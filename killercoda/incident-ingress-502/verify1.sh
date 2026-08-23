#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
target=$(kubectl get svc site -o jsonpath='{.spec.ports[0].targetPort}' 2>/dev/null)
[ "$target" = 80 ] || fail "The starting fault has changed: targetPort is '$target', expected 80."
endpoints=$(kubectl get endpoints site -o jsonpath='{.subsets[*].addresses[*].ip}' 2>/dev/null | wc -w)
[ "$endpoints" -ge 1 ] || fail "site has no endpoints; this is a selector/readiness incident, not the intended port incident."
# Probe from a throwaway client, not from inside the app container.
#
# hashicorp/http-echo is a scratch image: no shell, no wget. `kubectl exec`
# into it fails with `exec: "sh": executable file not found in $PATH`, so a
# check written that way can never pass however correct the learner is. The
# container IS listening on 8080 - it just cannot be asked from within.
POD_IP=$(kubectl get pod -l app=site -o jsonpath='{.items[0].status.podIP}' 2>/dev/null)
[ -n "$POD_IP" ] || fail "The site Pod has no IP yet."
body=$(kubectl run verify-probe-$RANDOM --rm -i --restart=Never   --image=curlimages/curl:8.10.1 --command --   curl -s --max-time 10 "http://$POD_IP:8080" 2>/dev/null)
echo "$body" | grep -q 'EgyKode incident resolved' || fail "The container is not serving on 8080."
[ -s /root/incident/root-cause.txt ] || fail "Write /root/incident/root-cause.txt before changing anything."
grep -qi targetPort /root/incident/root-cause.txt || fail "Name targetPort in the root cause."
grep -q 80 /root/incident/root-cause.txt || fail "Name the incorrect port 80."
grep -q 8080 /root/incident/root-cause.txt || fail "Name the listening port 8080."
echo "PASS - endpoints and the container localise the fault to the Service port mapping"
