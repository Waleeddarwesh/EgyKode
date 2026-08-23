#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
value=$(kubectl get deployment worker -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="REQUIRED_CONFIG")].value}' 2>/dev/null)
[ -n "$value" ] || fail "REQUIRED_CONFIG is not set on the Deployment."
pod=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
ready=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
[ "$ready" = true ] || fail "The worker replacement is not Ready."
phase=$(kubectl get pod "$pod" -o jsonpath='{.status.phase}' 2>/dev/null)
[ "$phase" = Running ] || fail "Worker is '$phase', not Running."
echo "PASS - the missing startup setting is present and the replacement is Ready"
