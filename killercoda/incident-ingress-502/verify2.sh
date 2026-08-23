#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
target=$(kubectl get svc site -o jsonpath='{.spec.ports[0].targetPort}' 2>/dev/null)
[ "$target" = 8080 ] || fail "site targetPort is '$target', not 8080."
port=$(kubectl -n ingress-nginx get svc ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.name=="http")].nodePort}' 2>/dev/null)
[ -n "$port" ] || fail "Could not find the ingress HTTP NodePort."
# Polled, because the fix is not instant at the edge.
#
# Changing targetPort updates the EndpointSlice, and the controller rebuilds
# its upstreams from that a moment later - measured at about 10 seconds from a
# clean state. A single request right after the patch still gets 502, so an
# unpolled check tells a learner their correct fix was wrong, which is the
# worst thing a verifier can do in a debugging lab.
for _ in $(seq 1 12); do
  out=$(curl -sS --max-time 10 -w '\n%{http_code}' -H 'Host: incident.example.test' http://localhost:$port/ 2>/dev/null)
  code=$(echo "$out" | tail -1)
  [ "$code" = 200 ] && break
  sleep 5
done
body=$(echo "$out" | sed '$d')
[ "$code" = 200 ] || fail "Ingress returned '$code', not 200 (waited 60s for the edge to pick up the change)."
echo "$body" | grep -q 'EgyKode incident resolved' || fail "Ingress did not return the application response."
echo "PASS - the application returns HTTP 200 through the Ingress"
