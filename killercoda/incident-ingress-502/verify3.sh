#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
image=$(kubectl get deploy site -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null)
[ "$image" = hashicorp/http-echo:1.0.0 ] || fail "The application image changed; restore the original workload."
args=$(kubectl get deploy site -o jsonpath='{.spec.template.spec.containers[0].args[*]}' 2>/dev/null)
echo "$args" | grep -q -- '-listen=:8080' || fail "The application listener was changed instead of fixing the Service."
selector=$(kubectl get svc site -o jsonpath='{.spec.selector.app}' 2>/dev/null)
[ "$selector" = site ] || fail "The Service selector changed; it should remain app=site."
port=$(kubectl get svc site -o jsonpath='{.spec.ports[0].port}' 2>/dev/null)
target=$(kubectl get svc site -o jsonpath='{.spec.ports[0].targetPort}' 2>/dev/null)
[ "$port" = 80 ] && [ "$target" = 8080 ] || fail "The intended one-field fix is port 80 -> targetPort 8080."
host=$(kubectl get ingress site -o jsonpath='{.spec.rules[0].host}' 2>/dev/null)
[ "$host" = incident.example.test ] || fail "The Ingress host changed; restore incident.example.test."
echo "PASS - the original path remains intact and only targetPort changed"
