#!/bin/bash
# A policy object by itself proves nothing. This scenario needs a CNI that
# enforces it; the kubeadm environment used by Killercoda does.
set -e
kubectl create namespace incident-dns >/dev/null 2>&1 || true
kubectl config set-context --current --namespace=incident-dns >/dev/null 2>&1

kubectl apply -f - <<'YAML' >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata: { name: db }
spec:
  replicas: 1
  selector: { matchLabels: { app: db } }
  template:
    metadata: { labels: { app: db } }
    spec:
      containers:
        - name: db
          image: nginx:1.27-alpine
          ports: [{ containerPort: 80 }]
---
apiVersion: v1
kind: Service
metadata: { name: db }
spec:
  selector: { app: db }
  ports: [{ port: 80, targetPort: 80 }]
---
apiVersion: v1
kind: Pod
metadata: { name: api, labels: { app: api } }
spec:
  containers:
    - name: api
      image: curlimages/curl:8.10.1
      command: ["sh", "-c", "sleep 3600"]
---
# The application may talk to db, but it cannot ask CoreDNS where db is.
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata: { name: api-egress, namespace: incident-dns }
spec:
  podSelector: { matchLabels: { app: api } }
  policyTypes: [Egress]
  egress:
    - to:
        - podSelector: { matchLabels: { app: db } }
      ports:
        - { protocol: TCP, port: 80 }
YAML
kubectl wait --for=condition=Ready pod/api --timeout=120s >/dev/null
kubectl rollout status deployment/db --timeout=120s >/dev/null
mkdir -p /root/incident
echo "Ready. The API can reach the database Pod by IP, but not its DNS name."
