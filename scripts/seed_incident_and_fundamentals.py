#!/usr/bin/env python3
"""
Seed the incident tier and the two missing fundamentals progressions.

Three things, in the order they were prioritised:

  1. Incident labs — something is already broken; the learner is given the
     symptom and a method, never the cause. This is the tier closest to the
     job, and the one a tutorial site cannot easily copy.
  2. Terraform fundamentals — the catalogue previously opened with a VPC
     module, which is not a first exposure to Terraform.
  3. Kubernetes fundamentals — same problem: Ingress and HPA before Pods.

An incident lab deliberately has no challenge variant. It *is* the hardest
tier, and the root cause sits behind a reveal at the end so the learner can
check their reasoning without being handed the answer.

Run: python scripts/seed_incident_and_fundamentals.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

COMMON_TF_CLEANUP = [
    "terraform destroy -auto-approve",
    "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId'",
]

SPECS: list[dict] = [
    # ── Terraform fundamentals ──────────────────────────────────────────────
    {
        "id": "lab-terraform-fundamentals",
        "order": 5,
        "tier": "guided",
        "title": "Terraform Fundamentals",
        "domain": "terraform",
        "level": "beginner",
        "phase": "iac",
        "minutes": 45,
        "cloud_cost": True,
        "destructive": False,
        "cost": "Free tier — one `t3.micro` and an S3 bucket. Nothing here runs an hourly-billed resource beyond the instance itself.",
        "description": "Provider, resource, variable, output, state — the five pieces, on infrastructure small enough to read in one screen.",
        "skills": [
            "Declare a provider and pin its version",
            "Read a plan and name what each symbol means",
            "Move a hardcoded value into a variable and out through an output",
            "Explain what the state file is and why it is not disposable",
        ],
        "tools": ["Terraform >= 1.6", "AWS CLI v2, configured"],
        "criteria": [
            "`terraform apply` creates an EC2 instance and an S3 bucket from a single configuration.",
            "Running `terraform apply` a second time reports `No changes` — you can explain why.",
            "The instance type comes from a variable, and the public IP leaves through an output.",
            "You can point at the line in `terraform.tfstate` that maps your resource to its real AWS id.",
            "`terraform destroy` removes everything, verified with the AWS CLI.",
        ],
        "cleanup": COMMON_TF_CLEANUP + [
            "aws s3 ls | grep tf-fundamentals   # must print nothing",
        ],
        "scenario": (
            "Before a VPC module makes any sense, the five pieces underneath it have "
            "to be concrete: what a provider is, what a resource declaration produces, "
            "where a value comes in, where a value goes out, and what Terraform "
            "remembers between runs.\n\n"
            "This lab builds the smallest infrastructure that exercises all five."
        ),
        "body": """
## 1. The provider

```hcl
terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
  }
}

provider "aws" {
  region = var.region
}
```

Terraform knows nothing about AWS. The provider is a plugin that translates
`resource` blocks into API calls, and `~> 5.40` means "any 5.x from 5.40, never
6.0" — patch and minor updates are allowed, the breaking major is not.

```bash
terraform init
```

`init` downloads the plugin and writes `.terraform.lock.hcl`, which records the
exact version and its checksum. **Commit that file** — it is what makes your
build and the CI runner's build identical.

## 2. Variables in, outputs out

```hcl
variable "region" {
  description = "Where this runs"
  type        = string
  default     = "us-east-1"
}

variable "instance_type" {
  description = "Size of the demo instance"
  type        = string
  default     = "t3.micro"
}
```

A variable with no `default` is required, and Terraform refuses to run without
it. That is the correct choice for anything environment-specific.

```hcl
output "instance_ip" {
  description = "Public address of the demo instance"
  value       = aws_instance.demo.public_ip
}
```

Outputs are the module's public surface. Anything a caller needs must leave
through one — there is no reaching inside.

## 3. Resources

```hcl
data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "demo" {
  ami           = data.aws_ami.al2023.id
  instance_type = var.instance_type

  tags = {
    Name    = "tf-fundamentals"
    Purpose = "learning"
  }
}

resource "aws_s3_bucket" "demo" {
  bucket = "tf-fundamentals-${random_id.suffix.hex}"
}

resource "random_id" "suffix" {
  byte_length = 4
}
```

A `data` block *reads* something that already exists; a `resource` block *owns*
something Terraform will create and destroy. Confusing the two is how people
accidentally destroy shared infrastructure.

Note `aws_s3_bucket.demo` depends on `random_id.suffix` without anyone saying
so. Terraform builds a dependency graph from the references themselves and
orders the work automatically.

## 4. Read the plan before you apply it

```bash
terraform fmt -recursive
terraform validate
terraform plan
```

Every resource gets a symbol, and the symbol is the whole message:

| Symbol | Meaning | How worried to be |
| --- | --- | --- |
| `+` | create | Normal for new infrastructure |
| `~` | update in place | Usually safe |
| `-` | destroy | Read carefully |
| `-/+` | **destroy then recreate** | Stop and read every line |

```bash
terraform apply
```

Then run it again:

```bash
terraform apply
# No changes. Your infrastructure matches the configuration.
```

That second run is the point of the whole tool. The configuration describes an
end state, so applying it to a system already in that state does nothing. This
is **idempotency**, and it is what makes it safe to run continuously.

## 5. The state file

```bash
terraform state list
terraform state show aws_instance.demo | head -20
grep -o '"id": "i-[a-z0-9]*"' terraform.tfstate | head -1
```

State is Terraform's memory: a map from your resource addresses to real AWS
ids. Without it, Terraform cannot tell a resource it created from one it has
never seen.

Two consequences to internalise now:

- **It frequently contains secrets in plain text** — an RDS password, a
  generated key — because the API returned them at creation. It never goes in
  Git.
- **Losing it orphans everything it tracked.** The resources keep running and
  billing; Terraform simply no longer knows about them. That is why the next
  lab moves it to a remote backend with locking.
""",
        "failures": [
            ("`terraform apply` says the bucket name is already taken",
             "S3 bucket names are globally unique across every AWS account. That is what `random_id` is for — check it is actually being interpolated into the name."),
            ("The second apply shows changes when nothing changed",
             "Something outside Terraform modified the resource — configuration drift. `terraform plan` shows exactly which attribute differs."),
            ("`terraform destroy` leaves the bucket behind",
             "S3 refuses to delete a bucket with objects in it. Empty it first: `aws s3 rm s3://<bucket> --recursive`."),
            ("`init` fails with a provider checksum mismatch",
             "The lock file was written on a different platform. `terraform providers lock -platform=linux_amd64 -platform=windows_amd64` records both."),
        ],
    },
    {
        "id": "lab-terraform-modules",
        "order": 6,
        "tier": "guided",
        "title": "Terraform Modules",
        "domain": "terraform",
        "level": "intermediate",
        "phase": "iac",
        "minutes": 50,
        "cloud_cost": True,
        "destructive": False,
        "cost": "Free tier — a VPC, subnets and one `t3.micro`. **No NAT Gateway** in this lab, deliberately: it is the one resource here that would bill hourly.",
        "description": "Turn a working configuration into a network module and a compute module, called twice with different inputs.",
        "skills": [
            "Extract a module with a deliberate input/output contract",
            "Call one module from another and let the graph order the work",
            "Know when a module is not worth writing",
        ],
        "tools": ["Terraform >= 1.6", "AWS CLI v2, configured"],
        "criteria": [
            "A `modules/network` module creates a VPC and subnets from inputs, exposing subnet ids as outputs.",
            "A `modules/compute` module places an instance into a subnet it did not create.",
            "The root module wires them together with no hardcoded ids anywhere.",
            "Calling the network module twice with different CIDRs produces two independent networks.",
            "You can explain why the compute module never references `aws_vpc` directly.",
        ],
        "cleanup": COMMON_TF_CLEANUP,
        "scenario": (
            "The configuration from the previous lab works, and now a second "
            "environment needs the same shape with different addresses. Copying the "
            "directory is the obvious move and the wrong one — two copies drift, and "
            "the drift is discovered during an incident.\n\n"
            "A module is how the same definition serves both."
        ),
        "body": """
## The contract

A module is a directory of `.tf` files with exactly three surfaces:

```text
modules/network/
  main.tf         the resources it owns
  variables.tf    the inputs  — its public API
  outputs.tf      the outputs — what callers may depend on
```

Anything a caller needs must leave through an `output`. There is no reaching
inside for a resource, and that restriction is precisely what makes a module
safe to change later.

## 1. The network module

```hcl
# modules/network/variables.tf
variable "name"       { type = string }
variable "cidr_block" { type = string }
variable "azs"        { type = list(string) }
```

```hcl
# modules/network/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  tags                 = { Name = var.name }
}

resource "aws_subnet" "public" {
  for_each = { for i, az in var.azs : az => i }

  vpc_id            = aws_vpc.this.id
  availability_zone = each.key
  cidr_block        = cidrsubnet(var.cidr_block, 8, each.value)

  tags = { Name = "${var.name}-public-${each.key}" }
}
```

`cidrsubnet(var.cidr_block, 8, 0)` carves `10.0.0.0/24` out of `10.0.0.0/16`.
Computing subnets rather than listing them means the module works for any CIDR
it is given.

```hcl
# modules/network/outputs.tf
output "vpc_id"     { value = aws_vpc.this.id }
output "subnet_ids" { value = [for s in aws_subnet.public : s.id] }
```

## 2. The compute module

```hcl
# modules/compute/variables.tf
variable "name"      { type = string }
variable "subnet_id" { type = string }
variable "instance_type" {
  type    = string
  default = "t3.micro"
}
```

Note what is **not** here: no `vpc_id`, no reference to `aws_vpc`. The compute
module is handed a subnet id and does not care where it came from. That is the
whole point — it could be given a subnet from a different module, or one that
already existed.

## 3. Wiring them together

```hcl
# main.tf
module "network" {
  source     = "./modules/network"
  name       = "demo"
  cidr_block = "10.20.0.0/16"
  azs        = ["us-east-1a", "us-east-1b"]
}

module "app" {
  source    = "./modules/compute"
  name      = "demo-app"
  subnet_id = module.network.subnet_ids[0]
}
```

Because `module.app` references `module.network.subnet_ids`, Terraform knows the
network must exist first. Nobody wrote an ordering; the reference *is* the
ordering.

```bash
terraform init      # required again — a new module must be installed
terraform plan
terraform apply
```

`terraform init` after adding a module trips everyone up once. A new or moved
module source is not picked up until you re-init.

## 4. Calling it twice

```hcl
module "network_staging" {
  source     = "./modules/network"
  name       = "staging"
  cidr_block = "10.30.0.0/16"
  azs        = ["us-east-1a"]
}
```

One definition, two networks that cannot drift apart. That is the return on the
directory structure.

## When not to write a module

A module costs a directory, two extra files and a layer of indirection. It earns
that when the same shape is built more than once, or when it hides genuine
complexity behind a small interface.

Wrapping a single `aws_s3_bucket` in a module buys nothing and forces the next
reader to open two files to understand one resource. The useful test:
**would a second caller ever exist?** If not, write the resource directly and
extract it the day the second caller appears.
""",
        "failures": [
            ("`Module not installed` after adding a module block",
             "Run `terraform init` again. A new module source is only fetched at init."),
            ("`Error: Unsupported attribute` on module.network.something",
             "That value has no `output`. A module exposes nothing by default — add the output explicitly."),
            ("Both networks got the same CIDR",
             "The second module call reused the default. Pass `cidr_block` explicitly to each."),
            ("`cidrsubnet` errors with 'prefix extension too large'",
             "You asked for more subnet bits than the parent CIDR has room for. A /16 with `8` gives /24s; a /24 with `8` does not fit."),
        ],
    },
    {
        "id": "lab-terraform-remote-state",
        "order": 7,
        "tier": "guided",
        "title": "Terraform Remote State & Locking",
        "domain": "terraform",
        "level": "intermediate",
        "phase": "iac",
        "minutes": 45,
        "cloud_cost": True,
        "destructive": False,
        "cost": "Free tier — an S3 bucket and a PAY_PER_REQUEST DynamoDB table. A few applies a week costs effectively nothing.",
        "description": "Move state off your laptop into an encrypted, versioned, locked backend — and prove the lock works by breaking it deliberately.",
        "skills": [
            "Migrate local state to an S3 backend without recreating resources",
            "Prove a concurrent apply is blocked rather than corrupting state",
            "Recover from a stale lock safely",
        ],
        "tools": ["Terraform >= 1.6", "AWS CLI v2, configured"],
        "criteria": [
            "State lives in S3, and `terraform.tfstate` is no longer written locally.",
            "The bucket has versioning and encryption enabled, and blocks public access.",
            "A second `apply` started while the first is running fails with a lock error rather than proceeding.",
            "You migrated existing state without any resource being destroyed and recreated.",
        ],
        "cleanup": [
            "terraform destroy -auto-approve",
            "# Empty the state bucket before deleting it (versioning keeps old objects):",
            "aws s3 rm s3://<state-bucket> --recursive   # current objects",
            "# Versioning keeps old objects; remove every version before deleting the bucket.",
            "# In the console: Empty bucket, which handles versions and delete markers.",
            "aws s3 rb s3://<state-bucket> --force",
            "aws dynamodb delete-table --table-name <lock-table>",
        ],
        "scenario": (
            "State is on your laptop. A colleague runs `terraform apply` from theirs, "
            "sees none of your resources, and creates a second copy of everything — or "
            "worse, destroys yours.\n\n"
            "This is the lab that makes Terraform usable by more than one person."
        ),
        "body": """
## 1. The backend has a chicken-and-egg problem

The bucket that holds state cannot itself be created by the configuration that
stores state in it. So it is created first, on its own:

```bash
BUCKET="tfstate-$(date +%s)"

aws s3api create-bucket --bucket "$BUCKET" --region us-east-1
aws s3api put-bucket-versioning --bucket "$BUCKET" \\
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$BUCKET" \\
  --server-side-encryption-configuration \\
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block --bucket "$BUCKET" \\
  --public-access-block-configuration \\
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

aws dynamodb create-table --table-name tf-locks \\
  --attribute-definitions AttributeName=LockID,AttributeType=S \\
  --key-schema AttributeName=LockID,KeyType=HASH \\
  --billing-mode PAY_PER_REQUEST
```

Each of those four bucket settings is there for a reason:

- **Versioning** — a corrupted state file with no previous version is one of the
  few genuinely unrecoverable situations in Terraform.
- **Encryption** — state routinely holds secrets in plain text.
- **Public access block** — it should not need saying, and it does.
- **DynamoDB** — the lock. `LockID` as the hash key is what Terraform expects.

## 2. Declare the backend and migrate

```hcl
terraform {
  backend "s3" {
    bucket         = "tfstate-REPLACE-ME"
    key            = "demo/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "tf-locks"
    encrypt        = true
  }
}
```

```bash
terraform init -migrate-state
```

Terraform notices the backend changed and offers to copy existing state up.
**Say yes.** This is a metadata move — no AWS API calls that alter real
infrastructure — so nothing is destroyed or recreated.

Confirm:

```bash
aws s3 ls "s3://$BUCKET/demo/"
ls terraform.tfstate 2>/dev/null || echo "no local state — correct"
terraform plan          # must report: No changes
```

That `No changes` is the proof the migration was clean. If it wants to create
everything, the state did not come across and you should stop.

## 3. Prove the lock works

In one terminal:

```bash
terraform apply           # leave it sitting at the confirmation prompt
```

In a second terminal, in the same directory:

```bash
terraform plan
```

```text
Error: Error acquiring the state lock
Lock Info:
  ID:        7a1f...
  Operation: OperationTypeApply
  Who:       waleed@laptop
  Created:   2026-08-10 14:02:11
```

That error is the feature. Without it, two applies write the same file and the
result is a state that matches neither reality nor either engineer's intent.

## 4. When a lock goes stale

A crashed apply — closed laptop, dropped connection — leaves the lock held.

```bash
terraform force-unlock 7a1f...
```

Read the lock info **before** you do this. `Who` and `Created` tell you whether
a colleague is mid-apply right now, in which case force-unlocking is how you
create the corruption the lock existed to prevent.
""",
        "failures": [
            ("`terraform init` wants to create every resource again",
             "State was not migrated. Re-run `terraform init -migrate-state`; if the local file is gone, `terraform import` each resource."),
            ("`Error acquiring the state lock` when nobody else is running",
             "A previous run crashed. Read the lock info, confirm nobody is applying, then `terraform force-unlock <id>`."),
            ("`AccessDenied` writing state",
             "The principal needs `s3:PutObject` on the key and `dynamodb:PutItem`/`DeleteItem` on the lock table."),
            ("The bucket will not delete",
             "Versioning keeps every old object. Delete all versions, not just current objects — see the cleanup steps."),
        ],
    },
    # ── Kubernetes fundamentals ─────────────────────────────────────────────
    {
        "id": "lab-k8s-workloads",
        "order": 19,
        "tier": "guided",
        "title": "Kubernetes Workloads: Pod, ReplicaSet, Deployment",
        "domain": "kubernetes",
        "level": "beginner",
        "phase": "kubernetes",
        "minutes": 45,
        "cloud_cost": False,
        "destructive": False,
        "cost": "Free — runs on kind, minikube or Docker Desktop. No cloud account needed.",
        "description": "Watch a Deployment create a ReplicaSet create Pods, then delete each in turn and see which come back.",
        "skills": [
            "Explain the Deployment → ReplicaSet → Pod ownership chain",
            "Perform a rolling update and roll it back",
            "Match a selector to labels, and recognise when they do not",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "A Deployment with 3 replicas is running, and you can name the ReplicaSet that owns the Pods.",
            "Deleting a Pod causes a replacement to appear; deleting the Deployment does not.",
            "A rolling update keeps the service available, and `rollout undo` returns to the previous image.",
            "You can produce a Deployment that creates zero Pods, and explain why.",
        ],
        "scenario": (
            "Ingress, HPA and NetworkPolicy all assume you know what a Pod is and what "
            "owns it. This lab builds that, by creating each object and then deleting "
            "it to see what the cluster does about it.\n\n"
            "Deleting things on purpose is the fastest way to learn what is watching."
        ),
        "body": """
## 1. A cluster on your laptop

```bash
kind create cluster --name fundamentals
kubectl cluster-info
kubectl get nodes
```

## 2. A bare Pod, and why you will not use one

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: solo
spec:
  containers:
    - name: web
      image: nginx:1.27-alpine
```

```bash
kubectl apply -f pod.yaml
kubectl get pod solo
kubectl delete pod solo
kubectl get pods          # gone, and nothing replaced it
```

That is the lesson: a bare Pod is not watched by anything. When it dies, it
stays dead.

## 3. A Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web           # which Pods this Deployment owns
  template:
    metadata:
      labels:
        app: web         # must match the selector above
    spec:
      containers:
        - name: web
          image: nginx:1.27-alpine
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f deployment.yaml
kubectl get deploy,rs,pods
```

Read the names in that output — the chain is visible in them:

```text
deployment.apps/web              3/3
replicaset.apps/web-6d4c8f9b7    3         <- created by the Deployment
pod/web-6d4c8f9b7-x2k9p                    <- created by the ReplicaSet
pod/web-6d4c8f9b7-lm4tq
pod/web-6d4c8f9b7-9wqzr
```

The Deployment manages ReplicaSets. The ReplicaSet keeps a count of Pods. The
Pod runs the container. Each layer watches the one below.

```bash
kubectl delete pod -l app=web --field-selector status.phase=Running | head -1
kubectl get pods -w         # a replacement appears within seconds; Ctrl-C
```

## 4. A rolling update

```bash
kubectl set image deployment/web web=nginx:1.28-alpine
kubectl rollout status deployment/web
kubectl get rs              # two ReplicaSets now — old scaled to 0
```

The old ReplicaSet is kept at zero replicas. That is what makes the next command
instant:

```bash
kubectl rollout undo deployment/web
kubectl rollout history deployment/web
```

Rolling back does not rebuild anything. It scales the previous ReplicaSet back
up and the new one down — seconds, not a redeploy.

## 5. Break it deliberately

Change the selector so it no longer matches the template labels:

```yaml
  selector:
    matchLabels:
      app: web-typo        # template still says app: web
```

```bash
kubectl apply -f broken.yaml
```

On an existing Deployment the API server rejects it — the selector is
immutable. Create it under a new name and you get a Deployment reporting
`0/3` with no error anywhere, because it owns nothing.

**A Deployment that creates no Pods is almost always a label mismatch.** They
are matched as plain strings, and a typo produces silence rather than a
complaint.
""",
        "failures": [
            ("Deployment shows 0/3 and no Pods exist",
             "`selector.matchLabels` does not match `template.metadata.labels`. Compare them character by character."),
            ("`selector is immutable` on apply",
             "A Deployment's selector cannot change after creation. Delete and recreate it, or use a new name."),
            ("Pods are Pending forever",
             "`kubectl describe pod` and read Events — usually insufficient CPU/memory on the node, or a nodeSelector nothing satisfies."),
            ("`ImagePullBackOff`",
             "The tag does not exist or the registry needs credentials. `kubectl describe pod` names the exact image it tried."),
        ],
    },
    {
        "id": "lab-k8s-services",
        "order": 20,
        "tier": "guided",
        "title": "Kubernetes Services & Service Discovery",
        "domain": "kubernetes",
        "level": "beginner",
        "phase": "kubernetes",
        "minutes": 45,
        "cloud_cost": False,
        "destructive": False,
        "cost": "Free — runs on kind, minikube or Docker Desktop.",
        "description": "Give disposable Pods a stable address, then break the selector and watch the endpoints empty.",
        "skills": [
            "Explain why a Pod IP is never a valid target",
            "Read `kubectl get endpoints` as the first debugging step",
            "Reach a Service by DNS name from inside the cluster",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "A ClusterIP Service routes traffic to three Pods, verified by repeated requests hitting different ones.",
            "`kubectl get endpoints` lists three addresses.",
            "Another Pod reaches the Service by name, not by IP.",
            "You can make the endpoint list empty in two different ways, and explain each.",
        ],
        "scenario": (
            "Pods are replaced constantly and get a new IP every time. Nothing can "
            "hold a Pod IP.\n\n"
            "A Service is the answer, and `kubectl get endpoints` is the single most "
            "useful command when one does not work."
        ),
        "body": """
## 1. Why not just use the Pod IP?

```bash
kubectl get pods -o wide         # note an IP
kubectl delete pod <name>
kubectl get pods -o wide         # the replacement has a different IP
```

Every rollout, eviction and node failure changes them. A Service is a stable
name and virtual IP in front of whichever Pods currently match its selector.

## 2. A ClusterIP Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
spec:
  type: ClusterIP
  selector:
    app: web           # any Pod with this label receives traffic
  ports:
    - port: 80         # the port the Service exposes
      targetPort: 80   # the port the container listens on
```

```bash
kubectl apply -f service.yaml
kubectl get svc web
kubectl get endpoints web
```

```text
NAME   ENDPOINTS                                   AGE
web    10.244.0.6:80,10.244.0.7:80,10.244.0.8:80   5s
```

**Endpoints are the whole story.** The Service has no intelligence of its own —
a controller watches for Pods matching the selector that are *ready*, and writes
their addresses here. Everything else follows from this list.

## 3. Reach it by name

```bash
kubectl run client --rm -it --image=curlimages/curl --restart=Never -- sh

# inside the Pod:
curl -s http://web           # same namespace
curl -s http://web.default.svc.cluster.local
cat /etc/resolv.conf         # points at CoreDNS
```

The short name works because `/etc/resolv.conf` has a search path. The fully
qualified form is `<service>.<namespace>.svc.cluster.local`, and it is what you
use across namespaces.

## 4. Empty the endpoint list, twice

**Way one — a selector that matches nothing:**

```bash
kubectl patch svc web -p '{"spec":{"selector":{"app":"wrong"}}}'
kubectl get endpoints web     # ENDPOINTS is <none>
kubectl patch svc web -p '{"spec":{"selector":{"app":"web"}}}'
```

**Way two — Pods that are not ready:**

```yaml
        readinessProbe:
          httpGet:
            path: /nonexistent
            port: 80
          periodSeconds: 5
```

```bash
kubectl get pods              # Running, but 0/1 READY
kubectl get endpoints web     # <none> — running is not the same as ready
```

That second case is the one that confuses people: the Pods are up, the logs look
fine, and the Service returns nothing. **Readiness controls endpoint
membership**, which is exactly what makes a rolling update safe.

## 5. The three types

| Type | Gives you | Use it for |
| --- | --- | --- |
| `ClusterIP` | An internal-only address | Everything inside the cluster — the default |
| `NodePort` | A high port on every node | Debugging, or a load balancer in front |
| `LoadBalancer` | A cloud load balancer | One public entry point per Service |

`LoadBalancer` provisions — and bills for — a real load balancer per Service.
That is why production puts one Ingress in front of many ClusterIP Services
rather than a LoadBalancer each.
""",
        "failures": [
            ("`ENDPOINTS` is `<none>`",
             "Either the selector matches no Pod, or the matching Pods are not ready. `kubectl get pods --show-labels` and check the READY column."),
            ("Connection refused through the Service",
             "`targetPort` does not match the container's actual port. The Service port and container port are different numbers."),
            ("The name does not resolve",
             "Check CoreDNS is running: `kubectl get pods -n kube-system -l k8s-app=kube-dns`. Then confirm the namespace in the FQDN."),
            ("Traffic only ever reaches one Pod",
             "Expected with keep-alive connections — kube-proxy balances connections, not requests. Use `curl` in a loop without keep-alive to see the spread."),
        ],
    },
    {
        "id": "lab-k8s-storage",
        "order": 21,
        "tier": "guided",
        "title": "Kubernetes Storage: PVC, PV and StorageClass",
        "domain": "kubernetes",
        "level": "intermediate",
        "phase": "kubernetes",
        "minutes": 50,
        "cloud_cost": False,
        "destructive": True,
        "cost": "Free on kind or minikube. On a cloud cluster each PVC provisions a real disk billed per GB-month — see cleanup.",
        "description": "Prove a container's filesystem is disposable, then attach storage that survives, and meet the access mode that blocks a rollout.",
        "skills": [
            "Explain the StorageClass → PV → PVC chain and who creates what",
            "Recognise why ReadWriteOnce blocks a multi-replica Deployment",
            "Know what `reclaimPolicy` does to your data",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "Data written into a container is gone after the Pod is deleted — demonstrated, not assumed.",
            "The same data survives a Pod deletion once a PVC is mounted.",
            "You can explain why a 3-replica Deployment with one ReadWriteOnce PVC leaves Pods Pending.",
            "You can state what happens to the underlying disk when the PVC is deleted, for your StorageClass.",
        ],
        "cleanup": [
            "kubectl delete deployment,pod --all",
            "kubectl delete pvc --all          # PVCs are NOT removed with the workload",
            "kubectl get pv                    # confirm nothing is Released and lingering",
            "# On a cloud cluster, unattached volumes keep billing:",
            "aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].[VolumeId,Size]' --output table",
        ],
        "scenario": (
            "A container's filesystem dies with the container. Most workloads do not "
            "care; a database very much does.\n\n"
            "This lab shows the difference concretely, then walks into the access mode "
            "that stops a Deployment scaling — which is one of the more confusing "
            "first encounters with Kubernetes storage."
        ),
        "body": """
> **This lab deletes Pods and volumes on purpose.** Run it on a throwaway
> cluster, never against anything holding data you need.

## 1. Prove the filesystem is disposable

```bash
kubectl run scratch --image=busybox --restart=Never -- sh -c "sleep 3600"
kubectl exec scratch -- sh -c "echo 'important' > /data.txt; cat /data.txt"
kubectl delete pod scratch
kubectl run scratch --image=busybox --restart=Never -- sh -c "sleep 3600"
kubectl exec scratch -- cat /data.txt      # No such file
```

The writable layer belongs to the container, and it goes when the container
does.

## 2. The three objects

| Object | Says | Created by |
| --- | --- | --- |
| `StorageClass` | *how* to provision — which disk type | The platform team, once |
| `PersistentVolume` | a specific piece of storage that exists | Usually automatically |
| `PersistentVolumeClaim` | *"I need 1Gi"* | The application author |

```bash
kubectl get storageclass
```

A Pod references a PVC; the PVC binds to a PV; the PV is created on demand from
the StorageClass. Application authors write only the middle one.

## 3. A claim, and a Pod that uses it

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: writer
spec:
  containers:
    - name: app
      image: busybox
      command: ["sh", "-c", "sleep 3600"]
      volumeMounts:
        - name: data
          mountPath: /data
  volumes:
    - name: data
      persistentVolumeClaim:
        claimName: data
```

```bash
kubectl apply -f storage.yaml
kubectl get pvc,pv
kubectl exec writer -- sh -c "echo 'survives' > /data/file.txt"
kubectl delete pod writer
kubectl apply -f storage.yaml
kubectl exec writer -- cat /data/file.txt      # survives
```

## 4. The access mode that blocks a rollout

```bash
kubectl create deployment web --image=nginx --replicas=3
# then patch it to mount the same ReadWriteOnce PVC
kubectl get pods
```

Some Pods stay `Pending`. `kubectl describe pod <name>` says the volume is
already attached elsewhere.

**`ReadWriteOnce` means one *node* may mount it** — which is what a cloud block
device physically is. Three replicas spread across nodes cannot share one. The
options:

- `ReadWriteOnce` + one replica — correct for most databases.
- A **StatefulSet** with `volumeClaimTemplates` — each replica gets its own
  volume.
- `ReadWriteMany` — needs a file system such as NFS or EFS, not a block device.

## 5. What happens to the disk

```bash
kubectl get pv -o custom-columns=NAME:.metadata.name,RECLAIM:.spec.persistentVolumeReclaimPolicy
```

- **`Delete`** — the default on most cloud StorageClasses. Deleting the PVC
  destroys the underlying disk **and the data on it**.
- **`Retain`** — the PV survives in `Released` state for manual recovery, and
  keeps billing until you remove it.

Check which one your cluster uses *before* you need to know.

Two behaviours worth remembering:

- **Deleting a StatefulSet does not delete its PVCs.** This protects your data,
  and it means a "clean" reinstall silently reuses the old disks.
- **`helm uninstall` does not remove PVCs either** — which is how a deleted
  monitoring stack keeps billing for volumes nobody can see.
""",
        "failures": [
            ("PVC stays `Pending`",
             "No StorageClass can satisfy it. `kubectl describe pvc` names the reason — often no default StorageClass, or a class that provisions nothing on this cluster."),
            ("Pods Pending with 'volume is already exclusively attached'",
             "A ReadWriteOnce volume with more than one replica. Scale to 1, or move to a StatefulSet with volumeClaimTemplates."),
            ("Data vanished after deleting the PVC",
             "The reclaim policy was `Delete`. That is the default and it is working as designed — check before deleting, not after."),
            ("PV stuck `Terminating`",
             "A finalizer is waiting on something still using it. Confirm no Pod mounts it, then inspect `kubectl get pv <name> -o yaml` for the finalizer."),
        ],
    },
    # ── Incidents ───────────────────────────────────────────────────────────
    {
        "id": "lab-incident-ingress-502",
        "order": 31,
        "tier": "incident",
        "title": "Incident: 502 Bad Gateway",
        "domain": "kubernetes",
        "level": "advanced",
        "phase": "kubernetes",
        "minutes": 40,
        "cloud_cost": False,
        "destructive": False,
        "cost": "Free — runs on kind or minikube with an NGINX ingress controller.",
        "description": "The site returns 502. You have cluster access and no explanation. Work the path from the edge inwards.",
        "skills": [
            "Work a request path in layers instead of guessing",
            "Use endpoints to separate a routing problem from an application problem",
            "State a root cause in one sentence before changing anything",
        ],
        "tools": ["kind or minikube with ingress-nginx", "kubectl 1.28+"],
        "criteria": [
            "The application returns HTTP 200 through the Ingress.",
            "You can state the root cause in one sentence.",
            "You can name the single command that localised the fault.",
            "You changed exactly one thing — no shotgun fixes.",
        ],
        "reproduce": """```bash
kubectl create namespace incident-01
kubectl apply -n incident-01 -f https://raw.githubusercontent.com/Waleeddarwesh/EgyKode/master/content/labs/fixtures/incident-01.yaml
```

If the fixture is unavailable, reproduce it by hand: deploy any HTTP image
listening on **8080**, create a Service whose `targetPort` is **80**, and put an
Ingress in front of it.""",
        "scenario": (
            "A deployment went out an hour ago. The site now returns **502 Bad "
            "Gateway** for every request.\n\n"
            "You have `kubectl` access to the cluster. Nobody has told you what "
            "changed, and the person who deployed it has gone home.\n\n"
            "There is no solution section in this lab. Find it."
        ),
        "body": """
## What a 502 already tells you

A 502 comes **from the proxy**, not from your application. The ingress
controller accepted the request, tried to forward it, and got nothing usable
back. That single fact rules out a whole class of causes: DNS resolved, the load
balancer is up, the controller is running, and TLS terminated.

The fault is between the controller and the container.

## Work the path, do not guess

```text
Ingress  →  Service  →  Endpoints  →  Pod  →  Container
```

Move one step at a time and prove each before moving on.

**Is the Ingress admitted, and does it point where you think?**

```bash
kubectl -n incident-01 get ingress
kubectl -n incident-01 describe ingress
```

Read the backend service name and port in the output, not in the YAML you
expect to be there.

**Does the Service have endpoints?**

```bash
kubectl -n incident-01 get endpoints
```

This is the highest-value command in the whole sequence. An empty list means the
Service selects nothing ready, and the fault is behind it. A populated list means
routing is fine and the fault is in front of the container.

**Are the Pods running and ready?**

```bash
kubectl -n incident-01 get pods
kubectl -n incident-01 describe pod <name>
```

`Running` and `READY 1/1` are different columns and different questions.

**Does the container actually answer, on the port you think?**

```bash
kubectl -n incident-01 exec deploy/<name> -- wget -qO- localhost:8080 | head -3
kubectl -n incident-01 port-forward deploy/<name> 9000:8080
curl -s localhost:9000 | head -3
```

If the container answers here but the Service does not, the two are not talking
about the same port.

**What does the proxy itself say?**

```bash
kubectl -n ingress-nginx logs deploy/ingress-nginx-controller --tail=30
```

The controller logs the upstream it tried and why it failed. That line usually
names the problem outright.

## Before you change anything

Write down, in one sentence: *"The 502 happens because ___."*

If you cannot finish that sentence, you have not found it yet — and changing
things now means you will not know which change fixed it.

## The candidates, in the order they occur

A 502 through an Ingress is nearly always one of these:

1. The Service's `targetPort` does not match the container's listening port.
2. The Service selector matches no ready Pod — endpoints empty.
3. The container listens on `127.0.0.1` rather than `0.0.0.0`, so it is
   reachable inside the Pod and nowhere else.
4. The application is up but returning nothing on `/` — a slow start, or a
   crash after accepting the connection.
5. The Ingress names a Service or port that does not exist.

Each is distinguishable by the commands above. That is the point of running them
in order rather than reading the list and guessing.
""",
        "reveal": (
            "**Root cause:** the Service declares `targetPort: 80` while the container "
            "listens on `8080`. Endpoints are populated — the selector is correct and "
            "the Pod is ready — so the fault sits between the Service and the "
            "container, which is why the endpoint list looked healthy and the request "
            "still failed.\n\n"
            "**The command that localised it:** `kubectl get endpoints` showed three "
            "healthy addresses, which ruled out everything behind the Service and "
            "pointed at the port mapping.\n\n"
            "**The fix:** set `targetPort: 8080`. One field.\n\n"
            "**Why it is easy to miss:** `port` and `targetPort` are both valid "
            "numbers and neither Kubernetes nor the controller validates that anything "
            "is listening on the target. Nothing is broken from the API's point of "
            "view — the mapping is simply wrong."
        ),
        "failures": [
            ("You changed several things and it works",
             "Revert them one at a time until it breaks again. A fix you cannot name is a fix you cannot repeat, and the real cause is still there."),
            ("`kubectl get endpoints` is empty",
             "Then the fault is behind the Service, not in front of it — selector labels or readiness. That is a different incident from this one."),
            ("It works from port-forward but not through the Ingress",
             "Everything from the Pod inwards is fine. Compare the Service's targetPort with the port that worked."),
        ],
    },
    {
        "id": "lab-incident-crashloopbackoff",
        "order": 32,
        "tier": "incident",
        "title": "Incident: CrashLoopBackOff",
        "domain": "kubernetes",
        "level": "advanced",
        "phase": "kubernetes",
        "minutes": 35,
        "cloud_cost": False,
        "destructive": False,
        "cost": "Free — runs on kind or minikube.",
        "description": "A container starts, dies, and restarts forever. The current logs are empty. Find out what the one that died said.",
        "skills": [
            "Read the logs of a container that has already exited",
            "Map an exit code to a cause",
            "Separate a crash from a failing health check",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "The Pod reaches `Running` with `READY 1/1` and stays there for two minutes.",
            "You can state the exit code and what it meant.",
            "You can explain why `kubectl logs` alone was not enough.",
        ],
        "reproduce": """```bash
kubectl create namespace incident-02
kubectl apply -n incident-02 -f https://raw.githubusercontent.com/Waleeddarwesh/EgyKode/master/content/labs/fixtures/incident-02.yaml
```

By hand: deploy any image whose entrypoint reads a required environment
variable that is not set, and let it exit non-zero.""",
        "scenario": (
            "A Pod has restarted 14 times in six minutes and sits in "
            "`CrashLoopBackOff`. `kubectl logs` prints nothing.\n\n"
            "Find out why, and fix it."
        ),
        "body": """
## What CrashLoopBackOff actually means

It is not an error in itself. It means the container exited, Kubernetes
restarted it, it exited again, and the kubelet is now backing off — waiting
longer between attempts (10s, 20s, 40s…) so a broken container cannot spin the
node.

The useful information is in the container that *already died*.

## The one command people miss

```bash
kubectl -n incident-02 logs <pod>              # the container that just started
kubectl -n incident-02 logs <pod> --previous   # the one that died
```

`--previous` is the whole lab. The current container has been alive for two
seconds and knows nothing; the evidence is in its predecessor.

## Then the exit code

```bash
kubectl -n incident-02 describe pod <pod>
```

Look at `Last State: Terminated` and its `Exit Code`:

| Exit code | Means | Look at |
| --- | --- | --- |
| `0` | Exited cleanly | A one-shot command in a Deployment — it needs to be a Job |
| `1` | Application error | The previous logs |
| `2` | Shell misuse | The command or args in the manifest |
| `126` / `127` | Not executable / not found | The entrypoint path |
| `137` | SIGKILL — almost always OOMKilled | Memory limit versus what it needs |
| `143` | SIGTERM — asked to stop | Something else is terminating it |

`137` is the one worth recognising instantly: the container exceeded its memory
limit and the kernel's OOM killer terminated it. `describe` says `OOMKilled`
explicitly in `Last State`.

## Rule out the probes

A container that is running fine but failing its liveness probe restarts in a
loop that looks identical from the outside:

```bash
kubectl -n incident-02 describe pod <pod> | grep -A5 Liveness
kubectl -n incident-02 get events --sort-by=.lastTimestamp | tail -20
```

An event saying `Liveness probe failed` means the application is alive and the
check is wrong — often a slow-starting process with no `startupProbe`, being
killed before it ever finishes booting.

## Before you change anything

Finish this sentence: *"The container exits because ___, which I know from ___."*

The second half matters as much as the first.

## The candidates

1. A required environment variable or config file is missing, so the process
   exits at startup.
2. A referenced ConfigMap or Secret does not exist — the Pod never starts and
   `describe` says so in Events.
3. The memory limit is below what the process needs — exit `137`, `OOMKilled`.
4. The command or args are wrong — exit `127`.
5. It is a one-shot task in a Deployment: it succeeds, exits `0`, and gets
   restarted because a Deployment expects a long-running process.
6. A liveness probe is killing a healthy but slow-starting container.
""",
        "reveal": (
            "**Root cause:** the container requires an environment variable that the "
            "manifest never sets. It exits `1` at startup, before writing anything to "
            "the log the *current* container would show.\n\n"
            "**The command that found it:** `kubectl logs <pod> --previous` — the dead "
            "container's output names the missing variable directly.\n\n"
            "**The fix:** add the variable via `env` or `envFrom`. If it belongs in a "
            "ConfigMap, note that editing that ConfigMap later will not restart the "
            "Pod — `envFrom` values are read once at container start.\n\n"
            "**Why `kubectl logs` alone showed nothing:** by the time you ran it, the "
            "kubelet had already started a replacement that had not reached the "
            "failure yet, or had produced no output at all."
        ),
        "failures": [
            ("`--previous` says there is no previous container",
             "The Pod has not restarted yet, or was just recreated. Wait for one more restart, or check `kubectl get events`."),
            ("Restart count climbs but the logs look normal",
             "Suspect a liveness probe rather than a crash. `describe` will show `Liveness probe failed` in Events."),
            ("The Pod never starts at all",
             "That is not CrashLoopBackOff — it is `CreateContainerConfigError` or `ImagePullBackOff`. `describe` names which."),
        ],
    },
    {
        "id": "lab-incident-cluster-dns",
        "order": 33,
        "tier": "incident",
        "title": "Incident: Service-to-Service Calls Fail",
        "domain": "kubernetes",
        "level": "advanced",
        "phase": "kubernetes",
        "minutes": 40,
        "cloud_cost": False,
        "destructive": False,
        "cost": "Free — runs on kind or minikube.",
        "description": "Every Pod is Running and healthy, but one service cannot reach another by name. Work down from DNS.",
        "skills": [
            "Test cluster DNS from inside a Pod",
            "Distinguish a name-resolution failure from a connectivity failure",
            "Recognise an egress policy that forgot DNS",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "The calling Pod reaches the target Service by name and gets a response.",
            "You can say whether the failure was resolution, routing or policy — and how you proved it.",
            "You can name the namespace-qualified DNS name of the target Service.",
        ],
        "reproduce": """```bash
kubectl create namespace incident-03
kubectl apply -n incident-03 -f https://raw.githubusercontent.com/Waleeddarwesh/EgyKode/master/content/labs/fixtures/incident-03.yaml
```

By hand: deploy two services in one namespace, then apply a default-deny egress
NetworkPolicy that does not allow UDP 53 to kube-system.""",
        "scenario": (
            "The API Pods are `Running` and `READY`. The database Pods are `Running` "
            "and `READY`. The API logs show connection failures to the database, and "
            "nobody has changed either application.\n\n"
            "Find out why they cannot talk."
        ),
        "body": """
## Test DNS before anything else

More than half of "the network is broken" reports in Kubernetes are name
resolution.

```bash
kubectl -n incident-03 exec deploy/api -- nslookup db
kubectl -n incident-03 exec deploy/api -- nslookup db.incident-03.svc.cluster.local
kubectl -n incident-03 exec deploy/api -- cat /etc/resolv.conf
```

Three distinct outcomes, three different faults:

| Result | Means |
| --- | --- |
| Resolves to an IP | DNS is fine — the problem is connectivity or the application |
| `NXDOMAIN` | The Service does not exist, or the name is wrong for this namespace |
| Times out | CoreDNS is unreachable — often an egress policy blocking UDP 53 |

That third case is the one that surprises people, because *everything looks
healthy*.

## Is CoreDNS itself alright?

```bash
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=20
```

## If the name resolves, test the connection

```bash
kubectl -n incident-03 exec deploy/api -- wget -qO- --timeout=5 http://db:5432 || echo "failed"
kubectl -n incident-03 get endpoints db
```

Separate the two failures deliberately:

- **Refused** — something answered and said no. Routing and policy are fine;
  look at the service.
- **Timed out** — nothing answered. Suspect a NetworkPolicy, or a Service with
  no endpoints.

## NetworkPolicies

```bash
kubectl -n incident-03 get networkpolicy
kubectl -n incident-03 describe networkpolicy
```

Two properties cause most of these incidents:

- A Pod selected by **no** policy is unrestricted. Security starts only when
  something selects it — which is why a `default-deny` is usually the first
  policy written, and why adding one breaks things that used to work.
- Policies are **additive with no deny rule**. Traffic is allowed if any policy
  allows it, so you cannot fix this by adding a deny — you widen an allow.

**The classic mistake:** a default-deny egress policy that permits traffic to the
database but forgets UDP 53 to CoreDNS. Every hostname lookup in the namespace
then times out, while the policy looks correct because the database rule is
right there.

```yaml
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
```

## Before you change anything

*"The call fails because ___, which I proved by ___."*
""",
        "reveal": (
            "**Root cause:** a default-deny egress NetworkPolicy allows traffic to the "
            "database but not to CoreDNS. The API cannot resolve `db`, so it never "
            "opens a connection at all — the database rule is correct and never gets "
            "used.\n\n"
            "**The command that found it:** `nslookup db` from inside the calling Pod "
            "*timed out* rather than returning NXDOMAIN. A timeout points at "
            "reachability of the resolver, not at a missing record.\n\n"
            "**The fix:** add an egress rule permitting UDP 53 to the kube-system "
            "namespace.\n\n"
            "**Why everything looked healthy:** the policy does exactly what it says, "
            "and both workloads are genuinely fine. Nothing reports an error, because "
            "from Kubernetes' point of view nothing is wrong."
        ),
        "failures": [
            ("`nslookup` returns NXDOMAIN, not a timeout",
             "That is a different fault — the Service does not exist under that name. Check the namespace and `kubectl get svc`."),
            ("DNS works but the connection is refused",
             "Resolution and policy are fine. The target is not listening on that port — check the Service's targetPort and the container."),
            ("Removing the policy fixes it, so you delete the policy",
             "That is not a fix, it is removing the security control. Add the missing egress rule instead."),
        ],
    },
]


def frontmatter(spec: dict) -> str:
    tier = spec["tier"]
    lines = [
        "---",
        f"labId: {spec['id']}",
        f'title: "{spec["title"]}"',
        f'description: "{spec["description"]}"',
        f"domain: {spec['domain']}",
        f"level: {spec['level']}",
        "type: lab",
        f"phase: {spec['phase']}",
        f"order: {spec['order']}",
        f"tier: {tier}",
        f"estimatedMinutes: {spec['minutes']}",
        f"cloudCost: {'true' if spec['cloud_cost'] else 'false'}",
        f'costEstimate: "{spec["cost"]}"',
    ]
    if spec.get("destructive"):
        lines.append("destructive: true")
    if spec.get("skills"):
        lines.append("skills:")
        lines += [f'  - "{s}"' for s in spec["skills"]]
    if spec.get("tools"):
        lines.append("tools:")
        lines += [f'  - "{t}"' for t in spec["tools"]]
    lines.append("successCriteria:")
    lines += [f'  - "{c}"' for c in spec["criteria"]]
    if spec.get("cleanup"):
        lines.append("cleanup:")
        lines += [f'  - "{c}"' for c in spec["cleanup"]]
    if tier == "guided":
        lines.append(f"challengeId: {spec['id']}-challenge")
    lines += ["authors: [waleed]", "updated: 2026-08-10", "---", ""]
    return "\n".join(lines)


def guided_body(spec: dict) -> str:
    out = ["## The scenario\n", spec["scenario"] + "\n", spec["body"].strip() + "\n"]
    out.append("\n## When it goes wrong\n")
    for symptom, cause in spec["failures"]:
        out.append(f"\n**{symptom}**\n\n{cause}\n")
    if spec.get("cleanup"):
        steps = "\n".join(spec["cleanup"])
        out.append(
            f"\n---\n\n## Clean up\n\nRun this even if you did not finish.\n\n```bash\n{steps}\n```\n"
            f"\n**Cost of this lab:** {spec['cost']}\n"
        )
    return "".join(out)


def incident_body(spec: dict) -> str:
    out = [
        "## The incident\n",
        spec["scenario"] + "\n",
        "\n## Reproduce it\n\n",
        spec["reproduce"] + "\n",
        "\n" + spec["body"].strip() + "\n",
        "\n## When it goes wrong\n",
    ]
    for symptom, cause in spec["failures"]:
        out.append(f"\n**{symptom}**\n\n{cause}\n")
    out.append(
        "\n---\n\n## Check your reasoning\n\n"
        "Read this **after** you have fixed it, or after a genuine attempt. "
        "Being handed the answer costs you the only thing this tier teaches.\n\n"
        "> " + spec["reveal"].replace("\n\n", "\n>\n> ") + "\n"
    )
    if spec.get("cleanup"):
        steps = "\n".join(spec["cleanup"])
        out.append(f"\n## Clean up\n\n```bash\n{steps}\n```\n")
    else:
        ns = spec["id"].replace("lab-incident-", "incident-")
        out.append(f"\n## Clean up\n\n```bash\nkubectl delete namespace {spec['phase'] and ''}{ns[:11]}\n```\n")
    return "".join(out)


def challenge_body(spec: dict) -> str:
    criteria = "\n".join(f"- {c}" for c in spec["criteria"])
    return f"""## The goal

Achieve the same outcome as **{spec['title']}**, from an empty starting point,
without the steps.

{spec['scenario']}

## What must be true when you are done

{criteria}

## Rules

- Do not open the guided lab until you are finished, or until the same problem
  has held you up for 20 minutes.
- Documentation is allowed. In the job it is the first thing you open.
- Verify every criterion with a command whose output you can read.

## If you get stuck

1. What did you expect, exactly?
2. What happened instead — the error text, not a paraphrase?
3. Which layer is that error from?
4. What is the smallest command that proves the layer below is fine?
"""


def main() -> None:
    written = 0
    for spec in SPECS:
        tier = spec["tier"]
        body = incident_body(spec) if tier == "incident" else guided_body(spec)
        (LABS / f"{spec['id']}.en.mdx").write_text(frontmatter(spec) + body, encoding="utf-8")
        written += 1

        if tier == "guided":
            challenge = dict(spec, tier="challenge")
            fm = frontmatter(challenge).replace(
                f"challengeId: {spec['id']}-challenge", f"guidedLabId: {spec['id']}"
            ).replace(f"labId: {spec['id']}", f"labId: {spec['id']}-challenge").replace(
                f'title: "{spec["title"]}"', f'title: "{spec["title"]} — Challenge"'
            )
            (LABS / f"{spec['id']}-challenge.en.mdx").write_text(
                fm + challenge_body(spec), encoding="utf-8"
            )
            written += 1

        mark = {"incident": "INCIDENT", "guided": "guided"}[tier]
        print(f"  {mark:<9} {spec['level']:<12} {spec['domain']:<11} {spec['title']}")

    print(f"\nwrote {written} file(s)")


if __name__ == "__main__":
    main()
