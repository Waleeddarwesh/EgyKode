# Prove it is stable

A Pod can look healthy in the quiet period before its next crash. Leave the
fixed Pod running for two minutes and make sure its restart count stays zero:

```
POD=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].metadata.name}')
kubectl get pod "$POD" -w
sleep 120
kubectl get pod "$POD" -o jsonpath='{.status.containerStatuses[0].restartCount}{"\n"}'
```

**Done when:** it is still `Running`, `1/1`, and has no restarts since the
fixed rollout.
