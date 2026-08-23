# Lab gaps — backlog

Recorded rather than papered over: a chapter pointing at a plausible-sounding
lab that teaches something else is worse than a chapter saying there is no lab
yet. Nothing here is a commitment to build.

## Three classes of "missing"

They need different responses, and conflating them is how a curriculum grows
labs it does not need while leaving a real gap open.

| Class | Meaning | Action |
| --- | --- | --- |
| **Curriculum gap** | A core capability is taught but not adequately practised | Consider a lab |
| **Coverage gap** | The material is practised indirectly, elsewhere | Link honestly; do not duplicate |
| **Environment gap** | The lab is valid; the online environment cannot reproduce it honestly | Change the environment, never the curriculum |

## Missing labs

| Gap | Class | Role | Priority | Reason |
| --- | --- | --- | --- | --- |
| **AWS Auto Scaling + Load Balancing** | Curriculum | Core | **P1** | Direct capstone capability, and the only near-term core-path gap |
| **kubeadm provisioning** | Curriculum | Alternative | P2 | Valuable Kubernetes depth; shows what EKS hides. Not on the main path |
| **Kustomize standalone** | Coverage | Core-supporting | P2 | The Argo CD lab already renders overlays. Worth building only if learners show confusion there |
| **Build tools standalone** | Coverage | Supporting | P3 | Already exercised by the CI pipeline labs, which is more useful than running Maven in isolation |

### P1 — AWS Auto Scaling + Load Balancing

The one worth building first. It sits on the capstone path and joins concepts
already taught separately:

```text
VPC → EC2 → Target Group → Load Balancer → Auto Scaling → Health → Replacement
```

It also carries a production mental model the curriculum currently states but
never makes a learner feel: **a load balancer distributes traffic; Auto Scaling
changes capacity. They solve different problems.**

Outcome-oriented rather than another resource tour:

> Deploy a stateless service behind an Application Load Balancer and an Auto
> Scaling Group, terminate an instance, and verify traffic continues while the
> group replaces the failed capacity.

That makes it a resilience exercise. It also gives the health-check threshold
material in `load-balancers` — interval × consecutive failures — somewhere to be
observed rather than read.

### Why the other three are not urgent

`kubeadm` is already classified `alternative` to the EKS capstone. It is
excellent for a Kubernetes-depth route, showing the control plane, etcd, API
server, controller manager and scheduler that EKS manages for you. "No dedicated
lab yet" is an acceptable state, and `k8s-cluster-administration` says exactly
that and links the chapter.

`kustomize` and `build-tools` are coverage gaps, not curriculum gaps. Both
chapters state plainly that no dedicated lab exists and link where the material
is genuinely exercised.

## Environment gaps

Labs that are valid but cannot currently be given an online terminal, with the
measured reason. **These are infrastructure problems, not curriculum problems.**
The rule: when the platform cannot honestly reproduce something, say so rather
than presenting a simulation as production behaviour.

| Lab | Environment finding | Action |
| --- | --- | --- |
| `lab-aws-iam-least-privilege` | LocalStack community does not enforce IAM | Real AWS, or a different simulator |
| `lab-16` (SonarQube + Trivy) | Too heavy for the current VM profile | Larger lab profile |
| `lab-05`, `lab-15`, `lab-17` (EKS) | EKS is not a community service | Real AWS |
| `lab-06` (EC2 user_data), `lab-aws-rds-backup-restore` | API accepted, nothing runs | Real AWS |

**IAM — measured.** LocalStack 3.8.1, `is_license_activated: false`,
`ENFORCE_IAM=1` silently ignored: a user holding only `s3:ListBucket`
successfully deleted the bucket. The entire lab is "prove the policy denies what
it should", so this environment would answer yes to everything. Making it pass
would teach the opposite of the lesson.

**SonarQube — measured.** `sonarqube:10.7.0-community` reaches UP in 35s at
**2.26 GiB** resident and 386% CPU at startup. With Jenkins and a cluster
alongside, that likely exceeds a Killercoda VM. Classify as *requires a larger
environment* rather than trimming the lab until it no longer resembles the
pipeline it teaches.

**EKS.** If the environment cannot create a control plane, there must be no
"EKS lab" built on something else that keeps the title.

## Proven but unbuilt

`lab-07-ansible-architecture-configuration-automated-inventory` — the design is
verified end to end and parked in a scratchpad, not in the repository.

What was proven: the real `amazon.aws.aws_ec2` inventory plugin queries
LocalStack's EC2 API, groups hosts by tag, and `ansible -m ping all` returns
`pong` from three hosts nobody typed into a file.

```text
LocalStack EC2 API → amazon.aws.aws_ec2 → dynamic inventory
    → keyed_groups by tag → Ansible → SSH → pong
```

The concept is authentic: **the inventory is discovered from infrastructure
rather than maintained by hand.**

**Simulation boundary, to be stated in the scenario:** LocalStack provides the
API metadata; Docker containers provide the reachable hosts. LocalStack
community does not boot an instance — `EC2_VM_MANAGER=docker` was set and no
container appeared, because the Docker-backed VM manager is a Pro feature — so
setup joins each API record to a real container by giving both the same private
IP. The API, the plugin, the tags, the grouping and the SSH are all real; the
hypervisor is what is substituted.

Only `setup.sh` exists. Steps and verifiers were not written, so it was kept out
of the repository rather than committed unverified.
