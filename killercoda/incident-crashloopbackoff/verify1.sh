#!/bin/bash
fail() { echo "FAIL: $1"; exit 1; }
pod=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
[ -n "$pod" ] || fail "The worker Pod does not exist."
restarts=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].restartCount}' 2>/dev/null)
[ "${restarts:-0}" -ge 1 ] || fail "The Pod has not restarted yet; wait for its first crash."
exitcode=$(kubectl get pod "$pod" -o jsonpath='{.status.containerStatuses[0].lastState.terminated.exitCode}' 2>/dev/null)
[ "$exitcode" = 1 ] || fail "Last exit code is '${exitcode:-unknown}', expected 1."
# Accept the evidence from either place, and prefer --previous.
#
# Measured on a kubeadm node: for a container that crashes immediately, the
# kubelet garbage-collects the dead container as soon as it replaces it, so
# `kubectl logs --previous` answers "unable to retrieve container logs" and
# /var/log/pods holds only the latest attempt. Requiring --previous made this
# step impossible to pass. While the Pod sits in CrashLoopBackOff nothing is
# running, so plain `kubectl logs` returns that dead container's output - which
# is the evidence, however it was reached.
# Search both, rather than falling back on emptiness.
#
# `kubectl logs --previous` prints "unable to retrieve container logs" on
# STDOUT and exits 0, so a non-empty test reads that error as a successful
# fetch and never falls back. Whether it succeeds depends on whether the
# kubelet has collected the older attempt yet, so a check written that way
# passes or fails according to timing - which is worse than failing outright.
evidence="$(kubectl logs "$pod" --previous 2>/dev/null)
$(kubectl logs "$pod" 2>/dev/null)"
echo "$evidence" | grep -q 'REQUIRED_CONFIG is not set' \
  || fail "Neither the previous nor the current logs show the startup error."
[ -s /root/incident/cause.txt ] || fail "Create /root/incident/cause.txt with your conclusion."
grep -qi previous /root/incident/cause.txt || fail "Explain that the evidence came from --previous."
grep -qi 'exit code 1' /root/incident/cause.txt || fail "Record exit code 1."
grep -qi REQUIRED_CONFIG /root/incident/cause.txt || fail "Name REQUIRED_CONFIG."
echo "PASS - the predecessor proves the startup error and exit code"
