# Permit DNS, not everything

The policy has one egress rule: TCP 80 to `app=db`. A NetworkPolicy with any
egress rule denies **everything else from those Pods**, and name resolution is
traffic like any other — so port 53 to CoreDNS was denied along with the rest.

Look at what you have to allow, before allowing it:

```
kubectl get networkpolicy api-egress -o yaml | sed -n '/^spec:/,$p'
kubectl get pods -n kube-system -l k8s-app=kube-dns --show-labels
kubectl get ns kube-system -o jsonpath='{.metadata.labels}{"\n"}'
```{{exec}}

CoreDNS is in `kube-system`, labelled `k8s-app=kube-dns`, and the namespace
carries `kubernetes.io/metadata.name=kube-system` — which is the label to
select it by, because every namespace gets it automatically.

## Add the rule

```
cat <<'YAML' | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-egress
  namespace: incident-dns
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: [Egress]
  egress:
    # The rule that was already here. Keep it.
    - to:
        - podSelector:
            matchLabels:
              app: db
      ports:
        - port: 80
          protocol: TCP
    # DNS, scoped to CoreDNS only.
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
YAML
sleep 3
kubectl exec api -- curl -sS --max-time 8 http://db | head -4
```{{exec}}

## Three things in that rule are the lesson

**`namespaceSelector` and `podSelector` under one `-`.** Written that way they
are ANDed: CoreDNS Pods *in* `kube-system`. Put a second `-` in front of
`podSelector` and they become two separate peers — "anything in kube-system,
**or** anything anywhere labelled `k8s-app=kube-dns`" — which is far wider than
you meant and looks almost identical on the page.

**UDP and TCP both.** DNS uses UDP for ordinary queries and falls back to TCP
when a response will not fit in a single datagram. Allow only UDP and most
lookups work, while a few large ones hang — an intermittent failure that is
extremely hard to attribute later.

**Not an allow-all rule.** `egress: [{}]` would make the symptom disappear
immediately and delete the control you were asked to preserve. The check on
this step rejects it: it requires the policy to still name `kube-system` and
`kube-dns`.

**Done when:** `http://db` answers from `api` by name, and the policy still
scopes DNS to CoreDNS.
