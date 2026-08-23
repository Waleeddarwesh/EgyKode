#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
kubectl get networkpolicy api-egress >/dev/null 2>&1 || fail "The api-egress policy is missing."
kubectl get pod api >/dev/null 2>&1 || fail "The api Pod is missing."

# This is a measurement, not a claim based on the manifest: a stored policy
# may be ignored by an unsupported CNI.
if kubectl exec api -- nslookup db >/dev/null 2>&1; then
  fail "db resolves already. The policy is not blocking DNS in this cluster."
fi
[ -s /root/incident/diagnosis.txt ] || fail "Create /root/incident/diagnosis.txt with your conclusion."
grep -qi timeout /root/incident/diagnosis.txt || fail "Your diagnosis must record the timeout."
grep -qi dns /root/incident/diagnosis.txt || fail "Your diagnosis must identify DNS."
grep -qi policy /root/incident/diagnosis.txt || fail "Your diagnosis must identify the policy."
echo "PASS - a live lookup times out, and the diagnosis names the cause"
