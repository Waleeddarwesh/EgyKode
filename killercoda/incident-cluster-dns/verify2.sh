#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
# Whitespace stripped before matching.
#
# `kubectl -o json` pretty-prints, so the document says `"port": 53` with a
# space while the patterns below are written compactly. Without this the checks
# could never match and a correctly solved scenario failed - the fix worked,
# DNS resolved, and the step still said "No DNS port 53 rule exists".
#
# Assigned and tested separately rather than `$(...) || fail`, because the exit
# status of a pipeline is the last command's, not kubectl's.
policy=$(kubectl get networkpolicy api-egress -o json 2>/dev/null | tr -d ' \n')
[ -n "$policy" ] || fail "No api-egress policy."
echo "$policy" | grep -q '"port":53' || fail "No DNS port 53 rule exists."
echo "$policy" | grep -q '"protocol":"UDP"' || fail "DNS needs a UDP 53 rule."
echo "$policy" | grep -q '"protocol":"TCP"' || fail "DNS also needs a TCP 53 rule."
echo "$policy" | grep -q 'kube-system' || fail "The DNS rule must target kube-system."
echo "$policy" | grep -q 'kube-dns' || fail "The DNS rule must select CoreDNS."
code=$(kubectl exec api -- curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://db 2>/dev/null)
[ "$code" = 200 ] || fail "api -> http://db returned '${code:-no response}', not 200."
echo "PASS - DNS works and the policy is still scoped to CoreDNS"
