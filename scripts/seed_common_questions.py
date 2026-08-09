#!/usr/bin/env python3
"""
Seed the question bank with the questions Cloud/DevOps interviews actually ask.

The existing bank was extracted from the chapters (migrate_questions.py), so it
mirrors how the handbook explains things. This adds the other half: the
questions that come up again and again in real interviews, phrased the way an
interviewer phrases them.

Written to `<domain>-common.json` so the two sources stay distinguishable — an
extracted question can be regenerated from its chapter, a curated one cannot.

Every entry is validated against a real chapter before it is written: a question
whose "read the chapter" link goes nowhere is worse than no question.

Run: python scripts/seed_common_questions.py
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEARN = ROOT / "content" / "learn"
OUT = ROOT / "content" / "questions"

# (domain, chapter, level, kind, question, answer)
QUESTIONS: list[tuple[str, str, str, str, str, str]] = [
    # ── Linux ────────────────────────────────────────────────────────────
    ("linux", "linux-foundations", "beginner", "conceptual",
     "What is the difference between a process and a daemon?",
     "Every running program is a process with a numeric PID. A daemon is simply a process that runs in the background with no controlling terminal — a service. `dockerd`, `kubelet` and a database server are all daemons."),
    ("linux", "linux-foundations", "beginner", "scenario",
     "A server is out of disk space. How do you find what is using it?",
     "`df -h` shows which filesystem is full, then `du -sh /var/*` narrows it down directory by directory. The usual culprits are `/var/log` and unpruned container images. A full disk breaks things that look unrelated — Docker cannot pull, Kubernetes evicts Pods, databases refuse writes."),
    ("linux", "linux-foundations", "intermediate", "conceptual",
     "What does `chmod 755` mean, and why is `777` almost always wrong?",
     "Each digit sums read (4), write (2) and execute (1) for owner, group and others. `755` gives the owner everything and everyone else read and execute. `777` grants write access to every process on the machine, including a compromised one — the fix is nearly always correct ownership (`chown`) plus a shared group, not wider permissions."),
    ("linux", "linux-foundations", "intermediate", "scenario",
     "A service works when you start it manually but is gone after a reboot. Why?",
     "It was started but never enabled. `systemctl start` runs it now; `systemctl enable` registers it to start at boot. They are independent, and confusing them produces a service that runs perfectly for months and then never comes back after a 3am reboot."),
    ("linux", "linux-foundations", "advanced", "conceptual",
     "What is the difference between SIGTERM and SIGKILL, and why does it matter in Kubernetes?",
     "`SIGTERM` (`kill`) asks a process to shut down cleanly; `SIGKILL` (`kill -9`) terminates it immediately with no chance to clean up. Kubernetes sends SIGTERM when removing a Pod and waits `terminationGracePeriodSeconds` before SIGKILL. An application that ignores SIGTERM drops in-flight user requests on every deploy."),

    # ── Networking ───────────────────────────────────────────────────────
    ("networking", "networking-fundamentals", "beginner", "conceptual",
     "What actually happens when you type a URL into a browser?",
     "DNS resolves the name to an IP (resolver → root → TLD → authoritative, cached at every step by TTL); TCP connects; TLS negotiates encryption and verifies the certificate chain; HTTP carries the request; the server responds. Most 'network' incidents are really DNS caching or certificate expiry."),
    ("networking", "networking-fundamentals", "intermediate", "conceptual",
     "What makes a subnet public rather than private?",
     "Its route table. A public subnet has a `0.0.0.0/0` route to an Internet Gateway; a private one either routes `0.0.0.0/0` to a NAT Gateway (outbound only) or has no default route at all. The name is a convention — the route is the mechanism."),
    ("networking", "networking-fundamentals", "intermediate", "conceptual",
     "Security group or NACL — what is the difference?",
     "A security group attaches to an instance, is stateful (return traffic is automatic) and only has allow rules. A NACL attaches to a subnet, is stateless (you must allow the reply explicitly) and supports deny rules. Forgetting the return rule on a NACL produces a hang, not a refusal, which sends people debugging the application."),
    ("networking", "networking-fundamentals", "advanced", "scenario",
     "You changed a DNS record and nothing happened. What is going on?",
     "Resolvers are still serving the old answer until its TTL expires. Check the remaining TTL with `dig`. The fix is procedural: lower the TTL a day *before* a migration, cut over, then raise it again — lowering it at cutover is too late, because the old long TTL is already cached."),

    # ── Git ──────────────────────────────────────────────────────────────
    ("git", "git-and-github", "beginner", "conceptual",
     "What is the difference between `git merge` and `git rebase`?",
     "`merge` creates a commit joining two histories and preserves what actually happened. `rebase` replays your commits on top of another branch, producing a linear history but rewriting commit hashes. Rebase your own unpushed work; never rebase a shared branch other people have pulled."),
    ("git", "git-and-github", "intermediate", "scenario",
     "You committed a secret and pushed it. What do you do?",
     "Treat the secret as compromised and rotate it first — that is the only step that actually protects you. Then remove it from history (`git filter-repo` or BFG) and force-push. Deleting the file in a new commit does nothing: the value is still in history and in every clone."),

    # ── Docker ───────────────────────────────────────────────────────────
    ("docker", "docker", "beginner", "conceptual",
     "What is the difference between an image and a container?",
     "An image is an immutable stack of read-only layers — the template. A container is a running instance of that image with a thin writable layer on top. The writable layer is discarded when the container is removed, which is why persistent data needs a volume."),
    ("docker", "docker", "intermediate", "conceptual",
     "Why does the order of Dockerfile instructions matter?",
     "Docker caches a layer per instruction and invalidates everything below the first change. Copying source before installing dependencies means every code edit re-downloads dependencies. Copy the manifest, install, then copy source — the difference between a 30-second and a 6-minute build."),
    ("docker", "docker", "intermediate", "conceptual",
     "How do you make a container image smaller and safer?",
     "Use a multi-stage build so compilers and build dependencies never reach the final image; start from a minimal base (alpine or distroless); combine `RUN` steps; add a `.dockerignore`; and run as a non-root `USER`. Smaller images pull faster and have far less to patch."),
    ("docker", "docker", "advanced", "conceptual",
     "Docker is 'deprecated' in Kubernetes — what does that actually mean?",
     "Kubernetes removed dockershim in 1.24, so it no longer uses the Docker *daemon* as a runtime; it talks to containerd through the CRI. Images are unaffected — they are an OCI standard, so an image built with `docker build` runs unchanged. The practical impact is on the node: `docker ps` no longer shows Kubernetes containers, `crictl ps` does."),
    ("docker", "docker", "advanced", "scenario",
     "A secret was copied into an image and deleted in the next instruction. Is it safe?",
     "No. Layers are additive — the deletion is a marker in a higher layer, and the original file is still in the lower one and extractable from the image. The secret must be rotated, and builds must take secrets from build secrets or the runtime environment instead."),

    # ── Kubernetes ───────────────────────────────────────────────────────
    ("kubernetes", "kubernetes", "beginner", "conceptual",
     "What is a Pod, and why not just run containers?",
     "A Pod is one or more containers sharing a network namespace and storage, always scheduled together and reachable on `localhost`. It is the smallest unit Kubernetes schedules. Usually there is one container; the exception is a sidecar that needs the same lifecycle and localhost access."),
    ("kubernetes", "kubernetes", "beginner", "conceptual",
     "What is the difference between a Deployment, a ReplicaSet and a Pod?",
     "A Deployment declares desired state and manages rollouts; it creates a ReplicaSet per version, and the ReplicaSet keeps the requested number of Pods running. Rolling back works because the previous ReplicaSet is retained at zero replicas."),
    ("kubernetes", "kubernetes", "intermediate", "conceptual",
     "Explain liveness, readiness and startup probes.",
     "Liveness failing restarts the container — for a process that has deadlocked. Readiness failing removes the Pod from Service endpoints without restarting it — for a temporarily busy or dependency-blocked process. Startup suspends the other two while a slow application boots. Pointing liveness at a database check turns a slow database into a cluster-wide restart storm."),
    ("kubernetes", "kubernetes", "intermediate", "scenario",
     "A Service returns nothing. How do you debug it?",
     "`kubectl get endpoints <service>` first. An empty list means the selector matches no ready Pod — a label mismatch or a failing readiness probe — and the network is not involved at all. If endpoints exist, check `targetPort` against the container's actual port, then test DNS from inside a Pod."),
    ("kubernetes", "kubernetes", "intermediate", "conceptual",
     "ClusterIP, NodePort or LoadBalancer — when do you use each?",
     "`ClusterIP` for internal traffic, which is nearly everything. `NodePort` mainly for debugging or behind an external balancer. `LoadBalancer` provisions a real cloud load balancer per Service, which is why production uses one Ingress in front of many ClusterIP Services rather than a LoadBalancer each."),
    ("kubernetes", "kubernetes", "intermediate", "scenario",
     "A Pod is stuck in `CrashLoopBackOff`. Walk through your diagnosis.",
     "`kubectl logs <pod> --previous` — the current container has just started and knows nothing; the evidence is in the one that died. Then `kubectl describe pod` for events and the exit code: 137 is OOMKilled (raise the memory limit or fix the leak), a config or missing-secret error appears in the logs, and a liveness probe that is too aggressive shows as repeated restarts of an otherwise healthy process."),
    ("kubernetes", "kubernetes", "advanced", "conceptual",
     "What does `OOMKilled` mean and who kills the process?",
     "The container exceeded its memory limit and the Linux kernel's OOM killer terminated it inside its cgroup — Kubernetes only reports what the kernel did. Fix it by raising the limit if the workload genuinely needs it, or by fixing the leak. Setting requests and limits equal gives the Pod the Guaranteed QoS class and makes it the last to be evicted."),
    ("kubernetes", "kubernetes", "advanced", "conceptual",
     "How does RBAC work, and why is there no deny rule?",
     "A Role (or ClusterRole) is a list of permissions; a RoleBinding attaches it to a user, group or ServiceAccount. RBAC is purely additive — a subject can do the union of what its bindings grant — so you restrict by granting less, never by subtracting. Verify with `kubectl auth can-i --list --as system:serviceaccount:ns:name`."),
    ("kubernetes", "kubernetes", "advanced", "conceptual",
     "Are Kubernetes Secrets encrypted?",
     "By default they are base64-encoded, not encrypted — anyone who can read the Secret can decode it instantly. Real protection needs encryption at rest in etcd, RBAC limiting who can read Secrets, `automountServiceAccountToken: false` where the API is not used, and ideally an external store such as AWS Secrets Manager."),
    ("kubernetes", "kubeadm", "advanced", "conceptual",
     "Why do control planes come in odd numbers?",
     "etcd needs a strict majority to accept a write. Three nodes tolerate one failure; four also tolerate only one, because losing two of four leaves no majority. A two-node 'HA' cluster is less available than a single node — it can lose quorum and refuse writes while both machines are still running."),

    # ── Terraform ────────────────────────────────────────────────────────
    ("terraform", "terraform", "beginner", "conceptual",
     "What is the Terraform state file and why does it matter?",
     "It maps your configuration to real resource IDs — Terraform's memory of what it created. Without it Terraform cannot tell an existing resource from one to create. It belongs in an encrypted remote backend with locking, never in Git: it frequently contains secrets in plain text."),
    ("terraform", "terraform", "intermediate", "conceptual",
     "How do you stop two engineers corrupting state at the same time?",
     "State locking. With an S3 backend, a DynamoDB table holds the lock: whoever starts first acquires it and the second run fails with a clear message rather than writing concurrently. Locking is the reason a shared backend is safe to use."),
    ("terraform", "terraform", "intermediate", "scenario",
     "A plan shows `-/+` on your production database. What do you do?",
     "Stop. `-/+` means destroy and recreate, because you changed an attribute that cannot be modified in place — on a database that is your data. Identify the forcing attribute in the plan output, and either revert it, use `ignore_changes`, or plan a proper migration with a snapshot first."),
    ("terraform", "terraform", "intermediate", "scenario",
     "Someone deleted a resource by hand in the console. What does Terraform do?",
     "`terraform plan` queries the provider, finds the resource missing — this is configuration drift — and proposes recreating it to match the declared state. `terraform apply` repairs it. This self-healing property is the point of declarative infrastructure."),
    ("terraform", "terraform", "advanced", "conceptual",
     "How do you refactor a large state file without destroying infrastructure?",
     "`terraform state mv` moves resource addresses between states, and `terraform import` adopts existing resources. Both change the mapping only — no cloud API calls that alter real infrastructure — so production keeps running while the layout changes."),
    ("terraform", "terraform", "intermediate", "conceptual",
     "Workspaces or separate directories for environments?",
     "Separate directories, usually. Workspaces share one configuration, so the only thing between a staging apply and a production apply is which workspace you are in — something you can forget. Directories make the environment explicit in the path and let production legitimately differ."),

    # ── Ansible ──────────────────────────────────────────────────────────
    ("ansible", "ansible", "intermediate", "conceptual",
     "What does idempotency mean in Ansible, and how do you prove it?",
     "Running the same playbook twice produces no further change. You prove it by running it again and seeing `changed=0`. Idempotency comes from using modules that check state rather than `command`/`shell` — and where a shell step is unavoidable, guarding it with `creates`, `removes` or a `when` condition."),
    ("ansible", "ansible", "intermediate", "conceptual",
     "When should a variable go in `defaults/` rather than `vars/`?",
     "Almost always `defaults/`. It sits near the bottom of the precedence order so callers can override it; `vars/` sits near the top and is effectively unoverridable. A role whose tunables live in `vars/` cannot be reused, which defeats the purpose of writing one."),

    # ── AWS ──────────────────────────────────────────────────────────────
    ("aws", "iam", "beginner", "conceptual",
     "What is the difference between an IAM user and an IAM role?",
     "A user is a permanent identity with long-lived credentials. A role is assumed temporarily and issues credentials that expire. Anything that is not a human — an EC2 instance, a CI job, a Pod — should use a role, so there is no long-lived key to leak."),
    ("aws", "iam", "intermediate", "scenario",
     "An application gets AccessDenied despite a policy that clearly allows the action. What do you check?",
     "First `aws sts get-caller-identity` — you are often not the principal you assumed. Then check whether the denial is on `sts:AssumeRole` (a trust policy problem) or the action itself (a permissions problem); whether an explicit Deny or an SCP overrides the Allow; and whether the resource ARN matches, remembering that S3 bucket and object operations need both `bucket` and `bucket/*`."),
    ("aws", "vpc", "intermediate", "conceptual",
     "What is a NAT Gateway for, and what does it cost you?",
     "It lets instances in private subnets reach the internet without being reachable from it. It is billed hourly plus per GB processed, is zonal (one per AZ for real availability), and pulling container images through it is a common surprise on the bill — VPC endpoints for S3 and ECR remove most of that traffic."),
    ("aws", "rds", "intermediate", "conceptual",
     "Is Multi-AZ the same as a read replica?",
     "No. Multi-AZ keeps a synchronous standby that serves no traffic and exists only for failover — it buys availability, not capacity. Read replicas are asynchronous and do serve reads. They solve different problems and are often needed together."),
    ("aws", "aws-overview", "intermediate", "conceptual",
     "When is a burstable `t` instance the wrong choice?",
     "When the workload is sustained rather than bursty. `t` instances earn CPU credits while idle and spend them under load; once exhausted they throttle to a fraction of a core. The instance stays 'healthy' while the application becomes unusably slow, and nothing says throttled unless you look at `CPUCreditBalance`."),
    ("aws", "aws-overview", "advanced", "conceptual",
     "How would you reduce a cloud bill that has grown without anyone noticing?",
     "In order: visibility, then elimination, then commitment. Enforce tagging and group spend by team and service; delete unattached EBS volumes, idle Elastic IPs and forgotten snapshots; right-size what is oversized; then buy Savings Plans for what remains. Committing to three years for an instance you should have deleted locks the waste in."),

    # ── CI/CD ────────────────────────────────────────────────────────────
    ("jenkins", "jenkins", "beginner", "conceptual",
     "What is the difference between continuous integration, delivery and deployment?",
     "Integration merges and verifies every change automatically. Delivery keeps every verified change *releasable*, with a human choosing when. Deployment removes that human — every change that passes goes to production. Most teams practise delivery and describe it as deployment."),
    ("jenkins", "jenkins", "intermediate", "conceptual",
     "What makes a pipeline stage an actual quality gate?",
     "It fails the build. A stage that reports findings and exits zero is a notification, not a gate — so scanners run with `--exit-code 1` and analysis waits for its verdict rather than firing and forgetting. Gates should also be scoped to new code, or a legacy codebase makes them unadoptable and they get disabled."),
    ("jenkins", "jenkins", "intermediate", "scenario",
     "How do you keep credentials out of a pipeline?",
     "Inject them at run time from a credential store and never write them to disk or the log. Prefer identity over secrets entirely — an IAM role assumed by the runner, or OIDC federation from the CI provider — so there is no long-lived key to rotate or leak."),

    # ── GitOps ───────────────────────────────────────────────────────────
    ("gitops", "gitops", "intermediate", "conceptual",
     "What problem does GitOps solve that a deploy pipeline does not?",
     "It replaces push with pull and makes drift visible. A controller in the cluster continuously compares running state to Git and reports or corrects the difference, so Git is genuinely the source of truth. It also means CI credentials never need cluster access — the cluster pulls, rather than the pipeline pushing."),
    ("gitops", "argocd", "advanced", "scenario",
     "An engineer hotfixes production with `kubectl edit`. What happens under GitOps?",
     "Argo CD marks the application OutOfSync, and with `selfHeal: true` reverts the change within minutes — correct behaviour that feels hostile the first time. The right response is to commit the fix so Git and the cluster agree. Genuinely controller-owned fields, such as replicas managed by an HPA, belong in `ignoreDifferences`."),

    # ── Observability ────────────────────────────────────────────────────
    ("observability", "observability", "intermediate", "conceptual",
     "What is the difference between monitoring and observability?",
     "Monitoring answers questions you knew to ask — dashboards and thresholds for known failure modes. Observability is whether you can answer *new* questions from the telemetry you already emit, without shipping code. High-cardinality, well-structured data is what makes the difference."),
    ("observability", "observability", "intermediate", "conceptual",
     "What should page a human at 3am?",
     "Symptoms users are feeling — error rate, latency, an SLO burning fast — not causes like CPU at 90%. The test is whether the recipient can act on it now and whether it matters if they do not. Alerting on causes is the fastest route to a team that ignores its alerts."),
    ("observability", "prometheus", "advanced", "conceptual",
     "Why alert on a ratio and a burn rate rather than a raw count?",
     "A count threshold fires on a busy night and stays silent during a quiet outage. A ratio means the same thing at any traffic level, and a burn rate expresses how fast you are consuming the error budget — so a page fires in proportion to how much trouble you are actually in, and a slow leak becomes a ticket rather than a 3am call."),

    # ── Security ─────────────────────────────────────────────────────────
    ("security", "container-security", "intermediate", "conceptual",
     "Where should container images be scanned?",
     "At three points: on pull requests, in the build pipeline before the push, and continuously in the registry. The third is the one teams forget — an image that passed on Monday can be critically vulnerable on Friday without a single line changing, because the vulnerability was published, not introduced."),
    ("security", "container-security", "advanced", "conceptual",
     "What does a good `securityContext` look like?",
     "`runAsNonRoot: true`, a numeric `runAsUser`, `allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`, and `capabilities: drop: [\"ALL\"]`, adding back only what genuinely breaks. Enforce it at the namespace boundary with Pod Security Admission rather than relying on every author remembering."),
    ("security", "network-policies", "intermediate", "conceptual",
     "How do Kubernetes NetworkPolicies behave by default?",
     "A Pod selected by no policy accepts all traffic; security starts only once something selects it, which is why the first policy you write is a default-deny. Policies are additive with no deny rule — traffic is allowed if any policy allows it — and an egress policy that forgets DNS to CoreDNS breaks every hostname lookup in the namespace."),

    # ── SRE ──────────────────────────────────────────────────────────────
    ("sre", "disaster-recovery", "intermediate", "conceptual",
     "What is the difference between RTO and RPO?",
     "RTO is how long you may take to restore service; RPO is how much data you may lose, measured in time. RTO drives standby capacity and automation, RPO drives backup and replication frequency. Both are business decisions, and a backup nobody has ever restored satisfies neither."),
    ("sre", "disaster-recovery", "advanced", "conceptual",
     "Is high availability the same as disaster recovery?",
     "No. HA handles a component failing inside a region, automatically and in seconds. DR handles losing a region — or a bad decision such as a dropped table or ransomware — deliberately, in minutes to hours. HA replicates faults as faithfully as data, which is exactly why backups still exist."),
    ("sre", "disaster-recovery", "intermediate", "scenario",
     "You are first responder on a production outage. What are your first moves?",
     "Declare it out loud early, assign an incident commander who decides rather than debugs, and stop the bleeding before finding the cause — roll back or fail over first. Check what changed recently, because most incidents are a change. Communicate on a timer even when there is nothing new, then write a blameless postmortem with specific, owned, dated actions."),
]


def chapter_index() -> dict[str, tuple[str, str]]:
    """contentId -> (domain, title), read from the chapters themselves."""
    index: dict[str, tuple[str, str]] = {}
    for path in LEARN.rglob("*.en.mdx"):
        text = path.read_text(encoding="utf-8")
        front = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", text)
        if not front:
            continue
        block = front.group(1)
        cid = re.search(r"^contentId:\s*(.+)$", block, re.M)
        title = re.search(r"^title:\s*(.+)$", block, re.M)
        domain = re.search(r"^domain:\s*(.+)$", block, re.M)
        if cid and title and domain:
            index[cid.group(1).strip()] = (
                domain.group(1).strip(),
                title.group(1).strip().strip('"'),
            )
    return index


def slug(text: str) -> str:
    text = re.sub(r"`[^`]*`", "", text).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:70]


def main() -> None:
    chapters = chapter_index()
    by_domain: dict[str, list[dict]] = defaultdict(list)
    missing: list[str] = []
    seen: set[str] = set()

    # Ids already used by the extracted bank, so nothing collides.
    for existing in OUT.glob("*.json"):
        for q in json.loads(existing.read_text(encoding="utf-8")):
            seen.add(q["id"])

    for domain, chapter, level, kind, question, answer in QUESTIONS:
        if chapter not in chapters:
            missing.append(f"{chapter} (for: {question[:50]})")
            continue

        qid = f"common-{slug(question)}"
        if qid in seen:
            continue
        seen.add(qid)

        by_domain[domain].append({
            "id": qid,
            "question": question,
            "answer": answer,
            "level": level,
            "kind": kind,
            "domain": domain,
            "chapter": chapter,
            "chapterTitle": chapters[chapter][1],
        })

    if missing:
        print("! skipped — no such chapter:")
        for m in missing:
            print(f"    {m}")

    total = 0
    for domain, questions in sorted(by_domain.items()):
        path = OUT / f"{domain}-common.json"
        path.write_text(json.dumps(questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        total += len(questions)
        print(f"  {path.name:<28} {len(questions)} question(s)")

    print(f"\nseeded {total} commonly-asked question(s) across {len(by_domain)} domain(s)")


if __name__ == "__main__":
    main()
