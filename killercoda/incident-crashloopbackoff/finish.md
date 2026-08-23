# Incident resolved

CrashLoopBackOff was the kubelet’s response, not the diagnosis. The diagnosis
was in `kubectl logs --previous`: a missing required environment value made the
process exit `1`. The fixed workload remained ready for two minutes, which
rules out a misleading gap between crashes.
