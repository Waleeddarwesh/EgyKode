# Localise the broken hop

Find the controller NodePort and test the edge, then inspect the endpoints and
the container’s actual listener:

```
PORT=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}')
curl -i -H 'Host: incident.example.test' http://localhost:$PORT/
kubectl get endpoints site
# The app image is a scratch image with no shell, so it cannot be exec'd into.
# Ask it from a throwaway client on the Pod network instead.
POD_IP=$(kubectl get pod -l app=site -o jsonpath='{.items[0].status.podIP}')
kubectl run probe --rm -i --restart=Never --image=curlimages/curl:8.10.1   --command -- curl -s --max-time 10 "http://$POD_IP:8080"
kubectl get svc site -o yaml
```

Endpoints being present rules out the selector and readiness. The container
answers on 8080, so compare that with `targetPort`. Record a one-sentence root
cause containing `targetPort`, `80`, and `8080` in
`/root/incident/root-cause.txt`.
