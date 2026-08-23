# Prove where the name fails

First compare the Service IP path with the name path:

```
kubectl get svc db -o wide
kubectl exec api -- curl -sS --max-time 3 http://$(kubectl get svc db -o jsonpath='{.spec.clusterIP}')
kubectl exec api -- nslookup db || true
kubectl get networkpolicy api-egress -o yaml
```{{exec}}

The IP request works; `nslookup db` should time out rather than say NXDOMAIN.
That distinguishes an unreachable resolver from a missing Service. Record the
conclusion (including `timeout`, `DNS`, and `policy`) in
`/root/incident/diagnosis.txt`.

**Done when:** you have proved the failure is resolution blocked by policy,
not database routing.
