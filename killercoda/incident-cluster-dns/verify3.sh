#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
name='db.incident-dns.svc.cluster.local'
code=$(kubectl exec api -- curl -s -o /dev/null -w '%{http_code}' --max-time 8 http://$name 2>/dev/null)
[ "$code" = 200 ] || fail "The namespace-qualified DNS name did not return 200."
[ -f /root/incident/fqdn.txt ] || fail "Write the FQDN to /root/incident/fqdn.txt."
grep -qx "$name" /root/incident/fqdn.txt || fail "The file must contain exactly $name."
echo "PASS - the full Service DNS name resolves and routes"
