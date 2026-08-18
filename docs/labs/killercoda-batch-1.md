# Killercoda Batch 1 — Linux, Networking, Git

Compatibility decisions for the first batch, made by reading each lab in full
rather than inferring from its domain. Recorded before implementation so the
omissions are a decision, not a discovery.

## Environment assumptions

Killercoda offers `ubuntu` and `kubernetes-kubeadm-*` backends. Everything
below assumes the `ubuntu` backend provides:

| Assumption | Confidence | Why it matters |
| --- | --- | --- |
| systemd is PID 1 | High — their kubeadm backends require it | Three scenarios use `systemctl` and `journalctl` |
| root or passwordless sudo | High — the terminal opens as `root@ubuntu` | Every scenario installs packages or edits `/etc` |
| Outbound internet | High — package installs are common in their examples | `apt-get install nginx` |
| No second host | Certain | Rules out the SSH-hardening lab |
| No GitHub API/UI | Certain | Rules out the collaboration lab |

Each `setup.sh` asserts the assumptions it depends on and exits non-zero with a
readable message rather than failing three steps later.

## Decisions

| Lab | Decision | Notes |
| --- | --- | --- |
| `lab-20-linux-server-administration` | **Convert** | Users, groups, setgid, service enablement, disk. Strongest candidate. |
| `lab-linux-processes-services-logs` | **Convert** | Ports, journals, a deliberately broken service. |
| `lab-22-bash-automation-backup-healthcheck` | **Convert** | Script exit codes, idempotence, retention. |
| `lab-git-recovery-history` | **Convert** | Reflog, branch recovery, secret removal. Pure Git. |
| `lab-21-linux-networking-troubleshooting` | **Convert, modified** | Timeout demonstrated with TEST-NET-3 (203.0.113.1) rather than an iptables DROP, which needs privileges Killercoda may not grant. |
| `lab-http-tls-troubleshooting` | **Convert, modified** | Three local HTTPS endpoints built with a private CA — valid, expired, wrong-host — instead of relying on third-party broken-TLS sites, so the exercise cannot rot when someone else's endpoint changes. The expired certificate is signed under `faketime`, because negative `-days` and `-not_after` are not portable. |
| `lab-linux-ssh-hardening` | **Reject** | Not faithfully reproducible. The lesson is "prove the new config from a second session before closing the first", and there is no second session. `ufw default deny incoming` also risks cutting Killercoda's own agent. |
| `lab-git-professional-collaboration` | **Reject** | Not reproducible. Branch protection, CODEOWNERS and pull requests are GitHub features, not Git ones — there is no repository host in the sandbox. |
| `lab-reverse-proxy-load-balancing` | **Defer to Batch 2** | Filed under networking but built on Docker Compose; belongs with the Docker batch. |

## Criteria coverage

Reasoning criteria stay on EgyKode. A scenario cannot check whether someone
can *explain* a thing, and a verify script that pretends to would be the worst
kind of check — one that passes without evidence.

| Scenario | Included | Omitted | Why omitted |
| --- | --- | --- | --- |
| `linux-users-permissions-services` | C1 deploy user, C2 setgid, C3 service enabled | C4 disk usage | "You can state which directory…" is reasoning; the commands are in the scenario, the claim is not checkable |
| `linux-processes-services-logs` | C1 port→PID, C3 broken service restored | C2 log reading, C4 state names | Both are reasoning; reading a journal leaves no state to inspect |
| `bash-backup-retention` | C1 exit code, C2 idempotence, C3 retention, C4 failure visible | — | All four leave state |
| `git-recovery-history` | C1 recovery, C3 secret removed | C2 revert vs reset, C4 why removal is insufficient | Both reasoning |
| `network-layer-diagnosis` | C1 resolution, C2 route, C3 refused vs timed out | C4 naming the layer | Reasoning |
| `tls-certificate-diagnosis` | C1 read a certificate, C2 which layer failed (two endpoints), C4 port reachable without TLS | C3 error meanings | C2 uses two local endpoints rather than three remote ones; C3 is reasoning |

## Runtime validation

Every scenario is tested locally in an `ubuntu:24.04` container: setup runs,
verification fails before the work, passes after it, and fails again on a
plausible wrong answer. What that cannot cover is Killercoda's own runtime —
systemd availability, network egress, and step timeouts.

Those are marked **"Ready for human Killercoda validation."** No scenario is
enabled on the site until its URL has been opened by a person.

## A deliberate non-check

`bash-backup-retention` step 1 teaches `set -euo pipefail`, and a script with
`set +e` still passes `verify1` — because the explicit size check catches the
failure anyway and the script still exits non-zero leaving nothing behind.

That is correct. The rule is to check resulting state, not whether a particular
command was typed, and a script that reaches the same outcome by another route
has met the criterion. The reasoning behind `set -e` stays on EgyKode.
