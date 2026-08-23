#!/bin/bash
set -e
kubectl create namespace incident-crash >/dev/null 2>&1 || true
kubectl config set-context --current --namespace=incident-crash >/dev/null 2>&1
kubectl apply -f - <<'YAML' >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata: { name: worker }
spec:
  replicas: 1
  selector: { matchLabels: { app: worker } }
  template:
    metadata: { labels: { app: worker } }
    spec:
      containers:
        - name: worker
          image: busybox:1.36.1
          command: ["sh", "-c", "if [ -z \"$REQUIRED_CONFIG\" ]; then echo 'REQUIRED_CONFIG is not set' >&2; exit 1; fi; echo worker-ready; sleep 3600"]
YAML
mkdir -p /root/incident
echo "Ready. Wait for worker to enter CrashLoopBackOff, then investigate."
