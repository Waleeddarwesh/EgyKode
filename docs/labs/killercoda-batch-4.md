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

### Correction: lab-12 is not the Ingress scenario

Reading its criteria before building changed the plan. Three of the four are
**ALB-specific**:

- "A real ALB is provisioned from a Kubernetes manifest, and you can find it in
  the AWS console"
- "You can explain what `target-type: ip` changes"
- "Deleting the Ingress removes the ALB — verified, not assumed"

Only path-based routing is reproducible without AWS. An ingress-nginx scenario
would cover one criterion of four and teach a different controller than the lab
does, so **lab-12 stays cloud-only**. The ingress-nginx findings above remain
useful — they belong to the Gateway API scenario, which compares the two.

### lab-k8s-gateway-api is proved and should be built next

Its criteria are implementation-neutral, and the interesting one is measurable:

```
Gateway API CRDs (v1.1.0 standard-install)   ~2s
NGINX Gateway Fabric v1.4.0                  ~40s to rolled out
GatewayClass "nginx"                         ACCEPTED True
```

The controller's Service is a LoadBalancer with a NodePort, so it works on
`kubernetes-kubeadm-1node` without any cluster flags. Note the deployment is
named **`nginx-gateway`** in namespace `nginx-gateway` — not the Helm-style name
the docs suggest.

**A weighted split, measured over 100 requests against a declared 80/20:**

```
     88 v1
     12 v2
```

That is criterion 2 — "a weighted split sends traffic to two Services, with no
annotations" — as a number rather than a claim. A verifier should allow a
generous band (say v1 in 60–95, v2 in 5–40 of 100) since it is weighted
round-robin, not a quota, while still failing an even split or a single backend.

Suggested shape:

1. The same app through an Ingress and an HTTPRoute, both reachable (criterion 1)
2. The weighted split, counted (criterion 2)
3. Who owns what: a Gateway owned by the platform team, HTTPRoutes owned by
   application teams in their own namespaces, joined by `allowedRoutes` — which
   is one of the two things Ingress cannot express (criteria 3 and 4)

### lab-aws-iam-least-privilege is infeasible — IAM is not enforced

Tested directly with `ENFORCE_IAM=1` on `localstack/localstack:3.8`:

- created user `lab-reader`
- attached a policy allowing `s3:ListBucket` on `arn:aws:s3:::allowed-bucket`
  and `s3:GetObject` on `arn:aws:s3:::allowed-bucket/*`, and nothing else
- listed **both** buckets with that user's own access key

```
--- allowed bucket:
2026-08-19 03:37:01          6 f.txt
exit=0
--- secret bucket (should be AccessDenied):
2026-08-19 03:37:01          6 f.txt
exit=0
```

The denied call succeeds. The lab's first criterion is "a user can read one
specific S3 bucket and nothing else, **proven by an allowed call and a denied
one**", and the denial cannot be produced. A scenario built here would teach a
policy the environment silently ignores — the precise failure this whole effort
exists to avoid.

`ENFORCE_IAM` is a Pro feature in practice. **Cloud-only.**

The same reasoning rules out the other policy-shaped cloud labs: anything whose
criterion is "and this call is refused" needs an authoriser, and LocalStack
community is not one. Note the contrast with Kubernetes RBAC, where
`kubectl auth can-i` asks a real authoriser and the refusals are genuine.

---

## Argo CD probe: mostly feasible, with one gap that decides the design

Measured on a kind cluster.

```
kubectl apply -f .../v2.13.1/manifests/install.yaml     ~4s to apply
all pods Running / Application Synced+Healthy           ~4 minutes
```

Four of the five criteria in `lab-argocd-gitops-reconciliation` need only a
**read-only public repository**, because the learner drifts the *cluster*, not
the repo:

**Drift and self-heal, measured:**

```
t+5s   replicas=4  sync=OutOfSync
t+10s  replicas=1  sync=Synced
```

`kubectl scale` to 4 was detected as `OutOfSync` within five seconds and
reverted within ten, with `syncPolicy.automated.selfHeal: true`. That is
criterion 5 as two numbers.

Criteria 1 (`Synced` and `Healthy`), 3 (the running Pod's image, checked against
the Pod) and 4 (sync history against a revision) are all readable from the
`Application` status and the Pod, so they need no write access either.

### The gap

Criterion 2 — "**a commit** that changes the image tag moves the Application to
`OutOfSync` without anyone running `kubectl`" — requires a repository the
learner can push to. A public example repo cannot demonstrate it.

Options, in order of preference:

1. **A git server in the cluster.** A tiny HTTP git repo as a Deployment, with
   the Application pointing at `http://git.gitops.svc/repo.git`. The learner
   commits and pushes to it over the cluster network. This is the only option
   that covers all five criteria, and is the one to build
2. Have the learner fork the example repo and paste their URL — needs a GitHub
   account and a token in the terminal, which breaks the no-credentials rule
3. Cover four criteria and say plainly that the commit-driven one needs a real
   remote, as `jenkins-fundamentals` does for its push trigger

Note the setup cost: ~4 minutes before step 1 can do anything, so `setup.sh`
belongs in `intro.background` with step 1 waiting for `Synced` in a bounded
loop, exactly as the Jenkins scenario does.

---

## Argo CD: built, tested, published

Option 1 above is what it became. Recorded here because the numbers decided
several parts of the design, and none of them were what I expected.

### The Git server

`git daemon --export-all --enable=receive-pack` in a Pod, `alpine/git` plus
`apk add --no-cache git-daemon` — the image ships every other git subcommand
but not that one, and without it the container seeds the repository and then
exits with `git: 'daemon' is not a git command`, which reads as a typo.

Argo CD accepts a `git://` repoURL. That was the pivotal unknown and it was
answered by a failure message: the first attempt reported
`dial tcp 10.96.234.41:9418: connect: connection timed out`, which is a network
error, not a scheme error — it had parsed the URL and tried to connect.

Two URLs for one repository, because two clients need it from different sides:

| Client | URL |
|---|---|
| the learner, on the node | `git://localhost:30418/app.git` (NodePort) |
| Argo CD, in the cluster | `git://git.gitops.svc:9418/app.git` |

The kind node has no `git` at all, which is why `setup.sh` checks for it rather
than assuming. Killercoda's image has carried it every time, and "every time so
far" is not a dependency declaration.

### Measurements

```
push -> running Pod        26-50s   with timeout.reconciliation: 30s
push -> running Pod        230s     on the 180s default
kubectl scale -> reverted  ~1s
sync wave 1 gating wave 2  107s     web Deployment did not exist while
                                    postgres pulled and became ready
```

**The controller reads `timeout.reconciliation` once, at startup.** Patching
`argocd-cm` alone leaves the default in place — measured 110s→50s only after
`rollout restart statefulset/argocd-application-controller`. `setup.sh` does
both.

That asymmetry — Git polled, cluster watched — is now the spine of the
scenario. Step 2 waits half a minute for a commit; step 3's drift is gone
before you can read it.

### What verify3 rests on

Everything step 3 produces is transient: the drift lasts a second and the
cluster ends where it started. The only durable trace is an event, and Argo CD
distinguishes the two cases in one word:

```
Sync operation to <sha> succeeded            a commit you pushed
Partial sync operation to <sha> succeeded    a self-heal
```

A partial sync does **not** append to `status.history`, so history cannot be
used here. Events last an hour by default, which outlives a session.

### Mutation tests run

| State | Result |
|---|---|
| untouched cluster | all three FAIL |
| `selfHeal: false` | verify1 FAIL |
| `source.path: k8s` | verify1 FAIL |
| committed tag that does not exist | verify2 FAIL — applies cleanly, reports `Synced`, never runs |
| happy path | all three PASS |

The bad-tag case is the one worth keeping: `nginx:9.99-doesnotexist` synced
without complaint and the verifier reported both the Pending Pod on the new
image and the Running one on the old. That is the whole argument for checking
the Pod rather than the manifest, and it is now in the failure message.

### Still not built

Loki, the Jenkins docker pipeline, and lab-16 (SonarQube/Trivy). Nothing found
so far says they are infeasible.

---

## Loki: built, tested, published

`grafana/loki-stack`, which the lab installs, is archived. Built on the current
`grafana/loki` 7.3.0 chart in SingleBinary mode plus `grafana/promtail` 6.17.1.

### Two failures that cost the most time

**`mkdir /var/loki: read-only file system`.** With `persistence.enabled: false`
the chart mounts nothing at `/var/loki` and the container's root filesystem is
read-only, so Loki dies on startup with an error about storage that is really
about a missing volume. Fixed with an `emptyDir` through
`singleBinary.extraVolumes`. A PVC would work and would need a default
StorageClass, which `k8s-storage-persistence` already records as not guaranteed
on this backend.

**An agent installed before its backend answers goes quiet permanently.**
Promtail was installed while Loki was still starting. It exhausted its retry
budget, dropped those batches, and then never discovered the Pods created
afterwards. `loki_ingester_streams_created_total` stayed at 0 while every Pod
was Running and promtail's own positions file showed it had read 46KB of
kube-apiserver logs. A `rollout restart` fixed it instantly: 0 → 12 streams.

That second one became step 1 rather than something `setup.sh` hides, because
"green Pods, no logs" reads as a broken query for as long as you let it.

### Measurements

```
373 lines scanned   {namespace="production"} |= "ERROR"
247 lines scanned   {namespace="production", app="api"} |= "ERROR"
crasher restart 1   t+11s
3 FATALs in Loki    t+61s   (CrashLoopBackOff backs off exponentially)
9 FATALs in Loki    by the time step 3 was finished
```

`kubectl expose statefulset` does not work — it fails with a NotFound about
the Service it declined to create. The NodePort is a written-out manifest.

### What the checks rest on

verify2 runs the learner's own query and requires four things of it: Loki
accepts it, it returns lines, every line is an error, and every line comes from
one Deployment. It also requires the *selector* to name the workload — a
namespace-wide selector narrowed by `|=` returns the right answer here only
because nothing else logs the word ERROR, and that is not the skill.

verify3 requires **three or more** copies of the crash message in Loki, because
`kubectl logs --previous` can already show two. Fewer than three proves nothing
that Kubernetes could not have told you.

| State | Result |
|---|---|
| no promtail | verify1 FAIL |
| `{} \|= "ERROR"` | verify2 FAIL — Loki refuses it outright |
| `{namespace="production"} \|= "ERROR"` | verify2 FAIL — selector names no workload |
| `{namespace="production", app="api"}` | verify2 FAIL — 25 of 50 lines are healthchecks |
| no crasher / placeholder / "it crashed" | verify3 FAIL |
| happy path | all three PASS |

---

## Route 53 and ACM: infeasible, and it fails in the dangerous direction

`lab-aws-route53-acm-dns` is the last remaining lab with **no** hands-on option
at all — its `handsOn` has only a `cloud` block, so today it needs an AWS
account *and* a domain. That made it worth probing even though its headline
criterion obviously needs real DNS.

Both services are present and answer properly:

```
route53 create-hosted-zone       -> zone with real NS and SOA defaults
acm request-certificate          -> PENDING_VALIDATION with a real
                                    _<hash>.egykode.test CNAME to create
```

So far so good. Then:

**LocalStack accepted a CNAME at the zone apex.** Real Route 53 refuses it:

```
InvalidChangeBatch: RRSet of type CNAME with DNS name egykode.test. is not
permitted at apex in zone egykode.test.
```

It then accepted an `A` ALIAS at the *same* name, leaving a zone holding both a
CNAME and an A record for the apex — a state Route 53 cannot be talked into.
Criterion 2 is "you can state why an ALIAS is used at the apex instead of a
CNAME", and the environment's answer to that question is "no reason, do either".

**ACM issued the certificate without the validation record ever existing.** It
moved `PENDING_VALIDATION -> ISSUED` on its own. Criterion 3 is "the
validation record is present and you can explain why it must stay"; here it
never had to be created at all, and deleting it would change nothing.

### Verdict

Of four criteria: one needs real public DNS and a real certificate chain and is
plainly out. **Two of the remaining three would demonstrate the opposite of
what AWS does.** That is worse than having no scenario — a learner would come
away believing an apex CNAME is fine and that DNS validation is decorative.

Same shape as `lab-aws-iam-least-privilege`: the service is emulated, the
*enforcement* is not, and every criterion in these labs is about the
enforcement. **Cloud-only.**

The general rule this confirms: when a lab's criteria are of the form "and this
is refused" or "and this stops working if you remove it", LocalStack community
cannot host it, however completely it implements the happy path.

## Step-criteria triage: all 51 finished, one real mapping bug

`node scripts/audit-step-criteria.mjs` listed 51 steps across 37 labs owning no
criterion. **All 51 have now been read against their lab's criteria.** One was
wrong. The other 50 are correct as they stand — do not re-triage this list.

The count is now **50 across 36 labs**, and that number should be expected to
stay there. It is a floor, not a backlog.

### The one that was wrong

**`lab-03-amazon-ecr-container-registry-s3-storage-buckets`.** Step 1 owned
`{[1, 2]}` and step 3 owned nothing. Criterion 1 is "an image pushed to ECR is
scanned automatically **and you can read the findings**" — but step 1 only
creates the repository with `scan_on_push = true`. Nothing is pushed and no
finding exists until step 3. Step 1 now owns `{2}` (the lifecycle policy, which
it does write) and step 3 owns `{1}`.

Moved rather than shared, deliberately — see the pre-tick rule below.

### The two rules the triage settled

**A step owns a criterion when it contains the work or the observation that
makes the criterion true** — not when it is a prerequisite for it. Creating the
EKS cluster, installing the Argo CD operator, writing `ansible.cfg`, `kind
create cluster`, deploying the workload a chaos experiment will kill: all are
required, none is described by any criterion. They stay unowned.

**Never add a criterion an *earlier* step already owns.** Marking the earlier
step ticks the criterion, and the later step — which reads its done-ness from
the criteria store — immediately shows "done" for work the reader has not
started. Eight labs already carry overlapping ownership from before this rule
was written; adding more would make it worse. Where a later step is the true
owner, move the criterion rather than share it.

That second rule is why several *tempting* cases were left alone:

- `lab-10` step 3 "Start it" shows `docker compose ps` reporting `healthy`,
  which is exactly criterion 2's claim — but step 2 owns it and comes first.
- `lab-argocd` step 3 "Establish the baseline" waits for `Synced` and
  `Healthy`, the second half of criterion 1 — step 2 owns it and comes first.
- `lab-sre-chaos` step 4 "Experiment three — drain a node" opens with a written
  hypothesis (criterion 4) and its finding is that recovery does *not* happen
  as expected (criterion 2). Both are owned by steps that sit either side of
  it. This is the closest call in the whole list; it was left unowned.

### The mirror-image problem, which is the real one

Five labs have a criterion **no step settles**, and in every case it is the
*last* one:

| Lab | Criteria | Orphaned |
| --- | --- | --- |
| `lab-01-aws-vpc-subnets-gateways-route-tables` | 5 | 5 |
| `lab-03-amazon-ecr-container-registry-s3-storage-buckets` | 4 | 4 |
| `lab-24-s3-cloudfront-static-site` | 5 | 5 |
| `lab-git-recovery-history` | 4 | 4 |
| `lab-terraform-fundamentals` | 5 | 5 |

The cause is structural, not a typo: each of these labs demonstrates its last
criterion in the lab-level **"Verify it worked"** section, which sits outside
every `<LabStep>`. lab-03's criterion 4 wants a deleted S3 object recovered
through versioning, and the `aws s3api list-object-versions` that does it is in
that section. No step can own it without claiming the reader did something the
step does not contain.

This matters more than the unowned steps, because a reader working purely
through the steps can never reach "all criteria met" in these five labs — and
since explanatory steps now follow lab completion (see below), those labs also
keep their explanatory steps grey until the last criterion is ticked by hand.

Fixing it means either moving the demonstration into a final step or accepting
the checklist tick. That is a content decision per lab, not a mapping pass, so
it is recorded here rather than guessed at.

## `totalCriteria`: explanatory steps now follow the finished lab

The residual design issue is closed. `LabStep` never received the lab's
criteria count, so a step settling no criterion knew only its own mark — and a
lab could show "all criteria met", render the completion card, and still leave
its explanatory steps grey with unfilled circles in the rail.

`totalCriteria` is now bound in the MDX component map beside `labId`, from
`lab.successCriteria.length`. An unowned step reads it to answer one question:
is every criterion ticked? Counted by **length**, the same way `LabComplete`
counts it, so the two cannot disagree about the same lab.

Such a step also drops its "I've run this" button once the lab is complete. The
button could no longer change what it shows — the mark records *where was I*,
and there is nowhere left to be — and a control that cannot affect its own
state is worse than no control. A line saying why the step is ticked replaces
it.

Mutation-tested, as everything here is: with the prop unthreaded at the lab
page, the new e2e test fails on exactly the reported symptom —
`data-done="false"` on step 1 of `lab-k8s-services` with all four criteria in
storage. Restored, it passes. Full spec: **29 passed, 4 skipped**.

---

## Criteria no step owns: four, not five, and three of those are correct

Read all five after they were flagged. They are not one problem.

**One was a plain mismap.** `lab-git-recovery-history` criterion 4 is "you can
explain why removing it is still not sufficient", and step 5's body is that
argument in as many words — *"Doing 2 without 1 is theatre. The key was in a
public repository, in CI logs, in forks, and quite possibly in a scraper's
database within minutes."* Step 5 → `criterion={[3, 4]}`. Nothing structural
about it.

**Three are cleanup criteria, and they belong outside the steps.**

```
lab-01                     terraform destroy removes the NAT Gateway
lab-24                     everything created is deleted, verified by listing
lab-terraform-fundamentals terraform destroy removes everything
```

Each lives in `## Clean up`, which opens with "Run this even if you did not
finish." That is the point of the section: on a billed lab the destroy has to
be reachable without working through the steps first. Turning it into a step
would bury the one instruction that stops the meter running.

The consequence — explanatory steps stay grey until the destroy box is ticked —
is not a defect either. The lab genuinely is not finished until the
infrastructure is gone, and on these three that is the most important box on the
page.

**One is a real decision, and it is `lab-03`.** Criterion 4 is "the state bucket
has versioning enabled, and you demonstrated recovering a deleted object". Step 2
creates the bucket with versioning; the recovery — `aws s3 rm` then
`list-object-versions` then removing the delete marker — is in `## Verify it
worked`, along with three other checks including an immutability test written to
fail on purpose.

Mapping it to step 2 would be wrong: marking step 2 would tick a criterion for a
recovery nobody has performed yet, which is the rule that stopped the tempting
cases in the previous pass. The options are to promote that section to a final
step, or to leave the checklist tick as the way it is settled.

**Resolved: promoted.** The consistency objection was checked and does not hold.
Of the 18 labs carrying a `## Verify it worked` section, **exactly one** — lab-03
— has that section carrying a criterion no step owns. Everywhere else the
section re-confirms criteria the steps already settle, which is why it belongs
there and why moving it here does not split a uniform set. lab-03 was already
the outlier.

The three cleanup criteria are a different case and stay where they are. lab-01,
lab-24 and lab-terraform-fundamentals each orphan a `terraform destroy` /
"everything is deleted" criterion inside `## Clean up`, a section that opens
"Run this even if you did not finish." On a billed lab the destroy has to be
reachable *without* working through the steps first; turning it into a step
buries the one instruction that stops the meter. lab-03's orphan had no such
justification — nothing about recovering a deleted object needs to be reachable
early.

lab-03 now has a step 4, "Delete an object, then get it back", owning criterion
4. Only the versioning-recovery block moved; the scan-findings read, the
immutable-tag push and the lifecycle preview stay in `## Verify it worked`,
because those confirm criteria steps 1–3 already own. No earlier step owned 4,
so there is no pre-tick problem. Every criterion in lab-03 is now settled by a
step.

## Batch 7 probe: the Jenkins Docker pipeline gate

Not yet built. The scan gate — the whole of criterion 2 — was measured first,
because it is the part that can silently stop working, and the measurements
changed the design twice.

### `--ignore-unfixed` empties the gate on an EOL base image

This is the finding that matters, and it contradicts the lab's own Jenkinsfile.
Distinct CVEs at HIGH/CRITICAL, `--ignore-unfixed`, `--scanners vuln`:

| Base image | Distinct CVEs |
| --- | --- |
| `debian:10` (the lab's example) | **1** |
| `debian:11-slim`, `ubuntu:18.04`, `ubuntu:20.04` | **0** |
| `alpine:3.16` | 1 |
| `python:3.9-slim` | 12 |
| `node:16-slim` | 20 |
| **`debian:12.5-slim`** | **15** |

An end-of-life distro ships no fixes, so *by construction* almost everything it
carries is `status: unfixed` and `--ignore-unfixed` discards it. `ubuntu:18.04`
scans clean for exactly the wrong reason. The lab's `FROM debian:10` survives on
a single CVE — CVE-2024-33599 in glibc, which Trivy reports as two rows
(`libc-bin`, `libc6`) and which is easy to misread as two findings. If that one
CVE is reclassified, the gate empties and the scenario teaches that a vulnerable
image passes.

**Use a frozen point release instead.** `debian:12.5-slim` is a snapshot of a
*supported* distro: Debian 12 keeps shipping fixes, the snapshot never rebuilds,
so its packages accumulate `status: fixed` findings. Fifteen today, and the
number grows over time rather than shrinking. `debian:12-slim` — the same distro
and variant, currently rebuilt — measures **0**, so the fix passes.

That pair is same-family, needs no archive.debian.org workaround, and teaches a
better lesson than end-of-life does: a base image is a frozen snapshot, and
rebuilding is what picks up the fixes.

### Dead ends, so they are not re-tried

- **A language-runtime pair.** `node:16-slim` (20) → `node:22-slim` is **8**, and
  `python:3.9-slim` (12) → `python:3.12-slim` is **1**. The fix side fails the
  gate. Runtime images always carry OS packages behind the distro;
  `python:3.12-slim`'s single finding is `util-linux`, not something `pip
  install --upgrade` clears.
- **Dropping `--ignore-unfixed`.** Gives `debian:10` a 28-CVE gate, but
  `debian:12-slim` then measures **13**, so the fixed side fails too. The flag
  has to stay.

### Costs, measured cold on an Ubuntu host with an empty cache

| Item | Cost |
| --- | --- |
| `aquasec/trivy:latest` pull | 60s |
| Trivy DB download | **101s, 108 MiB** |

The DB is **108 MiB**, not the 40–60 MB estimated earlier. Warm-cache timings
are meaningless for Killercoda; setup must prefetch the DB and the step must
wait on a bounded loop, as `jenkins-fundamentals` does for Jenkins itself.

### What setup.sh must assert

Silent emptying is the failure mode this project exists to prevent, so the gate
depth must not be assumed. `setup.sh` should scan the vulnerable base once and
**fail loudly with the count** if it finds nothing at HIGH/CRITICAL, rather than
letting a passing build be mistaken for a passing lab. The verifier for that step
checks behaviour — the build failed at the scan stage and no new tag reached the
registry — and, if the build succeeded, says plainly that the base image no
longer trips the gate, so the cause is diagnosable rather than mysterious.

### Test rig

Measured on a privileged `ubuntu:24.04` container running its own `dockerd`
(`--storage-driver=vfs`), not on the Windows host. Killercoda's backend is
Ubuntu with GNU coreutils and `#!/bin/bash`; the Alpine `docker:dind` image is
the wrong shape for the same reason it had no `python3` earlier in this file.

---

## `--ignore-unfixed` and an EOL base image cancel each other out

Reproduced independently after the measurement was reported, because it
contradicts what two published labs told readers to do.

```
                    distinct HIGH/CRITICAL, --ignore-unfixed
debian:10                      1     exit 1
debian:12.5-slim              15     exit 1
debian:12-slim                 0     exit 0
ubuntu:18.04                   0
```

An end-of-life distribution ships no fixes, so by construction almost
everything it carries is **unfixed** — and `--ignore-unfixed` discards exactly
that. `ubuntu:18.04` scans clean for the worst possible reason. `debian:10`,
which `lab-jenkins-docker-pipeline` used as its "deliberately old base image"
and annotated *"plenty of unfixed CVEs"*, resolves to **one** distinct CVE
(CVE-2024-33599, reported twice because it affects `libc-bin` and `libc6`).

A demonstration resting on one CVE stops working the day that CVE is patched
in, and it fails silently: the gate reports success on a vulnerable image,
which is the exact failure this project exists to prevent.

**The replacement is a frozen point release of a supported distribution.**
`debian:12.5-slim` is a snapshot Debian has since shipped fixes for, so those
findings carry `status: fixed` and survive the flag. The gap widens over time
rather than eroding, because the snapshot never rebuilds and the distribution
keeps patching. `debian:12-slim` — the same tag, rebuilt — is the fix.

Both labs are corrected. `lab-github-actions-ecr-eks` needed no change: it uses
`ignore-unfixed: true` in a production pipeline, which is correct usage, not as
a demonstration. The `--ignore-unfixed` policy discussion in
`learn/security/supply-chain-security` is also unaffected — blocking on what
nobody can act on really does teach people to bypass the gate. The flag is
right; pairing it with an EOL base to *prove* a gate is what does not work.

Dead ends, so nobody retries them: a node or python pair fails because the
fixed side still scans dirty (`node:22-slim` 8, `python:3.12-slim` 1, and that
one is `util-linux`, not something pip clears). Dropping `--ignore-unfixed`
fails because `debian:12-slim` then measures 13.

Cold cost on an Ubuntu host with an empty cache: `trivy image` 60s, database
101s and **108 MiB** — not the 40-60 MB estimated earlier. That drives the
setup's wait loop.

## `jenkins-docker-pipeline`: built, tested, published

| Scenario | Lab | Backend |
| --- | --- | --- |
| `jenkins-docker-pipeline` | lab-jenkins-docker-pipeline | ubuntu |

Three steps, covering criteria 1, 2 and 3; criterion 4 (`latest` is not what
gets deployed) is settled inside steps 1 and 2 rather than on its own. Verified
end to end from a wiped machine.

### Four bugs the test rig found, none of them visible on inspection

**Jenkins refuses a local-directory checkout.** Current git-plugin versions
abort with *"references a local directory, which may be insecure"* — hardening
against a job on a shared controller reading arbitrary host paths. A job whose
SCM url is `/srv/app` fails before the pipeline starts. Fixed with
`-Dhudson.plugins.git.GitSCM.ALLOW_LOCAL_CHECKOUT=true` in `JAVA_OPTS`, which is
defensible only because the VM is single-user and disposable.

**Waiting on `lastBuild` reads the previous build.** A build POSTed to Jenkins
sits in the queue for a moment, during which `lastBuild` still points at the
prior run — whose result is already final. A loop that breaks on any terminal
result therefore returns *instantly*, reporting the wrong build's outcome.

Worse, it compounds: **Jenkins coalesces identical queued triggers.** Step 3
triggered the broken build, read the stale `SUCCESS`, committed the fix and
triggered again — and Jenkins merged the two into one build that checked out the
*fixed* commit. The vulnerable image was never built at all, and every visible
signal said the step had passed. Caught only by counting builds: three existed
where four were expected.

The fix is to claim `nextBuildNumber` before triggering and poll that number.
`/job/<name>/<N>/api/json` 404s while queued, which the loop treats as
still-running, so it cannot terminate early or on the wrong run.

**An unencoded `tree` query returns 200 and an empty body.**
`?tree=builds[number,result]` sent raw looks exactly like a job with no builds,
so `verify3` would have reported "no build was stopped by the scan" whatever the
learner did. The brackets must be `%5B` / `%5D`.

**`make` is absent from `jenkins/jenkins:lts-jdk17`.** The cheap-check stage
exits 127, which reads as a broken pipeline rather than a missing package.

### One inaccuracy in written material, found by reading the output

A skipped stage still appears in the pipeline log — Jenkins enters the block and
declines to run its steps. The step text claimed "no `Push`" while the stage list
plainly showed `Push`. It now points at the two things that *are* evidence: the
`Stage "Push" skipped due to earlier failure(s)` line and a `Login Succeeded`
count of zero.

### Measured

| Item | Cost |
| --- | --- |
| `setup.sh`, images already pulled | 91s |
| `setup.sh`, re-run with everything warm | 12s |
| `jenkins/jenkins:lts-jdk17` pull (nested vfs) | 281s |
| Gate on `debian:12.5-slim` | `Total: 20 (HIGH: 18, CRITICAL: 2)` |

`setup.sh` asserts the gate has something to find and says so in
`/root/ci/setup.log` (20 finding rows for 15 distinct CVEs), so a Trivy database
that failed to download surfaces there rather than as a green build on a
vulnerable image.

### Mutation tests, three states each

| Verifier | Passes after | Rejects "not done" | Rejects wrong answer |
| --- | --- | --- | --- |
| `verify1` | commit-tagged image in registry | registry empty | image also pushed as `latest` |
| `verify2` | authenticated push, no secret in log | no successful build | password hardcoded in the Jenkinsfile |
| `verify3` | build gated, rebuild passed | no scan-stopped build in history | build failed at unit tests, not the gate |

`verify2` requires `Login Succeeded` and a push digest *before* asserting the
password is absent. Without that presence check, a build that never reached the
push satisfies "no credential in the log" by default — the same failure shape as
the absence checks recorded earlier in this file.

`verify1` retries the registry tag query: it was observed answering
`NAME_UNKNOWN` briefly after a push that had already printed its digest, and a
verifier that flakes teaches people to click it twice and stop reading it.

### Test rig

A privileged `ubuntu:24.04` container running its own `dockerd`. `overlay2` is
unavailable inside it (`driver not supported`), so `vfs` — which is why the
Jenkins pull measured 281s against the 1m48s recorded for `jenkins-fundamentals`
on a real host. Alpine `docker:dind` was rejected: these verifiers are
`#!/bin/bash` with GNU coreutils, matching Killercoda's ubuntu backend.
