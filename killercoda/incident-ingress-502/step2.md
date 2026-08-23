# Correct one mapping

Change only the Service’s `targetPort` from `80` to `8080`, then test through
the Ingress again:

```
kubectl patch svc site -p '{"spec":{"ports":[{"port":80,"targetPort":8080}]}}'
PORT=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')
curl -i -H 'Host: incident.example.test' http://localhost:$PORT/
```{{exec}}

**Done when:** the edge returns HTTP 200 and `EgyKode incident resolved`.
