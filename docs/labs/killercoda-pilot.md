# Killercoda pilot — three scenarios

**Status: ready for human Killercoda validation. Not production-ready.**

Purpose: prove the whole path — EgyKode lab → Start button → real terminal →
state-based verification — on three labs, before anyone writes the other 23.

## Selected labs

| # | EgyKode lab | Killercoda scenario | Why this one |
| --- | --- | --- | --- |
| 1 | `lab-23-git-branching-collaboration` | `git-branching-collaboration` | Needs nothing but a shell and git. No daemon, no cluster, no network. The lowest-risk proof that the path works at all. |
| 2 | `lab-09-production-grade-multi-stage-dockerfile-for-django-gunicorn` | `docker-multi-stage-build` | Shortest Docker lab (31 min). Depends on a working Docker daemon and outbound network. |
| 3 | `lab-k8s-workloads` | `k8s-workloads` | Deployments, ReplicaSets, replicas, rollout undo — no storage, no ingress, no second node. |

The Kubernetes lab sits in the **compatible-with-modifications** group, not the
directly-compatible one, because it needs a cluster provisioned. That is the
one modification, and Killercoda's Kubernetes environment is exactly what
supplies it — so it tests the interesting case rather than avoiding it.

## Scenario structure

Each follows Killercoda's documented layout:

```
killercoda/<scenario>/
├── index.json      backend image, steps, which verify script runs when
├── intro.md        what the environment already contains
├── step1-3.md      the task, with {{exec}} blocks
├── verify1-3.sh    state checks, one per step
├── setup.sh        prepares the environment before step 1
└── finish.md       what was proved, and what remains on EgyKode
```

## Verification design

Every script checks **resulting state**, never that a command was typed, and
every one has an explicit failure path with a message that says what to fix.

Three examples of choosing the stronger check:

- **Kubernetes replicas** — `.status.availableReplicas`, not `.spec.replicas`.
  A Deployment can ask for 3 and be running 0; the desired count would pass
  while nothing worked.
- **Docker image size** — compared against *the learner's own* single-stage
  image, not a hardcoded megabyte figure I would have had to guess.
- **Docker non-root** — the running container's `id -u`, not the presence of a
  `USER` line, which can be written and then overridden.

The Kubernetes teardown check inspects all three layers, because verifying only
the Deployment would pass while orphaned ReplicaSets kept Pods alive.

## Validation status — per scenario

Stated per scenario rather than as one summary, because the three are not
equally proven.

**Git — the only one exercised end to end**

- ✅ Scenario structure validated locally
- ✅ `setup.sh` run from empty, repository built as intended
- ✅ Verification **failure** path validated (all three steps)
- ✅ Verification **success** path validated (all three steps)
- ⚠️ Killercoda runtime not validated

| check | before the task | after the task |
| --- | --- | --- |
| `verify1` branch rebased onto main | FAIL — branch does not exist | PASS |
| `verify2` conflict resolved | FAIL — rebase still in progress | PASS |
| `verify3` commit recovered via reflog | FAIL — discount function missing | PASS |

**Docker**

- ✅ Scenario structure validated locally
- ✅ Shell syntax validated (`bash -n`)
- ✅ Verification logic reviewed
- ⚠️ Docker daemon/runtime **not** validated — no daemon available here
- ⚠️ Killercoda runtime not validated

**Kubernetes**

- ✅ Scenario structure validated locally
- ✅ Shell syntax validated (`bash -n`)
- ✅ Verification logic reviewed
- ⚠️ Kubernetes runtime **not** validated — no cluster available here
- ⚠️ Killercoda runtime not validated

None of the three is production-ready. All three are **ready for human
Killercoda validation**.

## Also validated (all three)

- `index.json` parses as valid JSON
- EgyKode typecheck, ESLint, content lint, translation parity
- The content-lint gate, mutation-tested in three directions: a non-HTTPS host
  fails, `enabled: true` with no URL fails, and a disabled block passes
- Rendered DOM for all three hands-on states — see below

## No unverified URLs are published

The three pilot labs carry `killercoda: { enabled: false }` and **no URL**. An
earlier revision of this work wrote invented URLs
(`https://killercoda.com/egykode/...`) with `enabled: true`, which would have
shipped live buttons pointing at scenarios that do not exist. That was wrong and
has been removed; no URL will be written until someone has opened it.

This surfaced a second problem worth recording. With one "unavailable" state,
the Git lab displayed *"It provisions real cloud infrastructure"* — false, and
the kind of copy that quietly teaches a beginner something untrue. There are now
three states:

| state | when | rendered |
| --- | --- | --- |
| `ready` | enabled **and** a valid URL | Button, "Opens in Killercoda" |
| `pending` | a `killercoda` block exists but is disabled | "A free environment is being prepared" |
| `unsupported` | no `killercoda` block at all | "It provisions real cloud infrastructure…" |

Verified in the rendered DOM: the two pilots show *pending* with no link,
`lab-terraform-fundamentals` shows *unsupported*, and there is no
`killercoda.com` link anywhere on any page.

## Pilot scope vs the original labs

The scenarios are **representative subsets**, not one-to-one reproductions. Each
original lab keeps all of its criteria on EgyKode.

**Docker — `lab-09` "Production-Grade Multi-Stage Dockerfile for Django & Gunicorn"**

*Pilot adaptation: same learning objective, reduced application complexity to
minimise environment setup and session time.*

| | |
| --- | --- |
| Included | Multi-stage build, build/runtime separation, smaller runtime image, non-root execution |
| Omitted | The full Django application; the criterion "the container refuses to start until the database is reachable" |
| Why | Django plus a database would spend most of a session on `pip install` and a second service. The image-layout lesson does not need it. |

The scenario uses a small Python/Gunicorn app. It is **not** the Django lab.

**Kubernetes — `lab-k8s-workloads`**

| | |
| --- | --- |
| Included | Deployment, ReplicaSet ownership, replica count, Pod deletion and reconciliation, cascade delete, rolling update, `rollout undo` |
| Omitted | "Produce a Deployment that creates zero Pods, and explain why" |
| Why | That criterion is a reasoning exercise; it belongs on the EgyKode page, not in a terminal |

**Git — `lab-23-git-branching-collaboration`**

| | |
| --- | --- |
| Included | Branch, rebase, real conflict resolution, reflog recovery |
| Omitted | "Explain why removing a committed secret from history does not make it safe" |
| Why | Reasoning, not execution |

**A lab is not fully Killercoda-compatible because its pilot scenario works.**
Each remains partially covered until the omitted criteria are addressed on
EgyKode.

## Local validation vs runtime validation

Two different claims, kept apart deliberately. Everything above the line has
been proven here; nothing below it has.

**Locally validated** means it was executed on this machine and observed to
work — the Git scenario's setup and all six of its verification paths, shell
syntax across all ten scripts, JSON parsing, the content-lint gate under
mutation, and the rendered DOM for all three hands-on states.

**Runtime validation** means the scenario has been launched on Killercoda and
a person watched it behave. **None of the three has had this.** No claim about
the Docker daemon, the Kubernetes topology, the session limit, outbound network
or resource limits rests on anything but assumption until the tests below are
run.

A scenario is not "validated" because its logic is sound. The Docker
verifications are correct shell that has never met a Docker daemon.

## Measuring the session limit

Do this **during the Git test**, not the other two.

Git is the only scenario with no image pull and no cluster bootstrap, so
elapsed wall-clock time is the session limit itself rather than a mix of setup
and limit. Docker and Kubernetes both burn an unknown number of minutes before
the learner types anything.

Procedure:

1. Note the wall-clock time the moment the terminal becomes usable.
2. Complete the three steps normally.
3. **Leave the tab open and idle** after finishing.
4. Note the time when the session terminates or warns.
5. Record both numbers: time-to-usable, and total session length.

This matters more than any other measurement here. A 60-minute session that
spends 12 minutes pulling `python:3.12` leaves 48 — against a lab estimated at
31 minutes of learner work that assumed none of that. If the limit is short,
labs get split rather than linked, and several 45–55 minute labs may leave the
compatible group entirely.

## Human test — run in this order

Git first. It has no daemon, no cluster and no network dependency, so a failure
there means the **integration** is wrong rather than the environment.

### 1. Git pilot — `killercoda/git-branching-collaboration`

- [ ] Scenario opens
- [ ] Environment starts
- [ ] `/root/shop` exists
- [ ] Git is available
- [ ] Step 1 passes **only after** a correct rebase
- [ ] Step 2 fails while the conflict is unresolved
- [ ] Step 2 passes after a genuine resolution
- [ ] Step 3 fails after the reset
- [ ] Step 3 passes after reflog recovery
- [ ] Session remains usable throughout

**Record:** actual elapsed session limit, not the expected 45 minutes.

### 2. Docker pilot — `killercoda/docker-multi-stage-build`

The critical unknown here is **the Docker daemon**.

- [ ] Docker CLI available
- [ ] Docker **daemon** available
- [ ] `setup.sh` succeeds
- [ ] Image build works
- [ ] `verify1` detects the single-stage image
- [ ] Multi-stage build works
- [ ] `verify2` correctly compares image sizes
- [ ] Non-root image works
- [ ] `verify3` detects UID ≠ 0
- [ ] No unexpected pull or network restrictions

**Record:** actual session duration, and time spent pulling images.

### 3. Kubernetes pilot — `killercoda/k8s-workloads`

- [ ] `kubectl` works
- [ ] Cluster becomes Ready
- [ ] **Actual node count recorded**
- [ ] Deployment with 3 replicas works
- [ ] ReplicaSet appears
- [ ] Pod deletion causes a replacement
- [ ] Deployment deletion cascades
- [ ] Rollout works
- [ ] `rollout undo` works
- [ ] No hidden dependency on StorageClass or systemd

**Record:** actual session duration, and whether the cluster is single-node or
multi-node — even though this pilot deliberately avoids multi-node
requirements, the answer decides four labs currently classed as unsuitable.

## Result to capture

Replace the assumptions with observations:

```
Git         → ✅ / ❌
Docker      → ✅ / ❌
Kubernetes  → ✅ / ❌

Session limit:   ___ minutes
Time to usable:  ___ minutes
Docker daemon:   yes / no
K8s nodes:       ___
StorageClass:    yes / no
Internet:        yes / no
Init system:     yes / no
```

Only with those numbers should anyone revisit the 26 / 25 / 8 classification,
publish the real URLs, or enable a Start Lab button.

## Known limitations

- **The three URLs are placeholders.** `https://killercoda.com/egykode/...` —
  the scenario repository is not published. They are the right shape and will
  need replacing with the real ones; content lint enforces the shape, not
  existence.
- **The Docker pilot drops one criterion.** The EgyKode lab's fourth criterion —
  a container that refuses to start until its database is reachable — needs a
  second service and is out of scope here. `finish.md` says so.
- **Killercoda cannot report back.** EgyKode never learns what happened in that
  terminal, so success criteria stay self-assessed even when Killercoda
  verified the work. The hands-on panel states this rather than implying the
  site checked anything.
- **Image pull time is unbudgeted.** The Docker and Kubernetes estimates count
  learner work only.

## No change to the compatibility matrix yet

Building these three surfaced nothing that contradicts
[killercoda-compatibility.md](./killercoda-compatibility.md). The matrix should
be revised **after** human validation, not before — particularly the session
limit, which could push several 45–55 minute labs out of the compatible group.
