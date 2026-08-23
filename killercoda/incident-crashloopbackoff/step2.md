# Fix the startup contract

Set `REQUIRED_CONFIG` on the `worker` Deployment to any non-empty value. Do
not replace the image or command; the process is sound once it receives its
required setting.

```
kubectl set env deployment/worker REQUIRED_CONFIG=present
kubectl rollout status deployment/worker --timeout=120s
kubectl get pods
```{{exec}}

**Done when:** the replacement Pod is `Running` and `1/1 Ready`.
