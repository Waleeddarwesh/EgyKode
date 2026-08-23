# Pass 3 — human review of configuration-dependent claims

In progress, 2026-08-23. The lens for every significant claim: **under what
conditions is this true?**

Classification: (1) always true · (2) true with stated assumptions ·
(3) configuration-dependent · (4) environment-dependent · (5) version-dependent ·
(6) provider/implementation-dependent · (7) not reliably true.

## Where the defects live

Worth recording before the findings, because it changed how this pass was run.

Interview Q&A sections are **4% of the core corpus by line count** and produced
**six of the previous eight findings** — roughly a twenty-fold defect density.
The reason is visible once you look: the main prose hedges carefully, and the
answer-key voice does not. "Instantly", "completely", "guaranteed" and
"automatically" cluster there.

So this pass read every core interview section first, then swept the main bodies
for defaults claims. That was the highest-yield ordering available.

---

## Findings

### P3-1 · `aws-overview` · Interview Questions

**Claim.** "EBS … is like a hard drive plugged directly into an EC2 server; it's
fast, used for operating systems, and **dies when the server dies**."

**Problem.** Not reliably true, and the chapter contradicted itself: its own
prose at line 117 correctly says an EBS volume "survives a stop/start", and
`cost-optimization` correctly describes orphaned volumes billing after an
instance is deleted. A learner could believe EBS is ephemeral — or be surprised
by a bill for volumes they thought were gone.

**Condition.** Deletion depends on the volume's `DeleteOnTermination` attribute.
AWS's table: root volume at launch → delete; data volume attached after launch →
preserve; data volume at launch → preserve via console, delete via CLI.

**Classification.** 3 — configuration-dependent. **Severity** E1 / P1.

**Corrected.** Now states that EBS lifetime is not the instance's, that the root
volume is deleted by default while attached data volumes are generally
preserved, and that forgotten volumes are a classic surprise cost. Also removed
"infinitely scalable" for S3 in the same answer (E5).

**Source.** [Preserve data when an instance is terminated](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/preserving-volumes-on-termination.html)

**Other chapters checked.** `cost-optimization` (correct already), `prometheus`
(correct), `k8s-config-storage` (correct). **Corrected:** `aws-overview` only.

---

### P3-2 · `kubernetes` · Service routing, and four other places

**Claim.** "The Kubernetes **Endpoints controller** continuously watches for Pods
matching that label … adds their real IPs to an **`Endpoints` object**", plus
`kubectl get endpoints` as the recommended diagnostic in four locations.

**Problem.** Version-dependent and internally inconsistent. The specialist
chapter `k8s-services-networking` correctly teaches **EndpointSlice** throughout
and correctly teaches that only *ready* Pods are listed. The overview chapter
taught the legacy API. Two mechanisms for one thing, in one curriculum.

**Condition.** The Endpoints API is **deprecated as of Kubernetes v1.33**;
EndpointSlice is its replacement. `kubectl get endpoints` still answers because
the control plane mirrors for compatibility — that mirroring is itself
deprecated.

**Classification.** 5 — version-dependent. **Severity** E2 / P2.

**Corrected.** The answer now describes the EndpointSlice controller, states
that only ready Pods are listed as ready addresses — which is *how* a readiness
probe removes a Pod from traffic and how a rolling update avoids sending
requests to a container still starting — and notes the deprecation.

**Source.** [EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

**Other chapters checked and corrected.** The belief was in six more places:
`kubernetes` (×3 more), `networking-fundamentals`, `start-here`,
`hands-on-labs` (×2), `troubleshooting` (×2). All migrated.

**Deliberately not changed:** `content/labs/*` and `killercoda/*` still use
`kubectl get endpoints`. The command works, and the scenario verifiers were
*tested* against real clusters — changing them without re-running those tests
would violate the project's own rule about untested verifiers. Recorded as
unresolved below.

---

### P3-3 · `system-architecture` and `project-overview` · private subnets

**Claim.** "A Private Subnet … its servers are **completely hidden** from the
outside world", and "Worker nodes … are **completely invisible** to the public
internet, **satisfying SOC2 Network Security requirements**."

**Problem.** Two defects. "Hidden" teaches the wrong model: a private instance is
still reachable from inside the VPC, from a peered VPC, over VPN or Direct
Connect, and — by design — from the load balancer in the public subnet. That
last one is the whole architecture. Believing "private = unreachable" is how
security groups stop getting attention.

The SOC 2 claim is unsupported: no single control satisfies an audit framework.

**Condition.** A private subnet removes *direct inbound reachability from the
internet*. Everything else still depends on security groups and NACLs.

**Classification.** 7 — not reliably true. **Severity** E3 / P2 (E5 for the
compliance claim).

**Corrected.** Both. The `system-architecture` prose at line 126 was already
correct — only the Q&A was wrong, which is the pattern again.

---

### P3-4 · `load-balancers` · Interview Questions

**Claim.** "The Load Balancer will **immediately** stop sending traffic to the
dead server."

**Problem.** This belief had already been corrected in the same chapter's prose
during pass 2, and survived in the Q&A. A target is marked unhealthy only after
a configured number of **consecutive** failed checks.

**Classification.** 3 — configuration-dependent. **Severity** E3 / P2.

**Corrected.** Now says requests continue to reach the dead server until the
threshold is met, that interval × threshold is the size of that window, and that
shrinking it trades faster ejection against evicting a target that was briefly
slow.

**Lesson.** Correcting prose does not correct a curriculum. Search the belief.

---

### P3-5 · `vpc` · `enable_dns_hostnames`

**Claim.** "without it, instances get no internal DNS name and service discovery
inside the VPC does not work. It is off by default."

**Problem.** The conclusion is right and the mechanism is wrong, which is the
worst combination for someone debugging. An instance always receives a private
DNS hostname. What changes is *resolution*.

**Condition.** AWS: if **either** `enableDnsHostnames` or `enableDnsSupport` is
false, the Route 53 Resolver cannot resolve Amazon-provided private DNS
hostnames; both must be true for a private hosted zone or PrivateLink private
DNS. `enableDnsHostnames` defaults to false on a VPC you create;
`enableDnsSupport` defaults to true.

**Classification.** 3 — configuration-dependent. **Severity** E3 / P3.

**Corrected.** Now separates having a name from resolving it, and says it fails
in the confusing way: the name exists and nothing answers for it.

**Source.** [Understanding Amazon DNS](https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html)

---

## Mental models corrected

Across passes 2 and 3, the beliefs that were wrong rather than merely worded
loosely:

- **"Requests reserve capacity"** → a scheduling input, a CPU share under
  contention, and a position in the eviction order.
- **"Rolling upgrade means zero downtime"** → workload architecture decides
  availability: replicas, spread, PodDisruptionBudgets.
- **"Synced means healthy"** → desired state and health are separate questions.
- **"Self-heal is instant"** → reconciliation is periodic, and `selfHeal` must
  be enabled.
- **"Disabling the IdP ends AWS access"** → session lifetime is what matters;
  existing credentials live until they expire.
- **"Failover is instant and lossless"** → 60–120 seconds, connections break,
  committed transactions survive and in-flight ones do not.
- **"EBS dies with the instance"** → lifetime is an attribute, and forgotten
  volumes keep billing.
- **"A Service routes to Endpoints"** → EndpointSlices, listing *ready* Pods.
- **"Private subnet means unreachable"** → no *direct inbound from the
  internet*; everything else is security groups.
- **"Kubernetes scales with traffic"** → scheduling and restarting are built in;
  autoscaling is configured.

## Verified as correct — no change

Checked against documentation and left alone, because a review that only
reports problems is not a review: SIGTERM's 30-second default grace period and
`docker stop`'s shorter one; security groups being stateful and NACLs not;
`user_data` running once by default; S3 Block Public Access being on by default
for new buckets; Argo CD's three-minute default reconciliation; service account
tokens being automounted by default; containers running as root by default; and
IAM's explicit-deny-always-wins.

## Unresolved

- **`content/labs/*` and `killercoda/*` still use `kubectl get endpoints`.** The
  chapters now teach EndpointSlice. The command works via mirroring, and the
  verifiers are tested; migrating them needs a cluster and a re-run, not a text
  edit.
- **Two chapters use different example versions** in `kubeadm upgrade apply`
  (v1.29.0 and v1.31.4). Cosmetic, but a learner reading both may pause.
- **`t3.xlarge` at "roughly $0.1664 per hour"** in `aws-overview` is
  region-specific and dated. Left for now; pricing prose needs a general policy
  rather than a spot fix.

## Status

Structural, mechanical, contradiction and targeted factual reviews are complete.
Pass 3 has read every core interview section and swept the main bodies for
defaults claims; the line-by-line reading of all forty core chapter bodies is
**not** finished. This document will grow.

Not a claim that the curriculum is correct — only a record of what was checked,
what was found, and what remains.
