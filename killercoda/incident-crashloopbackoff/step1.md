# Read the container that died

Wait until a restart has occurred, then inspect the predecessor and the last
termination state:

```
# Wait for the first restart rather than watching. `kubectl get pods -w` never
# returns, so as a clickable block it would hold the terminal open and the
# commands below it would never run. The wait is also the point: `--previous`
# only exists once a container has died and been replaced.
for i in $(seq 1 40); do
  R=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}' 2>/dev/null)
  [ -n "$R" ] && [ "$R" -ge 1 ] && break
  printf "."
  sleep 5
done
echo
kubectl get pods
POD=$(kubectl get pod -l app=worker -o jsonpath='{.items[0].metadata.name}')
kubectl logs "$POD" --previous
kubectl describe pod "$POD" | sed -n '/Last State/,/Ready/p'
```{{exec}}

The log names the missing setting and `describe` reports exit code `1`.

**Which log you are actually reading is the thing to understand here.** While a
Pod sits in `CrashLoopBackOff` nothing is running, so plain `kubectl logs`
returns the output of the container that just died — that is already the
evidence. `--previous` reaches back one further, to the attempt before it.

Try both above and you may find `--previous` answers *"unable to retrieve
container logs"*. That is not a broken cluster: the kubelet collects a dead
container once it has been replaced, and on a container that crashes instantly
the older attempt is gone within seconds. `--previous` is the right reflex when
a container has restarted **successfully** and you want the crash that preceded
it; during an active crash loop, the current log is the crash.

Write a sentence containing `previous`, `exit code 1`, and `REQUIRED_CONFIG`
in `/root/incident/cause.txt`.

**Done when:** you can distinguish the dead container’s evidence from current
logs of its replacement.
