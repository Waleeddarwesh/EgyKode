# Name the Service unambiguously

The short name works because the Pod search domain supplies the namespace. In
an application that may run elsewhere, use the unambiguous DNS name:

```
kubectl exec api -- curl -sS --max-time 5 http://db.incident-dns.svc.cluster.local | head
```{{exec}}

Put that exact FQDN in `/root/incident/fqdn.txt`. The namespace-qualified name
is `service.namespace.svc.cluster.local`.
