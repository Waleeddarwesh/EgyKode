# Killercoda batch 4 — Helm, and the IaC pattern

| Scenario | Lab | Backend |
| --- | --- | --- |
| `helm-upgrade-rollback` | lab-helm-upgrade-rollback | kubernetes-kubeadm-1node |
| `helm-custom-chart` | lab-14-creating-a-custom-helm-chart-for-django-microservices | kubernetes-kubeadm-1node |
| `terraform-ci-gate` | lab-terraform-testing-ci | ubuntu |
| `terraform-remote-state` | lab-terraform-remote-state | ubuntu |

## The IaC pattern is proven

`terraform-remote-state` establishes the approach the remaining AWS-shaped
Terraform labs can follow: **LocalStack in a container, the AWS provider pointed
at it through an `endpoints` block, and fake credentials.** S3, DynamoDB, the
Terraform S3 backend, state migration and DynamoDB locking all behave exactly as
they do against a real account.

Costs to budget for on the `ubuntu` backend:

- the LocalStack image pull, roughly one to three minutes
- the AWS provider download, measured at **69 seconds**

Both are one-time, in `setup.sh`, and the scenario is unusable until they
finish — so the setup script echoes progress rather than running silently.

Services confirmed working in the free image: **S3** (including versioning,
encryption, public access block) and **DynamoDB**. EKS and RDS are Pro-only and
remain out of reach; those labs stay cloud-only.

## Claims that turned out to be wrong

**`helm install --dry-run=server` does not validate the rendered output.** With
`replicaCount: two`, `helm lint` passes, `helm template` renders `replicas: two`,
and `--dry-run=server` **exits 0**. Only `helm template | kubectl apply
--dry-run=server` rejects it. A pipeline running the first three passes a chart
all the way to a failed deploy. This was written into a draft as fact before
being tested, and the test contradicted it.

**`trivy` is not satisfied by `sse_algorithm = "aws:kms"` alone.** AWS-0132 asks
for a *customer managed* key, so the fixed example needs an `aws_kms_key` and a
`kms_master_key_id`. The first "secure" version of the example still failed the
scan.

**The state lock error prints two IDs.** `RequestID` identifies the failed
DynamoDB call; the lock is under `Lock Info`. The first version of the recovery
command extracted `RequestID` — `force-unlock` then reported nothing useful and
released nothing. Both the step and its verifier now use the right one.

**The lock table always holds a `-md5` row.** It is a digest of the state file,
not a lock. A verifier written as "the table must be empty" fails permanently
after the first apply; it now counts only items carrying `Info`.

**A contaminated test passed.** `verify1` for the remote-state scenario passed
against a lock table left over from an earlier experiment rather than one the
step created. Caught by noticing `terraform state list` held four resources
where the API showed five. LocalStack was reset and the step re-run from clean
before the verifier was trusted.

## Exit codes worth writing down

| Command | Code | Means |
| --- | --- | --- |
| `terraform fmt -check` | 3 | Files need formatting — **not** 1 |
| `tflint` | 2 | Issues found |
| `trivy config --exit-code 1` | 1 | Findings at or above the severity |
| `terraform plan -detailed-exitcode` | 2 | Changes pending, i.e. drift |

A gate written as `if [ $? -eq 1 ]` misses three of those four. The gate script
in `terraform-ci-gate` uses `set -e` and tests for non-zero.

## Still open

`lab-terraform-fundamentals`, `lab-terraform-modules` and the VPC and S3/ECR
labs can all follow the LocalStack pattern. The EKS, RDS and CloudFront labs
cannot, and stay cloud-only.

---

## Batch 5 additions

| Scenario | Lab | Backend |
| --- | --- | --- |
| `terraform-fundamentals` | lab-terraform-fundamentals | ubuntu |
| `terraform-modules` | lab-terraform-modules | ubuntu |
| `aws-vpc-networking` | lab-01-aws-vpc-subnets-gateways-route-tables | ubuntu |

### ECR is not available on LocalStack community

`lab-03-amazon-ecr-container-registry-s3-storage-buckets` cannot be done this
way. Creating an `aws_ecr_repository` returns:

```
API for service 'ecr' not yet implemented or pro feature
```

Two of that lab's four criteria are ECR-specific — automatic scan-on-push and a
lifecycle policy expiring untagged images — so a scenario covering only the S3
half would leave half the lab unproven. It stays cloud-only.

Confirmed working in the free image and used by these scenarios: **VPC, subnets,
internet gateways, NAT gateways, Elastic IPs, route tables and associations,
EC2 instances with public IPs, AMI data lookups, S3, DynamoDB, IAM, STS.**

### Verifiers that passed without the work being done

**`terraform state rm` empties state while everything keeps running.** The first
version of the fundamentals destroy check tested only that state was empty. It
now asks the account, and rejects that case by name.

**An untouched account satisfies "nothing is left".** The VPC scenario's destroy
check passed on a fresh LocalStack where nothing had ever been built — every
assertion was about absence. It now first requires `terraform.tfstate.backup` to
contain a NAT gateway and an Elastic IP, which is evidence they existed and were
destroyed, and only then checks the account.

Both were found by running the verifier at the wrong moment on purpose. Absence
checks need a matching presence check, or they pass by default.

### An ordering bug in written material

Step 1 of the fundamentals scenario declared outputs referencing
`aws_instance.app` before any resources existed, then ran a plan to demonstrate
variable validation. The plan fails on the undeclared resource and never reaches
the validation. Outputs moved to the step that creates their resources.

### Ansible: one of the two labs is feasible

`lab-ansible-roles-idempotency` needs no cloud at all. It runs against the
Killercoda host itself with `ansible_connection=local`, installs nginx through
the role, and every criterion is measurable from the play recap or from
systemd.

`lab-07-ansible-architecture-configuration-automated-inventory` is **not**
feasible. Its first criterion is `ansible -m ping all` succeeding against hosts
generated from AWS tags, which needs SSH into real instances. LocalStack's EC2
objects are API records, not virtual machines — nothing listens on port 22 — so
the dynamic inventory could be generated and the ping could never succeed. It
stays cloud-only.

Idempotency checks worth reusing: the verifier converges first, then runs the
playbook **twice** and requires both runs to report `changed=0`. One quiet run
can happen by accident immediately after a change; two cannot. It also fails if
`RUNNING HANDLER` appears on a converged run, which is the actual outage —
a service restarting on every scheduled run.

### NetworkPolicy enforcement: settled, with one residual risk

Tested directly, by applying a default-deny and measuring whether traffic
actually stopped:

| CNI | Enforces NetworkPolicy |
| --- | --- |
| Calico v3.28 | yes |
| kindnet v20241212 | **yes** |
| Flannel | no (not tested here; well documented) |

The earlier working assumption that kindnet ignores NetworkPolicy is **out of
date** — recent kindnetd implements it. Both CNIs available for testing enforce,
so the "does nothing" case could not be reproduced with a real non-enforcing
plugin.

**Residual risk:** Killercoda's `kubernetes-kubeadm-1node` CNI is unverified. If
it is Flannel, step 1 of `k8s-networkpolicy-hpa` fails — by design, with a
message naming the plugin it found and explaining that the policy is stored but
not enforced. That failure is the lab's own criterion 4 ("why a NetworkPolicy
sometimes does nothing at all"), so the scenario tells the truth either way, but
the learner would be stopped at step 1. Worth confirming on the first
click-through.

The verifier was proven non-vacuous by applying an allow-all policy alongside
the default-deny, which makes traffic flow while the policy object still exists
— the same observable state a non-enforcing CNI produces.

### A narrative bug caught by running it

Step 2 originally claimed "by IP it works, by name it does not" immediately
after the default-deny. It does not: the default-deny blocks the database's
*ingress* too, so neither path works until the db policy exists. The step now
applies the database rule first, and only then is the DNS trap visible — which
is also the correct order in real life, and makes the point that egress and
ingress are two separate decisions.
