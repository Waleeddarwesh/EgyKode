# Killercoda batch 3 — Kubernetes operations, and SSH

Four scenarios, each tested against a real cluster or a systemd container
before publishing: every verifier was run before the work (must fail), after
the work (must pass), and against at least one plausible wrong answer (must
reject it).

| Scenario | Lab | Backend |
| --- | --- | --- |
| `k8s-config-secrets` | lab-11-core-kubernetes-workloads-configmaps-secrets | kubernetes-kubeadm-1node |
| `k8s-rbac-service-accounts` | lab-k8s-rbac-service-accounts | kubernetes-kubeadm-1node |
| `k8s-node-drain` | lab-k8s-node-drain-upgrade | kubernetes-kubeadm-2nodes |
| `linux-ssh-hardening` | lab-linux-ssh-hardening | ubuntu |

## Bugs this batch found in existing content

**`kubectl uncordon --all` does not exist.** It appeared in four lab files, in
cleanup blocks learners are told to run "even if you did not finish". The flag
is not accepted and the command fails outright, leaving nodes cordoned.
Replaced everywhere with `kubectl uncordon $(kubectl get nodes -o name)`, which
was tested.

**`sudo -n true` cannot succeed for the account the SSH lab creates.** Step 3
of `lab-linux-ssh-hardening` used it as the proof that sudo works. `-n` forbids
prompting, `sudo` wants to re-authenticate the human, and `--disabled-password`
leaves nothing to type — so the documented verification always fails. The lab
now shows `sudo -v`, and teaches the narrowly scoped `NOPASSWD` rule that
unattended access actually requires.

**`kubectl auth can-i get pods/log` reports `yes` while the request is
refused.** With a Role granting only `pods`, `can-i get pods/log` answers for
the parent resource and returns `yes`; `kubectl logs` on the same account
returns `Forbidden`. The correct form is `can-i get pods --subresource=log`,
which returns `no`. The RBAC scenario teaches this directly, and its verifier
makes the real log request rather than asking `can-i` — a verifier built on the
misleading form would have passed a Role that cannot read a single log line.

## Design decisions worth keeping

**QoS is verified from the spec first, then from the Pods.** Checking only the
running Pods meant a 60-second wait before a wrong answer failed. Checking only
the spec would miss a Deployment that never rolled out. The spec check fails
fast; the Pod check confirms it took effect.

**The token check reads the newest running Pod, not `items[0]`.** During a
rollout the list holds Pods from both ReplicaSets, and reading the old one
passed the check while the API token was still mounted in the new Pod. This was
caught by mutation testing, not by review.

**A bare Pod has no `ownerReferences`.** The first version of the drain check
counted "non-DaemonSet Pods still on the node" with a jsonpath range, which
emits nothing at all for a Pod with no owner — so `legacy-cache`, the entire
point of the step, was invisible to it. `custom-columns` prints `<none>` and
counts correctly.

**The drain scenario's zero-failure claim was checked against a naive
workload.** Draining a Deployment without a readiness probe or `preStop` hook
dropped a request; the hardened one dropped none across 1,862 requests spanning
a drain and a full rollout restart. Without that comparison the "no failed
requests" check could have been passing vacuously.

**ReadWriteOnce-style honesty about the environment.** `verify3.sh` in the drain
scenario checks `status.disruptionsAllowed`, which is what the eviction API
consults, rather than trying to parse the output of a `kubectl drain` that
retries every five seconds until a timeout.

## Deliberate omission

**`ufw enable` is not run.** The SSH scenario configures the firewall — default
deny incoming, explicit allow for 22 — and stops before enabling it. Killercoda
is a sandbox reached through a browser, and a default-deny policy applied to it
can take the learner's own terminal with it. The step says so plainly rather
than pretending the exercise is complete, and the verifier checks the staged
ruleset, which is exactly what it claims to check.

This is the one criterion in this batch not fully demonstrated online. The local
environment covers it.
