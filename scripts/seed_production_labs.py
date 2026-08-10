#!/usr/bin/env python3
"""
Close the remaining capability gaps in the project path.

Twelve labs, chosen because each one is a hole in the journey rather than
another entry in a category that is already covered. The AWS and Terraform
sections are deliberately left almost alone: they are the best-covered parts
of the path already.

One item from the review is not here. "EC2 Security & IAM with SSM —
Production Hardening" would substantially repeat lab-aws-ec2-cloudwatch-ssm,
which already teaches an instance with no inbound ports, SSM Session Manager
and an instance profile. Adding it would be filler, which is the thing this
catalogue keeps deciding not to do. Ansible Roles & Idempotency takes its slot,
since two Ansible labs was the thinnest section on the path.

Run: python scripts/seed_production_labs.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

K8S_CLEANUP = ["kubectl delete namespace <ns> --ignore-not-found", "kubectl get all -A | grep -v kube-system"]

SPECS: list[dict] = [
    {
        "id": "lab-linux-ssh-hardening",
        "order": 24,
        "title": "Linux Security & SSH Hardening",
        "domain": "linux",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — a VM, a container, or a spare machine.",
        "description": "Lock down SSH without locking yourself out, and know how to recover when you inevitably do.",
        "skills": [
            "Move from password login to key-only authentication safely",
            "Grant administrative access without handing out root",
            "Verify a change from a second session before trusting it",
        ],
        "tools": ["A Linux host you can reach another way (console, snapshot, or a second VM)"],
        "criteria": [
            "Key-based login works for a non-root administrative user.",
            "Password authentication and direct root login are both refused.",
            "You proved the new configuration in a second session before closing the first.",
            "A firewall permits SSH and nothing else you did not intend.",
        ],
        "scenario": (
            "A server is reachable on port 22 with password authentication and a "
            "shared root login. It is being scanned within minutes of being "
            "created — that is not paranoia, it is what the auth log shows.\n\n"
            "This lab closes it down. The order matters more than the settings: "
            "get it wrong and you lock yourself out of a machine you cannot "
            "physically reach."
        ),
        "body": """
> **Keep your current session open until the very end.** Every step below is
> verified from a *second* connection. If something is wrong, the first session
> is the only way back in.

## 1. An administrative user that is not root

```bash
sudo adduser --gecos "" deploy
sudo usermod -aG sudo deploy        # wheel on RHEL
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Root should not be a login account. Every action becomes anonymous the moment
several people share one, and `sudo` records who did what.

## 2. A key, and the permissions that make it work

On your **own machine**:

```bash
ssh-keygen -t ed25519 -C "deploy@egykode" -f ~/.ssh/egykode
ssh-copy-id -i ~/.ssh/egykode.pub deploy@<host>
```

Ed25519 over RSA: shorter, faster, and no key-size decision to get wrong.

If `ssh-copy-id` is unavailable, the permissions are the whole trick:

```bash
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys < key.pub
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

**SSH silently ignores an `authorized_keys` it considers too permissive**, and
logs nothing helpful. If key auth "does not work", check these two modes first.

## 3. Prove the key works — before changing anything

```bash
# from a SECOND terminal, leaving the first connected
ssh -i ~/.ssh/egykode deploy@<host> 'whoami && sudo -n true && echo "sudo ok"'
```

Do not proceed until this succeeds. This single step is the difference between
a hardening exercise and a support ticket.

## 4. Now close the doors

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers deploy
EOF

sudo sshd -t          # ALWAYS test the config first
sudo systemctl reload sshd
```

`sshd -t` parses the configuration without applying it. A typo here plus a
`restart` is how a machine becomes unreachable — and `reload` keeps existing
sessions alive, where `restart` does not.

A drop-in under `sshd_config.d/` rather than editing `sshd_config` means a
package upgrade cannot silently revert your changes.

## 5. Verify from a third session

```bash
ssh -i ~/.ssh/egykode deploy@<host> 'echo ok'      # must succeed
ssh -o PreferredAuthentications=password deploy@<host>   # must be refused
ssh root@<host>                                     # must be refused
```

Only when all three behave should you close the original session.

## 6. A firewall that allows what you actually use

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status verbose
```

Add the SSH rule **before** enabling. `ufw enable` on a remote machine with no
SSH rule disconnects you immediately, and it is the single most common way
people lock themselves out.

## 7. Read the log you just protected

```bash
sudo journalctl -u ssh --since "1 hour ago" | grep -ci "failed password"
```

Run this on any host that has been on the internet for a day. The number is
usually in the thousands, and it is the argument for everything above.
""",
        "failures": [
            ("Key auth fails with no useful error",
             "Permissions. `~/.ssh` must be 700 and `authorized_keys` 600, owned by the user. `sudo journalctl -u ssh` shows 'Authentication refused: bad ownership'."),
            ("Locked out after reloading sshd",
             "Use the provider's console or serial access, or attach the disk to another instance. This is why step 3 exists."),
            ("`ufw enable` disconnected you",
             "The allow rule must come first. Recover via console, then `ufw allow 22/tcp`."),
            ("`sudo` asks for a password in scripts",
             "Expected, and correct. Use a dedicated automation user with a narrowly scoped NOPASSWD rule rather than disabling it globally."),
        ],
    },
    {
        "id": "lab-docker-networking-volumes-healthchecks",
        "order": 11,
        "title": "Docker Networking, Volumes & Health Checks",
        "domain": "docker",
        "level": "beginner",
        "phase": "build-and-containers",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — Docker on your own machine.",
        "description": "Make four containers find each other, keep data across a restart, and start in an order that actually works.",
        "skills": [
            "Reach one container from another by name",
            "Tell a bind mount from a volume, and pick correctly",
            "Use a health check to control startup order",
        ],
        "tools": ["Docker", "Docker Compose"],
        "criteria": [
            "The application reaches PostgreSQL and Redis by service name, with no IP addresses anywhere.",
            "Database data survives `docker compose down` and returns after `up`.",
            "The application waits for the database to be *ready*, not merely started.",
            "You can explain why two containers on different networks cannot see each other.",
        ],
        "scenario": (
            "The application connects fine on your machine and fails in the "
            "pipeline with 'connection refused'. It starts before the database is "
            "ready, and everything it wrote last night is gone.\n\n"
            "These three problems are the same three you will meet again as "
            "Services, PersistentVolumes and readiness probes — which is why this "
            "lab sits before Kubernetes."
        ),
        "body": """
## 1. Names, not addresses

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: labonly
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5

  cache:
    image: redis:7-alpine

  app:
    image: curlimages/curl
    command: ["sh", "-c", "sleep 3600"]
    environment:
      DB_HOST: db          # a name, not an IP
      REDIS_HOST: cache
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started

volumes:
  pgdata:
```

```bash
docker compose up -d
docker compose exec app sh -c 'nslookup db; nslookup cache'
docker compose exec app curl -s --max-time 3 telnet://db:5432 && echo reachable
```

Compose puts every service on one network and makes each **service name**
resolvable. Container IPs change on every recreate, so a hardcoded address is
broken by design.

## 2. Prove isolation is real

```bash
docker network create isolated
docker run -d --name lonely --network isolated alpine sleep 3600
docker exec lonely ping -c1 db      # fails: different network
```

A container can only reach what shares a network with it. This is the same
model as a Kubernetes NetworkPolicy, learned in thirty seconds.

## 3. Volumes versus bind mounts

```bash
docker compose exec db psql -U postgres -c "CREATE TABLE t (id int); INSERT INTO t VALUES (1);"
docker compose down          # containers destroyed, named volume kept
docker compose up -d
docker compose exec db psql -U postgres -c "SELECT * FROM t;"    # still there

docker compose down -v       # -v ALSO removes named volumes
```

| | Named volume | Bind mount |
| --- | --- | --- |
| Written as | `pgdata:/var/lib/...` | `./src:/app` |
| Managed by | Docker | You |
| Survives `down` | Yes | Yes (it is your directory) |
| Removed by `down -v` | **Yes** | No |
| Right for | Databases, state | Source code in development |

`down -v` is the command that deletes data. It is one character from `down`,
and it is why the backup lab exists.

## 4. Started is not ready

```bash
docker compose down && docker compose up -d
docker compose ps       # db shows "healthy", not merely "running"
```

Plain `depends_on` waits for the container to **start**, which for PostgreSQL is
several seconds before it accepts connections. That gap is exactly why an app
crashes on first boot in CI and works locally, where the database was already
running.

`condition: service_healthy` ties startup to the health check instead:

```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 5
      start_period: 10s     # grace before failures count
```

**This is a readiness probe.** The Kubernetes lab later uses the same idea with
different syntax.

## 5. Break each one deliberately

```bash
# wrong service name
docker compose exec app curl -s --max-time 3 telnet://database:5432 || echo "DNS: no such host"

# right host, wrong port
docker compose exec app curl -s --max-time 3 telnet://db:5433 || echo "refused or timeout"
```

Learn the difference now: **no such host** is name resolution, **refused** means
something answered, **timeout** means nothing did.
""",
        "cleanup": ["docker compose down -v", "docker network rm isolated", "docker volume prune -f"],
        "failures": [
            ("`could not resolve host` between containers",
             "They are on different networks, or you used the container name instead of the service name. `docker network inspect <net>` lists members."),
            ("Data disappears after `down`",
             "You used `down -v`, or the volume is anonymous. Named volumes in the top-level `volumes:` block persist."),
            ("The app still starts too early",
             "`depends_on` without `condition: service_healthy` waits only for start. The dependency needs a healthcheck for the condition to mean anything."),
            ("The healthcheck never turns healthy",
             "The command runs *inside* the container — `pg_isready` must exist there. `docker inspect --format '{{json .State.Health}}' <c>` shows the output."),
        ],
    },
    {
        "id": "lab-aws-route53-acm-dns",
        "order": 13,
        "title": "Production DNS & TLS with Route 53 and ACM",
        "domain": "aws",
        "level": "intermediate",
        "phase": "cloud",
        "minutes": 50,
        "cloud_cost": True,
        "cost": "**Low.** A Route 53 hosted zone is $0.50/month and queries are fractions of a cent. ACM certificates are free. A domain, if you do not have one, is roughly $12/year.",
        "description": "Take a site from an IP address to a real domain over HTTPS, with a certificate that renews itself.",
        "skills": [
            "Choose between A, CNAME and ALIAS records deliberately",
            "Validate an ACM certificate by DNS and understand why it renews",
            "Plan a cutover around TTL instead of being surprised by it",
        ],
        "tools": ["AWS CLI v2, configured", "A domain you control"],
        "criteria": [
            "The site answers on your domain over HTTPS with a valid certificate.",
            "You can state why an ALIAS is used at the apex instead of a CNAME.",
            "The certificate's validation record is present and you can explain why it must stay.",
            "You can name the TTL on your record and what it means for a cutover.",
        ],
        "cleanup": [
            "aws route53 list-resource-record-sets --hosted-zone-id <id>",
            "# Delete non-default records, then the zone (a hosted zone bills monthly):",
            "aws route53 delete-hosted-zone --id <id>",
            "aws acm delete-certificate --certificate-arn <arn>",
        ],
        "scenario": (
            "The platform is reachable at `d3bbb7tnfglcfh.cloudfront.net`. That is "
            "fine for a test and unusable for anything real.\n\n"
            "This is the same work that put egykode.com in front of this page, "
            "including the mistake that cost an hour."
        ),
        "body": """
## 1. A hosted zone

```bash
aws route53 create-hosted-zone --name example.com \\
  --caller-reference "$(date +%s)" \\
  --query 'DelegationSet.NameServers' --output table
```

Point your registrar's nameservers at those four. Until that propagates, Route
53 is authoritative for a domain nobody asks it about.

```bash
dig NS example.com +short          # must return the Route 53 nameservers
```

## 2. A certificate, validated by DNS

```bash
ARN=$(aws acm request-certificate --domain-name example.com \\
  --subject-alternative-names "www.example.com" \\
  --validation-method DNS --region us-east-1 \\
  --query CertificateArn --output text)

aws acm describe-certificate --certificate-arn "$ARN" --region us-east-1 \\
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' --output table
```

**us-east-1 regardless of where anything else runs** — CloudFront only accepts
certificates from that region, and a certificate in the wrong one simply does
not appear in the console dropdown.

Create the CNAME it prints, then:

```bash
aws acm wait certificate-validated --certificate-arn "$ARN" --region us-east-1
```

**Leave the validation record in place forever.** ACM re-checks it to renew
automatically; delete it and the certificate silently stops renewing, which
surfaces thirteen months later as an outage.

## 3. The records

```json
{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "example.com",
      "Type": "A",
      "AliasTarget": {
        "HostedZoneId": "Z2FDTNDATAQYW2",
        "DNSName": "d3bbb7tnfglcfh.cloudfront.net",
        "EvaluateTargetHealth": false
      }
    }
  }]
}
```

| | `A` | `CNAME` | `ALIAS` |
| --- | --- | --- | --- |
| Points at | A fixed IP | Another name | An AWS resource |
| Allowed at the apex | Yes | **No** | Yes |
| Follows a changing target | No | Yes | Yes |
| Query cost | — | Billed | **Free** |

The apex restriction is not an AWS quirk: DNS forbids a CNAME alongside the
`SOA` and `NS` records every zone apex must have. ALIAS is Route 53 resolving it
internally, which is why it works there and a CNAME does not.

`Z2FDTNDATAQYW2` is CloudFront's fixed hosted zone id — the same for every
distribution, and worth recognising rather than looking up each time.

## 4. Verify all four layers

```bash
dig example.com +short
curl -sI https://example.com | head -3
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \\
  | openssl x509 -noout -subject -dates
```

## 5. TTL, and cutovers

```bash
dig example.com | grep -A1 "ANSWER SECTION"
```

The number before the record type is the remaining TTL. Resolvers everywhere
will keep serving the old answer until it expires.

**Lower the TTL a day before a migration, not during it.** Lowering it at
cutover changes nothing for anyone already holding the old record at the old
long TTL — which is the single most common DNS migration mistake.
""",
        "failures": [
            ("The certificate stays `PENDING_VALIDATION`",
             "The CNAME is wrong or proxied. Many DNS providers append the zone automatically — paste the name without it, and check with `dig`."),
            ("CloudFront will not offer your certificate",
             "It is not in us-east-1. Certificates for CloudFront must be requested there whatever region your other resources use."),
            ("`CNAMEAlreadyExists` when adding the alias",
             "Another distribution already claims that alternate name. Remove it there first."),
            ("Old content after the cutover",
             "The TTL has not expired. `dig` shows the remaining seconds; nothing you change makes a cached answer expire sooner."),
        ],
    },
    {
        "id": "lab-terraform-testing-ci",
        "order": 14,
        "title": "Terraform Validation, Linting & CI",
        "domain": "terraform",
        "level": "intermediate",
        "phase": "iac",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — everything here runs without creating infrastructure. `plan` reads AWS but changes nothing.",
        "description": "Build the gate that runs before every apply: format, validate, lint, scan, and a plan a human approves.",
        "skills": [
            "Chain the checks that catch a bad change before it reaches AWS",
            "Apply exactly the plan that was reviewed",
            "Detect drift on a schedule rather than during an incident",
        ],
        "tools": ["Terraform >= 1.6", "tflint", "trivy or checkov", "A GitHub repository"],
        "criteria": [
            "`fmt`, `validate`, `tflint` and a security scan all run in CI on a pull request.",
            "A misformatted or insecure change fails the pipeline — proven deliberately.",
            "The apply consumes a saved plan artifact rather than re-planning.",
            "A scheduled run reports drift when a resource is changed outside Terraform.",
        ],
        "scenario": (
            "Terraform runs from someone's laptop. Reviews read the HCL, not the "
            "plan, so nobody notices the `-/+` that would recreate the database "
            "until it happens.\n\n"
            "This lab puts the checks in front of the apply."
        ),
        "body": """
## The order, and why

```text
fmt  →  validate  →  tflint  →  security scan  →  plan  →  review  →  apply
```

Cheapest first. `fmt` takes a second; a security scan takes twenty; `plan` calls
AWS. Failing early means the expensive steps only run on changes that deserve
them.

## 1. The local checks

```bash
terraform fmt -check -recursive      # -check fails rather than rewriting
terraform init -backend=false        # no state needed to validate syntax
terraform validate
```

`-backend=false` matters in CI: validation needs no credentials and no state, so
it can run on a pull request from a fork.

## 2. Lint what `validate` cannot see

```bash
tflint --init
tflint --recursive
```

`validate` checks syntax and types. `tflint` catches the things that are valid
HCL and wrong anyway: a nonexistent instance type, a deprecated argument, a
missing required tag.

## 3. Scan for insecure defaults

```bash
trivy config --severity HIGH,CRITICAL --exit-code 1 .
```

Catches the classics — an unencrypted bucket, a security group open to
`0.0.0.0/0`, public access left unblocked. `--exit-code 1` is what makes it a
gate rather than a report.

## 4. Plan as an artifact

```bash
terraform plan -out=tfplan -input=false
terraform show -no-color tfplan > plan.txt
```

Then apply **exactly that**:

```bash
terraform apply -input=false tfplan
```

This is the important habit. Re-planning at apply time means the change that
runs is not the change that was reviewed — the world may have moved in between.
A saved plan cannot drift between approval and execution.

## 5. The workflow

```yaml
name: terraform
on:
  pull_request:
    paths: ["infrastructure/**"]
  schedule:
    - cron: "0 6 * * 1"      # weekly drift check

permissions:
  contents: read
  id-token: write
  pull-requests: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - run: terraform fmt -check -recursive
      - run: terraform init -backend=false
      - run: terraform validate

      - uses: terraform-linters/setup-tflint@v4
      - run: tflint --recursive

      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: config
          severity: HIGH,CRITICAL
          exit-code: "1"

      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PLAN_ROLE }}
          aws-region: us-east-1

      - run: terraform init
      - run: terraform plan -out=tfplan -no-color | tee plan.txt

      - uses: actions/upload-artifact@v4
        with:
          name: tfplan
          path: tfplan
```

**The plan role should be read-only.** A pull request from anywhere should be
able to *show* you what it would do and never be able to do it.

## 6. Drift detection

```bash
terraform plan -detailed-exitcode
# 0 = no changes, 1 = error, 2 = drift
```

That exit code is designed for exactly this. On a schedule, `2` means someone
changed AWS by hand — and finding that on a Monday morning is considerably
better than finding it mid-incident, when you cannot tell whether the drift is
the cause or a previous fix.
""",
        "failures": [
            ("`fmt -check` fails and you cannot see why",
             "`terraform fmt -diff -recursive` prints the exact change it wants."),
            ("`validate` fails in CI, passes locally",
             "A different Terraform version. Pin it with `setup-terraform`'s `terraform_version`."),
            ("The scanner flags something you accept",
             "Suppress it inline with a documented reason. A blanket `--skip` teaches everyone to ignore the tool."),
            ("The saved plan is rejected at apply",
             "State moved since the plan. That is the protection working — re-plan and review again."),
        ],
    },
    {
        "id": "lab-ansible-roles-idempotency",
        "order": 17,
        "title": "Ansible Roles, Variables & Idempotency",
        "domain": "ansible",
        "level": "intermediate",
        "phase": "iac",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — target a local container or VM.",
        "description": "Write a role that configures a server, then prove the second run changes nothing.",
        "skills": [
            "Structure a role so callers can override what they should",
            "Write tasks that report changed only when something changed",
            "Use handlers so a restart happens once, not per task",
        ],
        "tools": ["Ansible 2.15+", "A target host or container"],
        "criteria": [
            "A role installs and configures a service from variables, with no hardcoded values in tasks.",
            "The second run reports `changed=0` — demonstrated, not assumed.",
            "A configuration change triggers exactly one restart, via a handler.",
            "You can name two ways a task silently breaks idempotency.",
        ],
        "scenario": (
            "The playbook works. Running it twice restarts production, because "
            "every task reports `changed` whether or not anything changed.\n\n"
            "Idempotency is the property that makes configuration management safe "
            "to run continuously, and it does not happen by accident."
        ),
        "body": """
## 1. The role layout

```text
roles/webserver/
  tasks/main.yml       what to do
  handlers/main.yml    things triggered by notify
  defaults/main.yml    variables the caller may override
  vars/main.yml        variables the caller should not
  templates/           Jinja2 rendered onto the host
  files/               copied verbatim
  meta/main.yml        dependencies
```

Ansible loads these by name — putting a file in the right directory *is* the
wiring.

**`defaults/` versus `vars/` is the decision that makes a role reusable.** Both
define variables; they differ in precedence. `defaults` sits near the bottom, so
inventory, playbook and `--extra-vars` all override it. `vars` sits near the top
and is effectively unoverridable.

Every variable a caller might reasonably change belongs in `defaults`. Put it in
`vars` and you have written a role only you can use.

## 2. Tasks that tell the truth

```yaml
# roles/webserver/tasks/main.yml
- name: Install nginx
  ansible.builtin.package:
    name: "{{ webserver_package }}"
    state: present

- name: Deploy configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    owner: root
    mode: "0644"
    validate: "nginx -t -c %s"     # refuse to install a broken config
  notify: Restart nginx

- name: Ensure nginx is running and enabled
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true
```

Every module here **checks state before acting**. `package` does nothing if it is
installed; `template` compares a checksum and rewrites only on difference.

`validate:` is the detail worth copying — Ansible renders to a temporary file,
runs `nginx -t` against it, and only installs it if it parses. A broken template
can never take the service down.

## 3. Handlers: once, at the end

```yaml
# roles/webserver/handlers/main.yml
- name: Restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

Three tasks can all `notify` this and nginx restarts **once**, after everything
has converged. Restarting inline per task would bounce the service repeatedly
during a single run.

## 4. Prove it

```bash
ansible-playbook -i inventory site.yml
# PLAY RECAP: ok=4 changed=3

ansible-playbook -i inventory site.yml
# PLAY RECAP: ok=4 changed=0     <- the point of the whole lab
```

`changed=0` on the second run is the definition of idempotent. If it is not
zero, something reports change every time, and you can find it:

```bash
ansible-playbook -i inventory site.yml --check --diff
```

`--check` is a dry run; `--diff` shows exactly what it wants to alter.

## 5. The two ways people break it

**`command` and `shell` always report changed.** They have no idea what state
they produce, so Ansible assumes the worst:

```yaml
# breaks idempotency
- name: Extract archive
  ansible.builtin.shell: tar xzf /tmp/app.tar.gz -C /opt/app

# fixed — a guard that tells Ansible when the work is already done
- name: Extract archive
  ansible.builtin.unarchive:
    src: /tmp/app.tar.gz
    dest: /opt/app
    remote_src: true
    creates: /opt/app/bin/start
```

**A template that renders differently each run.** A timestamp or a random value
in the template makes the checksum differ every time, so it rewrites and
notifies a restart forever. Anything genuinely dynamic belongs outside the
managed file.
""",
        "failures": [
            ("The second run still reports changed",
             "`--check --diff` names the task. Almost always a `shell`/`command` without `creates`, or a template with dynamic content."),
            ("The handler never runs",
             "Handlers run at the end of a play, and are skipped entirely if the notifying task did not change. Force with `--force-handlers` when debugging."),
            ("Overriding a variable has no effect",
             "It is in `vars/` rather than `defaults/`. `vars` outranks nearly everything a caller can set."),
            ("A bad template took the service down",
             "Add `validate:` to the template task so a config that does not parse is never installed."),
        ],
    },
    {
        "id": "lab-k8s-rbac-service-accounts",
        "order": 29,
        "title": "Kubernetes RBAC & Service Accounts",
        "domain": "kubernetes",
        "level": "intermediate",
        "phase": "kubernetes",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — kind or minikube.",
        "description": "Grant a namespace read-only access, give a workload its own identity, and verify with the cluster rather than by hoping.",
        "skills": [
            "Assemble Role, RoleBinding, ClusterRole and ClusterRoleBinding correctly",
            "Give a Pod an identity that is not the default ServiceAccount",
            "Verify permissions with `auth can-i` instead of by trial",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "A subject can list Pods in one namespace and is refused in another.",
            "A workload runs as a dedicated ServiceAccount, not `default`.",
            "`kubectl auth can-i --list` output matches what you intended.",
            "You can explain why RBAC has no deny rule.",
        ],
        "cleanup": K8S_CLEANUP,
        "scenario": (
            "Every workload in the cluster runs as the `default` ServiceAccount, "
            "and its token is mounted into every Pod. Anything that reaches a "
            "container reaches the Kubernetes API with it.\n\n"
            "NetworkPolicies control what a Pod can *talk to*. RBAC controls what "
            "it can *do*, and you need both."
        ),
        "body": """
## 1. Four objects, two questions

| Object | Answers | Scope |
| --- | --- | --- |
| `Role` | What may be done? | One namespace |
| `ClusterRole` | The same, cluster-wide | Whole cluster |
| `RoleBinding` | Who gets it? | One namespace |
| `ClusterRoleBinding` | Who gets it everywhere? | Whole cluster |

Permissions and subjects are deliberately separate, which is what lets one
`ClusterRole` be bound differently in twenty namespaces.

## 2. A Role, which names nobody

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: team-a
  name: pod-reader
rules:
  - apiGroups: [""]                 # "" is the core API group
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
```

`pods/log` is a subresource and a separate grant — `get pods` does not include
reading their logs, which surprises people.

## 3. A RoleBinding, which names the subject

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  namespace: team-a
  name: team-a-read
subjects:
  - kind: ServiceAccount
    name: viewer
    namespace: team-a
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

## 4. Verify against the cluster

```bash
kubectl auth can-i list pods -n team-a --as system:serviceaccount:team-a:viewer   # yes
kubectl auth can-i list pods -n team-b --as system:serviceaccount:team-a:viewer   # no
kubectl auth can-i delete pods -n team-a --as system:serviceaccount:team-a:viewer # no
kubectl auth can-i --list -n team-a --as system:serviceaccount:team-a:viewer
```

**`--as` asks the API server to evaluate the real policy.** Reading YAML tells
you what you meant; this tells you what the cluster will actually do, and they
differ more often than anyone expects.

## 5. A workload with its own identity

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: api
  namespace: team-a
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  template:
    spec:
      serviceAccountName: api
      automountServiceAccountToken: false    # it never calls the API
```

That last line matters more than it looks. Kubernetes mounts an API token into
every Pod by default. An application that never talks to the API has no use for
one — but an attacker who reaches the container does.

```bash
kubectl exec deploy/api -- ls /var/run/secrets/kubernetes.io/serviceaccount 2>&1
# No such file — correct
```

## 6. Two properties that surprise people

**RBAC is purely additive; there is no deny rule.** A subject can do the union
of everything its bindings grant. You restrict by *not granting* — so when
someone has too much access, the fix is finding the extra binding, never adding
a denial.

**A namespaced RoleBinding may reference a ClusterRole.** This is the common
pattern: define `view` or `edit` once cluster-wide, bind it per namespace, and
the permissions apply only inside the binding's namespace.

```bash
kubectl get clusterrole view edit admin
kubectl create rolebinding team-a-view --clusterrole=view \\
  --serviceaccount=team-a:viewer -n team-a --dry-run=client -o yaml
```

## 7. Audit what you already have

```bash
kubectl get clusterrolebindings -o json | \\
  jq -r '.items[] | select(.roleRef.name=="cluster-admin") | .metadata.name'
```

Run that on any cluster you inherit. A ServiceAccount bound to `cluster-admin`
is the most common over-grant in existence, and it is usually there because
something did not work once.
""",
        "failures": [
            ("`auth can-i` says no when the YAML looks right",
             "Check the ServiceAccount namespace in `subjects` — a RoleBinding can reference a subject from another namespace, and a mismatch fails silently."),
            ("Permissions work in one namespace only",
             "That is a RoleBinding doing its job. Cluster-wide needs a ClusterRoleBinding."),
            ("`Forbidden` reading logs despite `get pods`",
             "`pods/log` is a separate resource. Add it to the rule."),
            ("Removing a binding does not revoke access",
             "Another binding still grants it. RBAC is additive — search all bindings for the subject."),
        ],
    },
    {
        "id": "lab-k8s-gateway-api",
        "order": 30,
        "title": "From Ingress to Gateway API",
        "domain": "kubernetes",
        "level": "intermediate",
        "phase": "kubernetes",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — kind or minikube with a Gateway controller.",
        "description": "Express the same routing twice — as an Ingress and as a Gateway — and see what the newer model actually fixes.",
        "skills": [
            "Write a Gateway and an HTTPRoute for an existing Service",
            "Explain the role split Gateway API introduces",
            "Do a weighted traffic split without controller-specific annotations",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+", "A Gateway API controller (Envoy Gateway or NGINX Gateway Fabric)"],
        "criteria": [
            "The same application is reachable through an Ingress and through an HTTPRoute.",
            "A weighted split sends traffic to two Services, with no annotations.",
            "You can name two things Gateway API expresses that Ingress cannot.",
            "You can explain who owns a Gateway versus who owns an HTTPRoute.",
        ],
        "cleanup": K8S_CLEANUP + ["kubectl delete gateway,httproute --all -A"],
        "scenario": (
            "Ingress is stable, everywhere, and feature-frozen. Everything it "
            "cannot express — header matching, traffic splitting, timeouts — moved "
            "into vendor annotations that mean different things on different "
            "controllers.\n\n"
            "Gateway API is the replacement. Learn Ingress first, because it is "
            "what existing clusters run; learn this, because new ones will not."
        ),
        "body": """
## 1. Install a controller and the CRDs

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
helm install eg oci://docker.io/envoyproxy/gateway-helm --version v1.1.0 -n envoy-gateway-system --create-namespace
kubectl get gatewayclass
```

Gateway API ships as CRDs, not as part of core Kubernetes. Nothing works until
both the CRDs and a controller implementing them are present.

## 2. The same routing, both ways

**Ingress — one object, one owner:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /     # controller-specific
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: web, port: { number: 80 } }
```

**Gateway API — two objects, two owners:**

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: platform
spec:
  gatewayClassName: eg
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All          # which namespaces may attach routes
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
spec:
  parentRefs:
    - name: platform
  hostnames: ["app.example.com"]
  rules:
    - matches:
        - path: { type: PathPrefix, value: / }
      backendRefs:
        - name: web
          port: 80
```

**That split is the entire point.** A platform team owns the `Gateway` — the
listeners, the certificates, which namespaces may attach. Application teams own
their `HTTPRoute` and can change their own routing without touching shared
infrastructure or asking anyone.

Under Ingress, both live in one object, so either everyone edits the shared
routing or nobody can change their own.

## 3. What Ingress cannot express

```yaml
  rules:
    # Header matching — an annotation on every controller, if it exists at all
    - matches:
        - headers:
            - name: x-canary
              value: "true"
      backendRefs:
        - name: web-canary
          port: 80

    # A weighted split, in the spec itself
    - backendRefs:
        - name: web
          port: 80
          weight: 90
        - name: web-canary
          port: 80
          weight: 10
```

```bash
for i in $(seq 1 20); do curl -s -H "Host: app.example.com" http://<gw-ip>/; done | sort | uniq -c
```

Roughly 90/10. Doing that with Ingress requires controller-specific annotations
that do not port between NGINX, Traefik and ALB — which is exactly the
fragmentation Gateway API exists to end.

## 4. The comparison

| | Ingress | Gateway API |
| --- | --- | --- |
| Objects | One | `GatewayClass` → `Gateway` → `*Route` |
| Ownership | Single team | Platform / application split |
| Header, method, query matching | Annotations | Typed fields |
| Traffic splitting | Annotations | `weight` |
| Protocols | HTTP(S) | HTTP, TCP, UDP, TLS, gRPC |
| Portability | Annotations differ per controller | Conformance-tested |
| Status | Frozen | Actively developed |

## 5. Migrating

Both can run at once, on different hostnames or different controllers. The
sensible path is a new Gateway alongside the existing Ingress, one route moved
at a time, with DNS as the switch.

```bash
kubectl get gateway platform -o jsonpath='{.status.conditions}' | jq
kubectl get httproute web -o jsonpath='{.status.parents}' | jq
```

**Read the status, not just the spec.** An HTTPRoute whose `parentRef` is not
accepted reports `Accepted: False` with a reason — and unlike an Ingress that
silently does nothing, it tells you why.
""",
        "failures": [
            ("`no matches for kind Gateway`",
             "The CRDs are not installed. They ship separately from Kubernetes."),
            ("The Gateway has no address",
             "No controller is watching that `gatewayClassName`, or it is waiting on a LoadBalancer. `kubectl describe gateway` shows the condition."),
            ("HTTPRoute exists but nothing routes",
             "Check `status.parents` — the Gateway's `allowedRoutes` may not permit that namespace."),
            ("The weighted split looks wrong",
             "Weights are statistical, not per-request, and keep-alive reuses connections. Send more requests without keep-alive."),
        ],
    },
    {
        "id": "lab-helm-upgrade-rollback",
        "order": 32,
        "title": "Helm Upgrades, Rollbacks & Release Strategy",
        "domain": "helm",
        "level": "intermediate",
        "phase": "kubernetes",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — kind or minikube.",
        "description": "Ship a release, break the next one on purpose, and get back to a working state in seconds.",
        "skills": [
            "Upgrade with `--atomic` so a failed release rolls itself back",
            "Inspect release history and roll back to a known-good revision",
            "See what an upgrade would change before running it",
        ],
        "tools": ["Helm 3.14+", "kind or minikube"],
        "criteria": [
            "Three revisions exist and `helm history` shows their status.",
            "A deliberately broken upgrade does not leave the release broken.",
            "You rolled back to a specific revision and verified the running image.",
            "You can explain what `--atomic` does that `--wait` alone does not.",
        ],
        "cleanup": ["helm uninstall demo -n demo", "kubectl delete namespace demo --ignore-not-found"],
        "scenario": (
            "The chart lab taught you to build a chart. This is the other 95% of "
            "the job: upgrading it, discovering the new version does not start, "
            "and getting back to the one that did — under time pressure."
        ),
        "body": """
## 1. A release to operate

```bash
kubectl create namespace demo
helm install demo oci://registry-1.docker.io/bitnamicharts/nginx \\
  -n demo --version 18.1.0 --wait
helm list -n demo
```

## 2. History is the feature

```bash
helm history demo -n demo
```

```text
REVISION  UPDATED       STATUS      CHART        APP VERSION  DESCRIPTION
1         Mon Aug 10..  deployed    nginx-18.1.0 1.27.0       Install complete
```

Helm keeps every revision's rendered manifests and values in a Secret in the
namespace. That is what makes rollback instant — nothing is rebuilt or
re-fetched.

## 3. See the change before making it

```bash
helm plugin install https://github.com/databus23/helm-diff
helm diff upgrade demo oci://registry-1.docker.io/bitnamicharts/nginx \\
  -n demo --version 18.1.0 --set replicaCount=3
```

`helm upgrade` with no preview is the Terraform equivalent of applying without
a plan. The diff shows exactly which fields change.

## 4. Upgrade atomically

```bash
helm upgrade demo oci://registry-1.docker.io/bitnamicharts/nginx \\
  -n demo --version 18.1.0 --set replicaCount=3 \\
  --atomic --timeout 3m
```

| Flag | Does |
| --- | --- |
| `--wait` | Waits for resources to be ready, then reports failure |
| `--atomic` | `--wait`, **and rolls back automatically if it fails** |
| `--timeout` | How long to wait before calling it failed |

**`--wait` tells you the release broke. `--atomic` un-breaks it.** The
difference is whether a failed deploy at 5pm is an incident or a message.

## 5. Break one deliberately

```bash
helm upgrade demo oci://registry-1.docker.io/bitnamicharts/nginx \\
  -n demo --version 18.1.0 \\
  --set image.tag=this-tag-does-not-exist \\
  --atomic --timeout 90s
```

The Pods never become ready, the timeout expires, and Helm rolls back on its
own:

```bash
helm history demo -n demo      # a failed revision, then a rolled-back one
kubectl get pods -n demo       # still serving the working image
```

The release history records the failure — which is what you want. A rollback
that hides the attempt makes the postmortem harder.

## 6. Roll back deliberately

```bash
helm rollback demo 1 -n demo --wait
helm history demo -n demo
kubectl get deploy -n demo -o jsonpath='{.items[0].spec.template.spec.containers[0].image}'
```

A rollback is itself a new revision, so history stays append-only and you can
always move forward again.

## 7. What to hold onto

- **Never `helm upgrade` without `--atomic` in production.** The only reason to
  omit it is when you want to inspect a broken state deliberately.
- **Pin the chart version** with `--version`. An unpinned upgrade pulls whatever
  is newest, so the same command does something different next week.
- **`--reuse-values` is a trap.** It carries forward values from the previous
  revision, including ones you meant to drop. `--reset-values` plus an explicit
  values file is predictable; `-f values-prod.yaml` every time is better still.
- `helm get values demo -n demo` shows what a release is *actually* running,
  which is frequently not what the values file in Git says.
""",
        "failures": [
            ("`another operation is in progress`",
             "A previous run died holding the lock. `helm rollback demo <last-good>` usually clears it; `helm status` shows the pending state."),
            ("Rollback succeeds but the Pods do not change",
             "The rollback restored the manifest, and a Pod may still be pulling. `kubectl rollout status` tells you when it has settled."),
            ("Values reappear that you removed",
             "`--reuse-values` carried them forward. Use `--reset-values` with an explicit values file."),
            ("History is empty after an uninstall",
             "`helm uninstall` removes it unless `--keep-history` was passed. There is nothing to roll back to."),
        ],
    },
    {
        "id": "lab-github-actions-ecr-eks",
        "order": 37,
        "title": "GitHub Actions: Build, Scan and Deploy to EKS",
        "domain": "github-actions",
        "level": "intermediate",
        "phase": "cicd",
        "minutes": 55,
        "cloud_cost": True,
        "cost_tier": "billable",
        "cost": "**Depends on an existing cluster.** Actions minutes are free on public repositories. ECR storage is inside the free tier at this scale; the EKS cluster you deploy to is $0.10/hour if you created one.",
        "description": "The same pipeline as the Jenkins lab, with no server to maintain and no stored AWS credentials.",
        "skills": [
            "Authenticate to AWS from CI with OIDC instead of an access key",
            "Push to ECR and deploy to EKS from a workflow",
            "Compare a hosted CI service with a self-managed controller honestly",
        ],
        "tools": ["A GitHub repository", "An AWS account", "An EKS cluster (or adapt to any Kubernetes)"],
        "criteria": [
            "A push builds an image tagged with the commit SHA and pushes it to ECR.",
            "No AWS access key exists in the repository — authentication is OIDC.",
            "A vulnerability at HIGH or CRITICAL fails the workflow before the push.",
            "The deployment rolls out, and the workflow fails if the rollout does not complete.",
        ],
        "cleanup": [
            "aws ecr batch-delete-image --repository-name <repo> --image-ids imageTag=<tag>",
            "kubectl delete deployment <name> -n <ns> --ignore-not-found",
            "aws iam delete-role --role-name <github-deploy-role>   # after detaching policies",
        ],
        "scenario": (
            "The Jenkins pipeline works, and it needs a server, plugins, backups "
            "and upgrades. For a project that already lives on GitHub, there is a "
            "path with none of that.\n\n"
            "This is not a replacement for the Jenkins lab. Knowing both, and why "
            "you would pick each, is the actual skill."
        ),
        "body": """
## 1. A role GitHub can assume, with no stored key

```bash
aws iam create-open-id-connect-provider \\
  --url https://token.actions.githubusercontent.com \\
  --client-id-list sts.amazonaws.com
```

The trust policy is the security boundary:

```json
{
  "Effect": "Allow",
  "Principal": { "Federated": "arn:aws:iam::<acct>:oidc-provider/token.actions.githubusercontent.com" },
  "Action": "sts:AssumeRoleWithWebIdentity",
  "Condition": {
    "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
    "StringLike": { "token.actions.githubusercontent.com:sub": "repo:OWNER/REPO:ref:refs/heads/main" }
  }
}
```

**The `sub` condition is not optional.** Without it, any repository on GitHub
can assume this role.

> **A trap this platform hit in production.** GitHub is rolling out *immutable
> identifiers*, where the subject carries numeric ids:
>
> ```
> repo:owner@138933390/repo@1328730125:ref:refs/heads/main
> ```
>
> A pattern written against the repository *name* then matches nothing, and the
> failure is an opaque `Not authorized to perform sts:AssumeRoleWithWebIdentity`.
> CloudTrail shows the subject that was actually sent — look there rather than
> guessing. The design is deliberate: renaming an account cannot transfer access
> to whoever claims the old name.

## 2. The workflow

```yaml
name: deploy
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write        # required to request the OIDC token

env:
  AWS_REGION: us-east-1
  ECR_REPO: egykode-demo
  CLUSTER: egykode-eks

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Assume AWS role
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE }}
          aws-region: ${{ env.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr

      - name: Build
        env:
          REGISTRY: ${{ steps.ecr.outputs.registry }}
          TAG: ${{ github.sha }}
        run: docker build -t "$REGISTRY/$ECR_REPO:${TAG::7}" .

      # Scan BEFORE the push. Scanning afterwards has already published it.
      - name: Scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ steps.ecr.outputs.registry }}/${{ env.ECR_REPO }}:${{ github.sha }}
          severity: HIGH,CRITICAL
          ignore-unfixed: true
          exit-code: "1"

      - name: Push
        run: docker push "${{ steps.ecr.outputs.registry }}/$ECR_REPO:${GITHUB_SHA::7}"

      - name: Deploy
        run: |
          aws eks update-kubeconfig --name "$CLUSTER" --region "$AWS_REGION"
          kubectl set image deployment/api api="${{ steps.ecr.outputs.registry }}/$ECR_REPO:${GITHUB_SHA::7}" -n production
          kubectl rollout status deployment/api -n production --timeout=5m
```

`kubectl rollout status --timeout` is what makes this a deploy rather than a
request. Without it the workflow goes green the moment the API accepts the
change, whether or not a single Pod ever became ready.

## 3. EKS has its own permission layer

`update-kubeconfig` succeeding means IAM let you *describe the cluster*. Talking
to the Kubernetes API is separate:

```bash
aws eks create-access-entry --cluster-name "$CLUSTER" \\
  --principal-arn arn:aws:iam::<acct>:role/github-deploy

aws eks associate-access-policy --cluster-name "$CLUSTER" \\
  --principal-arn arn:aws:iam::<acct>:role/github-deploy \\
  --access-scope type=namespace,namespaces=production \\
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy
```

On older clusters this is the `aws-auth` ConfigMap instead. Either way, "I have
IAM access" and "I can use kubectl" are two different grants, and confusing them
produces a confident `error: You must be logged in to the server`.

## 4. Jenkins or Actions?

| | Jenkins | GitHub Actions |
| --- | --- | --- |
| Runs on | A server you own | GitHub's runners, or yours |
| You maintain | Controller, plugins, backups, upgrades | Nothing |
| Config | `Jenkinsfile` (Groovy) | Workflow YAML |
| Credentials | Credential store | OIDC, no stored key |
| Cost | The server | Free on public repos |
| Runs offline | Yes | No |
| Ecosystem | Plugins, sometimes unmaintained | Marketplace actions, same caveat |

**Choose Jenkins** when builds must run inside your network, when you need
hardware GitHub does not offer, or when you are already invested and it works.
**Choose Actions** when the code is already on GitHub and you would rather not
operate a CI server — which is most projects, including this one.

Neither is the modern choice and the other legacy. The one that fails least
often is the one your team can debug.
""",
        "failures": [
            ("`Not authorized to perform sts:AssumeRoleWithWebIdentity`",
             "The `sub` in the trust policy does not match what GitHub sent. Read the real subject from CloudTrail — see the immutable-identifier note above."),
            ("`Credentials could not be loaded`",
             "`id-token: write` is missing from `permissions`. Without it no OIDC token is issued at all."),
            ("`You must be logged in to the server` after a successful update-kubeconfig",
             "IAM let you describe the cluster; Kubernetes has not authorised the principal. Add an EKS access entry or an aws-auth mapping."),
            ("The workflow is green but nothing deployed",
             "`kubectl set image` returns immediately. Without `rollout status --timeout` a failed rollout never fails the job."),
        ],
    },
    {
        "id": "lab-loki-centralized-logging",
        "order": 39,
        "title": "Centralised Logging with Loki and Grafana",
        "domain": "logging",
        "level": "intermediate",
        "phase": "observability",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free on kind or minikube. On a cloud cluster Loki requests a persistent volume, billed per GB-month — see cleanup.",
        "description": "Ship every Pod's logs somewhere they survive the Pod, then answer a real question with them.",
        "skills": [
            "Query logs by label instead of grepping a stream",
            "Correlate a metric spike with the log lines behind it",
            "Explain why Loki indexes labels rather than content",
        ],
        "tools": ["kind or minikube", "Helm 3.14+", "kubectl"],
        "criteria": [
            "Logs from every namespace are queryable in Grafana.",
            "You can filter to one Deployment's errors in the last 15 minutes.",
            "You produced a crash and found its cause from the logs alone.",
            "You can explain what happens to logs when a Pod is deleted, with and without Loki.",
        ],
        "cleanup": [
            "helm uninstall loki -n monitoring",
            "kubectl delete pvc --all -n monitoring   # PVCs survive uninstall",
            "kubectl delete namespace monitoring --ignore-not-found",
        ],
        "scenario": (
            "A Pod crashed at 3am. It has been replaced, and `kubectl logs` shows "
            "the new one. The evidence went with the old container.\n\n"
            "Metrics told you *that* something broke. Logs are how you find out "
            "*why* — but only if they left the node before the Pod did."
        ),
        "body": """
## 1. Install the stack

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm upgrade --install loki grafana/loki-stack \\
  -n monitoring --create-namespace \\
  --set grafana.enabled=true \\
  --set promtail.enabled=true \\
  --wait

kubectl port-forward -n monitoring svc/loki-grafana 3000:80
```

Three parts, and the split matters:

- **Promtail** runs as a DaemonSet — one per node — and tails
  `/var/log/pods`, attaching Kubernetes labels to every line.
- **Loki** stores it, indexing **only the labels**.
- **Grafana** queries it.

## 2. Why label-only indexing

Elasticsearch indexes the full text of every line, which is powerful and
expensive — the index often exceeds the logs. Loki indexes only labels
(namespace, pod, container) and compresses the rest, then brute-force searches
within the selected streams.

The practical consequence: **always select by label first**.

```logql
{namespace="production"}                             # fast
{namespace="production", app="api"} |= "ERROR"       # fast, then scan
{} |= "ERROR"                                        # scans everything, slow
```

That last query is the one people write first and the one that times out.

## 3. Queries you will actually use

```logql
{namespace="production", app="api"} |= "ERROR"

{namespace="production"} |= "ERROR" != "healthcheck"

{app="api"} | json | status >= 500

sum(rate({namespace="production"} |= "ERROR" [5m])) by (app)
```

That last one turns logs into a **metric**, so an error rate derived from log
lines can be graphed beside Prometheus data and alerted on the same way.

## 4. Cause a crash and find it

```bash
kubectl create deployment crasher --image=busybox -- \\
  sh -c 'echo "FATAL: config missing" >&2; exit 1'
kubectl get pods -w      # CrashLoopBackOff
```

Now compare the two ways of looking:

```bash
kubectl logs deploy/crasher              # the current container: nothing useful
kubectl logs deploy/crasher --previous   # the one that died: the message
```

Then in Grafana:

```logql
{app="crasher"}
```

**Every restart is there, in order.** `kubectl logs --previous` gives you one
container back; Loki gives you all of them, including the ones from before the
Pod was rescheduled onto a different node — which is the case `--previous`
cannot reach at all.

## 5. Retention, before it costs you

```yaml
loki:
  config:
    limits_config:
      retention_period: 168h        # 7 days
    compactor:
      retention_enabled: true
```

Logs grow without limit by default. Seven days is a reasonable start: long
enough for an investigation, short enough to bound the volume.

## 6. Metrics and logs together

Prometheus tells you the error rate rose at 02:14. Loki tells you what the
errors said. The two are complementary and neither replaces the other:

- **Metrics** — cheap, aggregated, good for alerting, no detail.
- **Logs** — expensive, precise, good for diagnosis, poor for alerting.

Use the same label names in both (`namespace`, `app`, `pod`) and a Grafana
dashboard can jump from a spike straight to the lines underneath it.
""",
        "failures": [
            ("No logs appear at all",
             "Promtail is a DaemonSet — check it is running on every node and can read `/var/log/pods`. `kubectl logs -n monitoring ds/loki-promtail`."),
            ("Queries time out",
             'No label selector, so Loki is scanning every stream. Always begin the query with a `{namespace="..."}` selector.'),
            ("Logs stop after a while",
             "Retention expired, or the PVC filled. `kubectl get pvc -n monitoring` and check the compactor."),
            ("Labels are missing",
             "Promtail's relabel config drops most Kubernetes metadata by default. Only labels you keep are queryable."),
        ],
    },
    {
        "id": "lab-terraform-state-recovery",
        "order": 41,
        "title": "Terraform Drift & State Recovery",
        "domain": "terraform",
        "level": "advanced",
        "phase": "production",
        "minutes": 55,
        "cloud_cost": True,
        "destructive": True,
        "cost": "Free tier — the exercises use an S3 bucket and a `t3.micro`. Nothing here bills hourly beyond the instance.",
        "description": "Someone changed AWS by hand and someone else deleted the state. Recover from both without rebuilding anything.",
        "skills": [
            "Detect drift and decide whether to adopt or revert it",
            "Import an existing resource into state",
            "Recover a state file from a versioned backend",
        ],
        "tools": ["Terraform >= 1.6", "AWS CLI v2, configured"],
        "criteria": [
            "You detected a manual change and can explain both ways to resolve it.",
            "A resource created outside Terraform is imported and `plan` reports no changes.",
            "A deleted state file is restored from S3 versioning and matches reality.",
            "Nothing was destroyed and recreated during any of it.",
        ],
        "cleanup": ["terraform destroy -auto-approve", "aws s3 ls | grep tfstate-recovery"],
        "scenario": (
            "Someone widened a security group in the console during an incident. "
            "Someone else ran `terraform apply` a week later and closed it again, "
            "causing a second incident.\n\n"
            "Then the state file was deleted.\n\n"
            "All three are recoverable. None of them require rebuilding the "
            "infrastructure — which is what people do when they do not know these "
            "commands."
        ),
        "body": """
> **This lab deletes state and modifies resources on purpose.** Use a scratch
> configuration, never a real environment.

## 1. Drift, detected

```bash
terraform apply -auto-approve
aws ec2 authorize-security-group-ingress --group-id <sg> \\
  --protocol tcp --port 8080 --cidr 0.0.0.0/0      # the "incident fix"

terraform plan -detailed-exitcode
echo "exit: $?"        # 2 = drift
```

```text
  ~ resource "aws_security_group" "demo" {
      ~ ingress { - from_port = 8080 ... }
    }
```

**Two legitimate responses, and choosing wrongly causes the second incident:**

- **Revert** — `terraform apply` removes the rule. Correct when the manual
  change was a mistake.
- **Adopt** — put the rule in the configuration. Correct when it was a real fix
  that must survive.

Never resolve it by running `apply` without reading the plan. That is what
closed the port again at the worst moment.

`-detailed-exitcode` returns `2` for drift, which is designed for a scheduled
job — finding drift on a Monday is much better than finding it mid-incident.

## 2. A resource Terraform does not know about

```bash
aws s3api create-bucket --bucket tfstate-recovery-demo-$(date +%s)   # by hand
```

Adding a matching `resource` block and applying fails: the bucket exists and
Terraform tries to create it. Import instead:

```hcl
resource "aws_s3_bucket" "adopted" {
  bucket = "tfstate-recovery-demo-1234567890"
}
```

```bash
terraform import aws_s3_bucket.adopted tfstate-recovery-demo-1234567890
terraform plan      # must report: No changes
```

That `No changes` is the test. If the plan wants to modify something, your
configuration does not match reality yet — keep editing until it does, and
resist the temptation to `apply` your way there.

Terraform 1.5+ can do this declaratively, which is reviewable:

```hcl
import {
  to = aws_s3_bucket.adopted
  id = "tfstate-recovery-demo-1234567890"
}
```

## 3. The state file is gone

```bash
aws s3 rm s3://<state-bucket>/demo/terraform.tfstate      # simulate it
terraform plan
# wants to create everything — it has lost all memory
```

**Do not apply.** That builds a second copy of everything you already have.

```bash
aws s3api list-object-versions --bucket <state-bucket> \\
  --prefix demo/terraform.tfstate \\
  --query 'Versions[].[VersionId,LastModified]' --output table

aws s3api get-object --bucket <state-bucket> \\
  --key demo/terraform.tfstate --version-id <id> restored.tfstate

aws s3 cp restored.tfstate s3://<state-bucket>/demo/terraform.tfstate
terraform plan      # No changes
```

**This is why the bootstrap stack enables versioning on the state bucket.** A
delete leaves a delete marker and the object is still there. Without versioning,
the only recovery is importing every resource by hand.

## 4. Refactoring without destroying

Renaming a resource in your configuration makes Terraform plan a destroy and a
create — same infrastructure, different address:

```bash
terraform state mv aws_instance.web aws_instance.frontend
terraform plan      # No changes
```

`state mv` updates the map only. No AWS API call touches the resource, so a
rename costs nothing and no downtime.

```bash
terraform state list
terraform state show aws_instance.frontend
terraform state rm aws_instance.frontend   # forget it WITHOUT deleting it
```

`state rm` is the one to be careful with: Terraform forgets the resource and it
keeps running and billing, invisible to your configuration. It is the right tool
for handing a resource to another stack, and a good way to create an orphan by
accident.

## 5. Habits worth keeping

- Versioning **and** locking on the state bucket, always.
- `-detailed-exitcode` on a schedule, so drift finds you rather than the reverse.
- `plan -out` then `apply` that file, so what runs is what was reviewed.
- Before anything risky: `terraform state pull > backup.tfstate`.
""",
        "failures": [
            ("`import` says the resource already exists in state",
             "It is already tracked under some address. `terraform state list` to find it."),
            ("`plan` still shows changes after import",
             "Your configuration does not match the real resource. Edit until the plan is empty — do not apply your way there."),
            ("No versions in the state bucket",
             "Versioning was not enabled. There is no recovery beyond importing everything; enable it now on every state bucket you own."),
            ("`state mv` reports the address does not exist",
             'Addresses are exact, including index keys such as `[0]` or `["us-east-1a"]`. Copy them from `terraform state list` rather than typing them.'),
        ],
    },
    {
        "id": "lab-k8s-node-drain-upgrade",
        "order": 42,
        "title": "Node Drain, Upgrade & Recovery",
        "domain": "kubernetes",
        "level": "advanced",
        "phase": "production",
        "minutes": 55,
        "cloud_cost": False,
        "destructive": True,
        "cost": "Free — a multi-node kind cluster. See the setup note; a single node cannot demonstrate rescheduling.",
        "description": "Take a node out of service without taking the application with it, and find out which workloads were never ready for it.",
        "skills": [
            "Cordon and drain a node safely",
            "Protect availability during voluntary disruption with a PDB",
            "Recognise workloads that cannot survive rescheduling",
        ],
        "tools": ["kind (multi-node)", "kubectl 1.28+"],
        "criteria": [
            "A node is drained with no failed requests to the application.",
            "A PodDisruptionBudget blocks a drain that would breach availability.",
            "You identified at least one workload that could not be rescheduled cleanly, and why.",
            "The node returns to service and receives Pods again.",
        ],
        "cleanup": ["kubectl uncordon --all", "kubectl delete deployment web --ignore-not-found", "kind delete cluster --name ops"],
        "scenario": (
            "The cluster needs a Kubernetes upgrade. That means taking each node "
            "out of service in turn, and the first one you try teaches you which "
            "of your workloads were only ever running by luck."
        ),
        "body": """
> **This evicts running workloads.** Use a throwaway cluster.

## Setup: more than one node

```bash
cat <<'EOF' | kind create cluster --name ops --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF

kubectl get nodes
```

A single-node cluster cannot demonstrate any of this — there is nowhere to
reschedule to, and every Pod simply goes `Pending`.

## 1. Something to keep alive

```bash
kubectl create deployment web --image=nginx:1.27-alpine --replicas=4
kubectl expose deployment web --port=80
kubectl get pods -o wide       # note the spread across nodes
```

Steady traffic, in another terminal:

```bash
kubectl run load --rm -it --image=curlimages/curl --restart=Never -- \\
  sh -c 'while true; do curl -s -o /dev/null -w "%{http_code} " http://web; sleep 0.2; done'
```

## 2. Cordon, then drain

```bash
kubectl cordon ops-worker
kubectl get nodes              # SchedulingDisabled — nothing new lands here
```

`cordon` stops *new* Pods arriving. Existing ones keep running, which makes it
safe to run well before the maintenance window.

```bash
kubectl drain ops-worker --ignore-daemonsets --delete-emptydir-data
```

- `--ignore-daemonsets` — DaemonSet Pods are recreated on the same node by
  design, so a drain can never evict them and refuses to start without this.
- `--delete-emptydir-data` — acknowledges that `emptyDir` data on this node is
  destroyed. Say it deliberately.

Watch the traffic terminal. Count non-200 responses.

## 3. If you saw failures, the workload was not ready

The Pod stayed in the Service's endpoints while it was terminating. The fix is
in the workload, not in the drain:

```yaml
      terminationGracePeriodSeconds: 30
      containers:
        - name: web
          readinessProbe:
            httpGet: { path: /, port: 80 }
            periodSeconds: 3
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 5"]
```

The `preStop` sleep is not superstition. On termination, two things happen
concurrently: the Pod is removed from endpoints, and `SIGTERM` is sent. The
five seconds let the endpoint removal propagate to every kube-proxy *before*
the process starts shutting down, so no traffic is routed to a dying Pod.

## 4. Protect availability

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web
```

```bash
kubectl apply -f pdb.yaml
kubectl drain ops-worker2 --ignore-daemonsets 2>&1 | head -3
# Cannot evict pod as it would violate the disruption budget
```

**A PDB governs voluntary disruption only** — drains, upgrades, autoscaler
scale-downs. It does nothing about a crash or a node failure, and that
distinction is the whole point: it prevents *self-inflicted* outages during
maintenance.

`minAvailable` must be lower than the replica count, or no drain can ever
proceed.

## 5. Back into service

```bash
kubectl uncordon ops-worker
kubectl get nodes
kubectl rollout restart deployment/web    # rebalance, once it is schedulable
```

Note that nothing moves back on its own. Kubernetes does not rebalance running
Pods, so after a drain the remaining nodes stay loaded until something forces a
reschedule.

## 6. What a real upgrade adds

```text
cordon → drain → upgrade kubelet/kubeadm → uncordon → verify → next node
```

- Upgrade the **control plane first**, one node at a time.
- Never skip a minor version — 1.28 → 1.30 is two upgrades.
- Check API deprecations *before* starting: a removed API version breaks
  workloads on the new nodes only, so it looks like a partial outage.

```bash
kubectl get --raw /metrics | grep apiserver_requested_deprecated_apis
```

That metric names what is still calling a deprecated API, which is exactly the
list you want before an upgrade rather than after.
""",
        "failures": [
            ("`drain` hangs indefinitely",
             "Something cannot be evicted: a bare Pod with no controller, or a PDB that cannot be satisfied. The message names it."),
            ("Requests fail during the drain",
             "The Pod left the process running while still in endpoints. Add a readiness probe and a `preStop` delay."),
            ("Everything goes Pending",
             "Nowhere to reschedule — a single-node cluster, or the remaining nodes lack capacity."),
            ("Pods do not return after uncordon",
             "Expected. Kubernetes does not rebalance running Pods; force it with `kubectl rollout restart`."),
        ],
    },
]


def frontmatter(spec: dict, tier: str) -> str:
    lab_id = spec["id"] if tier == "guided" else f"{spec['id']}-challenge"
    title = spec["title"] if tier == "guided" else f"{spec['title']} — Challenge"
    # Stated per lab rather than inferred from the prose: "Depends on an existing
    # cluster" reads as mild and means $0.10/hour, and a reader deciding whether
    # to open a lab on a phone should not have to parse a sentence to find out.
    tier_word = spec.get("cost_tier", "low" if spec["cloud_cost"] else "free")
    lines = [
        "---",
        f"labId: {lab_id}",
        f'title: "{title}"',
        f'description: "{spec["description"]}"',
        f"domain: {spec['domain']}",
        f"level: {spec['level']}",
        "type: lab",
        f"phase: {spec['phase']}",
        f"order: {spec['order']}",
        f"tier: {tier}",
        f"estimatedMinutes: {spec['minutes'] if tier == 'guided' else max(20, spec['minutes'] // 2)}",
        f"cloudCost: {'true' if spec['cloud_cost'] else 'false'}",
        f"costTier: {tier_word}",
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
    lines.append(
        f"challengeId: {spec['id']}-challenge" if tier == "guided" else f"guidedLabId: {spec['id']}"
    )
    lines += ["authors: [waleed]", "updated: 2026-08-10", "---", ""]
    return "\n".join(lines)


def guided_body(spec: dict) -> str:
    out = ["## The scenario\n", spec["scenario"] + "\n", spec["body"].strip() + "\n",
           "\n## When it goes wrong\n"]
    for symptom, cause in spec["failures"]:
        out.append(f"\n**{symptom}**\n\n{cause}\n")
    if spec.get("cleanup"):
        steps = "\n".join(spec["cleanup"])
        out.append(
            f"\n---\n\n## Clean up\n\nRun this even if you did not finish.\n\n"
            f"```bash\n{steps}\n```\n\n**Cost of this lab:** {spec['cost']}\n"
        )
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
- Documentation is allowed and encouraged.
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
        (LABS / f"{spec['id']}.en.mdx").write_text(
            frontmatter(spec, "guided") + guided_body(spec), encoding="utf-8")
        (LABS / f"{spec['id']}-challenge.en.mdx").write_text(
            frontmatter(spec, "challenge") + challenge_body(spec), encoding="utf-8")
        written += 2
        print(f"  {spec['domain']:<16} {spec['level']:<12} {spec['title']}")
    print(f"\nwrote {written} file(s) — {len(SPECS)} labs with challenges")


if __name__ == "__main__":
    main()
