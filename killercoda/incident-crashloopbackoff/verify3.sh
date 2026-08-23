#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
pod=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
ready=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
[ "$ready" = true ] || fail "The worker is not Ready."
restarts=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null)
[ "$restarts" = 0 ] || fail "The fixed Pod has restarted $restarts time(s)."
started=$(kubectl get pod "$pod" -o jsonpath='{.status.startTime}' 2>/dev/null)
age=$(( $(date +%s) - $(date -d "$started" +%s) ))
[ "$age" -ge 120 ] || fail "The fixed Pod is only ${age}s old; keep it healthy for two minutes."
echo "PASS - worker has stayed Running and Ready without a restart for ${age}s"
