# Check that the fix was surgical

The Deployment, selector, Ingress host, and Service port were already correct.
Only `targetPort` needed to change. Confirm the final shape:

```
kubectl get deploy site -o yaml
kubectl get svc site -o yaml
kubectl get ingress site -o yaml
```{{exec}}

This is why endpoint inspection was the highest-value command: it ruled out
the entire Pod-and-selector half of the request path before you changed a
thing.
