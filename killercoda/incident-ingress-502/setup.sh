#!/bin/bash
# ingress-nginx is required to generate a real proxy 502. A local curl to a
# Service would hide the exact layer this incident teaches.
set -e
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/baremetal/deploy.yaml >/dev/null
kubectl -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=300s >/dev/null
kubectl create namespace incident-ingress >/dev/null 2>&1 || true
kubectl config set-context --current --namespace=incident-ingress >/dev/null 2>&1
kubectl apply -f - <<'YAML' >/dev/null
apiVersion: apps/v1
kind: Deployment
metadata: { name: site }
spec:
  replicas: 1
  selector: { matchLabels: { app: site } }
  template:
    metadata: { labels: { app: site } }
    spec:
      containers:
        - name: site
          image: hashicorp/http-echo:1.0.0
          args: ["-listen=:8080", "-text=EgyKode incident resolved"]
          ports: [{ containerPort: 8080 }]
---
# This is the one deliberately bad field. The selector has endpoints and the
# process listens, but the Service sends connections to port 80.
apiVersion: v1
kind: Service
metadata: { name: site }
spec:
  selector: { app: site }
  ports: [{ port: 80, targetPort: 80 }]
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata: { name: site }
spec:
  ingressClassName: nginx
  rules:
    - host: incident.example.test
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service: { name: site, port: { number: 80 } }
YAML
kubectl rollout status deployment/site --timeout=120s >/dev/null
mkdir -p /root/incident
echo "Ready. incident.example.test returns a proxy error through ingress-nginx."
