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
