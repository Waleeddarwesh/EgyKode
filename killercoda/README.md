# Killercoda scenarios

Free, browser-based terminals for the labs that can run in one. No account, no
install, no cost to the learner and none to EgyKode.

**42 of the 55 guided labs have a scenario.** The other 13 need managed
services or enforcement no free emulator provides, and every one of them is
settled by a recorded test rather than by assumption — see *What cannot be
built* at the end.

## The rule about enabling

A lab links to its scenario only once **a human has opened that URL in a
browser**. Nothing here can check it for you: Killercoda serves an identical
5062-byte application shell for every path, so a real scenario and a typo are
byte-identical over HTTP, and a headless browser gets no further than the
consent gate.

`scripts/enable-killercoda.mjs` therefore writes what you confirm rather than
guessing and calling it verified.

```bash
node scripts/enable-killercoda.mjs <profile>          # show the URLs it would write
node scripts/enable-killercoda.mjs <profile> --write  # write them
npm run content:lint
```

The profile form builds `/<profile>/scenario/<directory>`. **If the published
path differs, that guess is wrong for every scenario at once** — these live
under `killercoda/`, and Killercoda sometimes includes the parent segment. Open
one link before trusting the rest, and if it 404s, paste the real one:

```bash
node scripts/enable-killercoda.mjs --url k8s-workloads=<the URL you actually see> --write
```

## What is here

Each scenario is an `index.json`, an `intro.md`, a `setup.sh` that builds the
starting state, a `step*.md` and matching `verify*.sh` per step, and a
`finish.md`.

`index.json` carries a non-standard `labId` key. Killercoda ignores keys it does
not know; it is there so enabling a scenario attaches it to the right lab by
declaration rather than by matching directory names against lab ids.

**`ubuntu`**

| Scenario | Lab | Steps |
| --- | --- | --- |
| `ansible-jenkins-vault` | Automated Jenkins Server & Toolchain Provisioning | 4 |
| `ansible-roles-idempotency` | Ansible Roles, Variables & Idempotency | 4 |
| `aws-cloudwatch-logs-alarms` | EC2 Operations: SSM, CloudWatch Logs & Metrics | 3 |
| `aws-vpc-networking` | AWS VPC, Subnets, Gateways & Route Tables | 4 |
| `bash-backup-retention` | Bash Automation: A Script You Can Trust | 3 |
| `docker-compose-reverse-proxy` | Nginx Reverse Proxy & Multi-Container Docker Compose Stack | 3 |
| `docker-multi-stage-build` | Production-Grade Multi-Stage Dockerfile for Django & Gunicorn | 3 |
| `docker-networks-volumes-healthchecks` | Docker Networking, Volumes & Health Checks | 3 |
| `git-branch-protection` | Professional Collaboration on GitHub | 4 |
| `git-branching-collaboration` | Git Branching & Collaboration | 3 |
| `git-recovery-history` | Git Recovery & History Surgery | 3 |
| `jenkins-docker-pipeline` | Jenkins Pipeline: Build, Scan and Push an Image | 3 |
| `jenkins-fundamentals` | Jenkins Fundamentals & Role-Based Access | 2 |
| `linux-processes-services-logs` | Linux Processes, Services & Logs | 3 |
| `linux-ssh-hardening` | Linux Security & SSH Hardening | 3 |
| `linux-users-permissions-services` | Linux Server Administration | 3 |
| `network-layer-diagnosis` | Linux Networking & Troubleshooting | 3 |
| `postgres-backup-restore` | Backup & Disaster Recovery Drill | 3 |
| `prometheus-alerts-dashboards` | Custom Prometheus Alert Rules & Grafana Dashboards | 3 |
| `registry-scanning-s3-hardening` | Amazon ECR Container Registry & S3 Storage Buckets | 4 |
| `reverse-proxy-load-balancing` | Reverse Proxy & Load Balancing with Nginx | 3 |
| `terraform-ci-gate` | Terraform Validation, Linting & CI | 4 |
| `terraform-fundamentals` | Terraform Fundamentals | 4 |
| `terraform-modules` | Terraform Modules | 3 |
| `terraform-remote-state` | Terraform Remote State & Locking | 4 |
| `terraform-secrets-manager` | Amazon RDS PostgreSQL & AWS Secrets Manager Integration | 3 |
| `terraform-state-recovery` | Terraform Drift & State Recovery | 4 |
| `tls-certificate-diagnosis` | HTTP & TLS Troubleshooting | 3 |

**`kubernetes-kubeadm-1node`**

| Scenario | Lab | Steps |
| --- | --- | --- |
| `argocd-gitops` | GitOps Delivery with Argo CD: Sync, Drift & Self-Heal | 3 |
| `helm-custom-chart` | Creating a Custom Helm Chart for Django Microservices | 3 |
| `helm-upgrade-rollback` | Helm Upgrades, Rollbacks & Release Strategy | 4 |
| `k8s-chaos-experiments` | Chaos: Failure Injection & Recovery | 3 |
| `k8s-config-secrets` | Core Kubernetes Workloads, ConfigMaps & Secrets | 4 |
| `k8s-gateway-api` | From Ingress to Gateway API | 3 |
| `k8s-networkpolicy-hpa` | Kubernetes Security Hardening (NetworkPolicies) & HPA | 3 |
| `k8s-rbac-service-accounts` | Kubernetes RBAC & Service Accounts | 3 |
| `k8s-services-endpoints` | Kubernetes Services & Service Discovery | 3 |
| `k8s-storage-persistence` | Kubernetes Storage: PVC, PV and StorageClass | 3 |
| `k8s-workloads` | Kubernetes Workloads: Pod, ReplicaSet, Deployment | 3 |
| `kube-prometheus-stack` | Deploying Kube-Prometheus-Stack on AWS EKS | 4 |
| `loki-log-queries` | Centralised Logging with Loki and Grafana | 3 |

**`kubernetes-kubeadm-2nodes`**

| Scenario | Lab | Steps |
| --- | --- | --- |
| `k8s-node-drain` | Node Drain, Upgrade & Recovery | 4 |

## The standard every scenario meets

**Every verifier is mutation-tested: it must fail before the work, pass after
it, and reject a plausible wrong answer.** Three states, each one run and read —
not assumed because the failure branch was written.

That standard has caught bugs in scenarios that had already shipped, and the
recurring shape is a check that passes for the wrong reason:

- An assertion about an *absence* passes where nothing was ever built. Pair it
  with a presence check, or it passes by default.
- `terraform state rm` empties state while every resource keeps running and
  billing; a destroy check that only reads state accepts it.
- Prometheus answers an instant query from a five-minute lookback, so `up{}`
  keeps returning after scraping has stopped entirely.
- A wrong password is accepted by Postgres from *inside* its own container,
  because the official image ships `host all all 127.0.0.1/32 trust`.

The most valuable mutation is the plausible wrong answer, not the empty one.

## Testing a scenario before publishing

Test it in the shape it ships to. Running the scripts from a shell on your own
machine has hidden real bugs — `/root` not writable, `kubectl expose
statefulset` not working at all, a Postgres auth proof that proved nothing.

**`ubuntu` backend** — a privileged container with its own Docker daemon:

```bash
docker run -d --name rig --privileged ubuntu:24.04 sleep infinity
docker exec rig bash -c 'apt-get update -qq && apt-get install -y -qq docker.io curl git jq'
docker exec -d rig bash -c 'dockerd --storage-driver=vfs >/var/log/dockerd.log 2>&1'
```

**`ubuntu` backend, when the scenario uses `systemctl`** — that needs a real
init, which the above does not have:

```bash
docker run -d --name rig --privileged --cgroupns=host \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw jrei/systemd-ubuntu:24.04
```

**`kubernetes-kubeadm-*` backends** — a kind node is a real kubeadm node:

```bash
kind create cluster --name rig
docker exec rig-control-plane bash -c 'export KUBECONFIG=/etc/kubernetes/admin.conf; kubectl get nodes'
```

Then run each step's commands and its verifier, **before and after**:

```bash
bash verify1.sh    # must FAIL here
# ...do the work from step1.md...
bash verify1.sh    # must PASS
```

Extract the commands a learner actually clicks rather than retyping them —
only fences closed by ```` ```{{exec}} ```` are clickable, and a regex that
spans from one fence to the next `{{exec}}` will swallow an illustrative output
block into the following command block.

Use Ubuntu rather than Alpine for the rig: these verifiers are `#!/bin/bash`
with GNU coreutils, matching the backend.

## Checks

```bash
npm run lint:killercoda            # structure
npm run audit:hazards              # known failure classes
node scripts/audit-verifiers.mjs   # verifier quality
```

`lint:killercoda` checks that every file `index.json` references exists, that
each scenario names a real lab, that shell scripts have a shebang and LF
endings, and that step pages have `{{exec}}` buttons. Killercoda fails silently
on all of these — a step whose `text` names a missing file renders blank, and a
broken `verify` makes the step impossible to complete.

`audit:hazards` encodes five things this project has actually been bitten by:
an unpinned image, `$?` after a pipe, the dead Jenkins signing key or Java 17,
an apt-only `awscli` install, and a database password "proof" made from inside
the database's own container. All three run inside `npm run verify`.

## Pinning

Pin every image. `localstack/localstack:latest` stopped starting without a
licence token partway through this work, and the failure read as a broken
environment rather than an upstream change.

Two deliberate exceptions, both documented where they appear:
`jenkins/jenkins:lts` floats because pinning an older Jenkins breaks plugin
installation outright, and `aquasec/trivy:latest` is pulled to scan, where the
point is whatever is current.

## What cannot be built, and why

Thirteen labs have no scenario. The reasons are recorded with the failing
command in `docs/labs/killercoda-batch-4.md` and
`docs/labs/killercoda-batch-7.md`. In short:

- **The service is not in the free image** — EKS, RDS, CloudFront, ECR and AWS
  Backup all answer *"API for service 'x' not yet implemented or pro feature"*.
- **The emulator accepts without enforcing** — IAM permits a call it should
  refuse, Route 53 accepts an apex CNAME that real DNS rejects, ACM issues a
  certificate with no validation record. Where a criterion is *"and this is
  refused"*, a free emulator cannot host it however completely it implements
  the happy path.
- **It needs a real machine or a real service** — SSH into an instance, a
  browser console, GitHub Actions itself.

**Before adding to that list, read the lab's `successCriteria` rather than its
title or its tooling.** Five labs were written off by inheritance and turned out
to be buildable: lab-17 is titled *"on AWS EKS"* and not one of its criteria
mentions AWS; lab-08 was excluded for EC2 user_data that appears only in its
cleanup block; lab-git-professional was excluded because its criteria are
"GitHub features" when they are *forge* features a free forge implements.

A **real equivalent system** standing in for a managed one is sound — kubeadm
for EKS, zot for ECR, Postgres for RDS, Gitea for GitHub, Vault dev for Vault.
The learner does genuine work and the verifier reads genuine state. **A faked
outcome is not**, and that is the line these scenarios hold: where the
environment cannot do something, the scenario says so and leaves that criterion
to the cloud version of the lab.
