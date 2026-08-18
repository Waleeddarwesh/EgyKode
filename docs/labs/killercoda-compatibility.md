# Killercoda compatibility — analysis before implementation

Purpose: decide which labs can actually be run in a free browser sandbox
before any Killercoda integration is built, so the feature never claims more
coverage than it has.

**Implementation is paused pending the open questions in the last section.**

## Headline

| | labs | share of 114 |
| --- | ---: | ---: |
| ✅ Directly compatible | **26** | 23% |
| 🟡 Compatible with modifications | **25** | 22% |
| ❌ Not suitable | **8** | 7% |
| Needs a real AWS account (`cloudCost: true`) | **55** | 48% |

**Best case is 51 of 114 labs — 45%.** Of the 59 labs that carry no AWS cost,
86% are reachable, but 25 of those need a scenario script written before they
work at all.

## Why `cloudCost: false` was the wrong proxy

The first pass used the billing flag and produced 59. That number is wrong for
this purpose: it says "this lab will not charge you", not "this lab runs on one
ephemeral machine". Three of the eight blockers below are free labs.

## Method, and a correction worth recording

Labs were classified by what their instructions actually demand — reboots,
second nodes, real cloud APIs, heavyweight services — rather than by domain or
cost.

The first run of that classification was wrong in a way worth writing down. A
challenge lab **deliberately contains no commands**: it states a goal and
withholds the steps. So signal extraction found nothing in any of them and
scored all 28 as directly compatible, including
`lab-k8s-node-drain-upgrade-challenge`, whose guided twin is blocked on needing
a second node. Same task, same requirement, opposite verdict.

Challenges now inherit their guided pair's verdict through `guidedLabId`. That
moved 8 labs out of "directly compatible" — the difference between claiming 34
and claiming 26.

## ❌ Not suitable — 8 labs

No scenario script fixes these. The requirement belongs to the exercise.

| Lab | Domain | Reason |
| --- | --- | --- |
| `lab-20-linux-server-administration` | linux | A success criterion is that a service **survives a reboot**. A sandbox session cannot be rebooted. |
| `lab-20-linux-server-administration-challenge` | linux | Same criterion. |
| `lab-k8s-node-drain-upgrade` | kubernetes | Draining a node requires somewhere for the pods to go — **two nodes minimum**. |
| `lab-k8s-node-drain-upgrade-challenge` | kubernetes | Same. |
| `lab-sre-chaos-failure-injection` | sre | Injects failure **across nodes**; single-node makes the exercise meaningless. |
| `lab-sre-chaos-failure-injection-challenge` | sre | Same. |
| `lab-aws-iam-least-privilege` | aws | Free in AWS, but still needs **a real AWS account** — IAM has no local equivalent. |
| `lab-aws-iam-least-privilege-challenge` | aws | Same. |

Recommendation: these stay as-is with their existing prerequisites. The two
Kubernetes and two SRE labs would become viable on a multi-node environment if
one is available — worth confirming, since that is 4 of the 8.

## 🟡 Compatible with modifications — 25 labs

Runnable on one machine, but only after a scenario is written. Grouped by the
work required.

**A Kubernetes cluster must be provisioned by the scenario (13 labs)**
`lab-k8s-workloads`, `lab-k8s-services`, `lab-k8s-storage`,
`lab-k8s-rbac-service-accounts`, `lab-k8s-gateway-api`,
`lab-incident-cluster-dns`, `lab-incident-crashloopbackoff`,
`lab-incident-ingress-502`, `lab-helm-upgrade-rollback`, plus challenge pairs.

Single-node is sufficient for all of these. `lab-k8s-storage` additionally
assumes a storage class — the scenario must supply one, and the lab's AWS EBS
references need replacing with a local provisioner.

**A heavyweight service must be installed first (8 labs)**
Jenkins (4), Loki/Fluentd (2), and their pairs. These pull large images and can
consume most of a session before the learner types anything. Each needs its
service pre-pulled in the setup script, and the lab may need trimming to fit a
session.

**systemd units (4 labs)**
`lab-ansible-roles-idempotency`, `lab-22-bash-automation-backup-healthcheck`
and pairs enable and start units. Viable **only if the environment provides a
real init system** — see open questions.

## ✅ Directly compatible — 26 labs

Nothing beyond a single Linux machine with Docker and internet access.

| Domain | Labs |
| --- | ---: |
| git | 6 |
| docker | 6 |
| networking | 6 |
| linux | 4 |
| sre | 2 |
| terraform | 2 |

These are the strongest candidates for a pilot: `git` and `docker` need no
provisioning at all, and together with `networking` and `linux` they cover the
whole Foundations phase — exactly where a beginner without a cloud account
currently stops.

One to confirm by reading: `lab-terraform-testing-ci` scored direct because it
appears to use local/null providers, but earlier signal extraction flagged AWS
strings in it. Read it before including it.

## Open questions — these gate the build

I could not verify these. Killercoda's documentation is client-rendered and
returned no content to an automated fetch, and stating their capabilities from
memory would put the whole analysis on a guess.

1. **Is there a real init system?** Decides 4 labs outright and affects how
   several others verify.
2. **Is a multi-node Kubernetes environment available?** Decides 4 of the 8
   currently-unsuitable labs.
3. **What is the session time limit?** Fourteen of these labs are 45–55 minutes
   *of learner work*, before image pulls. If sessions are shorter, those labs
   need splitting, not linking.
4. **Does a storage class exist by default**, or must the scenario install one?
5. **Is outbound internet available** for `apt`, `docker pull`, `helm repo add`
   and `git clone`? Most of the compatible set assumes it.

Answers to 1–3 could move the realistic number well below 51.

## Recommendation

Pilot the **26 directly compatible** labs, and start with git and docker, which
need no provisioning. Prove the integration end to end on three of them before
writing 25 scenario scripts.

Do not publish a number until the open questions are answered. "Practise the
fundamentals free, in a real terminal" is defensible today; "run everything
without cost" is not, and will not be — 55 labs build real cloud
infrastructure, which is the point of them.
