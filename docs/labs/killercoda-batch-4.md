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

### Compose scenario: two measurement bugs worth remembering

**`date -d` could not parse `.State.StartedAt`.** Docker returns
`2026-08-18T19:41:54.154296809Z`; neither busybox nor GNU date accepts it as
given. The first version of the ordering check guarded the parse with
`if [ -n "$EPOCH" ]`, so a failed parse **skipped the comparison entirely** and
the verifier passed without checking anything. Normalising to
`2026-08-18 19:41:54` works on both, and an unparsable timestamp is now a
failure rather than a skip.

**A `sleep 3` hid the thing the step was about.** Step 2 claimed that after
`docker compose up -d` the database has started but cannot answer. Measured from
a fresh volume, `pg_isready` returns "no response" immediately and "accepting
connections" about a second later — so the original `sleep 3` guaranteed the
learner would see the opposite of what the text said. The step now checks with
no delay, shows the real output, and says plainly that the window is about a
second here and much longer on a loaded runner. The point is the absence of a
guarantee, not the length of the race.

Also worth noting: the app installs Gunicorn at container start, so a fresh
`up` takes ~20s to answer. Both HTTP checks now wait in a bounded loop rather
than firing once and failing on a stack that was merely still starting.

---

## Batch 6: measured feasibility notes

**Jenkins is heavy but workable.** Measured on the `ubuntu` backend pattern:

| Step | Cost |
| --- | --- |
| `jenkins/jenkins:lts-jdk17` pull | **1m48s** |
| `jenkins-plugin-cli` (configuration-as-code, matrix-auth) | 14s |
| First start to API answering 200 | ~30s |

That is ~2.5 minutes, which is why `jenkins-fundamentals` runs its setup as
`intro.background` and step 1 waits for readiness in a bounded loop rather than
assuming it.

**Do not pin an old Jenkins.** `jenkins/jenkins:2.479.1-lts-jdk17` fails to
install current plugins outright — `scm-api` requires 2.504.3, `workflow-api`
requires 2.504.1. Use the floating `lts` tag.

**The CSRF crumb is session-bound.** `curl` fetching a crumb and posting without
the matching cookie gets 403 even as an administrator. Every request in the
scenario uses `-c`/`-b` with a cookie jar. This cost an hour of confusion and is
worth knowing before writing any Jenkins automation.

### Infeasible, with reasons

**`lab-git-professional-collaboration`** — three of four criteria are GitHub
server-side features: a rejected push to a protected branch, a pull request
blocked by a failing status check, and CODEOWNERS auto-requesting a reviewer.
None exist without a forge. A bare repo with a `pre-receive` hook would
demonstrate a different mechanism and still could not do the other two.

**`lab-jenkins-fundamentals` criterion 2** — a job that builds when a commit is
pushed — is not covered by the scenario. It needs a repository Jenkins can be
notified by; the local environment has one.

### Prometheus notes

`prometheus_http_requests_total` only counts Prometheus's own API handlers. A
404 to an arbitrary path is **not** recorded — malformed queries against
`/api/v1/query` produce real `code=400` series, which is what the scenario uses
to drive the alert.

`python3` is not present on every image (the Alpine-based test rig has none), so
scenario steps use `sed` for in-place edits rather than a Python heredoc.

---

## Audit of all shipped verifiers

A script (`/tmp/audit.mjs`, pattern list below) was run across all 31 scenarios
looking for the failure modes that recurred while building them. Worth re-running
whenever a scenario is added.

Patterns checked:

1. A conditional guard that turns a failed measurement into a **skipped** check
2. `date -d` on a raw Docker/ISO timestamp — busybox and GNU both reject
   nanoseconds
3. `python3` or `jq` used without `setup.sh` installing them
4. **Every assertion about an absence** — passes where nothing was ever built
5. `curl` with no `--max-time`
6. `$?` read after a pipe, which reports the last command in the pipeline

### Fixed

- **`terraform-fundamentals/verify4.sh`** — its evidence file was checked with
  `if [ -f ... ]`, so on an account where nothing was built every remaining
  assertion was about absence and the check passed. The file is now required.
- Three unbounded `curl` calls now carry `--max-time`.

### Also fixed, tested on a live cluster

**`k8s-workloads/verify2.sh`** asserted only absences: no Deployment, zero
ReplicaSets, zero Pods — all true of a cluster where the Deployment was never
created. The step leaves no artifact behind, so the evidence comes from
**Kubernetes events, which outlive the objects they describe**: after the
cascade deletes the Deployment, ReplicaSet and Pods, the ReplicaSet's
`SuccessfulCreate` events remain and prove it existed.

Verified in four states on a kind cluster:

| State | Result |
| --- | --- |
| Namespace where nothing was ever built | FAIL (correct) |
| Deployment created, then deleted | PASS |
| Deployment still running | FAIL (correct) |
| Deleted again | PASS |

One caveat recorded deliberately: events have a one-hour default TTL. A learner
who spends more than an hour on this step would lose the evidence and see a
false failure. Killercoda sessions are time-limited to about the same, so the
window holds — but if session length ever increases, this check needs revisiting.

### False positive

The 30 "never exits 0 explicitly" findings are wrong — those scripts end with
`echo "PASS"`, which exits 0. The pattern should look for a non-zero final
command, not a literal `exit 0`.

---

## Next group de-risked: Kubernetes Ingress

Proved on a kind cluster before committing to the scenario, the same way
LocalStack was proved before the IaC batch.

**ingress-nginx installs fast.** The baremetal manifest for
`controller-v1.11.3` applies in ~2s and the controller rolls out in ~30s. It
exposes a NodePort, so no cluster-creation flags are needed — it will work on
Killercoda's `kubernetes-kubeadm-1node` backend as-is.

```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/baremetal/deploy.yaml
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=300s
NODEPORT=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[0].nodePort}')
```

**Host routing is genuinely enforced**, so it is measurable rather than
assumed:

| Request | Result |
| --- | --- |
| `Host: shop.example.com` | **200** |
| `Host: other.example.com` | 404 |
| no Host header | 404 |

### Two lessons the probe produced by accident

**An Ingress with no `ingressClassName` is silently orphaned.** It is accepted,
listed by `kubectl get ingress`, and never picked up by any controller:

```
NAME     CLASS    HOSTS                ADDRESS      PORTS
orphan   <none>   orphan.example.com                80
shop     nginx    shop.example.com     172.22.0.2   80
```

The tell is the **empty ADDRESS column** — the controller writes it when it
adopts the resource. Requests to the orphan host return 404. This is verifiable
state (`.status.loadBalancer.ingress` is absent) and belongs in step 1.

**A path prefix is passed through to the backend unchanged.** Routing `/api` to
a service whose application serves from `/` produces a 404 *from the backend*,
not from the Ingress — which looks identical to a routing failure and is not
one. That is the `nginx.ingress.kubernetes.io/rewrite-target` lesson, and it
should be demonstrated by showing the backend's own 404 page before fixing it.

### Suggested shape

1. Two services behind one Ingress, host routing proved with the 404s above,
   and the orphaned-Ingress failure
2. Path routing and `rewrite-target`, using the backend 404 as the symptom
3. TLS termination with a self-signed secret

`lab-12` also covers the AWS Load Balancer Controller, which needs EKS and stays
cloud-only — the scenario should say so rather than imply the whole lab is
covered.
