#!/usr/bin/env python3
"""
Make the imported NTI labs followable.

The importer took each lab's README and kept its prose, its ASCII diagram and
its command list. What it could not bring across was the repository those
commands ran in — so every one of the eighteen says something like

    cd 03-Containerization-Docker/Lab09-Django-MultiStage-Dockerfile
    docker build -t nti-django-app:1.0 .

and never shows the Dockerfile. Fourteen of the eighteen never show a single
line of the YAML, HCL or config they instruct you to apply. None has a failure
mode; the authored labs all do.

The concept sections are good and are kept. What this adds is the artifact
itself, steps that run anywhere, verification that proves the outcome rather
than the existence of an object, and the failures each lab actually produces.

Run: python scripts/rewrite_imported_labs.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

REWRITES: dict[str, dict] = {}

# ── lab-09 · Multi-stage Dockerfile ───────────────────────────────────────
REWRITES["lab-09-production-grade-multi-stage-dockerfile-for-django-gunicorn"] = {
    "criteria": [
        "The final image is under 200 MB and contains no compiler.",
        "The container runs as a non-root user — proven with `docker exec ... id`.",
        "A build cache hit skips dependency installation when only application code changed.",
        "The container refuses to start until the database is reachable, instead of crashing.",
    ],
    "scenario": (
        "The image is 950 MB, ships `gcc` to production, and runs as root. It "
        "also takes four minutes to rebuild after a one-line code change, "
        "because every build reinstalls every dependency.\n\n"
        "All three problems have the same fix, and it is the order of the "
        "instructions rather than any single one of them."
    ),
    "body": """
## What you are building

A **multi-stage build** uses several `FROM` instructions in one Dockerfile.
Only the last stage becomes the image; the earlier ones are scratch space that
is discarded.

```text
  STAGE 1 — builder                    STAGE 2 — runtime
  python:3.13-slim                     python:3.13-slim
  + gcc, make, libpq-dev               copies ONLY the compiled wheels
  + compiles wheels        ══════▶     no compiler, no headers
  ~950 MB, thrown away                 runs as UID 10001
                                       ~160 MB, shipped
```

Three things this buys you, and the second is the one that matters most:

- **Size.** ~950 MB to ~160 MB, so pulls are faster on every node.
- **Attack surface.** An attacker who reaches a container with `gcc` in it can
  compile an exploit there. One without cannot.
- **Honesty.** If the runtime stage is missing a library, the build fails on
  your machine rather than the container failing in production.

---

## Build it

### 1. The Dockerfile

```dockerfile
# ---------- Stage 1: build ----------
FROM python:3.13-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \\
      build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt

# ---------- Stage 2: runtime ----------
FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \\
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \\
      libpq5 && rm -rf /var/lib/apt/lists/* \\
 && useradd --uid 10001 --create-home --shell /usr/sbin/nologin appuser

WORKDIR /app

# Dependencies first, and in their own layer — see step 2.
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \\
 && rm -rf /wheels

# Application code last, because it changes on every commit.
COPY --chown=appuser:appuser . .

USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s \\
  CMD python -c "import urllib.request,sys; \\
      sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz').status==200 else 1)"

ENTRYPOINT ["./entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "app.wsgi:application"]
```

`libpq-dev` is in the builder and `libpq5` in the runtime. The `-dev` package
carries headers needed to *compile* the driver; the runtime needs only the
shared library. Copying that distinction wholesale is what keeps the second
stage small.

### 2. Layer order is the build-time win

```dockerfile
COPY requirements.txt .        # changes rarely
RUN pip install ...            # cached until requirements.txt changes
COPY . .                       # changes every commit
```

Docker caches each layer and invalidates everything after the first change. Put
`COPY . .` before the install and every code change reinstalls every
dependency — the four-minute rebuild. In this order, a code change reuses the
dependency layer and rebuilds in seconds.

Verify the cache is working:

```bash
docker build -t app:1.0 .
echo "# touch" >> app/views.py
docker build -t app:1.1 .          # look for "CACHED" on the pip layer
```

### 3. An entrypoint that waits instead of crashing

```bash
#!/bin/sh
set -e

echo "waiting for ${DB_HOST}:${DB_PORT:-5432}"
until nc -z "${DB_HOST}" "${DB_PORT:-5432}"; do
  sleep 1
done

python manage.py migrate --noinput
exec "$@"
```

`exec "$@"` is the important line. Without `exec`, the shell stays as PID 1 and
Gunicorn runs as its child — so `docker stop` sends `SIGTERM` to the shell,
which does not forward it, and the container is killed 10 seconds later after
dropping in-flight requests. With `exec`, Gunicorn *becomes* PID 1 and shuts
down gracefully.

### 4. Build and measure

```bash
docker build -t app:1.0 .
docker images app:1.0 --format '{{.Size}}'
docker history app:1.0 | head
```

---

## Verify it worked

```bash
# Non-root, with the UID you chose
docker run --rm app:1.0 id
# uid=10001(appuser) gid=10001(appuser)

# No compiler in the shipped image
docker run --rm app:1.0 sh -c 'which gcc || echo "no compiler — correct"'

# Under 200 MB
docker images app:1.0 --format '{{.Size}}'

# The health check is wired up
docker run -d --name app -p 8000:8000 app:1.0
docker inspect --format '{{.State.Health.Status}}' app
```

Each of those checks an *outcome*. `docker images` showing the tag exists would
prove only that a build ran.

---

## When it goes wrong

**`pip install` fails in the runtime stage with a missing header**

You installed a `-dev` package only in the builder and the wheel is being
compiled again. That means it was not built in stage 1 — check the
`--find-links` path and that `--no-index` is set, so pip cannot silently reach
the internet and rebuild.

**Permission denied writing a file at runtime**

`USER appuser` cannot write to directories owned by root. `COPY --chown` fixes
the application directory; anything else the app writes needs an explicit
`RUN mkdir -p /app/media && chown appuser /app/media`.

**Every build reinstalls dependencies**

`COPY . .` appears before the install. Move it after, and check `.dockerignore`
excludes `.git` — a changing `.git` directory invalidates the cache on every
build even when no source file changed.

**`docker stop` takes exactly 10 seconds**

The entrypoint is missing `exec`, so `SIGTERM` reaches a shell that ignores it
and Docker falls back to `SIGKILL` after the grace period.

**Health check never turns healthy**

The command runs *inside* the container, so anything it calls must exist there.
`docker inspect --format '{{json .State.Health}}' app | jq` shows the actual
output of the last few probes.

---

## Clean up

```bash
docker rm -f app
docker rmi app:1.0 app:1.1
docker builder prune -f
```

**Cost of this lab:** Free — everything runs locally.
""",
}

# ── lab-10 · Nginx reverse proxy + Compose ────────────────────────────────
REWRITES["lab-10-nginx-reverse-proxy-multi-container-docker-compose-stack"] = {
    "criteria": [
        "Nginx serves static files directly and proxies everything else to Gunicorn.",
        "The stack starts in a working order — the app waits for a *ready* database, not a started one.",
        "Database data survives `docker compose down` and returns after `up`.",
        "The application sees the real client IP, not the proxy's.",
    ],
    "scenario": (
        "Gunicorn is serving CSS. It is a Python process reading files off disk "
        "and writing them to a socket, and it is doing that instead of handling "
        "requests — so the site is slow under load for no good reason.\n\n"
        "There is also no TLS, no static caching, and the application crashes on "
        "boot roughly one time in three because PostgreSQL is not accepting "
        "connections yet."
    ),
    "body": """
## What you are building

```text
  Browser
     │ :80
     ▼
  ┌──────────────────────── compose network ────────────────────────┐
  │  nginx        /static/  → served from a shared volume, on disk  │
  │               /         → proxy_pass to gunicorn                │
  │     │                                                           │
  │     ▼                                                           │
  │  web (gunicorn)  ──▶  db (postgres)   ──▶  named volume         │
  │                  ──▶  cache (redis)                             │
  └─────────────────────────────────────────────────────────────────┘
```

**Why not let Gunicorn serve static files?** It can, and every worker that is
streaming a CSS file is a worker not handling a request. Nginx does that with
`sendfile` in the kernel, at a cost close to zero, and adds caching headers
while it is there. This is the division of labour every Python deployment ends
up with.

---

## Build it

### 1. The Nginx configuration

```nginx
# nginx/default.conf
upstream django {
    server web:8000;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 20M;

    # Served from disk. Never reaches Python.
    location /static/ {
        alias /app/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location /media/ {
        alias /app/media/;
        expires 7d;
    }

    location / {
        proxy_pass http://django;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 5s;
        proxy_read_timeout    60s;
    }
}
```

**The four `proxy_set_header` lines are not boilerplate.** Without them the
application sees every request as coming from the Nginx container's IP, so
rate limiting, audit logs and geolocation all break in a way that looks
correct in testing — because in testing there is one client.

### 2. The Compose file

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 5s
      timeout: 3s
      retries: 5
      start_period: 10s

  cache:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      retries: 5

  web:
    build: .
    environment:
      DB_HOST: db
      REDIS_HOST: cache
    volumes:
      - static:/app/static
    depends_on:
      db:
        condition: service_healthy      # ready, not merely started
      cache:
        condition: service_healthy
    expose:
      - "8000"                          # visible to nginx, not to the host

  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - static:/app/static:ro           # the same volume web writes to
    depends_on:
      - web

volumes:
  pgdata:
  static:
```

Three details worth pointing at:

- **`expose` rather than `ports` on `web`.** Nginx reaches it on the compose
  network; the host does not need to, and publishing it would let clients skip
  the proxy entirely.
- **`${DB_PASSWORD:?...}`** fails the `up` with a clear message rather than
  silently starting PostgreSQL with an empty password.
- **The `static` volume is mounted twice** — read-write by `web`, read-only by
  `nginx`. That is how Nginx serves files a Python process collected.

### 3. Start it

```bash
export DB_PASSWORD=labonly
docker compose up -d --build
docker compose ps            # db and cache show "healthy", not "running"
```

---

## Verify it worked

```bash
# Static served by nginx, not Python
curl -sI http://localhost/static/css/site.css | grep -i 'server\\|cache-control'
# Server: nginx/1.27.x   Cache-Control: public, immutable

# Dynamic proxied through
curl -s -o /dev/null -w '%{http_code}\\n' http://localhost/

# The app sees the real client IP
docker compose logs web --tail 5 | grep -o 'X-Forwarded-For[^ ]*'

# Data survives a full stop
docker compose exec db psql -U app -c "CREATE TABLE t(id int); INSERT INTO t VALUES (1);"
docker compose down && docker compose up -d
docker compose exec db psql -U app -c "SELECT * FROM t;"
```

That last sequence is the one people skip and the one that matters. `down`
destroys containers and keeps named volumes; `down -v` destroys the volumes
too, and it is one character away.

---

## When it goes wrong

**502 Bad Gateway from Nginx**

Nginx started and the upstream did not answer. In order: is `web` running
(`docker compose ps`), is it listening on `0.0.0.0:8000` rather than
`127.0.0.1` inside its container, and does the `upstream` name match the
service name exactly?

**404 on static files, dynamic pages fine**

The `static` volume is empty. Whatever collects static assets has not run, or
it ran in a container that mounted a different volume. `docker compose exec
nginx ls /app/static` settles it.

**`host not found in upstream "web"`** and Nginx will not start

Compose resolves service names on its own network. This is a typo, or Nginx is
on a different network. Note that Nginx resolves upstreams **at startup** and
then caches — if `web` was not up yet, Nginx fails permanently rather than
retrying.

**The app crashes on first boot, works on restart**

`depends_on` without `condition: service_healthy` waits only for the container
to start. PostgreSQL accepts connections several seconds after that.

**Everything is gone after a restart**

`docker compose down -v`, or the volume was anonymous. Named volumes in the
top-level `volumes:` block persist.

---

## Clean up

```bash
docker compose down -v
docker volume prune -f
```

**Cost of this lab:** Free — everything runs locally.
""",
}

# ── lab-01 · VPC in Terraform ─────────────────────────────────────────────
REWRITES["lab-01-aws-vpc-subnets-gateways-route-tables"] = {
    "criteria": [
        "A VPC spans two availability zones with a public and a private subnet in each.",
        "An instance in a private subnet reaches the internet outbound and cannot be reached inbound.",
        "The difference between the two subnet types is visible in the route tables, not in their names.",
        "`terraform plan` reports no changes after `apply`.",
        "`terraform destroy` removes the NAT Gateway and releases its Elastic IP.",
    ],
    "scenario": (
        "You built this network by hand in the console lab. Doing it again in "
        "another region would take the same forty minutes and produce something "
        "subtly different.\n\n"
        "This is the same network as code — and the first `plan` you can read "
        "line by line before anything is created."
    ),
    "body": """
## What you are building

```text
                        VPC 10.0.0.0/16
  ┌──────────────────────────────┬──────────────────────────────┐
  │        us-east-1a            │         us-east-1b           │
  │  public  10.0.1.0/24         │   public  10.0.2.0/24        │
  │    └─ NAT Gateway + EIP      │                              │
  │  private 10.0.10.0/24        │   private 10.0.11.0/24       │
  └──────────────┬───────────────┴──────────────┬───────────────┘
                 │                              │
        Internet Gateway                route 0.0.0.0/0 → NAT
```

**A subnet is not public or private as a property.** Both are identical
objects. What makes one public is a route table entry sending `0.0.0.0/0` to
an Internet Gateway; what makes the other private is that its route sends
`0.0.0.0/0` to a NAT Gateway instead. Nothing else distinguishes them, and
naming a subnet "public" while pointing it at a NAT is a mistake Terraform
will happily make for you.

**Two availability zones, because one is not high availability.** An AZ is a
distinct set of buildings. Losing one is rare and does happen, and an
architecture with everything in `us-east-1a` goes down with it.

---

## Build it

### 1. The network

```hcl
variable "azs" {
  type    = list(string)
  default = ["us-east-1a", "us-east-1b"]
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true      # required for private DNS and for EKS
  tags = { Name = "platform" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 1)
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                     = "public-${var.azs[count.index]}"
    "kubernetes.io/role/elb" = "1"          # ALBs go here
  }
}

resource "aws_subnet" "private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = var.azs[count.index]

  tags = {
    Name                              = "private-${var.azs[count.index]}"
    "kubernetes.io/role/internal-elb" = "1"
  }
}
```

`cidrsubnet("10.0.0.0/16", 8, 1)` produces `10.0.1.0/24` — it adds 8 bits to
the prefix and takes block 1. Computing the blocks beats writing them out,
because a hardcoded list is where overlapping CIDRs come from.

The `kubernetes.io/role/*` tags are how the AWS Load Balancer Controller
discovers which subnets to place load balancers in. Without them, the
Kubernetes ingress lab fails with an error that says nothing about tags.

### 2. The NAT Gateway, and what it costs

```hcl
resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id     # lives in a PUBLIC subnet
  depends_on    = [aws_internet_gateway.main]
}
```

A NAT Gateway is about **$32/month plus per-GB processing**, and in a
private-subnet architecture it is usually the largest non-compute line on the
bill.

One NAT for both AZs is cheaper and means an AZ failure takes out egress for
the surviving one. One per AZ doubles the cost and removes that dependency.
For learning, one. For production, decide deliberately — this is a real
trade-off, not an oversight.

The `depends_on` is required: a NAT Gateway created before the IGW is attached
comes up unable to route, and the failure appears later as a timeout.

### 3. Route tables — where public and private are actually decided

```hcl
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
```

**A subnet with no explicit association silently uses the VPC's main route
table**, which has no internet route. Nothing errors; instances simply cannot
reach anything, and the cause is an association you forgot rather than a rule
you got wrong.

### 4. Apply

```bash
terraform init
terraform plan -out=tfplan       # read it before you accept it
terraform apply tfplan
```

---

## Verify it worked

```bash
# Every private subnet routes 0.0.0.0/0 at a NAT, never at an IGW
aws ec2 describe-route-tables \\
  --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \\
  --query 'RouteTables[].{rt:RouteTableId,routes:Routes[?DestinationCidrBlock==`0.0.0.0/0`].[GatewayId,NatGatewayId]}' \\
  --output table

# Both AZs are represented
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \\
  --query 'Subnets[].[Tags[?Key==`Name`]|[0].Value,AvailabilityZone,CidrBlock]' --output table

# The real test: outbound works, inbound does not
aws ssm start-session --target <private-instance-id>
#   curl -sI https://example.com | head -1     → 200, via NAT
#   (nothing on the internet can open a connection to this instance)

terraform plan -detailed-exitcode; echo "exit $?"    # 0 = no drift
```

---

## When it goes wrong

**A private instance cannot reach the internet**

Work outward: does the private route table have `0.0.0.0/0 → nat-…`, is the
subnet actually associated with that table, is the NAT in a **public** subnet,
and does the public route table point at the IGW? A NAT in a private subnet is
the classic version of this and produces a silent timeout.

**`Error: InvalidSubnet.Conflict`**

Two subnets overlap. `cidrsubnet` with distinct indexes prevents it; hand-written
blocks do not.

**Apply hangs on `aws_nat_gateway`**

NAT Gateways take a few minutes to provision. Ten minutes without progress
means it cannot reach the IGW — check the `depends_on`.

**`destroy` fails on the VPC**

Something Terraform did not create is still inside it — usually an ENI from a
load balancer that Kubernetes provisioned. Delete the Ingress objects first,
then destroy.

**A charge after destroying everything**

An Elastic IP that was released from the NAT but not deallocated.
`aws ec2 describe-addresses --query 'Addresses[?AssociationId==null]'`.

---

## Clean up

```bash
terraform destroy -auto-approve
aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[].NatGatewayId'
aws ec2 describe-addresses --query 'Addresses[?AssociationId==null].[PublicIp,AllocationId]'
```

**Cost of this lab:** **Billable.** The NAT Gateway is roughly $0.045/hour plus
per-GB processing — about $32/month if left running. Everything else here is
free. Destroy it when you finish.
""",
}

# ── lab-02 · IAM roles and security groups ────────────────────────────────
REWRITES["lab-02-iam-roles-irsa-policies-security-groups"] = {
    "criteria": [
        "Each role's trust policy names exactly one service, and its permissions policy names exactly the actions it needs.",
        "Security groups reference each other rather than CIDR ranges, so no rule contains a hardcoded IP.",
        "The database accepts connections only from the worker node security group — verified by trying from elsewhere.",
        "A pod assumes an IAM role through IRSA without any credential file existing.",
    ],
    "scenario": (
        "The cluster works because the node role has `AdministratorAccess`. Every "
        "pod on every node inherits it, so a compromise of any container is a "
        "compromise of the whole account.\n\n"
        "The security groups allow `0.0.0.0/0` on the database port, with a "
        "comment saying it is temporary."
    ),
    "body": """
## What you are building

Two independent systems that people conflate:

- **IAM** answers *what may this identity call in the AWS API?*
- **Security groups** answer *what may reach this network interface?*

An instance with no IAM permissions can still be reached on port 22. An
instance with `AdministratorAccess` and no inbound rules cannot be reached at
all but can delete your account. You need both, and neither substitutes for
the other.

```text
  Internet ──▶ sg-alb  (:443 from 0.0.0.0/0)
                  │  referenced by
                  ▼
              sg-nodes (:30000-32767 from sg-alb only)
                  │  referenced by
                  ▼
               sg-rds  (:5432 from sg-nodes only)
```

**Security groups reference other security groups, not CIDRs.** That is the
single most useful thing in this lab. A rule that says "from `sg-nodes`" keeps
working when nodes are replaced, scaled or move subnet — a rule that says
"from `10.0.10.0/24`" needs editing every time the network changes, and
somebody will widen it instead.

---

## Build it

### 1. A role is two policies

```hcl
# WHO may assume this role
data "aws_iam_policy_document" "node_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "node" {
  name               = "eks-node"
  assume_role_policy = data.aws_iam_policy_document.node_trust.json
}

# WHAT it may then do
resource "aws_iam_role_policy_attachment" "node" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore",
  ])
  role       = aws_iam_role.node.name
  policy_arn = each.value
}
```

Two policies, two questions. The **trust policy** says who may assume the role;
the **permissions policy** says what they may do afterwards. Getting a
`AccessDenied` on `sts:AssumeRole` means the first is wrong; getting it on the
API call itself means the second is.

Note `ContainerRegistryReadOnly`, not full ECR access. Nodes pull images; they
have no business pushing them.

### 2. IRSA — a role per workload, not per node

Attaching a policy to the node role gives it to **every pod on that node**. IRSA
scopes it to one Kubernetes ServiceAccount:

```hcl
data "aws_iam_policy_document" "irsa_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:sub"
      values   = ["system:serviceaccount:production:api"]
    }
    condition {
      test     = "StringEquals"
      variable = "${local.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/api-s3-access
```

**Both conditions are required.** Without the `sub` condition, any
ServiceAccount in the cluster can assume the role. Without `aud`, a token
issued for a different audience is accepted. Omitting either turns a
per-workload grant back into a cluster-wide one, silently.

### 3. Security group chaining

```hcl
resource "aws_security_group" "alb" {
  vpc_id = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]     # the ONLY place this appears
  }
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "nodes" {
  vpc_id = var.vpc_id
  egress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Separate resources, not inline blocks — see below.
resource "aws_vpc_security_group_ingress_rule" "nodes_from_alb" {
  security_group_id            = aws_security_group.nodes.id
  referenced_security_group_id = aws_security_group.alb.id
  from_port                    = 30000
  to_port                      = 32767
  ip_protocol                  = "tcp"
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_nodes" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.nodes.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
}
```

Use **separate rule resources** rather than inline `ingress` blocks whenever
two groups reference each other. Inline blocks on both sides create a circular
dependency Terraform cannot resolve, and the error message does not say so.

**Security groups are stateful.** A permitted inbound connection's replies are
allowed out automatically — you never write a matching egress rule. Network
ACLs are stateless and do need both, which is why people who learned NACLs
first write twice the rules they need here.

---

## Verify it worked

```bash
# No role has a wildcard action
aws iam list-attached-role-policies --role-name eks-node
aws iam get-role --role-name eks-node --query 'Role.AssumeRolePolicyDocument'

# No security group allows the database port from the world
aws ec2 describe-security-groups \\
  --filters "Name=vpc-id,Values=$(terraform output -raw vpc_id)" \\
  --query 'SecurityGroups[].IpPermissions[?contains(IpRanges[].CidrIp, `0.0.0.0/0`)].[FromPort,ToPort]' \\
  --output table
# only 443 should appear

# IRSA works, and there is no credential file anywhere
kubectl exec -n production deploy/api -- env | grep AWS_ROLE_ARN
kubectl exec -n production deploy/api -- aws sts get-caller-identity
# the ARN is the IRSA role, not the node role

# The negative test — from a pod WITHOUT the annotation
kubectl run probe --rm -it --image=amazon/aws-cli --restart=Never -- sts get-caller-identity
# returns the node role, and should be denied on your scoped actions
```

That last check is the one worth doing. Proving a permission works is easy;
proving the absence of one is the actual security claim.

---

## When it goes wrong

**`AccessDenied` on `sts:AssumeRoleWithWebIdentity`**

The `sub` condition does not match. The value must be exactly
`system:serviceaccount:<namespace>:<serviceaccount-name>` — a namespace typo
fails with no hint about which half is wrong.

**The pod gets the node role instead of the IRSA role**

The ServiceAccount annotation is missing, the pod does not name the
ServiceAccount, or the pod was running before the annotation was added. Pods
receive the projected token at creation; restart them.

**Terraform cycle error between two security groups**

Both use inline `ingress` blocks referencing each other. Move at least one to a
separate `aws_vpc_security_group_ingress_rule`.

**The database is unreachable from a node**

Security groups reference by group ID, so confirm the node is actually in
`sg-nodes` — an instance can carry several groups and the rule names one
specifically.

**`DependencyViolation` when destroying a security group**

An ENI still uses it, usually one created by the AWS Load Balancer Controller
rather than by Terraform. Delete the Kubernetes Services and Ingresses first.

---

## Clean up

```bash
terraform destroy -auto-approve
aws iam list-roles --query 'Roles[?starts_with(RoleName, `eks-`)].RoleName'
```

**Cost of this lab:** Free — IAM roles, policies and security groups cost
nothing. The resources they are attached to do.
""",
}

# ── lab-03 · ECR and S3 ───────────────────────────────────────────────────
REWRITES["lab-03-amazon-ecr-container-registry-s3-storage-buckets"] = {
    "criteria": [
        "An image pushed to ECR is scanned automatically and you can read the findings.",
        "A lifecycle policy expires untagged images, and you can state how many it will keep.",
        "Every bucket blocks public access and rejects requests that are not over TLS.",
        "The state bucket has versioning enabled, and you demonstrated recovering a deleted object.",
    ],
    "scenario": (
        "Images are pushed to Docker Hub with the tag `latest`, so nobody can say "
        "which commit is in production. Nothing scans them. The registry has "
        "eleven months of untagged layers nobody can delete safely because nobody "
        "knows what references them.\n\n"
        "The buckets were created by hand, and one of them is public."
    ),
    "body": """
## What you are building

Two storage services that get grouped together and behave nothing alike:

- **ECR** — a private Docker registry with scanning on push and lifecycle
  rules for expiring images.
- **S3** — object storage, here for Terraform state and load balancer access
  logs.

---

## Build it

### 1. A registry that scans and prunes

```hcl
resource "aws_ecr_repository" "app" {
  name                 = "platform/api"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
  }
}
```

**`IMMUTABLE` is the setting to argue for.** With mutable tags, `api:1.4.2` can
be overwritten, so the image you tested and the image running in production
share a name and differ in content. Immutable tags make that impossible, and
they force the habit of tagging by commit SHA.

```hcl
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Keep the 30 most recent tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v"]
          countType     = "imageCountMoreThan"
          countNumber   = 30
        }
        action = { type = "expire" }
      }
    ]
  })
}
```

Rules are evaluated in priority order and **the first match wins**, so an
overly broad rule at priority 1 makes everything below it dead code. Untagged
layers accumulate on every rebuild and are the usual answer to "why is the
registry bill growing".

### 2. Buckets that are private by construction

```hcl
resource "aws_s3_bucket" "state" {
  bucket = "platform-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "AES256" }
  }
}

resource "aws_s3_bucket_policy" "state_tls_only" {
  bucket = aws_s3_bucket.state.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.state.arn, "${aws_s3_bucket.state.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}
```

**Both ARNs in the policy.** Bucket-level actions such as `ListBucket` apply to
the bucket ARN; object actions apply to `/*`. A policy with only one is the
most common S3 policy bug, and it half-works — which is worse than failing.

**Versioning on the state bucket is not optional.** A deleted state file is one
command from recovery with it, and a full manual re-import of every resource
without it. That is a lab of its own later in the path.

### 3. Push an image

```bash
aws ecr get-login-password --region us-east-1 \\
  | docker login --username AWS --password-stdin \\
    "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com"

SHA=$(git rev-parse --short HEAD)
REG="$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com"

docker build -t "$REG/platform/api:$SHA" .
docker push "$REG/platform/api:$SHA"
```

Tag with the commit SHA. `latest` cannot answer "what is running in
production", which is the question you will be asked during an incident.

---

## Verify it worked

```bash
# The scan ran, and you can read it
aws ecr describe-image-scan-findings \\
  --repository-name platform/api --image-id imageTag="$SHA" \\
  --query 'imageScanFindings.findingSeverityCounts'

# Immutable tags are enforced — this must FAIL
docker push "$REG/platform/api:$SHA"     # ImageTagAlreadyExistsException

# The lifecycle policy does what you think
aws ecr get-lifecycle-policy-preview --repository-name platform/api \\
  --query 'previewResults[].{tag:imageTags[0],action:action.type}' --output table

# No bucket is public
aws s3api get-public-access-block --bucket "$(terraform output -raw state_bucket)"

# Versioning recovers a delete
aws s3 cp test.txt "s3://$(terraform output -raw state_bucket)/test.txt"
aws s3 rm "s3://$(terraform output -raw state_bucket)/test.txt"
aws s3api list-object-versions --bucket "$(terraform output -raw state_bucket)" --prefix test.txt
# delete the delete marker to restore it
```

`get-lifecycle-policy-preview` is worth knowing: it shows what the policy
*would* expire without waiting for it to run.

---

## When it goes wrong

**`denied: Your authorization token has expired`**

ECR login tokens last 12 hours. Re-run `get-login-password`. In CI this must be
a pipeline step, not something a human did once.

**`name unknown: The repository does not exist`**

The repository is per-region and per-account. Check the region in the registry
hostname matches where you created it.

**`BucketAlreadyExists`**

Bucket names are unique across every AWS account on earth. The
`account_id` suffix in the example exists for exactly this reason.

**Images push but never get scanned**

`scan_on_push` was false, or basic scanning is off at the registry level.
`aws ecr describe-registry` shows the configuration.

**The lifecycle policy deleted more than expected**

Rules match in priority order and the first match wins. Always run
`get-lifecycle-policy-preview` before applying a new rule.

**`AccessDenied` from your own account on a bucket you own**

The TLS-only deny policy is doing its job, or Block Public Access is. Explicit
denies beat every allow.

---

## Clean up

```bash
aws ecr delete-repository --repository-name platform/api --force
aws s3 rm "s3://$(terraform output -raw state_bucket)" --recursive
terraform destroy -auto-approve
```

**Cost of this lab:** **Low.** ECR is $0.10/GB-month and S3 about $0.023/GB —
a few images and a state file are cents. The `--force` on the repository is
required because it holds images.
""",
}

# ── lab-04 · RDS and Secrets Manager ──────────────────────────────────────
REWRITES["lab-04-amazon-rds-postgresql-aws-secrets-manager-integration"] = {
    "criteria": [
        "The database is Multi-AZ and has no public endpoint — verified from outside the VPC.",
        "The password was generated by Terraform and appears in no file you wrote.",
        "An application retrieves the credentials from Secrets Manager at runtime.",
        "You can state what Multi-AZ protects against and what it does not.",
    ],
    "scenario": (
        "The database password is in `terraform.tfvars`, which is in Git. The "
        "instance is single-AZ, so a zone failure is an outage of unknown "
        "length, and `publicly_accessible` is true because that was how somebody "
        "connected once from a laptop."
    ),
    "body": """
## What you are building

```text
   private subnet 1a          private subnet 1b
  ┌──────────────────┐       ┌──────────────────┐
  │   RDS primary    │◀═════▶│   standby        │   synchronous replication
  └──────────────────┘       └──────────────────┘
          ▲                            ▲
          └──── one DNS endpoint ──────┘   failover swaps what it points to
```

**Multi-AZ is availability, not scale.** The standby serves no reads and cannot
be connected to. It exists so that losing an availability zone costs you 60–120
seconds of failover instead of a restore from backup. If you want read scaling,
that is a read replica, and it is a different feature.

It also roughly doubles the instance cost, which is a trade-off worth stating
rather than discovering.

---

## Build it

### 1. A password nobody types

```hcl
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}"    # avoid characters that break URLs
}
```

`random_password` generates a value and stores it **in Terraform state**. That
is the important consequence: your state file now contains a credential, which
is why the state bucket is encrypted and access-controlled. There is no way to
generate a secret in Terraform without this being true — the alternative is
letting Secrets Manager generate and rotate it, and having Terraform reference
it rather than create it.

`override_special` is not cosmetic. A `/` or `@` in a password breaks a
connection string that nobody escaped, and the failure surfaces as an
authentication error rather than a parsing one.

### 2. The database

```hcl
resource "aws_db_subnet_group" "main" {
  name       = "platform"
  subnet_ids = var.private_subnet_ids      # private, in two AZs
}

resource "aws_db_instance" "main" {
  identifier     = "platform"
  engine         = "postgres"
  engine_version = "16.4"
  instance_class = "db.t4g.micro"

  allocated_storage     = 20
  max_allocated_storage = 100              # autoscale storage, not compute
  storage_encrypted     = true

  db_name  = "platform"
  username = "platform_admin"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  publicly_accessible    = false           # the important line

  multi_az                = true
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  performance_insights_enabled = true
  deletion_protection          = true
  skip_final_snapshot          = false
  final_snapshot_identifier    = "platform-final-${formatdate("YYYYMMDDhhmm", timestamp())}"
}
```

`max_allocated_storage` enables storage autoscaling — the disk grows on its own
and never shrinks. Running out of storage on RDS takes the database down, and
this is the one-line prevention.

`deletion_protection = true` means `terraform destroy` fails until you turn it
off. That is deliberate friction, and it is correct for anything holding data.

### 3. The secret

```hcl
resource "aws_secretsmanager_secret" "db" {
  name                    = "platform/rds/credentials"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = aws_db_instance.main.username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = aws_db_instance.main.db_name
  })
}
```

Store the **endpoint alongside the password**. An application that reads one
secret and gets everything it needs to connect never has a host name in its
configuration — so a failover, a restore or a move to another region changes
one secret rather than every deployment.

`recovery_window_in_days` means a deleted secret is recoverable for a week.
It also means the name is reserved for that week, so recreating with the same
name fails — use `--force-delete-without-recovery` when iterating in a lab.

### 4. Reading it at runtime

```python
import boto3, json

def credentials():
    client = boto3.client("secretsmanager")
    raw = client.get_secret_value(SecretId="platform/rds/credentials")
    return json.loads(raw["SecretString"])
```

No password in the image, in an environment variable, or in a config file. The
permission to read the secret is IRSA or an instance profile.

---

## Verify it worked

```bash
# Multi-AZ, private, encrypted
aws rds describe-db-instances --db-instance-identifier platform \\
  --query 'DBInstances[0].{multiAZ:MultiAZ,public:PubliclyAccessible,enc:StorageEncrypted,az:AvailabilityZone,standby:SecondaryAvailabilityZone}'

# The endpoint does not resolve to anything public
dig +short "$(terraform output -raw db_endpoint)"     # a 10.x address

# From OUTSIDE the VPC — this must fail
nc -zv -w5 "$(terraform output -raw db_endpoint)" 5432

# From a pod or instance INSIDE — this must work
kubectl run pg --rm -it --image=postgres:16-alpine --restart=Never -- \\
  psql "postgresql://platform_admin:$(aws secretsmanager get-secret-value \\
    --secret-id platform/rds/credentials --query SecretString --output text \\
    | jq -r .password)@<endpoint>:5432/platform" -c "SELECT version();"

# The password is nowhere in your source
grep -ri "password" --include="*.tf" --include="*.tfvars" . | grep -v random_password
```

The pair of connection tests is the point. One proves it works; the other
proves the isolation is real.

---

## When it goes wrong

**Connection times out from inside the VPC**

The security group, not the database. It must allow 5432 from the client's
security group. A timeout is a firewall; `connection refused` would mean
something answered.

**`FATAL: password authentication failed` with the right password**

A special character was mangled somewhere in a connection string. This is what
`override_special` prevents.

**`InvalidParameterCombination: Cannot find version 16.4`**

Engine versions differ per region and are retired. `aws rds
describe-db-engine-versions --engine postgres --query
'DBEngineVersions[].EngineVersion'`.

**`terraform destroy` refuses**

`deletion_protection = true`, working as intended. Set it false, apply, then
destroy.

**Recreating the secret fails with `already scheduled for deletion`**

The recovery window still holds the name. Delete it with
`--force-delete-without-recovery` when you are iterating in a lab.

**Failover took longer than expected**

Multi-AZ failover is 60–120 seconds and the DNS endpoint changes what it points
to. Clients that cache DNS forever reconnect slowly — set a connection timeout
and let the pool retry.

---

## Clean up

```bash
aws rds modify-db-instance --db-instance-identifier platform \\
  --no-deletion-protection --apply-immediately
terraform destroy -auto-approve
aws secretsmanager delete-secret --secret-id platform/rds/credentials \\
  --force-delete-without-recovery
aws rds describe-db-snapshots --query 'DBSnapshots[].DBSnapshotIdentifier'
```

**Cost of this lab:** **Billable.** `db.t4g.micro` Multi-AZ is roughly
$0.05/hour — about $30/month if left running, twice the single-AZ price.
Snapshots bill separately after the instance is gone, so check the last command.
""",
}

# ── lab-06 · Remote state, Jenkins host, AWS Backup ───────────────────────
REWRITES["lab-06-jenkins-ec2-instance-s3-backend-aws-backup-vault"] = {
    "criteria": [
        "State lives in S3 with DynamoDB locking, and a second concurrent apply is refused.",
        "The state bucket has versioning, so a deleted state file is recoverable.",
        "The Jenkins host has a stable address that survives a stop and start.",
        "A backup plan exists and you verified a recovery point was actually created.",
    ],
    "scenario": (
        "Terraform state is a file on one laptop. Two people ran `apply` at the "
        "same time last week and the state now disagrees with reality in ways "
        "nobody has fully mapped.\n\n"
        "The Jenkins server has no backups and its public IP changes every time "
        "it is stopped, which breaks every webhook."
    ),
    "body": """
## What you are building

The bootstrap problem first: **the backend that stores state cannot itself be
created by the configuration that uses it.** So this is two stages, and that is
not an accident of tooling.

```text
  stage 1  →  create the bucket + lock table with LOCAL state
  stage 2  →  every other stack uses them as a remote backend
```

### 1. The backend, created locally

```hcl
resource "aws_s3_bucket" "state" {
  bucket = "platform-tfstate-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_dynamodb_table" "lock" {
  name         = "platform-tfstate-lock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}
```

Two properties doing two different jobs:

- **Versioning** protects against a bad write or a deletion. Every previous
  state is retrievable.
- **The lock table** protects against two people applying at once. Terraform
  writes a lock item before touching state and removes it afterwards; a second
  run sees the item and refuses.

`PAY_PER_REQUEST` costs effectively nothing at this volume — a few writes per
apply.

### 2. Point the other stacks at it

```hcl
terraform {
  backend "s3" {
    bucket         = "platform-tfstate-111122223333"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "platform-tfstate-lock"
    encrypt        = true
  }
}
```

```bash
terraform init -migrate-state
```

The `key` is a path inside the bucket. One bucket holding
`production/…`, `staging/…` and `network/…` keeps each stack's state separate
while sharing one lock table — which is what you want, because a lock is per
state file.

**The backend block cannot use variables.** It is read before Terraform
evaluates anything, so these values are literals or come from
`-backend-config` flags. This surprises everyone once.

### 3. A host with an address that does not move

```hcl
resource "aws_instance" "jenkins" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = "t3.medium"
  subnet_id              = var.public_subnet_id
  vpc_security_group_ids = [aws_security_group.jenkins.id]
  iam_instance_profile   = aws_iam_instance_profile.jenkins.name

  metadata_options {
    http_tokens = "required"        # IMDSv2
  }

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = <<-EOF
    #!/bin/bash
    dnf install -y java-17-amazon-corretto docker git
    systemctl enable --now docker
    curl -fsSL https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key \
      -o /etc/pki/rpm-gpg/jenkins.key
    rpm --import /etc/pki/rpm-gpg/jenkins.key
    dnf install -y jenkins
    systemctl enable --now jenkins
  EOF

  tags = { Name = "jenkins", Backup = "daily" }
}

resource "aws_eip" "jenkins" {
  instance = aws_instance.jenkins.id
  domain   = "vpc"
}
```

A public IP is released when an instance stops and a different one is assigned
on start. An **Elastic IP** stays. That matters here because GitHub webhooks
point at an address, and every stop would otherwise mean reconfiguring them.

An EIP is free while attached and **billed while unattached**, which is the
reverse of what people assume and a common small mystery charge.

### 4. Backups, by tag

```hcl
resource "aws_backup_vault" "main" {
  name = "platform"
}

resource "aws_backup_plan" "daily" {
  name = "daily-30d"
  rule {
    rule_name         = "daily"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 5 * * ? *)"      # 05:00 UTC
    start_window      = 60
    completion_window = 180
    lifecycle { delete_after = 30 }
  }
}

resource "aws_backup_selection" "tagged" {
  name         = "tagged-daily"
  plan_id      = aws_backup_plan.daily.id
  iam_role_arn = aws_iam_role.backup.arn

  selection_tag {
    type  = "STRINGEQUAL"
    key   = "Backup"
    value = "daily"
  }
}
```

Selecting **by tag** rather than by resource ID means a new instance carrying
`Backup = daily` is protected the moment it exists. Selecting by ID means
somebody has to remember, and eventually will not.

---

## Verify it worked

```bash
# State is remote, and locking works
terraform state list | head
terraform plan &                       # hold a lock
terraform plan                         # must report: Error acquiring the state lock
wait

# A deleted state file is recoverable
aws s3api list-object-versions --bucket <state-bucket> --prefix production/terraform.tfstate \\
  --query 'Versions[].[VersionId,LastModified]' --output table

# The address survives a stop/start
aws ec2 stop-instances --instance-ids <id> && aws ec2 wait instance-stopped --instance-ids <id>
aws ec2 start-instances --instance-ids <id> && aws ec2 wait instance-running --instance-ids <id>
aws ec2 describe-addresses --query 'Addresses[].[PublicIp,InstanceId]' --output table

# A recovery point actually exists — not just a plan that says it will
aws backup list-recovery-points-by-backup-vault --backup-vault-name platform \\
  --query 'RecoveryPoints[].[CreationDate,Status,ResourceArn]' --output table
```

That last one is the difference between "backups are configured" and "backups
happened". A plan with no recovery points is a plan that has never run, and you
find that out either now or during a restore.

---

## When it goes wrong

**`Error acquiring the state lock`**

Either someone is genuinely applying, or a previous run died holding it.
`terraform force-unlock <lock-id>` — and confirm nobody is running first,
because forcing a live lock is how state gets corrupted.

**`NoSuchBucket` on `terraform init`**

The bootstrap stage has not been applied, or the backend block names the wrong
region. The backend cannot create its own bucket.

**Variables not allowed in the backend block**

Correct, and by design. Use `-backend-config=key=value` or a
`backend.hcl` file.

**Jenkins is not on port 8080 after boot**

Read `/var/log/cloud-init-output.log`. A failed user-data script leaves a
healthy-looking instance with nothing installed.

**The Elastic IP shows a charge**

It is unattached. `aws ec2 describe-addresses --query
'Addresses[?AssociationId==null]'` and release it.

**Backup plan exists, no recovery points**

The tag does not match, or the IAM role lacks the AWS Backup service policy.
`aws backup list-backup-jobs --by-state FAILED` gives the reason.

---

## Clean up

```bash
# Backups outlive the instance — delete recovery points first
aws backup list-recovery-points-by-backup-vault --backup-vault-name platform \\
  --query 'RecoveryPoints[].RecoveryPointArn' --output text
terraform destroy -auto-approve
aws s3 rm s3://<state-bucket> --recursive        # only when finished for good
```

**Cost of this lab:** **Billable.** A `t3.medium` is about $0.042/hour (~$30/month).
S3, DynamoDB on-demand and the EIP while attached are cents. Recovery points bill
until deleted and survive `terraform destroy`.
""",
}


def rewrite(lab_id: str, spec: dict) -> None:
    path = LABS / f"{lab_id}.en.mdx"
    text = path.read_text(encoding="utf-8")
    head, fm, _ = text.split("---", 2)

    # Success criteria became the "you are done when" checklist on the page, so
    # import artifacts like "Step 1: Deploy ECR & S3 Infrastructure" have to go.
    block = "successCriteria:\n" + "\n".join(f'  - "{c}"' for c in spec["criteria"])
    fm = re.sub(r"successCriteria:\n(?:  - .*\n|  \[\]\n)+", block + "\n", fm, count=1)

    # The source repository is gone; a path into it is not a reproducible step.
    fm = re.sub(r'^sourceFile: ".*"\n', "", fm, flags=re.M)
    fm = re.sub(r"^updated: .*$", "updated: 2026-08-10", fm, flags=re.M)

    body = f"## The scenario\n\n{spec['scenario']}\n\n{spec['body'].strip()}\n"
    path.write_text(f"{head}---{fm}---\n\n{body}", encoding="utf-8")

    # The challenge shares the criteria — they are what it is graded against.
    cpath = LABS / f"{lab_id}-challenge.en.mdx"
    if cpath.exists():
        ct = cpath.read_text(encoding="utf-8")
        chead, cfm, cbody = ct.split("---", 2)
        cfm = re.sub(r"successCriteria:\n(?:  - .*\n|  \[\]\n)+", block + "\n", cfm, count=1)
        cfm = re.sub(r'^sourceFile: ".*"\n', "", cfm, flags=re.M)
        cpath.write_text(f"{chead}---{cfm}---{cbody}", encoding="utf-8")


def main() -> None:
    for lab_id, spec in REWRITES.items():
        rewrite(lab_id, spec)
        print(f"  rewrote {lab_id}")
    print(f"\n{len(REWRITES)} labs rewritten (guided + challenge criteria)")


if __name__ == "__main__":
    main()
