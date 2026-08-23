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

### P3-6 · `container-security` · Why do we need it?

**Claim.** "a bot will hack your server **within 45 minutes** of it going live."

**Problem.** An invented statistic. The mechanism is real — automated scanning
of public repositories and reachable services, scripted exploits for public CVEs
— but the number has no source and the precision is fabricated. The project's
own rules forbid false statistics.

**Classification.** 7 — not reliably true. **Severity** E5 / P2.

**Corrected.** States the mechanism and explicitly declines to put a number on
it, because it depends on what was exposed, to whom, and which vulnerability.
The conclusion survives without the number: anything reachable and unpatched is
found by something that never sleeps, so the defence is not obscurity.

---

### P3-7 · `network-policies` · the DNS egress example contradicted its own chapter

**Claim.** The Level 1 egress example permitted **UDP 53 only**.

**Problem.** The same chapter's troubleshooting section — and the DNS incident
lab — correctly require UDP *and* TCP. So the chapter taught the beginner the
exact mistake it warns about two hundred lines later. DNS falls back to TCP when
a response exceeds one datagram, so a UDP-only rule produces the worst failure
shape: most lookups work and a few hang.

**Classification.** 3 — configuration-dependent. **Severity** E1 / P2.

**Corrected.** Both protocols in the example, with the reason stated.

**Other locations checked.** Every `port: 53` rule across chapters, labs and
scenarios. `lab-13`, `k8s-networkpolicy-hpa` and `incident-cluster-dns`'s
scenario were already correct; **`lab-incident-cluster-dns.en.mdx` was not** and
disagreed with its own scenario — corrected.

Also narrowed "they are physically trapped in the Frontend room. They cannot
reach the Database": a NetworkPolicy narrows blast radius, it is not a cage. The
attacker still has whatever that Pod may reach and whatever its service account
can do.

---

### P3-8 · `chaos-engineering` · hypothesis contradicted the corrected RDS material

**Claim.** Example hypothesis: "the system will failover to the Standby Database
**within 10 seconds**."

**Problem.** After pass 2 corrected RDS failover to AWS's documented 60–120
seconds, this extension chapter still implied 10. A beginner meeting both learns
nothing reliable.

**Classification.** 6 — provider-dependent. **Severity** E3 / P3.

**Corrected.** The example hypothesis now uses the documented window, mentions
broken connections, and adds the point that a hypothesis you cannot be wrong
about is not an experiment.

---

### P3-9 · The most duplicated wrong belief in the curriculum: GitOps convergence

**Six locations, corrected across three passes.** Worth recording as one finding
rather than six, because the shape is the lesson.

| Where | Claim |
| --- | --- |
| `argocd` `selfHeal` bullet | "instantly recreates the Pod" — pass 2 |
| `gitops` hacker Q&A | "instantly recreates the Deployment … fighting off the hacker automatically" — pass 2b |
| `argocd` Level 1 librarian | "**immediately** puts a 3rd book on the Shelf … **immediately** throws the comic book in the trash" |
| `gitops` Level 1 kingdom | "**immediately** bulldozes the house" |
| `gitops` principles list | "If the live system drifts from Git, it fixes it **immediately**" |
| `argocd` troubleshooting | "returns to `OutOfSync` immediately" (mine, from pass 1) |

The Argo CD Level 1 case is the sharpest: the analogy says "immediately" twice,
and the ASCII diagram **fifteen lines below it** says "Pulls changes every 3
minutes". The chapter contradicted itself inside one screen, and three previous
audits had walked past it because they were matching sentences.

**Conditions the belief hides.** Reconciliation is periodic — three minutes by
default, sooner with a webhook. Reverting out-of-band changes requires
`selfHeal`. Deleting objects no longer in Git requires `prune`. None of the three
is on unless configured.

**Classification.** 3 — configuration-dependent. **Severity** E3 / P1.

**Lesson, now recorded twice.** Correcting a sentence does not correct a
curriculum, and correcting a *chapter* does not either. The belief lived in the
analogy, the principles list, the answer key and the diagram caption
independently. Search for the idea, in every register the curriculum uses to
express it — including the ones that do not sound technical.

---

### P3-10 · Fabricated statistics — a class, not an instance

Three invented numbers, presented as fact:

| Chapter | Claim |
| --- | --- |
| `container-security` | "a bot will hack your server **within 45 minutes**" |
| `iam` | "a hacker will find them **in exactly 4 seconds**" · "a bill for **$50,000**" |
| `ecr` | a 500MB pull from in-region ECR "takes **milliseconds**" |

The mechanisms behind the first two are real — automated scanning of public
repositories, scripted exploits, crypto-mining abuse. The precision is invented,
and "exactly" makes it worse. The third is wrong by orders of magnitude.

**Corrected** by stating the mechanism and declining to give a number where none
is available. The IAM rewrite gained something the fake number was crowding out:
GitHub secret scanning and AWS's quarantine response, which is why a leaked key
often arrives as an AWS notification.

**Checked and left alone:** illustrative scenario numbers in analogies (a
$30,000 car, "100 servers on Black Friday") and real specifications — `gp3`'s
3,000 IOPS baseline, and gp2 needing 1,000 GB to reach 3,000 IOPS at 3 IOPS/GB.
Both correct.

**Classification.** 7 — not reliably true. **Severity** E5 / P2.

---

### P3-11 · Two absolutes about tools

`grafana`: "can connect to **50 different databases** simultaneously" — invented
precision, now "many kinds of data source".

`jenkins`: "runs 24/7, **executes perfectly every time**" — a beginner who
believes CI is infallible is unprepared for the flaky test and the drifted agent,
which is most of what running CI actually involves. Now "consistent rather than
infallible", with the point that telling real failures from flaky ones is part of
the job.

**Classification.** 7 — not reliably true. **Severity** E5 / P3.

---

### P3-12 · `kubernetes` · node failure was described as instant, and its timing taught nowhere

**Claim.** "If Server #12 catches fire, you need a robot to **instantly** realize
the server died, and move all the containers … to Server #15."

**Problem.** Node failure recovery is one of the slower things Kubernetes does,
and nothing in the curriculum said so. A learner planning for availability on
this model will be wrong by minutes — which is the difference between "we have
replicas" and "we are down".

**Condition.** Measured against the documentation: the control plane marks a node
`NotReady` after the node monitor grace period, **40 seconds** by default, then
taints it. Pods are evicted after a further **300 seconds** by default. A dead
node's Pods typically start moving around five and a half minutes later.

**Classification.** 3 — configuration-dependent. **Severity** E3 / P1.

**Corrected.** Both numbers are now stated, along with *why* the delay is
deliberate — evicting everything when one heartbeat is missed would be worse —
and the conclusion that faster failover comes from running more than one replica,
not from tuning the timeout down.

**Source.** [Nodes](https://kubernetes.io/docs/concepts/architecture/nodes/)

---

### P3-13 · `rds` · "can cause data corruption" was the wrong failure mode

**Claim.** "If a Kubernetes Node dies … the hard drive (EBS volume) is physically
stuck in the old Availability Zone. Kubernetes has to unmount it and remount it
across the network, **which can cause data corruption**."

**Problem.** That is not what happens, and it contradicted `auto-scaling`, which
correctly describes the real behaviour. An EBS volume belongs to one AZ and
attaches to one instance at a time. It is not remounted across the network. If
the replacement node is in another AZ the volume cannot follow, and the Pod sits
in `Pending`.

The single-attachment rule is what *prevents* the corruption scenario described.
Teaching it as the risk inverts the mechanism.

**Classification.** 7 — not reliably true. **Severity** E1 / P2.

**Corrected.** The failure is now a Pod that will not start — visible — rather
than two nodes writing to one filesystem.

---

### P3-14 · `observability` · what observability actually gives you

**Claim.** "the system automatically detects the CPU spike, sends an SMS … and
provides a dashboard showing **exactly which line of code caused the crash**."

**Problem.** Observability tooling does not identify causes. A beginner who
expects it to will not build the habit the discipline is actually made of, and
will be disappointed by every real tool. The alerting also requires rules
somebody wrote.

**Classification.** 7 — not reliably true. **Severity** E3 / P2.

**Corrected.** Now says it gives you *evidence fast enough to reason from*, and
that the reasoning is still yours — taking you from "a customer says it is
broken" to "errors on checkout started at 14:02, two minutes after a deploy" in
a minute rather than an afternoon.

---

### P3-15 · `prometheus` · `histogram_quantile` "mathematically guarantees"

**Claim.** "This query mathematically guarantees that 99% of our users are
experiencing speeds faster than the returned number. If the P99 is 4000ms, an
alarm fires immediately."

**Problem.** It is an estimate, not a guarantee, and the second sentence
contradicted the alerting section immediately below it, which explains `for:`
durations.

**Condition.** Prometheus documents `histogram_quantile` as interpolating within
the bucket the quantile falls into, assuming a uniform distribution inside it —
so accuracy is decided by bucket boundaries, and misaligned boundaries give
"large margins of error". If the quantile lands in the highest bucket, the upper
bound of the **second-highest** bucket is returned.

**Classification.** 3 — configuration-dependent (on your buckets).
**Severity** E1 / P2.

**Corrected.** Now teaches the estimate, why boundaries decide accuracy, and the
tell: a P99 pinned at your largest finite bucket means the buckets are too small,
not that latency is exactly that.

**Source.** [Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)

---

### P3-16 · `helm` · rollback "instantly … the exact working configuration"

Contradicted this chapter's own troubleshooting section, added in Phase 4. A
rollback applies the stored manifests at the speed of a normal rollout, and
restores **manifests, not data** — which is why a schema migration and a chart
rollback are two different plans.

**Classification.** 2 — true with stated assumptions. **Severity** E3 / P2.

---

## Coverage — what Pass 3 actually read

Stated plainly so the next reviewer knows where to start rather than guessing.

**Complete:**

- Every **interview Q&A** section in all 40 core chapters. Highest-yield surface
  by a wide margin.
- Every **Level 1** section in all core chapters.
- Corpus-wide sweeps: defaults (`by default`), convergence
  (`instantly`/`immediately`/`guaranteed`/`automatically`/`zero downtime`),
  fabricated statistics, and absolute claims.
- **Read in full or substantially, no findings:** `linux-foundations`,
  `k8s-config-storage`, `k8s-services-networking`, `kustomize`,
  `sre-fundamentals`, `jenkins` Level 3, `ansible` Level 3, `s3` Level 3,
  `auto-scaling` Level 2–3, `load-balancers` Level 2, `iam` policy section,
  `prometheus` Level 1.

**Not complete:** line-by-line reading of the Level 2–4 bodies of
`aws-overview`, `vpc`, `ec2`, `ecr`, `terraform`, `kubernetes`,
`k8s-cluster-administration`, `helm`, `gitops`, `argocd`, `grafana`,
`observability`, `container-security` and `supply-chain-security`. Those were
covered by the sweeps and by spot reads, not by a full read.

**The pattern held throughout, and it is the most useful thing to hand on.**
Defects clustered in two places: interview Q&A written in a confident answer-key
voice, and Level 1–2 analogy sections written enthusiastically. The newer,
carefully-hedged prose produced **zero** findings across every chapter read. A
reviewer with limited time should read those two surfaces in the older chapters
and can reasonably trust the rest.

## Status

Structural, mechanical, contradiction and targeted factual reviews are complete.
Pass 3 has completed the human review of the interview and Level 1 surfaces
across the core path, plus corpus-wide sweeps for the defect classes it found;
a full line-by-line read of the remaining Level 2–4 bodies is outstanding.

Sixteen findings, all corrected, each with its condition and — where the fact was
disputable — an authoritative source. Not a claim that the curriculum is correct.

## Chapters read and found clean

Recording these matters as much as the findings — an audit that only produces a
defect list gives no signal about coverage.

- **`linux-foundations`** (852 lines, full read) — no findings.
- **`sre-fundamentals`** — no findings. "100% is the wrong target" is argued
  economically and correctly, and its cross-reference claim that
  `observability` defines SLI/SLO/SLA and the error budget was checked and is
  accurate.
- **`kustomize`** Level 1 — no findings.
- **`prometheus`** Level 1 — the fifteen-second scrape, the pull model and the
  `/metrics` whiteboard analogy are all accurate.
- **`iam`** policy section — the bucket-ARN versus object-ARN distinction and
  explicit-deny-always-wins are both correct and well explained.
- **`ansible`**, **`helm`** Level 1 — analogy numbers only, no factual claims.

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
- **"A NetworkPolicy traps the attacker"** → it narrows blast radius; the Pod's
  remaining reach and its service account still apply.
- **"Allow UDP 53 for DNS"** → UDP *and* TCP, or large responses hang.
- **"Reconciliation is immediate"** → periodic, and correction requires
  `selfHeal`; deletion requires `prune`. Found in six places.
- **"CI executes perfectly every time"** → consistent, not infallible.
- **"A dead node's Pods move instantly"** → ~40s to NotReady, then ~300s before
  eviction. Availability comes from replicas, not from the timeout.
- **"Cross-AZ volume remounting corrupts data"** → single attachment prevents
  that; the real failure is a Pod stuck in Pending.
- **"Observability tells you what broke"** → it gives evidence quickly; the
  reasoning is still yours.

## Verified as correct — no change

`linux-foundations` was read in full and produced **no findings** — `After=`
versus `network-online.target`, the `Restart=always` trap, environment variables
not being a secret store, and SSH key permissions being a client-side check are
all precise. It is the standard the rest should be measured against.

Other claims checked against documentation and left alone, because a review that
only reports problems is not a review: SIGTERM's 30-second default grace period and
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
