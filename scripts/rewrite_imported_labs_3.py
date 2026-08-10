#!/usr/bin/env python3
"""
Batch 3 — the last five imported NTI labs.

Same defects, same remedy. See rewrite_imported_labs.py for the diagnosis.

lab-18 was the worst on the platform: 167 words, one `kubectl apply -f` of two
files that do not exist here, and a single success criterion reading
"Step 1: Deploy ECR & S3 Infrastructure" — a heading the importer mistook for
an objective, which then became the page's checklist.

Run: python scripts/rewrite_imported_labs_3.py
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from rewrite_imported_labs import rewrite  # noqa: E402

REWRITES: dict[str, dict] = {}

# ── lab-14 · A custom Helm chart ──────────────────────────────────────────
REWRITES["lab-14-creating-a-custom-helm-chart-for-django-microservices"] = {
    "criteria": [
        "One chart installs into two environments with different values and no edited templates.",
        "`helm template` renders correct YAML before anything touches the cluster.",
        "A config change causes a rollout, rather than mutating Pods that never restart.",
        "`helm lint` and a rendered dry run both pass in CI.",
    ],
    "scenario": (
        "There are three directories of manifests — dev, staging and prod — that "
        "started identical and are not any more. Nobody can say what differs "
        "except by diffing them, and the diff is 400 lines because the "
        "namespaces and image tags are on every file."
    ),
    "body": """
## What you are building

```text
  myapp/
    Chart.yaml            name, version, appVersion
    values.yaml           the defaults, and the documented interface
    values-prod.yaml      only what production differs by
    templates/
      _helpers.tpl        names and labels, defined once
      deployment.yaml
      service.yaml
      ingress.yaml
      configmap.yaml
      hpa.yaml
      NOTES.txt           printed after install
```

A chart is a package plus a **template engine plus a release**. The last part
is what people underuse: Helm remembers what it installed, so upgrade, rollback
and diff are possible. `kubectl apply -f` has no memory of what it applied.

---

## Build it

### 1. `Chart.yaml`

```yaml
apiVersion: v2
name: myapp
description: The platform application
type: application
version: 0.3.0            # the CHART version — bump on template changes
appVersion: "1.4.2"       # the APPLICATION version — the image tag
```

Two versions because they change for different reasons. Editing a template
without bumping `version` means two different charts share a number, and
`helm history` stops being able to tell you what ran.

### 2. Helpers, so names are defined once

```yaml
{{/* templates/_helpers.tpl */}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "myapp.fullname" -}}
{{- printf "%s-%s" .Release.Name (include "myapp.name" .) | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "myapp.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{- define "myapp.selectorLabels" -}}
app.kubernetes.io/name: {{ include "myapp.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end -}}
```

**Selector labels are a separate helper on purpose.** A Deployment's
`spec.selector` is immutable after creation, so it must not include
`app.kubernetes.io/version` or the chart version — the next `appVersion` bump
would try to change an immutable field and the upgrade fails with a message
that does not mention labels.

`trunc 63` is not decoration either: Kubernetes label values are limited to 63
characters, and a long release name silently produces an invalid object.

### 3. A template

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels: {{- include "myapp.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels: {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      annotations:
        # Roll the Pods when the config changes. Without this the ConfigMap is
        # updated and the running Pods keep the old values indefinitely.
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
      labels: {{- include "myapp.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          envFrom:
            - configMapRef:
                name: {{ include "myapp.fullname" . }}-config
          resources: {{- toYaml .Values.resources | nindent 12 }}
          {{- with .Values.probes }}
          readinessProbe: {{- toYaml .readiness | nindent 12 }}
          livenessProbe: {{- toYaml .liveness | nindent 12 }}
          {{- end }}
```

The `checksum/config` annotation is the idiom worth memorising. Editing a
ConfigMap through Helm changes the object and **does not restart anything** —
so a config change appears to deploy and takes effect at some unpredictable
future restart. Hashing the rendered ConfigMap into the Pod template makes the
Pod spec change, which makes it a rollout.

`{{- if not .Values.autoscaling.enabled }}` around `replicas` matters once an
HPA exists: leaving `replicas` in the manifest makes Helm and the HPA fight,
and each `helm upgrade` resets the count.

### 4. `values.yaml` is the interface

```yaml
replicaCount: 2

image:
  repository: registry.example.com/api
  tag: ""                       # defaults to .Chart.AppVersion
  pullPolicy: IfNotPresent

resources:
  requests: { cpu: 100m, memory: 128Mi }
  limits:   { cpu: 500m, memory: 256Mi }

probes:
  readiness:
    httpGet: { path: /healthz, port: 8000 }
    periodSeconds: 5
  liveness:
    httpGet: { path: /healthz, port: 8000 }
    periodSeconds: 10

autoscaling:
  enabled: false
  minReplicas: 2
  maxReplicas: 6
  targetCPUUtilizationPercentage: 70

ingress:
  enabled: false
  className: alb
  hosts: []
```

```yaml
# values-prod.yaml — only the differences
replicaCount: 4
autoscaling: { enabled: true, maxReplicas: 12 }
ingress:
  enabled: true
  hosts: ["app.example.com"]
resources:
  requests: { cpu: 500m, memory: 512Mi }
  limits:   { cpu: "2", memory: 1Gi }
```

### 5. Render before you install

```bash
helm lint ./myapp
helm template rel ./myapp -f myapp/values-prod.yaml | kubectl apply --dry-run=server -f -
helm install rel ./myapp -n platform --create-namespace -f myapp/values-prod.yaml --atomic --wait
```

`helm template` renders locally with no cluster involved, so it is the fast
check; piping it to `--dry-run=server` adds validation against the real API,
including admission webhooks. Both belong in CI.

---

## Verify it worked

```bash
# Same chart, different environments, no edited templates
helm template rel ./myapp | grep -c "replicas: 2"
helm template rel ./myapp -f myapp/values-prod.yaml | grep -c "replicas: 4"

# What the release is ACTUALLY running, not what the file says
helm get values rel -n platform
helm get manifest rel -n platform | head -30

# A config change produces a rollout
kubectl get pods -n platform -o name > /tmp/before
helm upgrade rel ./myapp -n platform --set config.LOG_LEVEL=debug --atomic --wait
kubectl get pods -n platform -o name > /tmp/after
diff /tmp/before /tmp/after && echo "NO ROLLOUT — checksum annotation missing" || echo "rolled — correct"

helm history rel -n platform
```

---

## When it goes wrong

**`field is immutable` on upgrade**

The Deployment selector changed, usually because a version label leaked into
`selectorLabels`. Selectors cannot be edited; the release must be uninstalled
and reinstalled.

**A ConfigMap change did nothing**

The `checksum/config` annotation is missing. The object updated; no Pod
restarted.

**`nindent` produces broken YAML**

Indentation is counted from column zero. `nindent 4` adds a newline then
indents by 4 — `indent` does not add the newline. Rendering with
`helm template` shows it immediately.

**Values from a previous release reappear**

`--reuse-values` carries them forward. Use an explicit values file every time.

**`helm lint` passes and the install fails**

`lint` checks the chart, not the cluster. Add `--dry-run=server`, which runs
admission control.

---

## Clean up

```bash
helm uninstall rel -n platform
kubectl delete namespace platform
```

**Cost of this lab:** Free on kind or minikube.
""",
}

# ── lab-15 · Cluster add-ons with Helm and IRSA ───────────────────────────
REWRITES["lab-15-managing-eks-cluster-add-ons-with-helm-irsa"] = {
    "criteria": [
        "A controller calls the AWS API using its own IAM role, not the node's.",
        "`aws sts get-caller-identity` from inside the Pod returns the IRSA role.",
        "A Pod without the annotation is refused the same action — demonstrated.",
        "metrics-server works, so `kubectl top` and HPAs have a metric.",
    ],
    "scenario": (
        "The Load Balancer Controller works because someone attached its policy "
        "to the node role. Every Pod on every node now has permission to create "
        "and delete load balancers, and nothing in the cluster shows that."
    ),
    "body": """
## What you are building

An empty EKS cluster cannot do much: it cannot provision a load balancer from
an Ingress, cannot report CPU for an HPA, and cannot attach a volume. Those
come from controllers you install — and the interesting part is how they get
AWS permissions.

```text
  Pod
   |  projected token: "I am system:serviceaccount:kube-system:alb-controller"
   v
  EKS OIDC provider  ->  AWS STS  ->  temporary credentials for ONE role
```

**Without IRSA there are two options and both are bad**: an access key in a
Secret, which never rotates, or a policy on the node role, which grants it to
every Pod on the node. IRSA gives one workload one role, with credentials that
expire.

---

## Build it

### 1. The role, trusted by one ServiceAccount

```hcl
data "aws_iam_policy_document" "lbc_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_host}:sub"
      values   = ["system:serviceaccount:kube-system:aws-load-balancer-controller"]
    }
    condition {
      test     = "StringEquals"
      variable = "${var.oidc_host}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lbc" {
  name               = "alb-controller"
  assume_role_policy = data.aws_iam_policy_document.lbc_trust.json
}
```

**Both conditions are required.** Without `sub`, any ServiceAccount in the
cluster can assume the role — which is worse than the node-role problem it was
meant to fix, because it now looks like it was done properly. Without `aud`, a
token minted for another audience is accepted.

`oidc_host` is the issuer URL with `https://` stripped.

### 2. The ServiceAccount carries the ARN

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::111122223333:role/alb-controller
```

The EKS Pod Identity Webhook sees this annotation and injects
`AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE` and a projected token into every
Pod using the ServiceAccount. Every AWS SDK finds them with no configuration.

**The injection happens at Pod creation.** Annotating a ServiceAccount does not
affect Pods that already exist — they must be restarted, and this is the reason
IRSA "does not work" more often than any misconfigured trust policy.

### 3. Install the add-ons

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/

helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \\
  -n kube-system \\
  --set clusterName=platform \\
  --set serviceAccount.create=false \\
  --set serviceAccount.name=aws-load-balancer-controller \\
  --set region=us-east-1 \\
  --set vpcId=vpc-0abc \\
  --atomic --wait

helm upgrade --install metrics-server metrics-server/metrics-server \\
  -n kube-system --atomic --wait
```

`serviceAccount.create=false` matters: letting the chart create the
ServiceAccount produces one without your annotation, and the controller falls
back to the node role — which usually *works*, so nothing looks wrong.

Pin chart versions with `--version` for the same reason you pin images.

---

## Verify it worked

```bash
# The Pod has an identity of its own
kubectl exec -n kube-system deploy/aws-load-balancer-controller -- env | grep AWS_ROLE_ARN
kubectl exec -n kube-system deploy/aws-load-balancer-controller -- \\
  ls /var/run/secrets/eks.amazonaws.com/serviceaccount/

# It IS that role, not the node role
kubectl run awscli --rm -it --image=amazon/aws-cli --restart=Never \\
  -n kube-system --overrides='{"spec":{"serviceAccountName":"aws-load-balancer-controller"}}' \\
  -- sts get-caller-identity
# Arn: .../alb-controller/botocore-session-...

# The negative test — a Pod WITHOUT the annotation
kubectl run awscli-plain --rm -it --image=amazon/aws-cli --restart=Never \\
  -- sts get-caller-identity
# returns the NODE role — proves the scoping is real

# metrics-server actually serves metrics
kubectl top nodes
kubectl top pods -A | head

# The controller can do its job
kubectl logs -n kube-system deploy/aws-load-balancer-controller --tail=20
```

The negative test is the one that proves the point. Showing the controller
works does not distinguish IRSA from a policy on the node role — showing that
an unannotated Pod gets something different does.

---

## When it goes wrong

**`WebIdentityErr: failed to retrieve credentials`**

The trust policy's `sub` does not match. It must be exactly
`system:serviceaccount:<namespace>:<name>`.

**The Pod gets the node role instead**

The annotation is missing, the Pod does not name the ServiceAccount, or it was
running before the annotation was added. Restart it.

**`no such host: oidc.eks...`**

No OIDC provider is registered for the cluster, or its thumbprint is stale.

**`kubectl top` returns `Metrics API not available`**

metrics-server is not running, or it cannot reach the kubelets. On some
clusters it needs `--kubelet-insecure-tls`; understand why before adding it.

**Everything works, and you cannot tell whether IRSA is being used**

That is the failure this lab is about. Run the negative test.

---

## Clean up

```bash
helm uninstall aws-load-balancer-controller metrics-server -n kube-system
terraform destroy -target=aws_iam_role.lbc
```

**Cost of this lab:** **Low.** IAM roles are free. The controllers run on nodes
you are already paying for; anything they provision is not.
""",
}

# ── lab-16 · The pipeline with gates ──────────────────────────────────────
REWRITES["lab-16-enterprise-multibranch-ci-cd-pipeline-with-sonarqube-trivy"] = {
    "criteria": [
        "A commit builds, tests, scans and deploys with no manual step.",
        "A deliberately vulnerable image fails the build and is never pushed.",
        "A quality gate failure fails the pipeline — demonstrated, not assumed.",
        "The pipeline fails when the rollout does not complete.",
    ],
    "scenario": (
        "The pipeline is green. It is also building `latest`, pushing before it "
        "scans, and finishing the moment `kubectl set image` returns — so a "
        "deploy that never becomes ready reports success.\n\n"
        "A gate that reports instead of blocking is a dashboard, not a gate."
    ),
    "body": """
## What you are building

```text
  checkout -> unit tests -> SonarQube gate -> build image -> Trivy scan
                                                                |
                                        CRITICAL+fixable? ------+--> FAIL, no push
                                                                |
                                                                v
                                                    push to ECR -> deploy -> wait
```

**Order is the design.** Scan **before** the push, because scanning afterwards
means the vulnerable image is already in the registry and someone can pull it.
Cheap checks first, so an expensive scan only runs on code that compiles.

---

## Build it

### 1. The Jenkinsfile

```groovy
pipeline {
  agent any

  environment {
    REGISTRY = "111122223333.dkr.ecr.us-east-1.amazonaws.com"
    IMAGE    = "platform/api"
    TAG      = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
  }

  options {
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  stages {
    stage('Unit tests') {
      steps {
        sh 'docker run --rm -v "$PWD":/src -w /src python:3.12-slim sh -c "pip install -q -r requirements.txt && pytest -q --junitxml=report.xml"'
      }
      post { always { junit 'report.xml' } }
    }

    stage('SonarQube') {
      steps {
        withSonarQubeEnv('sonarqube') {
          sh 'sonar-scanner -Dsonar.projectKey=platform-api'
        }
      }
    }

    stage('Quality gate') {
      steps {
        timeout(time: 10, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true      // <- the gate
        }
      }
    }

    stage('Build') {
      steps { sh 'docker build -t "$REGISTRY/$IMAGE:$TAG" .' }
    }

    stage('Scan') {
      steps {
        sh '''
          trivy image \
            --severity HIGH,CRITICAL \
            --ignore-unfixed \
            --exit-code 1 \
            --format table \
            "$REGISTRY/$IMAGE:$TAG"
        '''
      }
    }

    stage('Push') {
      steps {
        sh '''
          aws ecr get-login-password --region us-east-1 \
            | docker login --username AWS --password-stdin "$REGISTRY"
          docker push "$REGISTRY/$IMAGE:$TAG"
        '''
      }
    }

    stage('Deploy') {
      steps {
        sh '''
          aws eks update-kubeconfig --name platform --region us-east-1
          helm upgrade --install api ./chart -n platform \
            --set image.tag="$TAG" --atomic --wait --timeout 5m
          kubectl rollout status deploy/api -n platform --timeout=5m
        '''
      }
    }
  }

  post {
    always  { sh 'docker rmi "$REGISTRY/$IMAGE:$TAG" || true' }
    failure { echo "Build ${env.BUILD_NUMBER} failed at ${env.STAGE_NAME}" }
  }
}
```

Four details that separate this from a pipeline that only looks finished:

- **`abortPipeline: true`** is what makes the quality gate a gate. Without it,
  Sonar reports and the build continues.
- **`--exit-code 1`** is the same idea for Trivy. Without it the scan prints a
  table nobody reads.
- **`--ignore-unfixed`** keeps the gate actionable. Failing on a CVE with no
  available patch gives the team no move except to disable the check, which is
  how gates die.
- **`--atomic --wait` plus `rollout status --timeout`** is what makes the
  pipeline fail when the deploy fails. `helm upgrade` alone returns as soon as
  the API accepts the manifest.

### 2. Credentials the pipeline never stores

```groovy
// Avoid this:
withCredentials([string(credentialsId: 'aws-key', variable: 'AWS_SECRET')]) { ... }
```

The Jenkins host runs with an **IAM instance profile**, so `aws` and `docker
login` work with no stored key at all. A credential that does not exist cannot
leak from the credential store.

### 3. Multibranch: the same file, different behaviour

```groovy
    stage('Deploy') {
      when { branch 'main' }
      steps { ... }
    }
```

A multibranch job discovers every branch and runs its `Jenkinsfile`. Feature
branches get tests, Sonar and a scan; only `main` deploys. One file, and the
policy is visible in it rather than living in job configuration nobody can
review.

---

## Verify it worked

```bash
# The image was tagged by commit, never latest
aws ecr describe-images --repository-name platform/api \\
  --query 'sort_by(imageDetails,&imagePushedAt)[-1].imageTags'

# The running image matches what the pipeline pushed
kubectl get deploy api -n platform \\
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

**Prove each gate blocks, rather than trusting it:**

```bash
# 1. A knowingly vulnerable base — the build must FAIL at Scan, with no push
echo "FROM debian:10" > Dockerfile.vuln
docker build -f Dockerfile.vuln -t probe:vuln .
trivy image --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 probe:vuln
echo "exit=$?"     # 1

# 2. The image must NOT be in the registry after a failed build
aws ecr describe-images --repository-name platform/api \\
  --query 'imageDetails[].imageTags' | grep vuln || echo "never pushed — correct"

# 3. Break the quality gate deliberately and confirm the pipeline stops
#    (add a blocker-level issue, or lower the gate threshold in SonarQube)
```

A gate you have never seen fail is a gate you cannot claim works.

---

## When it goes wrong

**`waitForQualityGate` hangs until the timeout**

SonarQube cannot reach Jenkins to post the webhook. Configure the webhook in
SonarQube, pointing at `<jenkins>/sonarqube-webhook/`.

**Trivy fails every build after a while**

New CVEs are published against a base image that has not moved. Pin and update
the base deliberately, and keep `--ignore-unfixed` so the gate stays
actionable.

**`no basic auth credentials` on push**

The ECR token expired — they last 12 hours. `get-login-password` must be a
pipeline step, not something a human ran once.

**The pipeline is green and nothing deployed**

`kubectl set image` or `helm upgrade` returned immediately. Add
`rollout status --timeout` and `--atomic --wait`.

**`You must be logged in to the server`**

IAM let you fetch a kubeconfig; EKS has not authorised the principal. Add an
access entry for the Jenkins instance role.

**Two builds of the same branch corrupt each other**

`disableConcurrentBuilds()`.

---

## Clean up

```bash
docker image prune -af
aws ecr list-images --repository-name platform/api --filter tagStatus=UNTAGGED \\
  --query 'imageIds[]' --output json > /tmp/untagged.json
aws ecr batch-delete-image --repository-name platform/api --image-ids file:///tmp/untagged.json
```

**Cost of this lab:** **Low.** The Jenkins host and the cluster bill anyway.
ECR storage is $0.10/GB-month, which is why the lifecycle policy from the ECR
lab matters.
""",
}

# ── lab-17 · kube-prometheus-stack ────────────────────────────────────────
REWRITES["lab-17-deploying-kube-prometheus-stack-on-aws-eks"] = {
    "criteria": [
        "Prometheus is scraping the cluster and your application, verified in Targets.",
        "A ServiceMonitor picks up the application without editing Prometheus configuration.",
        "Grafana shows CPU and memory for your workload.",
        "Metrics survive a Prometheus Pod restart.",
    ],
    "scenario": (
        "\"Is it healthy?\" is answered by `kubectl get pods` and a guess. There "
        "is no history, so nobody can say whether last night was unusual, and "
        "the first sign of a problem is a person noticing."
    ),
    "body": """
## What you are building

```text
  ServiceMonitor  (a CRD: "scrape any Service with these labels")
        |  the Operator reads it and rewrites the Prometheus config
        v
  Prometheus  --scrapes-->  /metrics on node-exporter, kube-state-metrics, your app
        |
        +--> Alertmanager   routing and silencing
        +--> Grafana        dashboards
```

**The Operator is the part worth understanding.** Plain Prometheus has one
configuration file listing every scrape target — in a cluster where Pods come
and go, that file is wrong immediately. The Operator watches `ServiceMonitor`
and `PrometheusRule` objects and regenerates the configuration, so adding
monitoring to a new service is creating an object, not editing a central file
and reloading it.

---

## Build it

### 1. Install, with values that matter

```yaml
# values.yaml
prometheus:
  prometheusSpec:
    retention: 15d
    # Without this, ONLY ServiceMonitors carrying the release label are picked
    # up — the most common reason a new one is ignored in silence.
    serviceMonitorSelectorNilUsesHelmValues: false
    podMonitorSelectorNilUsesHelmValues: false
    ruleSelectorNilUsesHelmValues: false

    resources:
      requests: { cpu: 200m, memory: 2Gi }
      limits:   { memory: 4Gi }

    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 20Gi

grafana:
  adminPassword: ""            # set it, or read the generated Secret
  persistence:
    enabled: true
    size: 5Gi
  defaultDashboardsTimezone: browser

alertmanager:
  alertmanagerSpec:
    storage:
      volumeClaimTemplate:
        spec:
          storageClassName: gp3
          accessModes: ["ReadWriteOnce"]
          resources: { requests: { storage: 5Gi } }
```

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \\
  -n monitoring --create-namespace -f values.yaml --atomic --wait --timeout 10m
```

**`storageSpec` is not optional in any cluster you care about.** The default is
`emptyDir`, so every Prometheus restart loses all history — and you discover
that during the first incident, which is exactly when history was the point.

The three `...NilUsesHelmValues: false` lines are the single most useful thing
in this file. Left at their default, Prometheus only discovers ServiceMonitors
labelled with this Helm release, so a ServiceMonitor you create later is
ignored with no error anywhere.

### 2. Scrape your own application

Your app needs a `/metrics` endpoint and a Service with a **named** port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: platform
  labels: { app: api }
spec:
  selector: { app: api }
  ports:
    - name: http          # the name is what the ServiceMonitor references
      port: 80
      targetPort: 8000
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: api
  namespace: platform
  labels: { release: monitoring }
spec:
  selector:
    matchLabels: { app: api }
  namespaceSelector:
    matchNames: ["platform"]
  endpoints:
    - port: http          # the PORT NAME, not the number
      path: /metrics
      interval: 30s
```

`port` here is the Service's port **name**. Putting `8000` there is the most
common ServiceMonitor mistake, and it fails by simply never appearing in
Targets.

### 3. Look at it

```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
kubectl get secret -n monitoring monitoring-grafana \\
  -o jsonpath='{.data.admin-password}' | base64 -d; echo

kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090
```

---

## Verify it worked

```bash
# Everything is up
kubectl get pods -n monitoring

# Your target is being scraped and is UP — the actual test
curl -s localhost:9090/api/v1/targets \\
  | jq -r '.data.activeTargets[] | select(.labels.job=="api") | "\\(.health) \\(.scrapeUrl) \\(.lastError)"'

# A query returns data for your workload
curl -sG localhost:9090/api/v1/query \\
  --data-urlencode 'query=sum(rate(container_cpu_usage_seconds_total{namespace="platform"}[5m])) by (pod)' \\
  | jq '.data.result | length'

# History survives a restart — this is what storageSpec buys
kubectl delete pod -n monitoring prometheus-monitoring-kube-prometheus-prometheus-0
kubectl wait --for=condition=Ready pod/prometheus-monitoring-kube-prometheus-prometheus-0 -n monitoring --timeout=300s
# re-run the query and confirm the older data is still there
```

`kubectl get pods` showing `Running` proves the stack installed. The Targets
query proves it is *monitoring something*, which is a different claim.

---

## When it goes wrong

**A ServiceMonitor exists and the target never appears**

In order: the `...NilUsesHelmValues: false` settings, then the `release` label,
then `port` naming a port **name** rather than a number, then the
`namespaceSelector`.

**Prometheus is OOM killed**

Memory scales with active series. Raise the limit, shorten `retention`, or drop
high-cardinality labels — a label containing a request id or a pod name in a
metric that already has one is the usual cause.

**All history disappeared**

No `storageSpec`, so it was `emptyDir`.

**PVCs stay `Pending`**

No default StorageClass, or the EBS CSI driver is not installed.

**Grafana shows "No data" while Prometheus has the metric**

The dashboard's datasource, or a variable that resolves to nothing. Run the
panel's query in Prometheus directly to find out which side is wrong.

**The install times out**

Three PVCs must bind first. `kubectl get pvc -n monitoring` shows whether they
did.

---

## Clean up

```bash
helm uninstall monitoring -n monitoring
kubectl delete pvc --all -n monitoring          # PVCs SURVIVE uninstall
kubectl delete namespace monitoring
kubectl get crd | grep coreos                   # CRDs also survive
```

**Cost of this lab:** **Low on top of the cluster.** Three EBS volumes totalling
30 GB is about $2.40/month, and they keep billing after `helm uninstall` unless
you delete the PVCs.
""",
}

# ── lab-18 · Alert rules and dashboards ───────────────────────────────────
REWRITES["lab-18-custom-prometheus-alert-rules-grafana-dashboards"] = {
    "criteria": [
        "An alert you wrote moves from inactive to pending to firing, and you caused it.",
        "The alert carries a runbook link and enough context to act on without opening a dashboard.",
        "A dashboard shows request rate, error rate and latency for your service.",
        "You can explain what `for:` does and why removing it produces pager noise.",
    ],
    "scenario": (
        "Prometheus is collecting metrics nobody looks at. There are no alerts, "
        "so problems are found by users; the one dashboard shows CPU, which has "
        "never once explained an outage.\n\n"
        "Collecting metrics and being able to answer a question with them are "
        "different things."
    ),
    "body": """
## What you are building

Alerts on **symptoms users feel**, not on causes you guessed:

```text
  RED, for a request-driven service
    Rate       requests per second
    Errors     the proportion that failed
    Duration   how long they took (p95, p99)
```

High CPU is not an incident. Users cannot feel CPU. They feel errors and
latency — so alert on those, and use CPU to explain them once you are already
looking.

---

## Build it

### 1. A PrometheusRule

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: platform-alerts
  namespace: monitoring
  labels: { release: monitoring }      # or the Operator ignores it
spec:
  groups:
    - name: platform.rules
      interval: 30s
      rules:
        - alert: HighErrorRate
          expr: |
            sum(rate(http_requests_total{namespace="platform",status=~"5.."}[5m]))
              /
            sum(rate(http_requests_total{namespace="platform"}[5m]))
              > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "5xx rate is {{ $value | humanizePercentage }} in platform"
            description: >-
              More than 5% of requests have failed for 5 minutes.
              Current rate {{ $value | humanizePercentage }}.
            runbook_url: "https://runbooks.example.com/high-error-rate"

        - alert: HighLatency
          expr: |
            histogram_quantile(0.95,
              sum(rate(http_request_duration_seconds_bucket{namespace="platform"}[5m])) by (le)
            ) > 1
          for: 10m
          labels: { severity: warning }
          annotations:
            summary: "p95 latency is {{ $value | humanizeDuration }}"
            runbook_url: "https://runbooks.example.com/high-latency"

        - alert: PodCrashLooping
          expr: |
            increase(kube_pod_container_status_restarts_total{namespace="platform"}[15m]) > 3
          for: 5m
          labels: { severity: critical }
          annotations:
            summary: "{{ $labels.pod }} restarted {{ $value }} times in 15 minutes"
            runbook_url: "https://runbooks.example.com/crashloop"

        - alert: PersistentVolumeFillingUp
          expr: |
            kubelet_volume_stats_available_bytes / kubelet_volume_stats_capacity_bytes < 0.10
          for: 15m
          labels: { severity: warning }
          annotations:
            summary: "{{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} free"
```

**`for:` is the difference between an alert and pager noise.** The expression
becomes true, the alert goes `Pending`, and only if it is *still* true after
the `for:` duration does it fire. A five-second blip during a rollout resolves
itself; without `for:`, it wakes someone up.

**A ratio, not a count.** `sum(rate(...5xx)) > 10` fires on a busy Tuesday and
stays silent during an outage at 3am when traffic is low. The proportion is
what users experience.

**Every alert has a `runbook_url`.** Someone woken at 3am should not have to
reconstruct what the alert means. If you cannot write the runbook, the alert is
probably not actionable — which is itself a useful signal.

### 2. Route it

```yaml
alertmanager:
  config:
    route:
      group_by: ["alertname", "namespace"]
      group_wait: 30s          # collect related alerts before the first send
      group_interval: 5m
      repeat_interval: 4h
      receiver: default
      routes:
        - matchers: ['severity="critical"']
          receiver: pager
          repeat_interval: 1h
    receivers:
      - name: default
        slack_configs:
          - channel: "#alerts"
            title: '{{ .CommonAnnotations.summary }}'
            text: '{{ .CommonAnnotations.description }}\\n{{ .CommonAnnotations.runbook_url }}'
      - name: pager
        pagerduty_configs:
          - service_key: "..."
    inhibit_rules:
      # A node being down explains every Pod on it. Say it once.
      - source_matchers: ['alertname="NodeDown"']
        target_matchers: ['severity="warning"']
        equal: ["node"]
```

`group_wait` and `inhibit_rules` are what stop one failure producing forty
notifications. A node failing should page once, not once per Pod.

### 3. A dashboard, kept in Git

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: platform-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"        # the sidecar imports it
data:
  platform.json: |
    { "title": "Platform — RED", "panels": [ ... ] }
```

The Grafana sidecar watches for ConfigMaps carrying `grafana_dashboard: "1"`
and imports them. **A dashboard edited in the UI is lost when the Pod is
replaced**; one in a ConfigMap is version-controlled, reviewable and
reproducible.

The three panels worth having before any others:

```promql
# Rate
sum(rate(http_requests_total{namespace="platform"}[5m])) by (service)

# Errors
sum(rate(http_requests_total{namespace="platform",status=~"5.."}[5m])) by (service)
  / sum(rate(http_requests_total{namespace="platform"}[5m])) by (service)

# Duration
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{namespace="platform"}[5m])) by (le, service))
```

---

## Verify it worked

```bash
# The Operator loaded your rules
kubectl get prometheusrule -n monitoring
curl -s localhost:9090/api/v1/rules | jq -r '.data.groups[].name'

# The expression returns something. An alert on a metric that does not exist
# is silent forever and looks identical to an alert that is not firing.
curl -sG localhost:9090/api/v1/query \\
  --data-urlencode 'query=sum(rate(http_requests_total{namespace="platform"}[5m]))' \\
  | jq '.data.result | length'      # must be > 0
```

**Now make one fire — this is the lab.**

```bash
# Cause real restarts
kubectl set image deploy/api api=nginx:does-not-exist -n platform

# Watch it move through the states
watch -n5 'curl -s localhost:9090/api/v1/alerts | jq -r ".data.alerts[] | \\"\\(.labels.alertname) \\(.state)\\""'
# inactive -> pending (during `for:`) -> firing

# It reached Alertmanager
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-alertmanager 9093:9093
curl -s localhost:9093/api/v2/alerts | jq -r '.[].labels.alertname'

# Restore, and confirm it resolves
kubectl rollout undo deploy/api -n platform
```

An alert that has never fired is a hypothesis. Watching it go
`pending → firing` and then resolve is the only way to know the expression, the
`for:`, the labels and the routing all work together.

---

## When it goes wrong

**The rule does not appear in Prometheus**

The `release` label is missing, or `ruleSelectorNilUsesHelmValues` was left
true. `kubectl logs -n monitoring prometheus-operator` shows what it loaded.

**An alert never fires even though the condition is true**

Run the expression in the Prometheus UI. Almost always it returns no data —
the metric name is wrong, or the label selector matches nothing. No data is not
`false`; it is silence.

**Everything fires at once after a deploy**

`for:` is too short, or missing. Rollouts produce brief spikes by design.

**One node failure produces forty pages**

No `inhibit_rules` and no `group_by`.

**The dashboard disappeared**

It was created in the UI on a Pod with no persistence. Put it in a ConfigMap.

**`{{ $value }}` renders as a long float**

Use `humanize`, `humanizePercentage` or `humanizeDuration`.

---

## Clean up

```bash
kubectl delete prometheusrule platform-alerts -n monitoring
kubectl delete configmap -l grafana_dashboard=1 -n monitoring
```

**Cost of this lab:** Free on top of the monitoring stack. Rules and dashboards
are configuration; the Prometheus and Grafana volumes underneath them are what
bills.
""",
}


def main() -> None:
    for lab_id, spec in REWRITES.items():
        rewrite(lab_id, spec)
        print(f"  rewrote {lab_id}")
    print(f"\n{len(REWRITES)} labs rewritten (guided + challenge criteria)")


if __name__ == "__main__":
    main()
