#!/usr/bin/env python3
"""
Batch 2 of making the imported NTI labs followable.

Same defects as batch 1 and the same remedy: show the artifact, give steps that
run anywhere, verify the outcome rather than the existence of an object, and
name the failures each lab actually produces. See rewrite_imported_labs.py for
the full diagnosis.

Run: python scripts/rewrite_imported_labs_2.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rewrite_imported_labs import rewrite  # noqa: E402  (shared helper)

REWRITES: dict[str, dict] = {}

# ── lab-05 · EKS cluster and managed node group ───────────────────────────
REWRITES["lab-05-amazon-eks-cluster-managed-node-group-provisioning"] = {
    "criteria": [
        "`kubectl get nodes` shows Ready nodes in private subnets.",
        "The OIDC provider exists and a ServiceAccount can assume an IAM role through it.",
        "You can explain why `update-kubeconfig` succeeding does not mean `kubectl` will work.",
        "The node group scales without recreating the cluster.",
    ],
    "scenario": (
        "You have a network, roles and a registry. Nothing is running on any of "
        "it.\n\n"
        "This is the cluster — and the two permission systems that catch "
        "everybody the first time, because they look like one."
    ),
    "body": """
## What you are building

```text
   AWS manages this                     You manage this
  +-------------------------+          +--------------------------+
  |  EKS control plane      |          |  managed node group      |
  |  apiserver, etcd,       | <------> |  2 x t3.medium, private  |
  |  scheduler, controllers |          |  subnets, autoscaling    |
  |  across 3 AZs           |          |  to 6                    |
  +-------------------------+          +--------------------------+
        $0.10/hour                          EC2 pricing
```

EKS runs the control plane you built by hand in the kubeadm lab: the API
server, etcd and the controllers, replicated across availability zones and
patched by AWS. You do not get a node to log into, and you do not get to break
etcd.

**A managed node group is still EC2.** AWS handles the launch template, the
draining on upgrade and the replacement of an unhealthy instance, but the nodes
are yours, they sit in your subnets, and they bill at normal EC2 rates.

---

## Build it

### 1. The cluster

```hcl
resource "aws_eks_cluster" "main" {
  name     = "platform"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.31"

  vpc_config {
    subnet_ids              = concat(var.private_subnet_ids, var.public_subnet_ids)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["203.0.113.4/32"]   # your address, not 0.0.0.0/0
  }

  encryption_config {
    provider { key_arn = aws_kms_key.eks.arn }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator"]

  access_config {
    authentication_mode                         = "API"
    bootstrap_cluster_creator_admin_permissions = true
  }
}
```

`encryption_config` is envelope encryption of Secrets in etcd with your KMS
key. Without it, a Secret is base64 in etcd and AWS holds the only key. It can
only be enabled **at creation** — there is no adding it later.

`enabled_cluster_log_types` is the only way to see the control plane. `audit`
in particular answers "who did this", and turning it on after an incident is
too late.

### 2. The node group

```hcl
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "workers"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = var.private_subnet_ids     # private, always

  instance_types = ["t3.medium"]
  capacity_type  = "ON_DEMAND"                 # or SPOT — see below

  scaling_config {
    desired_size = 2
    min_size     = 2
    max_size     = 6
  }

  update_config {
    max_unavailable = 1                        # one node at a time
  }

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}
```

**`ignore_changes` on `desired_size` matters once autoscaling is real.** The
Cluster Autoscaler changes the desired count; without this, the next
`terraform apply` sets it back to 2 and evicts whatever had scaled up.

Nodes go in **private** subnets. They reach the internet through the NAT
Gateway to pull images; nothing on the internet reaches them.

`capacity_type = "SPOT"` is up to 90% cheaper and gives two minutes' notice
before reclamation — a good fit for stateless workloads, a bad one for the
database.

### 3. OIDC, so a Pod can have its own IAM role

```hcl
data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
}
```

Without this, the only way to give a Pod AWS permissions is to attach them to
the **node role** — which grants them to every Pod on that node. The IRSA lab
builds on this.

### 4. Add-ons

```hcl
resource "aws_eks_addon" "this" {
  for_each      = toset(["vpc-cni", "coredns", "kube-proxy", "aws-ebs-csi-driver"])
  cluster_name  = aws_eks_cluster.main.name
  addon_name    = each.value
  resolve_conflicts_on_update = "OVERWRITE"
}
```

A cluster without `aws-ebs-csi-driver` cannot bind a PersistentVolumeClaim, and
the failure is a PVC that stays `Pending` with nothing obviously wrong.

### 5. Connect

```bash
aws eks update-kubeconfig --name platform --region us-east-1
kubectl get nodes
```

---

## Two permission systems, not one

This is the part worth slowing down for, because the error message is
unhelpful.

```text
IAM          ->  may you call the EKS API? (DescribeCluster, ListClusters)
EKS access   ->  may you call the KUBERNETES API? (get pods, create deploy)
```

`update-kubeconfig` only needs the first. It writes a file. Getting a
kubeconfig therefore tells you **nothing** about whether `kubectl` will work,
and the failure appears one command later as:

```text
error: You must be logged in to the server (Unauthorized)
```

Grant the second explicitly:

```bash
aws eks create-access-entry --cluster-name platform \\
  --principal-arn arn:aws:iam::111122223333:role/deployer \\
  --type STANDARD

aws eks associate-access-policy --cluster-name platform \\
  --principal-arn arn:aws:iam::111122223333:role/deployer \\
  --access-scope type=namespace,namespaces=production \\
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSEditPolicy
```

On clusters older than 1.23 this is the `aws-auth` ConfigMap instead — the same
idea with a much worse failure mode, since a malformed edit locks everyone out
including you.

---

## Verify it worked

```bash
# Nodes are Ready, and in private subnets
kubectl get nodes -o wide
aws ec2 describe-instances --filters "Name=tag:eks:cluster-name,Values=platform" \\
  --query 'Reservations[].Instances[].[InstanceId,PrivateIpAddress,PublicIpAddress]' --output table
# the PublicIpAddress column must be empty

# The OIDC provider exists and matches the cluster issuer
aws eks describe-cluster --name platform --query 'cluster.identity.oidc.issuer'
aws iam list-open-id-connect-providers

# Secrets are encrypted with your key
aws eks describe-cluster --name platform --query 'cluster.encryptionConfig'

# Something actually schedules
kubectl run smoke --image=nginx:alpine --restart=Never
kubectl wait --for=condition=Ready pod/smoke --timeout=90s && kubectl delete pod smoke
```

That last one is the real test. Nodes reporting `Ready` and a Pod actually
running are different claims — a broken CNI gives you the first without the
second.

---

## When it goes wrong

**`You must be logged in to the server (Unauthorized)`**

IAM let you describe the cluster; Kubernetes has not authorised you. Add an
access entry, or check `aws sts get-caller-identity` matches the principal you
granted — assuming a role changes who you are.

**Nodes never reach Ready**

They cannot reach the control plane endpoint or pull the CNI image. In private
subnets that means the NAT Gateway or the route table.
`kubectl describe node` and the EC2 system log say which.

**Pods stay `Pending` with `no nodes available`**

The node group scaled to zero, or a taint you did not add is present. Managed
node groups taint nodes during an upgrade.

**PVCs stay `Pending`**

`aws-ebs-csi-driver` is not installed, or its ServiceAccount has no IRSA role.

**`terraform apply` shrinks the cluster after autoscaling**

`desired_size` is being managed by both Terraform and the autoscaler. Add
`ignore_changes`.

**Destroy hangs on the VPC**

Kubernetes created load balancers and ENIs that Terraform does not know about.
Delete Services of type LoadBalancer and Ingresses first.

---

## Clean up

```bash
kubectl delete svc --all-namespaces --field-selector spec.type=LoadBalancer
kubectl delete ingress --all -A
terraform destroy -auto-approve
aws eks list-clusters
```

**Cost of this lab:** **Billable.** The EKS control plane is $0.10/hour
(~$73/month) whether or not anything runs on it, plus two `t3.medium` nodes at
about $0.08/hour together. Destroy it the moment you finish.
""",
}

# ── lab-07 · Ansible architecture and dynamic inventory ───────────────────
REWRITES["lab-07-ansible-architecture-configuration-automated-inventory"] = {
    "criteria": [
        "`ansible -m ping all` succeeds against hosts nobody typed into a file.",
        "The inventory is generated from AWS tags, so a new instance is managed without an edit.",
        "`ansible-inventory --graph` shows hosts grouped by tag.",
        "You can explain why Ansible needs no agent on the target.",
    ],
    "scenario": (
        "The inventory is a text file with IP addresses in it. Instances are "
        "replaced weekly, so it is wrong most of the time, and the way you find "
        "out is a playbook that reports success against a host that no longer "
        "exists."
    ),
    "body": """
## What you are building

```text
  control node (your laptop)
       |  SSH :22 -- no agent on the far end
       v
  +---------------------------------------------+
  |  inventory: generated from AWS tags          |
  |    tag_Role_jenkins  -> i-0abc (10.0.1.12)   |
  |    tag_Role_worker   -> i-0def, i-0ghi       |
  +---------------------------------------------+
```

**Ansible is agentless**, and that is the design decision everything else
follows from. Puppet, Chef and Salt run a daemon on every target that you have
to install, upgrade and monitor — a second fleet to operate. Ansible connects
over SSH, copies a Python module to a temporary directory, runs it, collects
JSON and deletes it.

The cost of that choice is real: execution is serial-ish and slower at
thousands of hosts, and the target needs Python and SSH. The benefit is that
there is nothing to keep running.

---

## Build it

### 1. `ansible.cfg` — the settings you will otherwise repeat forever

```ini
[defaults]
inventory            = inventory/aws_ec2.yml
remote_user          = ec2-user
private_key_file     = ~/.ssh/platform.pem
host_key_checking    = False
interpreter_python   = auto_silent
stdout_callback      = yaml
callbacks_enabled    = timer, profile_tasks
retry_files_enabled  = False
forks                = 20

[privilege_escalation]
become        = True
become_method = sudo
become_user   = root
become_ask_pass = False

[ssh_connection]
pipelining = True
ssh_args   = -o ControlMaster=auto -o ControlPersist=300s
```

Three of these are worth understanding rather than copying:

- **`pipelining = True`** removes a file transfer per task. On a playbook with
  forty tasks it is a large speed-up, and it requires `requiretty` to be off in
  `/etc/sudoers` — which it is on modern distributions.
- **`ControlPersist`** reuses one SSH connection instead of reconnecting per
  task.
- **`host_key_checking = False`** is right for ephemeral cloud instances whose
  keys change on every rebuild, and wrong for long-lived servers, where it
  removes your protection against a man-in-the-middle.

### 2. Inventory generated from AWS, not typed

```yaml
# inventory/aws_ec2.yml
plugin: amazon.aws.aws_ec2
regions:
  - us-east-1
filters:
  instance-state-name: running
  tag:Project: platform
keyed_groups:
  - key: tags.Role
    prefix: tag_Role
  - key: placement.availability_zone
    prefix: az
hostnames:
  - private-ip-address        # private: you reach them through the VPC
compose:
  ansible_host: private_ip_address
```

```bash
ansible-galaxy collection install amazon.aws
ansible-inventory --graph
```

```text
@all:
  |--@tag_Role_jenkins:
  |  |--10.0.1.12
  |--@tag_Role_worker:
  |  |--10.0.10.4
  |  |--10.0.11.9
```

**This is the whole point of the lab.** A new instance carrying
`Role=worker` is in the `tag_Role_worker` group the moment it boots. Nobody
edits anything, and the inventory cannot drift from reality because it *is*
reality, queried on each run.

### 3. Prove the connection before writing a playbook

```bash
ansible -m ping all
ansible -m ping tag_Role_jenkins
ansible -a "uptime" tag_Role_worker
ansible -m setup --tree /tmp/facts all      # everything Ansible knows
```

`ping` here is not ICMP. It connects over SSH, runs a Python module and expects
`pong` back — so a success proves SSH, the user, `become` and Python all work
before any real task depends on them.

---

## Verify it worked

```bash
# Hosts appear with no file listing them
ansible-inventory --graph
ansible-inventory --host 10.0.1.12 | jq '.tags'

# Connectivity, privilege escalation and Python all work
ansible -m ping all
ansible -m command -a "id" --become all      # uid=0(root)

# The proof: launch another tagged instance and re-run with no edits
aws ec2 run-instances ... --tag-specifications \\
  'ResourceType=instance,Tags=[{Key=Project,Value=platform},{Key=Role,Value=worker}]'
ansible -m ping tag_Role_worker              # the new host is simply there
```

---

## When it goes wrong

**`Failed to connect to the host via ssh: Permission denied (publickey)`**

Wrong `remote_user` for the AMI — `ec2-user` on Amazon Linux, `ubuntu` on
Ubuntu — or the wrong key. `ansible -vvv` prints the exact SSH command; run it
by hand.

**The inventory is empty**

The plugin is not enabled, the filters match nothing, or the credentials have
no `ec2:DescribeInstances`. `ansible-inventory --list -vvv` shows the API call
and its result.

**`Missing sudo password`**

`become_ask_pass` is false and the user needs a password. Use a NOPASSWD rule
scoped to what automation actually runs, not a blanket one.

**`/usr/bin/python: not found`**

The target has no Python at the expected path. `interpreter_python =
auto_silent` handles almost every case; `raw` is the escape hatch for
bootstrapping a host that has none at all.

**Ansible reports success against a host that is gone**

That is the static-inventory failure this lab removes. A generated inventory
cannot list an instance that is not running.

---

## Clean up

```bash
# Nothing to destroy — this lab only reads AWS.
aws ec2 describe-instances --filters "Name=tag:Project,Values=platform" \\
  "Name=instance-state-name,Values=running" \\
  --query 'Reservations[].Instances[].InstanceId'
```

**Cost of this lab:** **Low.** Ansible itself is free; you are billed only for
whatever instances you are managing.
""",
}

# ── lab-08 · Toolchain provisioning with roles ────────────────────────────
REWRITES["lab-08-automated-jenkins-server-toolchain-provisioning"] = {
    "criteria": [
        "One playbook takes a bare instance to a working Jenkins with its toolchain.",
        "The second run reports `changed=0`.",
        "A verify playbook asserts each service and binary, and fails loudly when one is missing.",
        "Secrets come from Vault, not from a variable in the repository.",
    ],
    "scenario": (
        "Setting up the build server is a wiki page with nineteen steps. It was "
        "last accurate in March. The person who wrote it has left, and the "
        "server is one disk failure from being unbuildable."
    ),
    "body": """
## What you are building

A role per concern, composed by one playbook:

```text
  playbooks/site.yml
      |
      +-- common      packages, timezone, users, hardening
      +-- java        OpenJDK 17 (Jenkins will not start without it)
      +-- docker      engine, the jenkins user in the docker group
      +-- jenkins     repository, package, plugins, service
      +-- aws_cli     v2 from the official installer
      +-- kubectl     pinned to the cluster's minor version
      +-- helm        via the official script
      +-- trivy       scanner used by the pipeline
      +-- sonarqube   quality gate, in a container
```

**A role is a directory layout Ansible understands.** Putting a file in
`roles/java/tasks/main.yml` *is* the wiring — there is no registration step.
The alternative is one 1,000-line playbook where nothing can be reused and any
change risks everything.

---

## Build it

### 1. The composition

```yaml
# playbooks/site.yml
- name: Provision the build host
  hosts: tag_Role_jenkins
  become: true

  pre_tasks:
    - name: Refresh the package cache
      ansible.builtin.package:
        update_cache: true
      changed_when: false          # a cache refresh is not a change

  roles:
    - common
    - java
    - docker
    - { role: jenkins, tags: ["jenkins"] }
    - aws_cli
    - kubectl
    - helm
    - trivy
    - { role: sonarqube, tags: ["quality"] }
```

`changed_when: false` on the cache refresh matters more than it looks. A task
that reports `changed` on every run makes `changed=0` unreachable, and once the
number is never zero nobody looks at it again.

### 2. A role, in full

```yaml
# roles/jenkins/tasks/main.yml
- name: Add the Jenkins repository key
  ansible.builtin.get_url:
    url: https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
    dest: /etc/pki/rpm-gpg/RPM-GPG-KEY-jenkins
    mode: "0644"

- name: Add the Jenkins repository
  ansible.builtin.yum_repository:
    name: jenkins
    description: Jenkins stable
    baseurl: https://pkg.jenkins.io/redhat-stable
    gpgkey: file:///etc/pki/rpm-gpg/RPM-GPG-KEY-jenkins
    gpgcheck: true

- name: Install Jenkins
  ansible.builtin.package:
    name: "jenkins-{{ jenkins_version }}"     # pinned, not "latest"
    state: present
  notify: Restart jenkins

- name: Ensure the config directory exists
  ansible.builtin.file:
    path: /var/lib/jenkins/init.groovy.d
    state: directory
    owner: jenkins
    mode: "0755"

- name: Wait for Jenkins to answer
  ansible.builtin.uri:
    url: "http://127.0.0.1:8080/login"
    status_code: [200, 403]
    timeout: 5
  register: jenkins_up
  until: jenkins_up.status in [200, 403]
  retries: 30
  delay: 5
```

```yaml
# roles/jenkins/defaults/main.yml
jenkins_version: "2.462.3"
jenkins_port: 8080
```

```yaml
# roles/jenkins/handlers/main.yml
- name: Restart jenkins
  ansible.builtin.service:
    name: jenkins
    state: restarted
    enabled: true
```

**`defaults/`, not `vars/`.** Both define variables; `defaults` sits low in
precedence so inventory and `--extra-vars` can override it, `vars` sits high
and effectively cannot be overridden. Anything a caller might reasonably change
belongs in `defaults`, or you have written a role only you can use.

**Pin the version.** `state: latest` makes the same playbook produce a
different server next week, which is the opposite of what configuration
management is for.

### 3. Secrets from Vault

```bash
ansible-vault create group_vars/all/vault.yml
```

```yaml
vault_sonarqube_admin_password: "..."
vault_jenkins_admin_password: "..."
```

```yaml
# group_vars/all/main.yml — the indirection is deliberate
sonarqube_admin_password: "{{ vault_sonarqube_admin_password }}"
```

Referencing `vault_*` variables through plain names keeps every playbook
readable — you can see which values are secret from the mapping file without
decrypting anything.

```bash
ansible-playbook playbooks/site.yml --vault-password-file .vault_pass
```

### 4. A verify playbook that asserts

```yaml
# playbooks/verify.yml
- hosts: tag_Role_jenkins
  become: true
  tasks:
    - name: Services are running
      ansible.builtin.service_facts:

    - name: Assert each service is active
      ansible.builtin.assert:
        that: ansible_facts.services[item ~ '.service'].state == 'running'
        fail_msg: "{{ item }} is not running"
      loop: [jenkins, docker]

    - name: Binaries answer
      ansible.builtin.command: "{{ item }} --version"
      changed_when: false
      loop:
        - /usr/local/bin/aws
        - /usr/local/bin/kubectl
        - /usr/local/bin/helm
        - /usr/local/bin/trivy
```

`assert` is what makes this a test rather than a report. A `command` that
prints a version and is never checked passes whatever it prints.

---

## Verify it worked

```bash
ansible-playbook playbooks/site.yml
# PLAY RECAP: changed=23

ansible-playbook playbooks/site.yml
# PLAY RECAP: changed=0          <- the point of the whole lab

ansible-playbook playbooks/verify.yml
ansible-playbook playbooks/site.yml --check --diff       # what would change
ansible-playbook playbooks/site.yml --tags jenkins       # one role only
```

`changed=0` on the second run is the definition of idempotent, and it is what
lets this playbook run on a schedule to correct drift rather than being a
one-shot installer.

---

## When it goes wrong

**The second run still reports changes**

`--check --diff` names the task. Almost always a `command`/`shell` with no
`creates:` guard, or a template rendering a timestamp.

**Jenkins installs but does not start**

Java is missing or the wrong major version. `journalctl -u jenkins -n 50` says
so directly.

**`Interactive vault password prompt` in CI**

Pass `--vault-password-file`, and keep that file out of the repository.

**A handler never fires**

Handlers run at the end of a play and are skipped entirely if the notifying
task did not change. `--force-handlers` while debugging.

**The docker group does not take effect**

Group membership applies at next login. `reset_connection` in the play, or
`become` for the tasks that need it.

---

## Clean up

```bash
# Nothing to destroy here — the instance belongs to the Terraform lab.
ansible -m command -a "systemctl status jenkins --no-pager" tag_Role_jenkins
```

**Cost of this lab:** **Low.** You pay for the instance being configured, not
for Ansible.
""",
}

# ── lab-11 · Core Kubernetes workloads ────────────────────────────────────
REWRITES["lab-11-core-kubernetes-workloads-configmaps-secrets"] = {
    "criteria": [
        "The application runs from an image with no environment-specific value baked into it.",
        "A failing readiness probe removes a Pod from the Service without restarting it.",
        "Every container has requests and limits, and you can state its QoS class.",
        "A ConfigMap change reaches the Pods, and you know what made it.",
    ],
    "scenario": (
        "The image has the database hostname compiled in, so staging and "
        "production are different builds of the same commit. The password is in "
        "the same file. There are no probes, so a hung process keeps receiving "
        "traffic, and no limits, so one leaking container takes the node with it."
    ),
    "body": """
## What you are building

```text
  Namespace: platform
    |
    +-- ConfigMap    non-secret config      -> env vars
    +-- Secret       credentials            -> env vars, RBAC-scoped
    +-- Deployment   2 replicas, probes, limits
    +-- Service      ClusterIP, stable name
```

---

## Build it

### 1. A namespace, and why not `default`

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: platform
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: restricted
```

A namespace is the unit RBAC, quotas and NetworkPolicies attach to. Everything
in `default` shares one blast radius and cannot be granted separately, which is
why the first real thing you create is a namespace.

### 2. Configuration outside the image

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  namespace: platform
data:
  LOG_LEVEL: "info"
  DB_HOST: "postgres.platform.svc.cluster.local"
  FEATURE_CHECKOUT: "true"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
  namespace: platform
type: Opaque
stringData:                     # plain text here; Kubernetes encodes it
  DB_PASSWORD: "change-me"
  API_KEY: "change-me"
```

Use `stringData` when writing YAML by hand. `data` requires base64 and creates
a step where people paste the wrong thing — and **base64 is encoding, not
encryption** either way. Anyone with `get secrets` reads it:

```bash
kubectl get secret app-secrets -n platform -o jsonpath='{.data.DB_PASSWORD}' | base64 -d
```

What a Secret buys you over a ConfigMap is that RBAC can withhold it
separately, `kubectl describe` does not print it, and the kubelet mounts it as
`tmpfs`.

### 3. The Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: platform
spec:
  replicas: 2
  selector:
    matchLabels: { app: api }
  template:
    metadata:
      labels: { app: api }
    spec:
      containers:
        - name: api
          image: registry.example.com/api:1.4.2      # never :latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef: { name: app-config }
            - secretRef:    { name: app-secrets }

          resources:
            requests: { cpu: "100m", memory: "128Mi" }
            limits:   { cpu: "500m", memory: "256Mi" }

          startupProbe:                # slow starts do not count as failures
            httpGet: { path: /healthz, port: 8000 }
            failureThreshold: 30
            periodSeconds: 2
          readinessProbe:              # may I receive traffic?
            httpGet: { path: /healthz, port: 8000 }
            periodSeconds: 5
          livenessProbe:               # should I be killed?
            httpGet: { path: /healthz, port: 8000 }
            periodSeconds: 10
            failureThreshold: 3

          lifecycle:
            preStop:
              exec: { command: ["sh", "-c", "sleep 5"] }
      terminationGracePeriodSeconds: 30
```

**The three probes answer three different questions**, and conflating them
causes outages:

| Probe | Asks | On failure |
| --- | --- | --- |
| `startupProbe` | Has it finished booting? | Holds the other two off |
| `readinessProbe` | Can it serve now? | Removed from the Service. Not restarted. |
| `livenessProbe` | Is it wedged? | **Container killed** |

A liveness probe pointed at an endpoint that touches the database turns a
database blip into every Pod restarting at once. Liveness should test the
process, readiness should test whether it can do useful work.

**Requests versus limits, and QoS:**

- `requests` is what the scheduler reserves — too high and Pods stay `Pending`.
- `limits` is the ceiling. Exceeding memory is an immediate OOM kill; exceeding
  CPU is throttling, not a kill.
- Equal requests and limits gives `Guaranteed` QoS, which is evicted last.
  Requests only gives `Burstable`. Neither gives `BestEffort`, evicted first.

```bash
kubectl get pod -n platform -o jsonpath='{.items[*].status.qosClass}'
```

### 4. A Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: platform
spec:
  selector: { app: api }
  ports:
    - port: 80
      targetPort: 8000
```

---

## Verify it worked

```bash
# The config is injected, not baked in
kubectl exec -n platform deploy/api -- env | grep -E 'LOG_LEVEL|DB_HOST'

# Endpoints exist — this is what a Service actually resolves to
kubectl get endpointslices -n platform -l kubernetes.io/service-name=api

# Readiness removes a Pod without restarting it
kubectl exec -n platform deploy/api -- touch /tmp/unhealthy   # if your app honours it
kubectl get pods -n platform          # READY 0/1, RESTARTS unchanged
kubectl get endpointslices -n platform -l kubernetes.io/service-name=api  # one fewer address

# QoS is what you intended
kubectl get pods -n platform -o custom-columns=NAME:.metadata.name,QOS:.status.qosClass

# Reachable by name from inside the cluster
kubectl run curl --rm -it --image=curlimages/curl --restart=Never -n platform -- \\
  curl -s -o /dev/null -w '%{http_code}\\n' http://api/
```

The readiness test is the one worth doing carefully: seeing `READY 0/1` with
`RESTARTS 0` and one fewer endpoint is the difference between understanding
readiness and having copied it.

---

## When it goes wrong

**`CreateContainerConfigError`**

A ConfigMap or Secret named in `envFrom` does not exist **in that namespace**.
`kubectl describe pod` names it.

**`CrashLoopBackOff` immediately after a config change**

The app read a value it cannot parse. `kubectl logs --previous` reads the dead
container.

**Pods restart under load with no error in the logs**

OOM killed. `kubectl get pod -o jsonpath='{.status.containerStatuses[0].lastState}'`
shows `reason: OOMKilled`. Raise the memory limit or fix the leak.

**The Service returns nothing but Pods are healthy**

The selector does not match the Pod labels, or readiness is failing. The
EndpointSlice tells you which in one command.

**Everything is slow but nothing is failing**

CPU throttling at the limit. Exceeding a CPU limit throttles rather than kills,
so it presents as latency, not as an error.

**A config change did nothing**

Environment variables are read once at process start. Restart the Pods, or
mount the ConfigMap as a file and watch it.

---

## Clean up

```bash
kubectl delete namespace platform
```

**Cost of this lab:** Free on kind or minikube. On EKS you are paying for the
cluster either way; these objects add nothing.
""",
}

# ── lab-12 · Ingress and the AWS Load Balancer Controller ─────────────────
REWRITES["lab-12-application-routing-with-k8s-ingress-aws-load-balancer-contr"] = {
    "criteria": [
        "A real ALB is provisioned from a Kubernetes manifest, and you can find it in the AWS console.",
        "Path-based routing sends two paths to two different Services.",
        "You can explain what `target-type: ip` changes, and why it matters here.",
        "Deleting the Ingress removes the ALB — verified, not assumed.",
    ],
    "scenario": (
        "Each service was exposed with `type: LoadBalancer`, so there are six "
        "load balancers, six DNS names and six monthly charges for one "
        "application.\n\n"
        "One entry point, routed by path, is the fix — and the mechanism that "
        "creates it is worth understanding, because when it silently does "
        "nothing there is no error anywhere."
    ),
    "body": """
## What you are building

```text
   Internet
      |  one DNS name, one certificate
      v
   Application Load Balancer          <- created BY the controller, from your manifest
      |  /api -> target group 1
      |  /    -> target group 2
      v
   Pod IPs directly (target-type: ip)
```

**The Ingress object does nothing on its own.** It is configuration waiting for
a controller. Without one, `kubectl apply` succeeds, `kubectl get ingress`
shows the object, `ADDRESS` stays empty forever and nothing anywhere reports an
error. That silence is the single most confusing failure in Kubernetes
networking, and knowing to check for the controller first saves hours.

---

## Build it

### 1. The controller, and its AWS identity

```bash
helm repo add eks https://aws.github.io/eks-charts
helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \\
  -n kube-system \\
  --set clusterName=platform \\
  --set serviceAccount.create=false \\
  --set serviceAccount.name=aws-load-balancer-controller
```

The controller creates ALBs, target groups and listener rules in **your AWS
account**, so it needs IAM permissions — through IRSA, not the node role:

```bash
kubectl annotate serviceaccount aws-load-balancer-controller -n kube-system \\
  eks.amazonaws.com/role-arn=arn:aws:iam::111122223333:role/alb-controller
```

### 2. Subnets must be tagged, or nothing happens

```bash
aws ec2 create-tags --resources subnet-0abc subnet-0def \\
  --tags Key=kubernetes.io/role/elb,Value=1                 # public: internet-facing

aws ec2 create-tags --resources subnet-0ghi subnet-0jkl \\
  --tags Key=kubernetes.io/role/internal-elb,Value=1        # private: internal
```

This is how the controller discovers where to place the load balancer. Missing
tags produce `unable to discover at least one subnet` in the controller log and
nothing at all on the Ingress — which is why the controller log is the first
place to look, not the last.

### 3. The Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: platform
  namespace: platform
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:111122223333:certificate/abc
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/group.name: platform      # share ONE ALB
spec:
  ingressClassName: alb
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service: { name: api, port: { number: 80 } }
          - path: /
            pathType: Prefix
            backend:
              service: { name: web, port: { number: 80 } }
```

Three annotations that change behaviour rather than decorate it:

- **`target-type: ip`** registers **Pod IPs** in the target group. The
  alternative, `instance`, registers nodes and relies on a NodePort, adding a
  kube-proxy hop and losing the client IP. With the VPC CNI giving Pods real
  VPC addresses, `ip` is the better default — and it is required for Fargate.
- **`group.name`** lets several Ingress objects share one ALB. Without it every
  Ingress gets its own, and you have recreated the problem this lab exists to
  solve.
- **`ssl-redirect`** is enforced at the load balancer, so no request reaches
  your application over plain HTTP.

**Rules are evaluated in order and the first match wins.** Putting `/` before
`/api` swallows everything, and the symptom is the wrong service answering
rather than an error.

---

## Verify it worked

```bash
# The ALB was created, and Kubernetes knows its address
kubectl get ingress -n platform
aws elbv2 describe-load-balancers \\
  --query 'LoadBalancers[?contains(LoadBalancerName,`platform`)].[DNSName,Scheme,State.Code]' --output table

# Targets are Pod IPs, and they are healthy
aws elbv2 describe-target-health --target-group-arn <arn> \\
  --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output table
kubectl get pods -n platform -o wide      # the same addresses

# Both paths route where you intended
curl -s -o /dev/null -w '%{http_code} ' https://app.example.com/api/health
curl -s -o /dev/null -w '%{http_code}\\n' https://app.example.com/

# HTTP is redirected, not served
curl -sI http://app.example.com/ | head -2      # 301 to https

# Deleting the Ingress removes the ALB
kubectl delete ingress platform -n platform
aws elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerName'
```

That last check is not ceremony. An ALB that outlives its Ingress keeps billing
and its ENIs block the VPC from being destroyed later.

---

## When it goes wrong

**`ADDRESS` stays empty**

Read the controller: `kubectl logs -n kube-system deploy/aws-load-balancer-controller`.
Almost always missing subnet tags, missing IRSA permissions, or a
`ingressClassName` no controller is watching.

**`unable to discover at least one subnet`**

The `kubernetes.io/role/elb` tags. Both the tag and a subnet in at least two
AZs are required.

**Targets are `unhealthy` but the Pods are Ready**

The ALB health check path differs from the readiness probe path, or the
security group does not allow the ALB to reach the Pod port. These are separate
health checks and they can disagree.

**502 from the ALB**

There are healthy targets and the application refused the connection — usually
the container listening on `127.0.0.1` rather than `0.0.0.0`, or the wrong
`targetPort`.

**404 from the ALB**

No rule matched. Check the `Host` header and rule order.

**`terraform destroy` hangs on the VPC**

The ALB still exists because the Ingress was never deleted. Its ENIs hold the
subnets.

---

## Clean up

```bash
kubectl delete ingress --all -n platform
aws elbv2 describe-load-balancers --query 'LoadBalancers[].[LoadBalancerName,State.Code]' --output table
```

**Cost of this lab:** **Billable.** An ALB is about $0.0225/hour (~$17/month)
plus capacity units, and it keeps billing until the Ingress is deleted.
""",
}

# ── lab-13 · NetworkPolicy and HPA ────────────────────────────────────────
REWRITES["lab-13-kubernetes-security-hardening-networkpolicies-hpa"] = {
    "criteria": [
        "With default-deny applied, an unrelated Pod cannot reach the application — demonstrated.",
        "The application still reaches the database and DNS.",
        "The HPA scales up under load and back down afterwards.",
        "You can explain why a NetworkPolicy sometimes does nothing at all.",
    ],
    "scenario": (
        "Every Pod can reach every other Pod, in every namespace. A compromise "
        "of the public-facing service is a port scan away from the database.\n\n"
        "The application is also fixed at two replicas, so traffic either wastes "
        "money or drops requests."
    ),
    "body": """
## What you are building

Two independent controls that are often taught together and solve different
problems: **NetworkPolicy** decides what a Pod may talk to; **HPA** decides how
many of it there are.

```text
   ingress controller ---> api  ---> postgres
                            |
                            +------> kube-dns :53   (easy to forget)

   everything else --X--> api        default deny
```

---

## Build it

### 1. Default deny — start by breaking it

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: platform
spec:
  podSelector: {}                 # every Pod in the namespace
  policyTypes: ["Ingress", "Egress"]
```

An empty `podSelector` selects everything; no rules means nothing is allowed.
Apply this first and confirm the application breaks — a default-deny you cannot
prove is doing anything is indistinguishable from one that is silently ignored.

### 2. Allow exactly what is needed

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
  namespace: platform
spec:
  podSelector:
    matchLabels: { app: api }
  policyTypes: ["Ingress", "Egress"]

  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: ingress-nginx }
      ports:
        - protocol: TCP
          port: 8000

  egress:
    # DNS first. Without it nothing resolves and every symptom is misleading.
    - to:
        - namespaceSelector:
            matchLabels: { kubernetes.io/metadata.name: kube-system }
          podSelector:
            matchLabels: { k8s-app: kube-dns }
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53

    - to:
        - podSelector:
            matchLabels: { app: postgres }
      ports:
        - protocol: TCP
          port: 5432
```

**Forgetting DNS egress is the classic self-inflicted outage.** Everything
still works by IP, so the application looks reachable, while every hostname
lookup times out — and the symptom is slow failures rather than refusals, which
sends people to look at the database.

Two more things worth holding onto:

- **Policies are additive, and there is no deny rule.** A Pod's allowed traffic
  is the union of every policy selecting it. You restrict by not allowing.
- **A Pod selected by no policy at all is unrestricted.** That is why the
  default-deny exists; without it, adding a policy to one Pod leaves every
  other Pod wide open.

### 3. The HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
  namespace: platform
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0        # react quickly
      policies:
        - type: Percent
          value: 100
          periodSeconds: 30
    scaleDown:
      stabilizationWindowSeconds: 300      # leave slowly
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

**`averageUtilization: 70` is a percentage of the CPU *request*, not of the
node.** A Pod requesting `100m` and using `70m` is at 100% by this measure. An
HPA on a Deployment with no CPU request cannot compute a ratio and does
nothing, reporting `<unknown>` — which is the most common reason an HPA appears
inert.

The asymmetric `behavior` is deliberate: scale up fast because the alternative
is dropped requests, scale down slowly because flapping is worse than a few
minutes of extra capacity.

`metrics-server` must be installed, or there is no CPU reading at all.

---

## Verify it worked

```bash
# The negative test — this is the actual security claim
kubectl run intruder --rm -it --image=curlimages/curl --restart=Never -n platform -- \\
  curl -s --max-time 5 http://api:80/          # must time out

# The positive test, from a Pod the policy allows
kubectl run probe --rm -it --image=curlimages/curl --restart=Never \\
  -n ingress-nginx -- curl -s -o /dev/null -w '%{http_code}\\n' http://api.platform/

# DNS still resolves from the app
kubectl exec -n platform deploy/api -- nslookup postgres.platform.svc.cluster.local

# HPA has a reading, not <unknown>
kubectl get hpa -n platform
kubectl top pods -n platform

# Generate load and watch it scale
kubectl run load --rm -it --image=busybox:1.36 --restart=Never -n platform -- \\
  sh -c 'while true; do wget -q -O- http://api:80/ >/dev/null; done'
kubectl get hpa api -n platform -w
kubectl get deploy api -n platform -w
```

Both the timeout and the success matter. Proving traffic flows is easy; proving
that traffic which should not flow does not is the claim you are actually
making.

---

## When it goes wrong

**The policy has no effect and everything still connects**

**The CNI must enforce NetworkPolicy, and not all do.** kind's default CNI
accepts the objects and ignores them entirely — no error, no warning. Calico,
Cilium and the AWS VPC CNI (with policy enforcement enabled) do enforce. Check
what the cluster runs before concluding the policy is wrong.

**Everything broke and the errors mention timeouts**

DNS egress. Add UDP and TCP 53 to `kube-system`.

**A policy in another namespace does not apply**

NetworkPolicies are namespaced and select Pods in their own namespace only. The
`namespaceSelector` matches the *other* end of the connection.

**`namespaceSelector` matches nothing**

It matches namespace **labels**, not names. Kubernetes 1.22+ sets
`kubernetes.io/metadata.name` automatically; older clusters need a label added.

**HPA shows `<unknown>` for the metric**

`metrics-server` is not installed, or the Deployment has no CPU request. Both
are required.

**It scales up and immediately back down**

Add a `scaleDown` stabilization window. Without one, a brief dip removes the
capacity you just added.

---

## Clean up

```bash
kubectl delete networkpolicy --all -n platform
kubectl delete hpa --all -n platform
kubectl delete namespace platform
```

**Cost of this lab:** Free on kind or minikube with a CNI that enforces policy.
On EKS the cluster bills either way; these objects add nothing.
""",
}


def main() -> None:
    for lab_id, spec in REWRITES.items():
        rewrite(lab_id, spec)
        print(f"  rewrote {lab_id}")
    print(f"\n{len(REWRITES)} labs rewritten (guided + challenge criteria)")


if __name__ == "__main__":
    main()
