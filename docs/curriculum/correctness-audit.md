# E/F correctness, contradiction and duplication audit

First pass, 2026-08-23. Structure is frozen: this pass changes only what is
wrong, contradictory, or redundantly re-explained.

## Method

Three sweeps, in this order:

1. **E — obsolete syntax and version-sensitive claims.** Mechanical sweep for
   known-dead patterns (`docker-compose`, PodSecurityPolicy, `k8s.gcr.io`,
   `extensions/v1beta1`, `helm init`/Tiller, `MAINTAINER`, `apt-key`,
   `--export`, `--generator`, `componentstatuses`, `sudo:` in Ansible), then
   every version pin and pinned release URL in the corpus, each hit read in
   context before any edit.
2. **Cross-chapter contradiction.** For each shared concept, the *definitional*
   sentences were extracted from every chapter that mentions it and read side by
   side. No script can judge whether two explanations disagree; the script only
   assembles them.
3. **F — duplication.** Paragraph-level near-duplicate detection across all 57
   chapters, plus repeated section headings.

**Disputed or version-sensitive facts were checked against the vendor's own
documentation**, not against judgement. Where authoritative confirmation could
not be obtained, the claim was rewritten to be true regardless of version rather
than asserted — see E-2.

## E — findings

### E-1 (P2) Gateway API chapter pinned a release from two years earlier

`gateway-api.en.mdx` installed `v1.1.0`, declared `ReferenceGrant` at
`v1beta1`, and stated that "TCP, UDP and TLS routes are still experimental".

All three were correct *for v1.1.0* — the chapter was internally consistent,
which is why nothing flagged it. Against the current release they are not:
Gateway API v1.5 promoted **ReferenceGrant to `v1`** and **TLSRoute to the
Standard channel**.

Evidence: [Gateway API v1.5: Moving features to Stable](https://kubernetes.io/blog/2026/04/21/gateway-api-v1-5/),
[gateway-api v1.5.0 release](https://github.com/kubernetes-sigs/gateway-api/releases/tag/v1.5.0).
The `v1.5.0/standard-install.yaml` asset was confirmed to exist before the URL
was changed (the request returns a 302 to a release asset named
`standard-install.yaml`).

Fixed: install URL bumped to v1.5.0, `ReferenceGrant` to `v1`, and the channel
paragraph now says TCPRoute and UDPRoute remain experimental while TLSRoute has
graduated. Added a line telling the reader to check a resource's channel against
the release they installed rather than against a blog post — which is the
general defence against this whole class of rot.

### E-2 (P3) Kubernetes swap claim was version-pinned prose

`kubeadm.en.mdx` said "As of Kubernetes v1.28+, swap support is available in
beta". Alpha in 1.22 and beta in 1.28 are correct historical facts, but
`NodeSwap` was expected to graduate to stable in v1.34 and the current release
is v1.36.

**Authoritative confirmation of GA could not be obtained** — the sources found
say "likely to graduate", which is not evidence. Rather than assert a status,
the sentence now gives the alpha/beta history and tells the reader to check the
`NodeSwap` feature gate for the version they actually run, and notes that
`kubeadm` still expects swap off unless `failSwapOn: false` is set deliberately.
True regardless of which release the learner is on.

### E-3 (P2) Spot Instance discount was wrong, and contradicted another chapter

`auto-scaling.en.mdx` described Spot as "excess AWS capacity sold at a 70%
discount". `cost-optimization.en.mdx`, two phases later, said "up to a 90%
discount". A learner reading both is told two different numbers for the same
thing.

AWS states: *"available at up to a 90% discount compared to On-Demand prices"* —
[EC2 Spot Instances](https://aws.amazon.com/ec2/spot/).

Fixed in `auto-scaling`.

### E-4 (P2) The same section overstated the saving

`cost-optimization` then said "you save 90% on your compute bill", dropping
AWS's "up to". Fixed to state that AWS quotes *up to* 90% and that the realised
figure depends on the instance types and Availability Zones you will accept.

### E-5 (P2) Exit code 137 was equated with OOMKilled

`troubleshooting.en.mdx` had `137 | **OOMKilled** — exceeded the memory limit`.
The Docker chapter hedges this correctly ("very often the memory limit") and the
Kubernetes chapter names both causes, so the reference table was the odd one out
and the most likely to be read as definitive.

137 is SIGKILL (128+9). OOM is the usual cause; a failed liveness probe also
ends in a killed container. Fixed to say so and to send the reader to
`lastState.terminated.reason` instead of assuming.

### E-6 (P3) "Karpenter completely replaces the concept of ASGs"

An absolute claim that is true only of the nodes Karpenter manages. Narrowed,
and the mechanism kept: it provisions through the EC2 Fleet API rather than by
adjusting a group's desired capacity.

## Contradiction sweep — clean

Definitional sentences were compared across chapters for: cgroups, PID 1,
SIGTERM, container exit codes, desired state, SLI and SLO. All consistent, and
consistent in the intended shape — introduced once in the foundational chapter,
reinforced in application.

One example worth recording as the pattern working: `linux-foundations`
introduces cgroups as a kernel mechanism, `docker` reinforces them as runtime
controls mapped to Kubernetes `securityContext`, and `troubleshooting` applies
them to a containerd/kubelet cgroup driver mismatch. Three chapters, one mental
model.

E-3 was the only genuine cross-chapter contradiction found.

## F — duplication

**Paragraph level: effectively none.** One near-duplicate across the whole
corpus — the alt text of the architecture diagram, which appears in `start-here`
and `system-architecture` because it is the same image. Not a defect.

**F-1 (fixed) Dependency confusion was explained twice, independently.**
`build-tools` (core, order 8) and `nexus-and-artifacts` (alternative, order 36)
each gave a full account of the attack. They did not contradict each other, but
they were two canonical explanations rather than one — precisely the shape that
drifts apart later.

`build-tools` keeps the canonical explanation, since it is core and comes first.
The Nexus chapter now points at it and keeps only what is specific to a
repository manager: the version-99.0.0 trick, and that a group repository
merging internal and proxied content is what creates the ambiguity.

**Judged NOT duplication — `Error acquiring the state lock`,** which appears in
both `terraform` and `troubleshooting`. This is the intended model: the
canonical, worked explanation lives in the chapter that teaches Terraform, and
the reference chapter carries a compact lookup entry. They agree. Left alone.

**Judged NOT duplication — the `Level 1–4` and interview-question headings**
shared by ~38 chapters, and "Analyzing the actual code" by 16. Those are the
chapter template, not repeated teaching.

## Still to do

This was one pass over the mechanically findable classes. It is **not** a
chapter-by-chapter reading of all 57, which is what E-class defects of the
"inaccurate behaviour claim" and "teaches poor production practice" kind
require. Those cannot be swept for; they have to be read for, by someone who
knows the technology.

The next pass should read the core path in order and check claims against vendor
documentation as it goes, with the same P0–P3 classification.
