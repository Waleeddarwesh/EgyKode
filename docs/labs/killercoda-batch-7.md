# Killercoda batch 7 — five scenarios, and three verdicts that were wrong

| Scenario | Lab | Backend |
| --- | --- | --- |
| `aws-cloudwatch-logs-alarms` | lab-aws-ec2-cloudwatch-ssm | ubuntu |
| `kube-prometheus-stack` | lab-17-deploying-kube-prometheus-stack-on-aws-eks | kubernetes-kubeadm-1node |
| `ansible-jenkins-vault` | lab-08-automated-jenkins-server-toolchain-provisioning | ubuntu |
| `git-branch-protection` | lab-git-professional-collaboration | ubuntu |
| `terraform-secrets-manager` | lab-04-amazon-rds-postgresql-aws-secrets-manager-integration | ubuntu |

**36 → 41 scenarios.** Four of those five labs were on the do-not-build list.

## The mistake that hid three buildable labs

All three were settled **by inheritance from the lab's title or its
implementation**, never by reading its success criteria.

| Lab | Recorded as | Actually |
| --- | --- | --- |
| lab-17 | "needs EKS" | Four criteria: Prometheus targets, a ServiceMonitor, a Grafana graph, metrics surviving a restart. **None mentions AWS.** |
| lab-08 | "Terraform provisions Jenkins via EC2 user_data" | Four criteria: a playbook, `changed=0`, a verify play, secrets from Vault. **Only the cleanup block mentions EC2.** |
| lab-git-professional | "three criteria are GitHub server-side" | They are *forge* features, not GitHub features. A free forge does all four. |

**The check that finds these: read the successCriteria, not the title and not
the tooling.** If the criteria describe Kubernetes, a real kubeadm node serves.
If they describe Ansible, the Killercoda host serves. If they describe a Git
server refusing things, a forge serves.

What genuinely cannot be substituted is *enforcement a free emulator does not
implement* — that list is unchanged and still settled by test.

## The rule for substitutes

A **real equivalent system** standing in for a managed one is sound: kubeadm for
EKS, `registry:2` for ECR, Postgres for RDS, Gitea for GitHub, Vault dev for
Vault. The learner does genuine work, the verifier reads genuine state, and the
skill transfers.

**A faked outcome is not**, and this is the line the shipped scenarios hold.
Every case below is one where the emulator says *yes* and nothing happens:

| Call | Emulator | Reality |
| --- | --- | --- |
| `ssm send-command` | `Success`, rc 0, empty output | nothing ran |
| `logs filter-log-events --filter-pattern` | returns every event | pattern ignored |
| `cloudwatch put-metric-data` to `AWS/EC2` | accepted | real AWS refuses |
| CloudWatch alarm evaluation | stays `INSUFFICIENT_DATA` | never evaluates |

None of them errors. That shape — accepted, not honoured — is why the CloudWatch
scenario teaches the gap instead of hiding it, and why criterion 1 of
lab-aws-ec2-cloudwatch-ssm is left to a real account.

## Facts that expire, found by hitting them

**Jenkins rotated its package signing key in December 2025.**
`jenkins.io-2023.key` still downloads and no longer matches what the repository
is signed with. Failure: `NO_PUBKEY 7198F4B714ABFC68`, which reads as a broken
mirror. Current key is `jenkins.io-2026.key`
(`5E386EADB55F01504CAE8BCF7198F4B714ABFC68`), on **both** `debian-stable` and
`redhat-stable`. lab-06 and lab-08 were corrected.

**Jenkins requires Java 21 or 25 and refuses 17**: `Supported Java versions are:
[21, 25]`. The package installs cleanly and the service then dies. lab-08 said
"OpenJDK 17 (Jenkins will not start without it)", now exactly backwards.

**Ubuntu 24.04 has no `awscli` package.** `apt-cache policy awscli` →
`Candidate: (none)`. Three shipped scenarios installed it that way with no
check, so `aws` was simply absent and every later command died on
`aws: not found`.

**AWS CLI v2 cannot talk to LocalStack's CloudWatch.** CloudWatch is migrating
to AWS JSON 1.0; LocalStack still parses the query protocol. `Operation
detection failed. Missing Action in request for query-protocol service
ServiceModel(cloudwatch)` — upstream `localstack/localstack#13028`, open,
reproduced on LocalStack 3.8 **and** 4.0. No env var forces the old protocol, so
the scenario pins `aws-cli 2.15.30` and smoke-tests it in setup.

**`localstack/localstack:latest` no longer starts** without an auth token —
exit 55, "License activation failed". Everything here pins `3.8`.

**Gitea matches CODEOWNERS paths as regular expressions**, GitHub as gitignore
globs. `infra/*` is a valid glob and a regex matching nothing useful, so the file
parses and no reviewer is ever requested. `infra/.*` works.

## Measurements

| Thing | Cost |
| --- | --- |
| `kube-prometheus-stack` helm install | 20s |
| …Prometheus ready | ~4.5 min cold |
| `ansible-jenkins-vault` setup | 135s |
| …first playbook run | 1m46s (ok=7 changed=6) |
| `git-branch-protection` setup (Gitea) | 35s |
| `aws-cloudwatch-logs-alarms` setup | 83s |
| SonarQube image / RSS / startup | 1.43 GB / 2,205 MB / 72s |
| Trivy DB, cold | 108 MiB, 101s |

## Verifier bugs found by mutation-testing my own checks

**`kubectl run -i` prints the Pod's stdout twice**, concatenated on one line
(`...}}{"status":...`). Every numeric extraction saw `"14\n14"`, failed its
digits-only guard, and read as **0** — so verify1 reported "0 targets are up"
about a cluster scraping fourteen. `head -1` does not fix it; the responses must
be split first.

**Prometheus instant queries have a five-minute lookback**, so `up{}` keeps
answering after scraping stops. verify2 passed a mutation that removed the
ServiceMonitor's label — the corpse was still warm. It now requires the newest
sample to be under 90s old.

**A wall-clock heuristic decayed.** verify4 first compared sample count against
uptime÷interval; that only holds for a minute after a restart, so it began
failing correct answers. It now asks Prometheus for a moment *before its own
process start* — only data off the volume can be there.

**Gitea computes mergeability asynchronously** and answers "Please try again
later" — neither allowed nor refused. Read as either, the check flakes.

**An unencoded `tree` query returns 200 with an empty body**, indistinguishable
from a job with no builds. Brackets must be `%5B`/`%5D`.

## Four ways a generated password breaks a tool

All four came out of `terraform-secrets-manager`, and they are the same
underlying problem: a random password contains characters that something
interprets.

**The password is in `terraform.tfstate` and `grep` does not find it.** State
is JSON, and JSON stores an ampersand as its six-character unicode escape
rather than as itself. A literal grep for the password therefore returns
nothing from a file that plainly contains it. The first version of that
verifier grepped, and would have failed a correct answer. (The exact escape is
written out in the scenario's `verify1.sh` and `step1.md`.)

> "I grepped the state file and the password was not there" is not evidence.
> Read the attribute with `jq`.

**`sed`'s `&` in a replacement means "the whole match"**, so writing a generated
password with `sed` silently mangles it.

**An empty `$PW` makes `grep` match every line**, turning a "not present" check
into a false leak report. Every such check needs a non-empty guard, and `-F`.

**`terraform output -raw <name>` for an output that does not exist** prints a
warning that a command substitution captures as if it were the value — which
then got written into the secret *as the password*.

## Postgres trusts its own container

The application first connected with `docker exec` into the database, and
accepted a **deliberately wrong password**. The official image ships
`host all all 127.0.0.1/32 trust`, so any connection made from inside the
container is accepted regardless of the password.

The rotation proof proved nothing until the client moved outside the container
and onto the published port, where `scram-sha-256` applies. Any scenario that
proves something by "the wrong credential is refused" must check where the
client is standing.

## Where the ceiling is now

**41 of 55 guided labs.** The remaining 14 need enforcement or managed services
no free emulator provides, and every one is settled by test rather than by
analogy.

`lab-04` shipped as a **three-of-four**: Secrets Manager is in the community
image, so the credential criteria are real against a real PostgreSQL, and only
"Multi-AZ with no public endpoint, verified from outside the VPC" needs an
account. It is not simulated, and the scenario says so.
