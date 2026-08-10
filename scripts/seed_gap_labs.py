#!/usr/bin/env python3
"""
Fill the remaining topic gaps in the lab catalogue.

Targets from the coverage review: AWS 1→4, Networking 1→3, Git 1→3,
Jenkins 1→3, Linux 2→3, SRE 1→3.

Two deliberate constraints:

  · The AWS labs teach *AWS concepts* through the console and CLI. The existing
    Terraform labs already build a VPC, IAM and RDS — repeating them in HCL
    would be duplication, and a learner who has only ever seen a resource
    through Terraform cannot debug it in the console at 3am.

  · The Jenkins labs are grounded in the iVolve internship labs 21–23, which
    are procedures that have actually been run, rather than composed from
    documentation.

Run: python scripts/seed_gap_labs.py
"""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

FREE = "Free tier — no hourly-billed resource is created."

SPECS: list[dict] = [
    # ── Linux ───────────────────────────────────────────────────────────────
    {
        "id": "lab-linux-processes-services-logs",
        "order": 23,
        "title": "Linux Processes, Services & Logs",
        "domain": "linux",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — any Linux machine, VM or container.",
        "description": "Find the process, read what it actually said, and restore a service that will not start.",
        "skills": [
            "Locate a process by port, name or open file",
            "Read a service's own logs rather than guessing from its status",
            "Tell a crash apart from a configuration error",
        ],
        "tools": ["Linux with systemd", "sudo access"],
        "criteria": [
            "You can name the PID holding a given port, and the command that told you.",
            "You can show the last 50 log lines for one service without reading the whole journal.",
            "A deliberately broken service is diagnosed from its logs and restored.",
            "You can explain the difference between `failed`, `inactive` and `activating`.",
        ],
        "scenario": (
            "A service is down. `systemctl status` says `failed`, which tells you "
            "*that* it failed and nothing about why.\n\n"
            "This lab builds the sequence that gets from that word to the cause."
        ),
        "body": """
## 1. What is running, and what holds the port

```bash
ps aux --sort=-%mem | head -10       # heaviest processes first
sudo ss -ltnp | grep ':8080'         # who is listening
sudo lsof -i :8080                   # the same, with more detail
pgrep -a nginx                       # PIDs by name, with their command line
```

`ss -ltnp` is the one to memorise: **l**istening, **t**cp, **n**umeric, with the
**p**rocess. If nothing is listening, the service is not running and the network
was never involved.

## 2. Ask systemd, then ask the application

```bash
systemctl status nginx               # what systemd thinks happened
journalctl -u nginx -n 50 --no-pager # what the application said
journalctl -u nginx -f               # follow it live
journalctl -u nginx --since "10 min ago" -p err
```

`status` gives you the exit code and the last few lines. `journalctl -u` gives
you everything the unit wrote. The second is where the cause usually is, and it
is the step people skip.

**The states mean different things:**

| State | Means |
| --- | --- |
| `active (running)` | Working |
| `inactive (dead)` | Stopped, and nothing tried to start it |
| `failed` | It tried and exited non-zero — read the logs |
| `activating` | Still starting, or stuck in a start loop |

## 3. Break it, then fix it

```bash
sudo sed -i 's/^user /usr /' /etc/nginx/nginx.conf   # a deliberate typo
sudo systemctl restart nginx
systemctl status nginx
```

Now work it properly:

```bash
journalctl -u nginx -n 20 --no-pager
sudo nginx -t                        # most services have a config test
```

`nginx -t` names the file and line. Many daemons have an equivalent — `sshd -t`,
`apachectl configtest`, `postgres --check`. Reach for it before restarting
anything, because a service that fails to start on a bad config will keep
failing no matter how many times you restart it.

```bash
sudo sed -i 's/^usr /user /' /etc/nginx/nginx.conf
sudo systemctl restart nginx && systemctl is-active nginx
```

## 4. Signals, and what a restart really does

```bash
sudo systemctl reload nginx          # SIGHUP — re-read config, keep connections
sudo systemctl restart nginx         # stop then start — drops connections
kill -TERM <pid>                     # ask politely
kill -9 <pid>                        # last resort; no cleanup happens
```

`reload` and `restart` are not interchangeable. On a busy server `restart` drops
every in-flight request; `reload` re-reads the configuration without doing so —
if the service supports it.

## 5. When the logs are empty

```bash
journalctl -u myapp --since today | wc -l
sudo journalctl --disk-usage
systemctl cat myapp | grep -E 'StandardOutput|StandardError'
```

A unit with `StandardOutput=null` writes nothing to the journal, and its output
is wherever the application was told to put it. `systemctl cat` shows the unit
as systemd actually sees it, including drop-ins you did not know existed.
""",
        "failures": [
            ("`systemctl status` shows failed with no useful output",
             "`journalctl -u <unit> -n 50` — status truncates. If that is empty too, check `StandardOutput` in `systemctl cat`."),
            ("The service restarts in a loop",
             "`Restart=always` with a config error. Fix the config; the loop is systemd doing what it was told."),
            ("Port already in use",
             "`sudo ss -ltnp | grep <port>` names the holder. Often an old instance that did not exit."),
            ("Changes to the unit file do nothing",
             "`sudo systemctl daemon-reload` after editing a unit, then restart it."),
        ],
    },
    # ── Networking ──────────────────────────────────────────────────────────
    {
        "id": "lab-http-tls-troubleshooting",
        "order": 25,
        "title": "HTTP & TLS Troubleshooting",
        "domain": "networking",
        "level": "intermediate",
        "phase": "foundations",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — uses public endpoints and a local container.",
        "description": "Take a failing HTTPS request apart layer by layer: DNS, TCP, TLS, HTTP — and know which one broke.",
        "skills": [
            "Inspect a certificate chain and its expiry from the command line",
            "Separate a TLS failure from an HTTP failure",
            "Read `curl -v` output as a sequence of layers",
        ],
        "tools": ["curl", "openssl", "dig", "nc"],
        "criteria": [
            "You can print a site's certificate subject, issuer and expiry without a browser.",
            "You can state which layer failed for three different broken URLs.",
            "You can explain what `SSL_ERROR_SYSCALL` and `certificate verify failed` each imply.",
            "You can prove a port is reachable independently of whether TLS succeeds.",
        ],
        "scenario": (
            "\"The site is down.\" It returns a certificate error in one browser, "
            "works in another, and curl fails with something different again.\n\n"
            "Each of those is a different layer, and the fix depends entirely on "
            "which one."
        ),
        "body": """
## The four layers, in order

```text
DNS  ->  TCP  ->  TLS  ->  HTTP
dig      nc       openssl   curl
```

`curl -v` walks all four in one command, and its output is readable as exactly
that sequence:

```bash
curl -v https://egykode.com/ 2>&1 | head -20
```

```text
* Host egykode.com:443 was resolved.          <- DNS worked
* Connected to egykode.com (52.84.143.46)      <- TCP worked
* TLS handshake, Certificate (11):             <- TLS in progress
* SSL certificate verify ok.                   <- TLS worked
> GET / HTTP/2                                 <- HTTP begins
```

Whichever line is missing is the layer that failed.

## 1. DNS

```bash
dig +short egykode.com
dig egykode.com | grep -A2 "ANSWER SECTION"
```

A wrong-but-cached answer is the common case; the TTL in the answer tells you
whether you are looking at cache or configuration.

## 2. TCP, without TLS in the way

```bash
nc -vz egykode.com 443
```

This proves reachability on its own. If `nc` connects and `curl` still fails,
the network is fine and the problem is TLS or above — which removes firewalls
and security groups from the investigation entirely.

## 3. TLS

```bash
echo | openssl s_client -connect egykode.com:443 -servername egykode.com 2>/dev/null \\
  | openssl x509 -noout -subject -issuer -dates

# Just the expiry, for a monitoring check
echo | openssl s_client -connect egykode.com:443 2>/dev/null \\
  | openssl x509 -noout -enddate

# The full chain the server actually sends
echo | openssl s_client -connect egykode.com:443 -showcerts 2>/dev/null | grep -c "BEGIN CERTIFICATE"
```

`-servername` sets SNI. Without it a server hosting several sites returns its
default certificate, and you diagnose the wrong one.

**The three failures you will meet:**

| Message | Means | Fix |
| --- | --- | --- |
| `certificate has expired` | The dates have passed | Renewal automation stopped |
| `unable to get local issuer certificate` | Chain incomplete | Server sends the leaf but not the intermediate |
| `certificate is not valid for <host>` | Right cert, wrong name | Missing SAN entry |

The second is the subtle one: it works in browsers, which cache intermediates
from previous sites, and fails in curl and in your application. "It works in
Chrome" is not evidence the chain is complete.

## 4. HTTP

```bash
curl -sI https://egykode.com/ | head -5
curl -s -o /dev/null -w 'code=%{http_code} tls=%{time_appconnect} total=%{time_total}\\n' https://egykode.com/
```

`time_appconnect` is when TLS finished. If it is close to `time_total`, the
handshake is your latency, not the application.

## 5. Practise on deliberately broken endpoints

```bash
curl -v https://expired.badssl.com/        2>&1 | grep -i "certificate"
curl -v https://wrong.host.badssl.com/     2>&1 | grep -i "certificate"
curl -v https://untrusted-root.badssl.com/ 2>&1 | grep -i "issuer"
curl -v https://self-signed.badssl.com/    2>&1 | grep -i "self.signed"
```

Read each error and name the layer before moving on. `-k` skips verification and
is useful to *confirm* the diagnosis — if `-k` works, the transport is fine and
the fault is purely certificate validation.
""",
        "failures": [
            ("Works in the browser, fails in curl",
             "Almost always an incomplete chain. The browser cached the intermediate from another site; curl did not."),
            ("`SSL_ERROR_SYSCALL` with no detail",
             "The connection dropped during the handshake — often a middlebox, or the server rejecting the TLS version. Try `--tlsv1.2`."),
            ("Certificate looks correct but the name is wrong",
             "You omitted `-servername`, so the server returned its default certificate."),
            ("`nc` connects but curl times out",
             "The port is open and nothing is speaking HTTPS on it — check you are not hitting a plain HTTP port with https://."),
        ],
    },
    {
        "id": "lab-reverse-proxy-load-balancing",
        "order": 26,
        "title": "Reverse Proxy & Load Balancing with Nginx",
        "domain": "networking",
        "level": "intermediate",
        "phase": "foundations",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — Docker Compose on your own machine.",
        "description": "Put a proxy in front of two backends, then break one and watch what the health check does about it.",
        "skills": [
            "Configure an upstream with more than one backend",
            "Forward the headers an application needs to see the real client",
            "Explain 502 versus 504 from the proxy's point of view",
        ],
        "tools": ["Docker", "Docker Compose"],
        "criteria": [
            "Requests through the proxy reach both backends, demonstrated by repeated calls.",
            "Stopping one backend does not produce errors for the client.",
            "The backend can see the original client IP, not the proxy's.",
            "You can produce a 502 and a 504 deliberately and explain the difference.",
        ],
        "scenario": (
            "One application server is a single point of failure, and it also has to "
            "terminate TLS, serve static files and survive a restart.\n\n"
            "A reverse proxy in front solves all three — and introduces its own "
            "failure modes, which are the ones you will actually debug in "
            "Kubernetes later."
        ),
        "body": """
## 1. Two backends and a proxy

```yaml
# compose.yaml
services:
  app1:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:5678", "-text=backend one"]
  app2:
    image: hashicorp/http-echo:1.0
    command: ["-listen=:5678", "-text=backend two"]
  proxy:
    image: nginx:1.27-alpine
    ports: ["8080:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [app1, app2]
```

```nginx
# nginx.conf
upstream backend {
    server app1:5678 max_fails=2 fail_timeout=10s;
    server app2:5678 max_fails=2 fail_timeout=10s;
}

server {
    listen 80;

    location / {
        proxy_pass http://backend;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 2s;
        proxy_read_timeout    5s;
    }
}
```

```bash
docker compose up -d
for i in $(seq 1 6); do curl -s localhost:8080; echo; done
```

You should see both backends. Nginx round-robins by default.

## 2. Why those four headers matter

Once a proxy is in front, the application no longer sees the client — it sees
the proxy. Without these headers:

- Every log line records the proxy's IP, so rate limiting and audit trails are
  useless.
- Redirects are built against the proxy's hostname.
- The application thinks the request was HTTP, and redirect loops to HTTPS.

`X-Forwarded-For` appends rather than replaces, so a chain of proxies is
preserved. Your application must be configured to *trust* it — accepting it from
anywhere lets a client forge their own IP.

## 3. Kill a backend

```bash
docker compose stop app1
for i in $(seq 1 6); do curl -s localhost:8080; echo; done
```

Every response now comes from `app2`. `max_fails=2 fail_timeout=10s` marks a
backend unavailable after two failures and retries it ten seconds later — a
passive health check, driven by real traffic rather than a separate probe.

```bash
docker compose start app1
```

## 4. Produce 502 and 504 on purpose

```bash
docker compose stop app1 app2
curl -s -o /dev/null -w '%{http_code}\\n' localhost:8080     # 502
```

**502** — the proxy could not get a usable response. Nothing was listening, or
the connection was refused. The fault is behind the proxy.

For a **504**, make a backend slow: with `proxy_read_timeout 5s`, a backend that
takes ten seconds produces a gateway timeout. The backend is alive and simply
too slow — a completely different investigation.

| Code | Proxy is saying | Look at |
| --- | --- | --- |
| 502 | "I could not talk to the backend" | Is it running? Right port? |
| 504 | "The backend did not answer in time" | Slow queries, timeouts, saturation |

That distinction is exactly the one you will need for a Kubernetes Ingress,
which is the same pattern with the proxy managed for you.

```bash
docker compose logs proxy | tail -5
```

The proxy's own log names the upstream it tried and why it failed. It is the
first place to look, and the last place people look.
""",
        "cleanup": ["docker compose down -v", "docker ps -a | grep http-echo   # should be empty"],
        "failures": [
            ("502 immediately, with both backends running",
             "The upstream port is wrong, or the service name does not resolve on the Compose network. `docker compose exec proxy ping app1`."),
            ("All requests hit one backend",
             "Keep-alive: the connection is reused. Nginx balances connections, not requests — use `curl -H 'Connection: close'`."),
            ("The application logs the proxy's IP",
             "`X-Real-IP` is set but the application is not reading it, or does not trust it."),
            ("`host not found in upstream`",
             "Nginx resolves upstream names at startup. If a backend was not up yet, the proxy fails to start — `depends_on` helps, a resolver is the robust fix."),
        ],
    },
    # ── Git ─────────────────────────────────────────────────────────────────
    {
        "id": "lab-git-recovery-history",
        "order": 27,
        "title": "Git Recovery & History Surgery",
        "domain": "git",
        "level": "intermediate",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — a local repository is enough.",
        "description": "Destroy work four different ways and get it back, then remove a secret from history and understand why that is not the fix.",
        "skills": [
            "Recover commits after a hard reset, a deleted branch or a bad rebase",
            "Choose between revert, reset and restore deliberately",
            "Remove a file from history, and know what that does not achieve",
        ],
        "tools": ["git 2.30+"],
        "criteria": [
            "You recovered work after `reset --hard`, after deleting a branch, and after an aborted rebase.",
            "You can state when `revert` is correct and when `reset` is.",
            "A committed secret is gone from every commit, verified by searching history.",
            "You can explain why removing it is still not sufficient.",
        ],
        "scenario": (
            "You reset the wrong branch. A colleague force-pushed over your work. "
            "There is an API key in a commit from three weeks ago.\n\n"
            "All three are recoverable, and knowing that changes how confidently "
            "you work."
        ),
        "body": """
## Set up a repository to break

```bash
mkdir /tmp/git-recovery && cd /tmp/git-recovery && git init
for i in 1 2 3 4 5; do echo "line $i" >> file.txt; git add -A; git commit -qm "commit $i"; done
git log --oneline
```

## 1. `reset --hard`, undone

```bash
git reset --hard HEAD~3
git log --oneline          # two commits left
git reflog                 # every position HEAD has held
git reset --hard HEAD@{1}  # back
```

**`git reflog` is the repository's own undo history.** A commit stays reachable
for about 90 days even when no branch points at it. Almost nothing done locally
is truly destructive.

## 2. A deleted branch

```bash
git switch -c feature && echo work >> file.txt && git commit -qam "feature work"
git switch master
git branch -D feature          # "permanently" deleted
git reflog | grep feature      # the commit hash is still here
git switch -c feature-restored <hash>
```

## 3. An abandoned rebase

```bash
git rebase -i HEAD~3    # not available non-interactively; abort instead
git rebase --abort      # puts everything back exactly as it was
```

`--abort` is always available mid-rebase, and it is complete. Trying a rebase
costs nothing.

## 4. revert, reset or restore

The three are not interchangeable, and picking the wrong one on a shared branch
is how you create the next problem:

| Command | Does | Use when |
| --- | --- | --- |
| `git restore <file>` | Discards uncommitted changes to a file | You edited something by mistake |
| `git reset --hard <ref>` | Moves the branch, discards commits | The work is local and unpushed |
| `git revert <commit>` | **Adds** a commit undoing another | The commit is already pushed |

**Never `reset` a branch other people have pulled.** `revert` is the shared-branch
answer: history stays intact and everyone's clone still agrees.

```bash
git revert --no-edit HEAD
git log --oneline -2        # the original and its revert, both present
```

## 5. A secret in history

```bash
echo "AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG" > .env
git add .env && git commit -qm "add config"
echo "more work" >> file.txt && git commit -qam "unrelated"

git log --oneline -- .env          # still there
git rm --cached .env -q && echo ".env" >> .gitignore
git commit -qm "stop tracking .env"

git log -p --all -S 'wJalrXUtnFEMI' | head -5   # the value is STILL in history
```

That last command is the point. Removing the file going forward does nothing
about the commits that already contain it, and every clone has them.

```bash
# git-filter-repo is the maintained tool; BFG is the alternative
pip install git-filter-repo
git filter-repo --path .env --invert-paths --force
git log --all --oneline -S 'wJalrXUtnFEMI'      # gone
```

**The order that actually matters:**

1. **Rotate the credential.** Assume it is compromised the moment it was
   pushed. This is the only step that protects anything.
2. Then rewrite history.
3. Then force-push and tell everyone with a clone to re-clone.

Doing 2 without 1 is theatre. The key was in a public repository, in CI logs, in
forks, and quite possibly in a scraper's database within minutes.
""",
        "failures": [
            ("`reflog` does not show the commit",
             "Reflog is per-clone and local. If the work was only ever on another machine or a deleted remote branch, it is not here."),
            ("`filter-repo` refuses to run",
             "It requires a fresh clone by default. Use `--force` only when you understand it is rewriting this working copy."),
            ("Colleagues' branches break after a rewrite",
             "Expected — every commit hash changed. They must re-clone or rebase onto the new history."),
            ("The secret still appears on GitHub after rewriting",
             "GitHub keeps unreferenced commits accessible for a while and caches PR views. Contact support to purge, and rotate regardless."),
        ],
    },
    {
        "id": "lab-git-professional-collaboration",
        "order": 28,
        "title": "Professional Collaboration on GitHub",
        "domain": "git",
        "level": "intermediate",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — a GitHub account.",
        "description": "Protect a branch, require review, and make the pipeline the thing that decides whether code can merge.",
        "skills": [
            "Configure branch protection that CI actually enforces",
            "Route review automatically with CODEOWNERS",
            "Write commit messages a release process can read",
        ],
        "tools": ["A GitHub repository you own", "git 2.30+"],
        "criteria": [
            "A direct push to the protected branch is rejected.",
            "A pull request cannot merge while its status check is failing.",
            "A CODEOWNERS entry requests the right reviewer automatically.",
            "You can explain why 'require branches to be up to date' matters.",
        ],
        "scenario": (
            "Trunk-based development only works when `main` is always releasable. "
            "That is not a matter of discipline — it is a matter of configuration.\n\n"
            "This lab makes the repository enforce it."
        ),
        "body": """
## 1. A check for the branch to depend on

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npm test
```

Branch protection can only require a check that has run at least once, so merge
this first.

## 2. Protect the branch

**Settings → Branches → Add rule**, pattern `main`:

- **Require a pull request before merging** — no direct pushes.
- **Require approvals: 1** — for a solo repository this can be 0; keep the PR
  requirement regardless, because it is what makes the checks run.
- **Require status checks to pass** — select `test`.
- **Require branches to be up to date before merging.**
- **Do not allow bypassing the above settings** — including for administrators.

Prove it:

```bash
git switch main
echo "direct" >> README.md && git commit -qam "direct push"
git push origin main
# ! [remote rejected] main -> main (protected branch hook declined)
```

**"Up to date before merging" is the one worth understanding.** Without it, two
PRs that each pass independently can break `main` together — one renames a
function, the other adds a caller. Neither PR ever saw the other. With it, the
branch must be rebased onto current `main` and the checks re-run against the
combination that will actually exist.

## 3. CODEOWNERS

```text
# .github/CODEOWNERS
*                       @Waleeddarwesh
/infrastructure/        @Waleeddarwesh
/content/learn/         @Waleeddarwesh
*.tf                    @Waleeddarwesh
```

Last matching pattern wins — the opposite of `.gitignore`. Combined with
"Require review from Code Owners", a change to `/infrastructure/` cannot merge
without the person responsible for it seeing it.

## 4. Commit messages a machine can read

```text
feat(labs): add incident tier
fix(ci): accept GitHub's immutable OIDC subject
docs(readme): correct the lab count
```

Conventional Commits are worth adopting for one concrete reason: the prefix
drives release automation. `fix` produces a patch release, `feat` a minor, and
`!` or a `BREAKING CHANGE:` footer a major. The changelog writes itself.

```bash
git log --oneline --grep '^feat' | head
```

## 5. The pull request

```bash
git switch -c fix/typo
# ... change, commit, push ...
gh pr create --fill        # or open it in the browser
```

Two habits that make review useful rather than ceremonial:

- **Say what a reader can now do that they could not before.** A diff shows
  what changed; only you can say why.
- **Keep it small.** A 40-line PR gets a real review. A 2,000-line PR gets
  "LGTM", which is not a review.
""",
        "failures": [
            ("The status check cannot be selected in branch protection",
             "It has never run. Merge the workflow first, or open one PR so GitHub learns the check name."),
            ("Protection does not apply to you",
             "Enable 'Do not allow bypassing'. Administrators are exempt by default."),
            ("CODEOWNERS is ignored",
             "It must be on the *default* branch, in `.github/`, `docs/` or the root, and the owner needs write access."),
            ("PRs stay blocked after checks pass",
             "'Up to date' is on and `main` moved. Rebase and let the checks re-run."),
        ],
    },
    # ── Jenkins ─────────────────────────────────────────────────────────────
    {
        "id": "lab-jenkins-fundamentals",
        "order": 33,
        "title": "Jenkins Fundamentals & Role-Based Access",
        "domain": "jenkins",
        "level": "beginner",
        "phase": "cicd",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — Jenkins in Docker on your own machine.",
        "description": "Run Jenkins in a container, build a job from a webhook, and stop every authenticated user being an administrator.",
        "skills": [
            "Run Jenkins reproducibly with persistent state",
            "Trigger a build from a push rather than a button",
            "Grant permissions by role rather than to everyone",
        ],
        "tools": ["Docker", "Docker Compose"],
        "criteria": [
            "Jenkins is running with its home directory on a named volume, surviving a container restart.",
            "A job builds automatically when a commit is pushed.",
            "Two users exist: one administrator, one read-only, verified by logging in as each.",
            "The read-only user cannot start a build — demonstrated, not assumed.",
        ],
        "scenario": (
            "Jenkins out of the box gives every authenticated user broad "
            "permissions, and its state lives inside a container that will be "
            "replaced.\n\n"
            "Neither is acceptable, and both are fixed before writing a single "
            "pipeline."
        ),
        "body": """
> Grounded in the iVolve internship labs 21–23, which are procedures that have
> actually been run rather than assembled from documentation.

## 1. Jenkins that survives its container

```yaml
# compose.yaml
services:
  jenkins:
    image: jenkins/jenkins:lts-jdk17
    ports:
      - "8080:8080"
      - "50000:50000"      # agent port
    volumes:
      - jenkins_home:/var/jenkins_home
    environment:
      JAVA_OPTS: "-Djenkins.install.runSetupWizard=false"

volumes:
  jenkins_home:
```

```bash
docker compose up -d
docker compose exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

**`jenkins_home` on a named volume is the whole lab in one line.** Jobs,
credentials, plugins and build history all live there. Without it, `docker
compose down` destroys your CI server — which is how people end up with a
Jenkins nobody dares upgrade.

## 2. A job that builds on push

Install **Git** and **Pipeline** plugins, then create a Pipeline job with:

```groovy
pipeline {
  agent any

  triggers {
    githubPush()
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }
    stage('Build') {
      steps { sh 'echo building; ls -la' }
    }
    stage('Test') {
      steps { sh 'echo testing' }
    }
  }

  post {
    always  { echo "finished: ${currentBuild.currentResult}" }
    failure { echo 'notify here' }
  }
}
```

For the webhook, GitHub must be able to reach Jenkins. Locally that means a
tunnel:

```bash
# ngrok, cloudflared, or any tunnel
ngrok http 8080
# then GitHub -> Settings -> Webhooks -> https://<tunnel>/github-webhook/
```

The trailing slash on `/github-webhook/` is required. Without it GitHub gets a
404 and the delivery shows red in the webhook's Recent Deliveries — which is the
first place to look when pushes do not trigger builds.

## 3. Role-based access

Install **Role-based Authorization Strategy**, then
**Manage Jenkins → Security → Authorization → Role-Based Strategy**.

**Manage and Assign Roles → Manage Roles:**

| Role | Pattern | Permissions |
| --- | --- | --- |
| `admin` | — | Overall/Administer |
| `readonly` | — | Overall/Read, Job/Read, Job/Discover |

Create two users under **Manage Users**, assign one to each, and then verify by
logging in as the read-only user:

- The **Build Now** button is absent, not merely disabled.
- `Manage Jenkins` does not appear.

**Verify by logging in, not by reading the matrix.** A permissions grid that
looks right and behaves differently is the normal case, and the only proof is
attempting the action.

## 4. Why this comes before pipelines

A Jenkins with `jenkins_home` in a container and every user an administrator
will work perfectly until the day it does not — and then there is no history to
consult and no way to tell who changed what. Both problems are ten minutes of
configuration now and a rebuild later.
""",
        "cleanup": ["docker compose down", "# keep the volume, or remove it with:", "docker compose down -v"],
        "failures": [
            ("The webhook fires but no build starts",
             "The job needs `githubPush()` in `triggers`, and the URL must end in `/github-webhook/`. Check Recent Deliveries in GitHub for the response code."),
            ("Locked out after enabling role-based strategy",
             "No user has Overall/Administer. Edit `config.xml` in `jenkins_home` to set `<useSecurity>false</useSecurity>`, restart, and reconfigure."),
            ("Plugins disappear after a restart",
             "`jenkins_home` is not on a volume. Everything Jenkins knows lives there."),
            ("`sh` steps fail with 'command not found'",
             "The tool is not in the container. Either install it in a custom image or run the stage on an agent that has it."),
        ],
    },
    {
        "id": "lab-jenkins-docker-pipeline",
        "order": 34,
        "title": "Jenkins Pipeline: Build, Scan and Push an Image",
        "domain": "jenkins",
        "level": "intermediate",
        "phase": "cicd",
        "minutes": 55,
        "cloud_cost": False,
        "cost": "Free — local Jenkins and a free registry account.",
        "description": "Take a commit to a scanned, tagged image in a registry, with a gate that blocks rather than reports.",
        "skills": [
            "Build a container image from a pipeline without leaking credentials",
            "Fail a build on a vulnerability rather than logging one",
            "Tag images so a deployment can be traced to a commit",
        ],
        "tools": ["Docker", "Jenkins with the Docker Pipeline plugin", "A registry account"],
        "criteria": [
            "A push produces an image tagged with the short commit SHA in the registry.",
            "A HIGH or CRITICAL vulnerability fails the build — proven with a deliberately old base image.",
            "No credential appears in the build log.",
            "The `latest` tag is not what gets deployed, and you can say why.",
        ],
        "scenario": (
            "The pipeline builds an image and pushes it as `latest`. Nobody can say "
            "which commit is in production, the scan runs after the push, and the "
            "registry password is an environment variable in the job configuration."
        ),
        "body": """
## The pipeline

```groovy
pipeline {
  agent any

  environment {
    REGISTRY   = 'docker.io/waleeddarwesh'
    IMAGE      = 'egykode-demo'
    // Short SHA: traceable, immutable, and sortable by build.
    TAG        = "${env.GIT_COMMIT.take(7)}"
  }

  options {
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Unit tests') {
      steps { sh 'make test || echo "no tests yet"' }
    }

    stage('Build image') {
      steps {
        sh 'docker build -t $REGISTRY/$IMAGE:$TAG .'
      }
    }

    stage('Scan image') {
      steps {
        // --exit-code 1 is what turns a report into a gate.
        sh '''
          docker run --rm \\
            -v /var/run/docker.sock:/var/run/docker.sock \\
            aquasec/trivy:latest image \\
            --exit-code 1 --severity HIGH,CRITICAL --ignore-unfixed \\
            $REGISTRY/$IMAGE:$TAG
        '''
      }
    }

    stage('Push') {
      when { branch 'main' }
      steps {
        withCredentials([usernamePassword(
          credentialsId: 'registry',
          usernameVariable: 'REG_USER',
          passwordVariable: 'REG_PASS')]) {
          sh '''
            echo "$REG_PASS" | docker login $REGISTRY -u "$REG_USER" --password-stdin
            docker push $REGISTRY/$IMAGE:$TAG
            docker logout $REGISTRY
          '''
        }
      }
    }
  }

  post {
    always { sh 'docker image prune -f || true' }
  }
}
```

## The four decisions in that file

**1. Tag with the commit SHA, never `latest`.** `latest` is not a version — it
is whatever was pushed most recently, so the same manifest deployed twice can
produce two different containers and a rollback has nothing to roll back to.
`$TAG` ties a running container to exactly one commit.

**2. Scan before push, and exit non-zero.** A scan after the push has already
published the vulnerable image. `--exit-code 1` makes Trivy fail the stage;
`--ignore-unfixed` removes findings you cannot act on, which is what stops the
gate becoming noise people learn to ignore.

**3. `withCredentials`, and `--password-stdin`.** The block masks the values in
the log; `--password-stdin` keeps the password out of the process list, where
`ps aux` on the agent would otherwise show it.

**4. `when { branch 'main' }`.** Feature branches build and scan — the feedback
a developer needs — but only `main` publishes.

## Prove the gate works

```dockerfile
FROM debian:10        # end of life, plenty of unfixed CVEs
RUN apt-get update && apt-get install -y curl
```

Run the pipeline. The scan stage should fail and the push stage should never
execute. **A gate you have not seen fail is a gate you cannot trust** — this is
the only way to know it is wired up.

Then fix it:

```dockerfile
FROM debian:12-slim
RUN apt-get update && apt-get install -y --no-install-recommends curl \\
    && rm -rf /var/lib/apt/lists/*
```

## Order the stages by cost

Unit tests before the image build; the image build before the scan. A test suite
that fails in 40 seconds should not run after a six-minute build. Engineers learn
about a broken test in under a minute, and the expensive stages only run on code
that has earned them.
""",
        "cleanup": ["docker image prune -af", "docker logout docker.io"],
        "failures": [
            ("`docker: permission denied` in the pipeline",
             "The Jenkins user cannot reach the Docker socket. Add it to the `docker` group, or mount the socket with correct permissions."),
            ("The credential appears in the log",
             "Something echoed it outside `withCredentials`, or the shell traced it. Avoid `set -x` in stages that touch secrets."),
            ("Trivy reports nothing on a knowingly old image",
             "The database failed to download and it exited 0. Check the stage output for a DB error — a scanner that cannot update is not a gate."),
            ("`GIT_COMMIT` is null",
             "`checkout scm` has not run yet, or the job is not backed by SCM. Compute the tag after checkout."),
        ],
    },
    # ── AWS ─────────────────────────────────────────────────────────────────
    {
        "id": "lab-aws-iam-least-privilege",
        "order": 9,
        "title": "AWS IAM & Least Privilege",
        "domain": "aws",
        "level": "beginner",
        "phase": "cloud",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — IAM users, roles and policies cost nothing.",
        "description": "Write a policy that grants exactly one action, prove what it blocks, and swap a long-lived key for a role.",
        "skills": [
            "Read and write an IAM policy document",
            "Test a permission before shipping it, with the policy simulator",
            "Explain the difference between a trust policy and a permissions policy",
        ],
        "tools": ["AWS CLI v2, configured", "An AWS account"],
        "criteria": [
            "A user can read one specific S3 bucket and nothing else, proven by an allowed call and a denied one.",
            "You can explain why `s3:ListBucket` and `s3:GetObject` need different resource ARNs.",
            "A role is assumed with `sts assume-role`, returning credentials that expire.",
            "You can name what an explicit `Deny` does to an `Allow`.",
        ],
        "scenario": (
            "The application has an access key with `AdministratorAccess` because "
            "that made it work. Everybody knows it is wrong; nobody knows what it "
            "actually needs.\n\n"
            "This lab replaces it with a policy you can defend, and a role instead "
            "of a key."
        ),
        "body": """
> The Terraform labs build IAM as code. This one works in the CLI and console
> deliberately — when a permission fails at 3am you will be reading the console,
> and a resource you have only ever seen through HCL is one you cannot debug.

## 1. The anatomy of a policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadOneBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::egykode-lab-config/*"
    },
    {
      "Sid": "ListThatBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::egykode-lab-config"
    }
  ]
}
```

**Two statements, because the two actions act on different things.**
`ListBucket` operates on the *bucket*; `GetObject` operates on *objects inside
it*. Granting only one produces the most common IAM confusion in existence: a
policy that "clearly allows S3" and returns AccessDenied.

## 2. Create and attach

```bash
aws iam create-user --user-name lab-reader
aws iam create-policy --policy-name lab-read-config \\
  --policy-document file://policy.json

aws iam attach-user-policy --user-name lab-reader \\
  --policy-arn arn:aws:iam::<account>:policy/lab-read-config
```

## 3. Prove what it allows *and* what it blocks

```bash
aws iam simulate-principal-policy \\
  --policy-source-arn arn:aws:iam::<account>:user/lab-reader \\
  --action-names s3:GetObject s3:DeleteObject s3:ListAllMyBuckets \\
  --resource-arns "arn:aws:s3:::egykode-lab-config/settings.yaml" \\
  --query 'EvaluationResults[].[EvalActionName,EvalDecision]' --output table
```

`allowed` for `GetObject`, `implicitDeny` for the others. **Testing the denials
matters as much as the grants** — a policy that works is not the same as a
policy that is narrow.

## 4. Roles instead of keys

A user carries long-lived credentials. A role is assumed and issues credentials
that expire in an hour.

```bash
cat > trust.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::<account>:user/lab-reader" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role --role-name lab-reader-role \\
  --assume-role-policy-document file://trust.json

aws sts assume-role \\
  --role-arn arn:aws:iam::<account>:role/lab-reader-role \\
  --role-session-name demo \\
  --query 'Credentials.[AccessKeyId,Expiration]' --output table
```

**Two different policies, and confusing them is the classic mistake:**

| Policy | Answers | Failure looks like |
| --- | --- | --- |
| Trust policy | *Who may become this role?* | AccessDenied on `sts:AssumeRole` |
| Permissions policy | *What may the role then do?* | AccessDenied on `s3:GetObject` |

Read which action the error names, and you know which document to open.

## 5. Deny always wins

```json
{ "Effect": "Deny", "Action": "s3:DeleteObject", "Resource": "*" }
```

An explicit `Deny` overrides every `Allow`, from any policy, including an
administrator's. That is how guardrails and SCPs work — you cannot grant your
way past one.

## 6. When permissions behave strangely

```bash
aws sts get-caller-identity
```

Run this first, always. The most common cause of "the policy is not working" is
that you are not the principal you assumed you were — a profile, an assumed
role, or an instance role is in play.
""",
        "cleanup": [
            "aws iam detach-user-policy --user-name lab-reader --policy-arn <arn>",
            "aws iam delete-policy --policy-arn <arn>",
            "aws iam delete-user --user-name lab-reader",
            "aws iam delete-role --role-name lab-reader-role",
        ],
        "failures": [
            ("AccessDenied on a policy that clearly allows it",
             "Check the resource ARN. Bucket-level and object-level actions need `arn:...:bucket` and `arn:...:bucket/*` respectively."),
            ("`sts assume-role` denied",
             "That is the trust policy, not the permissions policy. The principal must be listed in the role's trust document."),
            ("The simulator says allowed but the real call fails",
             "Something else denies it — an SCP, a permission boundary, or a bucket policy. The simulator does not evaluate resource-based policies by default."),
            ("Cannot delete the user",
             "Detach all policies and delete access keys and login profile first."),
        ],
    },
    {
        "id": "lab-aws-vpc-console",
        "order": 10,
        "title": "AWS VPC Networking by Hand",
        "domain": "aws",
        "level": "beginner",
        "phase": "cloud",
        "minutes": 55,
        "cloud_cost": True,
        "cost": "Free tier — a VPC, subnets, an Internet Gateway and one `t3.micro`. **No NAT Gateway is created**, deliberately: it is the one resource here that bills hourly.",
        "description": "Build the network by hand so the Terraform version stops being magic — and find out what actually makes a subnet public.",
        "skills": [
            "Explain what makes a subnet public, in terms of the route table",
            "Distinguish a security group from a NACL by their statefulness",
            "Reach an instance in a private subnet without a public IP",
        ],
        "tools": ["AWS CLI v2, configured", "An AWS account"],
        "criteria": [
            "A VPC with one public and one private subnet exists, built by hand.",
            "An instance in the public subnet is reachable over SSH; one in the private subnet is not.",
            "You can state which single route makes the public subnet public.",
            "You reached the private instance without giving it a public IP.",
        ],
        "cleanup": [
            "aws ec2 terminate-instances --instance-ids <ids>",
            "aws ec2 delete-subnet --subnet-id <id>   # both subnets",
            "aws ec2 detach-internet-gateway --internet-gateway-id <igw> --vpc-id <vpc>",
            "aws ec2 delete-internet-gateway --internet-gateway-id <igw>",
            "aws ec2 delete-vpc --vpc-id <vpc>",
            "aws ec2 describe-vpcs --query 'Vpcs[?!IsDefault].VpcId'   # should be empty",
        ],
        "scenario": (
            "The Terraform VPC lab produces a working network in one command, which "
            "is the point of Terraform and also the problem: nothing about it "
            "explains why it works.\n\n"
            "Build the same thing by hand once, and every later `terraform apply` "
            "becomes readable."
        ),
        "body": """
## 1. The VPC and two subnets

```bash
VPC=$(aws ec2 create-vpc --cidr-block 10.50.0.0/16 \\
  --query 'Vpc.VpcId' --output text)
aws ec2 create-tags --resources $VPC --tags Key=Name,Value=lab-vpc

PUB=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.50.1.0/24 \\
  --availability-zone us-east-1a --query 'Subnet.SubnetId' --output text)
PRIV=$(aws ec2 create-subnet --vpc-id $VPC --cidr-block 10.50.2.0/24 \\
  --availability-zone us-east-1b --query 'Subnet.SubnetId' --output text)
```

At this point **both subnets are private**. Nothing distinguishes them yet — the
names are a convention, not a setting.

## 2. The one route that changes everything

```bash
IGW=$(aws ec2 create-internet-gateway --query 'InternetGateway.InternetGatewayId' --output text)
aws ec2 attach-internet-gateway --internet-gateway-id $IGW --vpc-id $VPC

RT=$(aws ec2 create-route-table --vpc-id $VPC --query 'RouteTable.RouteTableId' --output text)
aws ec2 create-route --route-table-id $RT \\
  --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW
aws ec2 associate-route-table --route-table-id $RT --subnet-id $PUB
```

**That `0.0.0.0/0 → igw` route is the entire difference.** A subnet is public
because its route table sends unmatched traffic to an Internet Gateway. Nothing
else about it changed.

```bash
aws ec2 describe-route-tables --route-table-ids $RT \\
  --query 'RouteTables[0].Routes' --output table
```

Routes match **most-specific-first**: traffic to `10.50.x.x` matches the `local`
route and stays inside; anything else falls through to `0.0.0.0/0`.

## 3. Security groups, and what stateful means

```bash
SG=$(aws ec2 create-security-group --group-name lab-ssh \\
  --description "SSH from my IP" --vpc-id $VPC --query 'GroupId' --output text)

MYIP=$(curl -s https://checkip.amazonaws.com)
aws ec2 authorize-security-group-ingress --group-id $SG \\
  --protocol tcp --port 22 --cidr ${MYIP}/32
```

There is no outbound rule here, and the SSH session still works. That is
**statefulness**: the reply to an allowed inbound connection is permitted
automatically.

A NACL is stateless — allow inbound 22 and the reply is still dropped unless you
also allow outbound on the ephemeral range. The symptom is a *hang*, not a
refusal, which is why people debug the application instead of the network.

## 4. Public and private instances

```bash
aws ec2 run-instances --image-id <al2023-ami> --instance-type t3.micro \\
  --subnet-id $PUB --security-group-ids $SG --associate-public-ip-address \\
  --key-name <your-key>

aws ec2 run-instances --image-id <al2023-ami> --instance-type t3.micro \\
  --subnet-id $PRIV --security-group-ids $SG
```

The second has no public IP and no route to the internet. It is unreachable from
outside and cannot reach out — which is correct, and inconvenient.

## 5. Reaching the private instance without a NAT Gateway

The obvious answer is a NAT Gateway, and it bills ~$32/month whether or not
traffic flows. For a lab, use **SSM Session Manager** instead:

```bash
aws ssm start-session --target <private-instance-id>
```

It needs the SSM agent (present on Amazon Linux 2023), an instance profile with
`AmazonSSMManagedInstanceCore`, and either internet egress or VPC endpoints. No
inbound rule, no public IP, no bastion — and every session is logged, which a
bastion host does not give you.

**This is worth knowing beyond the lab.** A great many "we need a bastion" and
"we need a NAT Gateway" requirements dissolve into SSM plus VPC endpoints, and
that is a real monthly saving.
""",
        "failures": [
            ("SSH times out to the public instance",
             "Three candidates: no `0.0.0.0/0` route, no public IP assigned, or the security group does not allow your current address. Check in that order."),
            ("`delete-vpc` fails as in use",
             "Dependencies must go first: instances, then subnets, then detach and delete the IGW."),
            ("The private instance cannot reach the internet",
             "That is correct behaviour — there is no NAT Gateway. Use SSM, or VPC endpoints for AWS APIs."),
            ("SSM says the target is not connected",
             "The instance needs the SSM instance profile and a path to the SSM endpoints. Check the instance profile first."),
        ],
    },
    {
        "id": "lab-aws-ec2-cloudwatch-ssm",
        "order": 11,
        "title": "EC2 Operations: SSM, CloudWatch Logs & Metrics",
        "domain": "aws",
        "level": "intermediate",
        "phase": "cloud",
        "minutes": 50,
        "cloud_cost": True,
        "cost": "Free tier — one `t3.micro`, and CloudWatch's free tier covers 5 GB of logs and 10 custom metrics. Leave the instance running and expect ~$8/month after the first year.",
        "description": "Operate an instance without SSH: run commands, ship logs, and alarm on something that matters.",
        "skills": [
            "Administer an instance with no inbound ports open",
            "Ship application logs to CloudWatch and query them",
            "Alarm on a symptom rather than on CPU",
        ],
        "tools": ["AWS CLI v2, configured", "An AWS account"],
        "criteria": [
            "You ran a command on the instance with no SSH key and no inbound rule.",
            "Application logs appear in a CloudWatch log group and you can query them.",
            "An alarm exists on a metric that reflects user impact, and you can justify the threshold.",
            "You can explain why the default EC2 metrics do not include memory or disk.",
        ],
        "cleanup": [
            "aws ec2 terminate-instances --instance-ids <id>",
            "aws logs delete-log-group --log-group-name /egykode/lab/app",
            "aws cloudwatch delete-alarms --alarm-names egykode-lab-errors",
            "aws iam remove-role-from-instance-profile --instance-profile-name <p> --role-name <r>",
            "aws iam delete-instance-profile --instance-profile-name <p>",
        ],
        "scenario": (
            "An instance has port 22 open to the world, a key everyone shares, and "
            "logs that exist only on its disk — so when it is replaced, the evidence "
            "goes with it.\n\n"
            "All three are avoidable, and the alternatives are free."
        ),
        "body": """
## 1. An instance with no inbound ports

```bash
aws iam create-role --role-name lab-ec2-ssm \\
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ec2.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy --role-name lab-ec2-ssm \\
  --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
aws iam attach-role-policy --role-name lab-ec2-ssm \\
  --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy

aws iam create-instance-profile --instance-profile-name lab-ec2-ssm
aws iam add-role-to-instance-profile --instance-profile-name lab-ec2-ssm --role-name lab-ec2-ssm
```

Launch with that profile and **no SSH ingress rule at all**, then:

```bash
aws ssm start-session --target <instance-id>

aws ssm send-command --instance-ids <instance-id> \\
  --document-name "AWS-RunShellScript" \\
  --parameters 'commands=["uptime","df -h"]' \\
  --query 'Command.CommandId' --output text
```

`send-command` runs across many instances at once and records who ran what.
That audit trail is something a shared SSH key can never provide.

## 2. Ship the logs off the instance

```bash
sudo dnf install -y amazon-cloudwatch-agent
```

```json
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/app/app.log",
            "log_group_name": "/egykode/lab/app",
            "log_stream_name": "{instance_id}",
            "retention_in_days": 7
          }
        ]
      }
    }
  },
  "metrics": {
    "metrics_collected": {
      "mem": { "measurement": ["mem_used_percent"] },
      "disk": { "measurement": ["used_percent"], "resources": ["/"] }
    }
  }
}
```

**`retention_in_days` is not optional.** A log group defaults to *never expire*,
and CloudWatch Logs charges for storage — an unbounded log group is one of the
quietest ways to accumulate a bill.

**Why memory and disk are in there:** EC2's default metrics come from the
hypervisor, which can see CPU, network and disk I/O but has no visibility inside
the guest. Memory and filesystem usage require an agent. A great deal of
"CloudWatch does not show memory" confusion is this, and only this.

## 3. Query the logs

```bash
aws logs start-query \\
  --log-group-name /egykode/lab/app \\
  --start-time $(date -d '1 hour ago' +%s) --end-time $(date +%s) \\
  --query-string 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc | limit 20'
```

## 4. Alarm on something that matters

```bash
aws logs put-metric-filter \\
  --log-group-name /egykode/lab/app \\
  --filter-name errors \\
  --filter-pattern 'ERROR' \\
  --metric-transformations metricName=AppErrors,metricNamespace=EgyKode,metricValue=1

aws cloudwatch put-metric-alarm \\
  --alarm-name egykode-lab-errors \\
  --metric-name AppErrors --namespace EgyKode \\
  --statistic Sum --period 300 --evaluation-periods 2 \\
  --threshold 10 --comparison-operator GreaterThanThreshold \\
  --treat-missing-data notBreaching
```

Two deliberate choices:

- **`evaluation-periods 2`** — the condition must hold for two consecutive
  windows. One bad minute during a deploy should not page anyone.
- **`treat-missing-data notBreaching`** — no errors produces no data points, and
  the default (`missing`) would leave the alarm in `INSUFFICIENT_DATA` forever.

**Alarm on errors, not CPU.** CPU at 90% with happy users is not an incident;
errors at 10 per five minutes is, whatever the CPU is doing.
""",
        "failures": [
            ("The instance does not appear in Session Manager",
             "Missing instance profile, or no path to the SSM endpoints. `aws ssm describe-instance-information` lists what SSM can actually see."),
            ("No logs arrive",
             "The agent is not running, the file path is wrong, or the role lacks `CloudWatchAgentServerPolicy`. Check `/opt/aws/amazon-cloudwatch-agent/logs/`."),
            ("The alarm sits in INSUFFICIENT_DATA",
             "A metric filter emits data points only when the pattern matches. Set `--treat-missing-data notBreaching`."),
            ("No memory metric",
             "Expected. The hypervisor cannot see inside the guest — the agent provides it."),
        ],
    },
    {
        "id": "lab-aws-rds-backup-restore",
        "order": 12,
        "title": "RDS PostgreSQL: Backups, Restore and Failover",
        "domain": "aws",
        "level": "intermediate",
        "phase": "cloud",
        "minutes": 55,
        "cloud_cost": True,
        "cost": "**Partly billable.** A `db.t3.micro` is free for 12 months on a new account and ~$13/month after. Snapshots are billed beyond the free allowance. Delete the instance the same day.",
        "destructive": True,
        "description": "Take a snapshot, destroy data on purpose, and restore it — then measure how long that actually took.",
        "skills": [
            "Restore a database to a point in time, not just to a snapshot",
            "Measure a real RTO instead of assuming one",
            "Explain why a restore creates a new instance",
        ],
        "tools": ["AWS CLI v2, configured", "psql"],
        "criteria": [
            "A manual snapshot exists and you can list it.",
            "Data deleted on purpose is recovered, verified by querying it.",
            "You can state the measured RTO — wall-clock minutes from decision to service restored.",
            "You can explain why the restored instance has a different endpoint.",
        ],
        "cleanup": [
            "aws rds delete-db-instance --db-instance-identifier <id> --skip-final-snapshot",
            "aws rds delete-db-instance --db-instance-identifier <restored-id> --skip-final-snapshot",
            "aws rds delete-db-snapshot --db-snapshot-identifier <snapshot-id>",
            "aws rds describe-db-instances --query 'DBInstances[].DBInstanceIdentifier'   # must be empty",
            "aws rds describe-db-snapshots --snapshot-type manual --query 'DBSnapshots[].DBSnapshotIdentifier'",
        ],
        "scenario": (
            "There is a backup. Nobody has ever restored it.\n\n"
            "A backup that has not been restored is a hope, not a backup — and the "
            "only way to know your recovery time is to measure it with a stopwatch."
        ),
        "body": """
> **This lab destroys data on purpose.** Use a database you created for it and
> nothing else.

## 1. A database with backups on

```bash
aws rds create-db-instance \\
  --db-instance-identifier egykode-lab \\
  --db-instance-class db.t3.micro \\
  --engine postgres --engine-version 16 \\
  --allocated-storage 20 \\
  --master-username labadmin --manage-master-user-password \\
  --backup-retention-period 7 \\
  --no-publicly-accessible
```

`--manage-master-user-password` puts the password in Secrets Manager rather than
in your shell history. `--backup-retention-period 7` is what enables
point-in-time recovery — with `0`, automated backups are **off** and PITR is not
available at all.

## 2. Data worth losing

```sql
CREATE TABLE orders (id serial PRIMARY KEY, customer text, total numeric);
INSERT INTO orders (customer, total)
  SELECT 'customer-' || i, i * 10 FROM generate_series(1, 1000) i;
SELECT count(*) FROM orders;   -- 1000
```

## 3. A manual snapshot

```bash
aws rds create-db-snapshot \\
  --db-instance-identifier egykode-lab \\
  --db-snapshot-identifier egykode-lab-before-incident

aws rds wait db-snapshot-completed \\
  --db-snapshot-identifier egykode-lab-before-incident
```

Automated backups follow the instance and are deleted with it. A **manual**
snapshot survives, which is what you want before anything risky.

## 4. The incident

```sql
DELETE FROM orders WHERE total > 500;
SELECT count(*) FROM orders;   -- 50
```

**Start a timer now.** RTO is wall-clock time from the decision to recover until
service is restored, and it is always longer than people guess.

## 5. Restore

```bash
aws rds restore-db-instance-from-db-snapshot \\
  --db-instance-identifier egykode-lab-restored \\
  --db-snapshot-identifier egykode-lab-before-incident \\
  --db-instance-class db.t3.micro

aws rds wait db-instance-available --db-instance-identifier egykode-lab-restored
```

Or to a point in time, which is usually what you actually want — five minutes
before the mistake, not whenever the last snapshot happened:

```bash
aws rds restore-db-instance-to-point-in-time \\
  --source-db-instance-identifier egykode-lab \\
  --target-db-instance-identifier egykode-lab-pitr \\
  --restore-time 2026-08-10T14:25:00Z
```

**A restore always creates a new instance.** It does not overwrite the original,
and the new one has a **different endpoint** — so recovery is not complete when
the data is back. The application still points at the old host, and someone has
to repoint it. That step is where most of the measured RTO actually goes, and it
is the step DR plans forget.

Stop the timer:

```sql
SELECT count(*) FROM orders;   -- 1000
```

## 6. What you just measured

| | Meaning | What you did |
| --- | --- | --- |
| **RTO** | How long recovery took | Your stopwatch |
| **RPO** | How much data was lost | Time between the snapshot and the delete |

A 7-day retention with PITR gives an RPO of roughly five minutes, because
transaction logs are shipped continuously. Snapshot-only recovery gives an RPO
of "since the last snapshot", which can be a whole day.

Write both numbers down. A DR plan with numbers nobody has measured is a
document, not a plan.
""",
        "failures": [
            ("`restore-db-instance-to-point-in-time` rejects the time",
             "It must be within the retention window and after the earliest restorable time — `describe-db-instances` reports both."),
            ("Cannot connect to the restored instance",
             "It is created with the *default* security group, not the source's. Attach the right one."),
            ("Deleting the instance leaves a final snapshot",
             "That is the default. `--skip-final-snapshot` for a lab; never in production."),
            ("`--manage-master-user-password` is unsupported",
             "An older CLI or engine version. Upgrade the CLI, or set a password and rotate it afterwards."),
        ],
    },
    # ── SRE ─────────────────────────────────────────────────────────────────
    {
        "id": "lab-sre-backup-disaster-recovery",
        "order": 35,
        "title": "Backup & Disaster Recovery Drill",
        "domain": "sre",
        "level": "advanced",
        "phase": "production",
        "minutes": 55,
        "cloud_cost": False,
        "destructive": True,
        "cost": "Free — runs locally with Docker Compose and PostgreSQL.",
        "description": "Lose the database on purpose, restore it, and write down the RTO and RPO you actually achieved.",
        "skills": [
            "Verify a backup by restoring it, not by checking it exists",
            "Measure RTO and RPO rather than asserting them",
            "Write a runbook someone else can follow",
        ],
        "tools": ["Docker", "Docker Compose", "psql"],
        "criteria": [
            "A backup is taken, verified, and restored into a clean database.",
            "You can state the RTO you measured and the RPO your schedule implies.",
            "The restore is driven by a written runbook, not by memory.",
            "A deliberately corrupted backup is detected before it is trusted.",
        ],
        "scenario": (
            "The backup job has reported success every night for eight months. "
            "Nobody has restored one.\n\n"
            "Today you find out whether it works — on a database you can afford "
            "to lose."
        ),
        "body": """
> **This lab destroys a database on purpose.** Use the Compose stack below and
> nothing that matters.

## 1. Something to lose

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: labonly
      POSTGRES_DB: shop
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
```

```sql
CREATE TABLE orders (id serial PRIMARY KEY, customer text, total numeric, created_at timestamptz DEFAULT now());
INSERT INTO orders (customer, total)
  SELECT 'customer-' || i, i * 10 FROM generate_series(1, 5000) i;
```

## 2. A backup that verifies itself

```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP=$(date +%Y-%m-%dT%H-%M-%S)
OUT="backups/shop-${STAMP}.dump"
mkdir -p backups

# Custom format: compressed, and restorable selectively with pg_restore.
docker compose exec -T db pg_dump -U postgres -Fc shop > "${OUT}.partial"

size=$(stat -c %s "${OUT}.partial")
[ "$size" -gt 4096 ] || { echo "FATAL: dump is ${size} bytes"; exit 1; }

# Verify it parses before trusting it. This is the step that was missing for
# eight months: every command exited 0 and the dump was empty.
docker compose exec -T db pg_restore --list /dev/stdin < "${OUT}.partial" > /dev/null \
  || { echo "FATAL: dump is not readable by pg_restore"; exit 1; }

mv "${OUT}.partial" "$OUT"
echo "ok: $OUT ($size bytes)"
```

Three things make this a backup rather than a file:

- **`.partial` then rename** — a rename is atomic, so an interrupted dump can
  never be mistaken for a good one.
- **A size floor** — an empty dump is a successful command and a failed backup.
- **`pg_restore --list`** — proves the archive is readable. A corrupt dump that
  nobody parses is discovered during the incident.

## 3. The disaster

```bash
docker compose down -v      # the volume, and every byte in it, is gone
docker compose up -d
```

**Start the timer.**

## 4. Restore, from the runbook

```bash
docker compose exec -T db psql -U postgres -c "CREATE DATABASE shop;"
docker compose exec -T db pg_restore -U postgres -d shop --no-owner < backups/shop-<stamp>.dump
docker compose exec -T db psql -U postgres -d shop -c "SELECT count(*) FROM orders;"
```

Stop the timer. That number is your **RTO**, and it is the honest one — including
the time you spent finding the right file and remembering the flags.

## 5. Detect a corrupt backup

```bash
cp backups/shop-<stamp>.dump /tmp/corrupt.dump
dd if=/dev/urandom of=/tmp/corrupt.dump bs=1 seek=500 count=200 conv=notrunc
docker compose exec -T db pg_restore --list /dev/stdin < /tmp/corrupt.dump
# pg_restore: error: did not find magic string in file header
```

Your backup script already runs that check. This is what it catches.

## 6. Write the numbers down

| | Definition | Yours |
| --- | --- | --- |
| **RTO** | Time from decision to service restored | measured above |
| **RPO** | Maximum data loss, in time | your backup interval |

A nightly backup means an RPO of up to 24 hours. If that is unacceptable, the
answer is continuous archiving (WAL shipping), not a more frequent `pg_dump`.

**The runbook is the deliverable**, not the script. Write the restore procedure
so that someone who has never done it can follow it at 3am — then have someone
else run it, because the only real test of a runbook is a person who did not
write it.
""",
        "cleanup": ["docker compose down -v", "rm -rf backups /tmp/corrupt.dump"],
        "failures": [
            ("`pg_restore` reports errors about ownership",
             "Use `--no-owner`. Roles from the source database do not exist in a fresh instance."),
            ("The restore succeeds but the table is empty",
             "You restored into the wrong database, or the dump was taken before the data existed. Check with `pg_restore --list`."),
            ("The backup file is a few hundred bytes",
             "`pg_dump` failed and the shell still wrote a file. This is exactly what the size check catches."),
            ("Restore takes far longer than expected",
             "That is the finding. A measured RTO that disappoints you is more useful than an assumed one that does not."),
        ],
    },
    {
        "id": "lab-sre-chaos-failure-injection",
        "order": 36,
        "title": "Chaos: Failure Injection & Recovery",
        "domain": "sre",
        "level": "advanced",
        "phase": "production",
        "minutes": 50,
        "cloud_cost": False,
        "destructive": True,
        "cost": "Free — a local Kubernetes cluster.",
        "description": "Kill things deliberately, measure how long recovery takes, and find the assumption that was wrong.",
        "skills": [
            "Form a hypothesis before injecting a failure",
            "Measure recovery rather than observing it",
            "Recognise a self-healing gap that only appears under failure",
        ],
        "tools": ["kind or minikube", "kubectl 1.28+"],
        "criteria": [
            "A killed Pod is replaced automatically, and you measured how long it took.",
            "You found at least one case where recovery did *not* happen as expected.",
            "A PodDisruptionBudget prevents an eviction that would have caused an outage.",
            "Each experiment had a written hypothesis before it was run.",
        ],
        "scenario": (
            "The architecture diagram says the system is highly available. Nobody "
            "has tested it.\n\n"
            "Chaos engineering is not breaking things at random — it is stating what "
            "you believe will happen, then checking."
        ),
        "body": """
> **This lab deletes running workloads.** Use a throwaway cluster.

## The method

Every experiment has four parts, and the first is the one people skip:

1. **Hypothesis** — "killing one of three replicas causes no failed requests."
2. **Blast radius** — one namespace, one Deployment, and a way to stop.
3. **Inject** — the smallest failure that tests the hypothesis.
4. **Measure** — was the hypothesis right? If yes, make it harsher.

An experiment without a hypothesis is just an outage you caused.

## 1. Something to break

```bash
kubectl create deployment web --image=nginx:1.27-alpine --replicas=3
kubectl expose deployment web --port=80
kubectl set resources deployment web --requests=cpu=10m,memory=16Mi
```

Generate steady traffic in a second terminal:

```bash
kubectl run load --rm -it --image=curlimages/curl --restart=Never -- \\
  sh -c 'while true; do curl -s -o /dev/null -w "%{http_code} " http://web; sleep 0.2; done'
```

## 2. Experiment one — kill a Pod

**Hypothesis:** no failed requests; a replacement is Ready within 30 seconds.

```bash
time kubectl delete pod -l app=web --field-selector=status.phase=Running --wait=false | head -1
kubectl get pods -w
```

Watch the traffic terminal. Count non-200 responses.

If you saw failures, the hypothesis was wrong, and that is the useful outcome:
the Service kept the dying Pod in its endpoints until it was fully terminated.
The fix is a `preStop` hook and a readiness probe that fails first.

## 3. Experiment two — take the whole Deployment down

**Hypothesis:** requests fail until Pods return, and recovery is automatic.

```bash
kubectl scale deployment web --replicas=0
sleep 10
kubectl scale deployment web --replicas=3
```

Measure the gap. This is a controlled version of a bad deploy, and the number
you get is your real recovery time for one.

## 4. Experiment three — drain a node

**Hypothesis:** draining a node moves the Pods without downtime.

```bash
kubectl get nodes
kubectl drain <node> --ignore-daemonsets --delete-emptydir-data
```

On a single-node cluster everything becomes `Pending` — which *is* the finding:
there is nowhere to reschedule. On multi-node, watch whether all replicas were on
the same node, which quietly defeats the point of having three.

```bash
kubectl uncordon <node>
```

## 5. Protect against the eviction

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: web
```

```bash
kubectl apply -f pdb.yaml
kubectl drain <node> --ignore-daemonsets
# evicting pod web-...
# error when evicting pod: Cannot evict pod as it would violate the disruption budget
```

**A PDB does not stop a crash.** It stops *voluntary* disruption — drains,
upgrades, autoscaler scale-downs — which is precisely the category that causes
self-inflicted outages during maintenance.

Spreading matters too:

```yaml
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: web
```

Three replicas on one node is one node failure away from zero.

## 6. Write it down

For each experiment: the hypothesis, what happened, and what you changed.

The experiments that *disprove* a hypothesis are the entire value. An experiment
that confirms what you already believed has told you nothing you did not know.
""",
        "cleanup": [
            "kubectl delete deployment web --ignore-not-found",
            "kubectl delete svc web --ignore-not-found",
            "kubectl delete pdb web --ignore-not-found",
            "kubectl uncordon --all",
        ],
        "failures": [
            ("Requests fail when a single Pod is deleted",
             "The Pod stayed in endpoints while terminating. Add a readiness probe and a `preStop` sleep so it leaves the Service before the process stops."),
            ("`drain` hangs forever",
             "Something cannot be evicted — often a bare Pod with no controller, or a PDB that cannot be satisfied. The message names it."),
            ("All replicas are on one node",
             "The scheduler had no reason to spread them. That is what `topologySpreadConstraints` is for."),
            ("The PDB blocks every drain",
             "`minAvailable` equals the replica count leaves no room for disruption. It must be lower than `replicas`."),
        ],
    },
]


def frontmatter(spec: dict, tier: str) -> str:
    lab_id = spec["id"] if tier == "guided" else f"{spec['id']}-challenge"
    title = spec["title"] if tier == "guided" else f"{spec['title']} — Challenge"
    lines = [
        "---",
        f"labId: {lab_id}",
        f'title: "{title}"',
        f'description: "{spec["description"]}"',
        f"domain: {spec['domain']}",
        f"level: {spec['level']}",
        "type: lab",
        f"phase: {spec['phase']}",
        f"order: {spec['order']}",
        f"tier: {tier}",
        f"estimatedMinutes: {spec['minutes'] if tier == 'guided' else max(20, spec['minutes'] // 2)}",
        f"cloudCost: {'true' if spec['cloud_cost'] else 'false'}",
        f'costEstimate: "{spec["cost"]}"',
    ]
    if spec.get("destructive"):
        lines.append("destructive: true")
    if spec.get("skills"):
        lines.append("skills:")
        lines += [f'  - "{s}"' for s in spec["skills"]]
    if spec.get("tools"):
        lines.append("tools:")
        lines += [f'  - "{t}"' for t in spec["tools"]]
    lines.append("successCriteria:")
    lines += [f'  - "{c}"' for c in spec["criteria"]]
    if spec.get("cleanup"):
        lines.append("cleanup:")
        lines += [f'  - "{c}"' for c in spec["cleanup"]]
    lines.append(
        f"challengeId: {spec['id']}-challenge" if tier == "guided" else f"guidedLabId: {spec['id']}"
    )
    lines += ["authors: [waleed]", "updated: 2026-08-10", "---", ""]
    return "\n".join(lines)


def guided_body(spec: dict) -> str:
    out = ["## The scenario\n", spec["scenario"] + "\n", spec["body"].strip() + "\n",
           "\n## When it goes wrong\n"]
    for symptom, cause in spec["failures"]:
        out.append(f"\n**{symptom}**\n\n{cause}\n")
    if spec.get("cleanup"):
        steps = "\n".join(spec["cleanup"])
        out.append(
            f"\n---\n\n## Clean up\n\nRun this even if you did not finish.\n\n"
            f"```bash\n{steps}\n```\n\n**Cost of this lab:** {spec['cost']}\n"
        )
    return "".join(out)


def challenge_body(spec: dict) -> str:
    criteria = "\n".join(f"- {c}" for c in spec["criteria"])
    return f"""## The goal

Achieve the same outcome as **{spec['title']}**, from an empty starting point,
without the steps.

{spec['scenario']}

## What must be true when you are done

{criteria}

## Rules

- Do not open the guided lab until you are finished, or until the same problem
  has held you up for 20 minutes.
- Documentation is allowed and encouraged.
- Verify every criterion with a command whose output you can read.

## If you get stuck

1. What did you expect, exactly?
2. What happened instead — the error text, not a paraphrase?
3. Which layer is that error from?
4. What is the smallest command that proves the layer below is fine?
"""


def main() -> None:
    written = 0
    for spec in SPECS:
        (LABS / f"{spec['id']}.en.mdx").write_text(
            frontmatter(spec, "guided") + guided_body(spec), encoding="utf-8"
        )
        (LABS / f"{spec['id']}-challenge.en.mdx").write_text(
            frontmatter(spec, "challenge") + challenge_body(spec), encoding="utf-8"
        )
        written += 2
        print(f"  {spec['domain']:<11} {spec['level']:<12} {spec['title']}")
    print(f"\nwrote {written} file(s) — {len(SPECS)} labs with challenges")


if __name__ == "__main__":
    main()
