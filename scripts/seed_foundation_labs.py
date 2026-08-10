#!/usr/bin/env python3
"""
Seed the foundational labs the catalogue was missing.

The existing 19 labs are excellent but start at intermediate Terraform: 17 of
19 are intermediate or advanced, and the first thing a beginner meets is a VPC
module. There was no on-ramp — no Linux, no Git, no Bash, and nothing that
deploys a static site, which is what this platform itself runs on.

Every lab written here follows the same contract:

  · a scenario, not an exercise — a reason the work exists
  · commands the reader runs, with the output they should see
  · success criteria they can check themselves
  · common failures, because the failure is where the learning is
  · an explicit cost line and a cleanup section for anything cloud-billable
  · a challenge variant with the steps removed

Run: python scripts/seed_foundation_labs.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

# The highest existing order is 19; these continue from 20 so the index keeps
# its reading order without renumbering work that already exists.
LABS_SPEC: list[dict] = [
    {
        "id": "lab-20-linux-server-administration",
        "order": 20,
        "title": "Linux Server Administration",
        "domain": "linux",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — runs on any Linux machine, a VM, or a container",
        "description": "Create users and groups, set permissions that actually hold, and manage services and packages on a server you did not build.",
        "skills": [
            "Create users and groups with correct ownership and permissions",
            "Read and set permissions without reaching for chmod 777",
            "Manage packages and services, and make them survive a reboot",
            "Find what is consuming disk on a server that is full",
        ],
        "tools": ["Any Linux (Ubuntu 22.04+ or RHEL 9)", "sudo access"],
        "criteria": [
            "A deploy user exists, belongs to a shared group, and can read the application directory without being root.",
            "`/opt/app` is owned by that group and group-writable, and a second user in the group can write to it.",
            "A service is installed, running, and comes back after `reboot` — proven by `systemctl is-enabled`.",
            "You can state which directory is consuming the most disk, with the command that told you.",
        ],
        "scenario": (
            "You have been handed SSH access to a server somebody else built. A "
            "colleague needs to deploy to it, the application directory is owned "
            "by root, and the disk is at 91%. Nobody documented any of it.\n\n"
            "This is the most common first task in the job, and none of it is "
            "exotic — it is users, permissions, services and disk."
        ),
        "body": """
## The work

### 1. A user for the job, not for the person

Create a group first, then a user in it. The group is what makes access
survivable when a second person needs it.

```bash
sudo groupadd --system deployers
sudo useradd --create-home --gid deployers --shell /bin/bash deploy
sudo passwd -l deploy          # no password login; SSH keys only
id deploy
```

`--gid deployers` puts the user in the group at creation. `passwd -l` locks the
password so the account cannot be used for interactive password login — an SSH
key is the only way in.

### 2. Permissions that hold when a second person arrives

```bash
sudo mkdir -p /opt/app
sudo chown -R root:deployers /opt/app
sudo chmod -R 2775 /opt/app
```

The leading `2` is the setgid bit, and it is the part most guides omit. Without
it, a file created in `/opt/app` belongs to whichever user made it, and the
next deployer cannot overwrite it. With it, everything created inside inherits
the `deployers` group.

Prove it rather than assume it:

```bash
sudo -u deploy touch /opt/app/test.txt
ls -l /opt/app/test.txt        # group must be "deployers"
```

### 3. A service that survives a reboot

```bash
sudo apt-get update && sudo apt-get install -y nginx   # or dnf on RHEL
systemctl status nginx
sudo systemctl enable --now nginx
systemctl is-enabled nginx     # must print "enabled"
```

`enable` and `start` are different things. `--now` does both. A service that is
started but not enabled works perfectly until the machine reboots at 3am and
never comes back — and that failure looks like a mystery unless you know to
check this.

### 4. Find the disk

```bash
df -h                          # which filesystem is full?
sudo du -sh /var/* 2>/dev/null | sort -h | tail -5
sudo journalctl --disk-usage
```

Work top-down: `df` names the filesystem, `du` narrows it to a directory. The
usual culprits are `/var/log` and unpruned container images. If the journal is
the problem:

```bash
sudo journalctl --vacuum-time=7d
```

A full disk is worth recognising because it breaks things that look unrelated —
Docker cannot pull, Kubernetes evicts Pods, the database refuses writes, and
every error message points somewhere else.
""",
        "failures": [
            ("`sudo -u deploy touch` gives Permission denied",
             "`/opt/app` is not group-writable. Check `ls -ld /opt/app` — you want `drwxrwsr-x` with the `s`, not `drwxr-xr-x`."),
            ("A new file has the wrong group",
             "The setgid bit is missing. `chmod g+s /opt/app` and create the file again; existing files keep their old group."),
            ("The service is running but gone after reboot",
             "It was started, never enabled. `systemctl is-enabled <service>` tells you which."),
            ("`df` says the disk is full but `du` finds nothing",
             "A deleted file is still held open by a process. `sudo lsof +L1` lists them; restarting the holder releases the space."),
        ],
    },
    {
        "id": "lab-21-linux-networking-troubleshooting",
        "order": 21,
        "title": "Linux Networking & Troubleshooting",
        "domain": "networking",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 50,
        "cloud_cost": False,
        "cost": "Free — no cloud resources",
        "description": "Work a connection failure from the outside in: DNS, route, port, firewall, application — and know which layer you are on.",
        "skills": [
            "Resolve a name and read the TTL that explains a stale answer",
            "Read a routing table and say where a packet would go",
            "Prove whether a port is open, listening, or filtered",
            "Work a failure in layers instead of guessing",
        ],
        "tools": ["Linux with `dig`, `ss`, `curl`, `ip`", "sudo access"],
        "criteria": [
            "You can state the IP a hostname resolves to and the remaining TTL on that answer.",
            "You can name the interface and gateway a packet to 1.1.1.1 would leave by.",
            "You can distinguish 'connection refused' from 'timed out' and say what each implies.",
            "Given a failing connection, you can name which layer is at fault before changing anything.",
        ],
        "scenario": (
            "An application cannot reach its database. The developer says \"the "
            "network is down\". It almost never is.\n\n"
            "This lab builds the sequence that finds the real cause in under two "
            "minutes, instead of restarting things until something changes."
        ),
        "body": """
## The order matters

Work outside-in. Each step rules out a layer, so you never guess:

```text
name resolves?  ->  route exists?  ->  port open?  ->  app answers?
   dig               ip route           ss / curl       logs
```

### 1. Does the name resolve?

```bash
dig +short db.internal.example.com
dig db.internal.example.com | grep -A2 "ANSWER SECTION"
```

The number before the record type is the remaining **TTL**. If the value is
wrong and the TTL is large, you are looking at a cached answer, not at your
configuration — and no amount of restarting will fix it. `dig @8.8.8.8 <name>`
asks a resolver that has no local cache, which tells you whether the problem is
yours or upstream.

### 2. Where would the packet go?

```bash
ip route
ip route get 10.20.5.10
```

`ip route get` is the direct answer: it names the interface and gateway the
kernel would use for that exact destination. If it says the wrong interface, the
problem is routing, and nothing downstream is worth checking yet.

### 3. Is anything listening, and is the port reachable?

Locally:

```bash
ss -ltnp | grep 5432
```

`ss -ltnp` — listening, TCP, numeric, with the process. If nothing is listening,
the application is not running, and the network was never involved.

Remotely:

```bash
curl -v --max-time 5 telnet://db.internal.example.com:5432
```

The two failures mean different things, and the distinction is the whole point:

| Result | Meaning | Look at |
| --- | --- | --- |
| `Connection refused` | Something answered and said no | The service — it is down or bound to 127.0.0.1 |
| `Connection timed out` | Nothing answered at all | A firewall or security group silently dropping it |
| Connects, then hangs | Reached it; the app is not replying | Application logs, slow queries |

A refused connection is *good news*: routing and firewalls are fine, and the
problem is a process you control.

### 4. Bound to the wrong address

The most common false alarm:

```bash
ss -ltnp | grep 5432
# LISTEN 0 244 127.0.0.1:5432   <- only localhost
# LISTEN 0 244 0.0.0.0:5432     <- every interface
```

A service bound to `127.0.0.1` works perfectly from the machine itself and is
unreachable from anywhere else. `curl` from the server succeeds, the developer
says "it works here", and the connection still fails from the app.
""",
        "failures": [
            ("`dig` returns the old IP after a DNS change",
             "The record is cached for its TTL. Check the TTL in the answer, and query `@8.8.8.8` to compare with an uncached resolver."),
            ("`curl` times out but the security group looks correct",
             "Check the *outbound* rules on the source and the NACL on the subnet — a NACL is stateless and needs the return path allowed explicitly."),
            ("Works from the server, fails from anywhere else",
             "The service is bound to 127.0.0.1. Look at the `ss -ltnp` output, not at the firewall."),
            ("`ss` shows nothing on the port",
             "The process is not running. This is not a network problem — check the service and its logs."),
        ],
    },
    {
        "id": "lab-22-bash-automation-backup-healthcheck",
        "order": 22,
        "title": "Bash Automation: A Script You Can Trust",
        "domain": "linux",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 40,
        "cloud_cost": False,
        "cost": "Free — no cloud resources",
        "description": "Write a backup script that fails loudly instead of silently, and schedule it so a missed run does not go unnoticed.",
        "skills": [
            "Write a script that stops at the first real error",
            "Quote variables so a space cannot become a second argument",
            "Exit with codes that CI and systemd can act on",
            "Schedule work and detect a run that never happened",
        ],
        "tools": ["bash 4+", "systemd or cron"],
        "criteria": [
            "The script exits non-zero when any step fails, proven by deliberately breaking one.",
            "Running it twice does not corrupt or duplicate the previous backup.",
            "A backup older than the retention window is removed automatically.",
            "A failed run is visible without anyone reading the logs.",
        ],
        "scenario": (
            "There is a backup script on the server. It has 'run successfully' "
            "every night for eight months. The backup directory is empty.\n\n"
            "It has been exiting 0 the whole time, because nothing in it ever "
            "checked whether anything worked."
        ),
        "body": """
## The four lines that make a script trustworthy

```bash
#!/usr/bin/env bash
set -euo pipefail
IFS=$'\\n\\t'
```

- **`-e`** — exit on the first failing command. Without it, a script whose
  `pg_dump` failed carries on to upload an empty file and reports success.
- **`-u`** — an unset variable is an error. This is what stops
  `rm -rf "$BACKUP_DIR"/*` becoming `rm -rf /*` when the variable was never set.
- **`-o pipefail`** — in `a | b`, fail if *any* stage failed. Without it,
  `pg_dump | gzip > out.gz` reports success whenever `gzip` succeeds, which it
  does even when it compresses nothing.
- **`IFS`** — split on newlines and tabs, not spaces, so a filename with a
  space stays one filename.

## The script

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/app}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
STAMP="$(date +%Y-%m-%dT%H-%M-%S)"
TARGET="${BACKUP_DIR}/db-${STAMP}.sql.gz"

log() { printf '%s %s\\n' "$(date -Is)" "$*" >&2; }

die() { log "FAILED: $*"; exit 1; }

mkdir -p "$BACKUP_DIR"

log "starting backup -> ${TARGET}"

# Write to a temporary name first. A partial file that is never renamed can
# never be mistaken for a good backup.
tmp="${TARGET}.partial"
pg_dump --no-owner "$DATABASE_URL" | gzip -9 > "$tmp" || die "pg_dump failed"

# A dump that produced nothing is a failure, even though every command exited 0.
size=$(stat -c %s "$tmp")
[ "$size" -gt 1024 ] || die "backup is only ${size} bytes — refusing to keep it"

mv "$tmp" "$TARGET"
log "wrote ${TARGET} (${size} bytes)"

# Retention. -mtime is whole days; this deletes nothing on the first week.
deleted=$(find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
log "removed ${deleted} backup(s) older than ${RETENTION_DAYS} days"
```

Two details carry most of the value.

**Write to `.partial`, then rename.** A rename is atomic. If the machine dies
mid-dump, you are left with a `.partial` file that no restore will ever pick up
— rather than a truncated file that looks like a backup.

**Check the size.** This is what the eight-months-of-nothing script was missing.
Every command exited 0; the dump was simply empty. A backup that is not checked
is a hope, not a backup.

## Schedule it, and notice when it does not run

A systemd timer over cron, for one reason — `Persistent=true`:

```ini
# /etc/systemd/system/db-backup.timer
[Unit]
Description=Nightly database backup

[Timer]
OnCalendar=*-*-* 02:30:00
Persistent=true

[Install]
WantedBy=timers.target
```

`Persistent=true` runs a missed job when the machine comes back. A cron job on a
machine that was asleep at 02:30 simply never runs, and nothing says so.

```bash
sudo systemctl enable --now db-backup.timer
systemctl list-timers db-backup.timer
journalctl -u db-backup.service -n 20
```

`OnFailure=` on the service unit turns a failure into an alert rather than a
log line nobody reads.
""",
        "failures": [
            ("The script exits 0 but the backup is empty",
             "`pipefail` is not set, so only `gzip`'s exit code was checked. Add `set -o pipefail`, and check the file size explicitly."),
            ("`rm` deleted more than expected",
             "An unquoted or unset variable. `set -u` catches the unset case; quoting `\"$VAR\"` catches the space case."),
            ("The timer never fired",
             "`systemctl list-timers` shows the next run. If the unit is not listed, it was created but not enabled."),
            ("Retention deletes nothing",
             "`find -mtime +7` means strictly more than 7×24 hours. On day 7 there is nothing to delete yet — that is correct, not broken."),
        ],
    },
    {
        "id": "lab-23-git-branching-collaboration",
        "order": 23,
        "title": "Git Branching & Collaboration",
        "domain": "git",
        "level": "beginner",
        "phase": "foundations",
        "minutes": 45,
        "cloud_cost": False,
        "cost": "Free — a GitHub account is enough",
        "description": "Work a change through a branch, a rebase and a conflict, and recover from the three mistakes everyone makes.",
        "skills": [
            "Take a change from branch to merged pull request",
            "Rebase onto a moved main and resolve a conflict deliberately",
            "Recover a commit you thought you destroyed",
            "Remove a secret from history, and know why that is not enough",
        ],
        "tools": ["git 2.30+", "a GitHub account"],
        "criteria": [
            "A feature branch is merged into main through a pull request, with a linear history.",
            "You resolved a real conflict — not by taking one side wholesale, but by reading both.",
            "You recovered a commit after a hard reset, using the reflog.",
            "You can explain why removing a committed secret from history does not make it safe.",
        ],
        "scenario": (
            "You are contributing to a repository other people are also changing. "
            "Main has moved since you branched, your history has a conflict in it, "
            "and at some point you will reset something you did not mean to.\n\n"
            "All three are normal. None of them should cost you work."
        ),
        "body": """
## The daily loop

```bash
git switch -c feat/add-healthcheck      # branch from main
# ... edit, then ...
git add -p                              # stage hunks, not whole files
git commit -m "Add /healthz endpoint"
git fetch origin
git rebase origin/main                  # replay your work on current main
git push -u origin feat/add-healthcheck
```

`git add -p` walks you through each hunk. It is slower than `git add .` and it
is the reason your commits end up saying one thing each — which is what makes
them reviewable and revertible.

**Rebase daily, not at the end.** Replaying two commits onto a main that moved
this morning is a small conflict you still remember the context for. Replaying
three weeks of work is every conflict at once, in a hurry.

## Resolving a conflict properly

```bash
git rebase origin/main
# CONFLICT (content): Merge conflict in src/app.py
```

Open the file. You will see both sides:

```text
<<<<<<< HEAD              (what is on main)
timeout = 30
=======                   (what you wrote)
timeout = 60
>>>>>>> feat/add-healthcheck
```

The mistake is picking a side because it is quicker. Read both — someone raised
that timeout on main for a reason, and your change may need to accommodate it
rather than replace it.

```bash
# after editing to the correct combined result
git add src/app.py
git rebase --continue
```

`git rebase --abort` puts everything back exactly as it was. Nothing is lost by
trying.

## The recovery everybody needs eventually

```bash
git reset --hard HEAD~3      # three commits, apparently gone
git reflog                   # every position HEAD has held
# a1b2c3d HEAD@{1}: commit: Add /healthz endpoint
git reset --hard HEAD@{1}    # back, intact
```

**`git reflog` is the undo history for the repository itself.** A commit is
reachable for ~90 days even after every branch pointing at it is gone. Almost
nothing done locally in git is actually destructive, and knowing that changes
how confidently you work.

## A secret in history

```bash
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "Remove .env from tracking"
```

That stops tracking it going forward, and **the value is still in history and in
every clone**. The order that matters:

1. **Rotate the credential.** Assume it is compromised — this is the only step
   that actually protects anything.
2. Then rewrite history (`git filter-repo`, or the GitHub secret-scanning flow).
3. Then force-push, and tell anyone with a clone.

Doing step 2 without step 1 is theatre.
""",
        "failures": [
            ("`git push` is rejected as non-fast-forward",
             "Main moved. `git fetch origin && git rebase origin/main`, then push. Do not `--force` onto a shared branch."),
            ("The rebase conflicts in files you never touched",
             "You branched from an old main. Abort, fetch, and rebase onto the current one."),
            ("You reset and lost commits",
             "`git reflog`, find the hash, `git reset --hard <hash>`. It is almost certainly still there."),
            ("A force-push erased a colleague's commits",
             "Use `--force-with-lease` instead — it refuses when the remote has moved since you last fetched."),
        ],
    },
    {
        "id": "lab-24-s3-cloudfront-static-site",
        "order": 24,
        "title": "Static Site on S3 + CloudFront",
        "domain": "aws",
        "level": "beginner",
        "phase": "cloud",
        "minutes": 55,
        "cloud_cost": True,
        "cost": (
            "Free tier — CloudFront's always-free tier covers 1 TB egress and 10M "
            "requests per month, and a few MB in S3 costs well under $0.01. Nothing "
            "here provisions an hourly resource: no NAT Gateway, no load balancer."
        ),
        "description": "Serve a site from a private bucket through a CDN with HTTPS, correct cache headers, and a cleanup you actually run.",
        "skills": [
            "Serve a private S3 bucket through CloudFront with Origin Access Control",
            "Set cache headers that differ for immutable assets and HTML",
            "Confirm compression and caching from response headers, not assumptions",
            "Destroy everything you created",
        ],
        "tools": ["AWS CLI v2, configured", "An AWS account"],
        "criteria": [
            "The site loads over HTTPS on the CloudFront domain.",
            "The bucket is private — a direct S3 URL returns AccessDenied, and only CloudFront can read it.",
            "Fingerprinted assets return `max-age=31536000, immutable`; HTML revalidates.",
            "`Content-Encoding: br` is present on an HTML response.",
            "Everything created is deleted at the end, verified by listing.",
        ],
        "scenario": (
            "You need to put a static site on the internet, on HTTPS, cheaply, and "
            "without leaving a bucket open to the world.\n\n"
            "This is the architecture EgyKode itself runs on — the page you are "
            "reading is served exactly this way, so the Terraform in "
            "`infrastructure/terraform/production/` is the finished version of "
            "what you are about to build by hand."
        ),
        "body": """
## Why not just make the bucket public?

S3 can serve a website directly. It is also the single most common cause of
real-world data exposure, it cannot do HTTPS on your own domain, and it has no
edge cache. The pattern below keeps the bucket **private** and lets exactly one
CloudFront distribution read it.

## 1. A private bucket

```bash
BUCKET="egykode-lab-$(date +%s)"
aws s3api create-bucket --bucket "$BUCKET" --region us-east-1

aws s3api put-public-access-block --bucket "$BUCKET" \\
  --public-access-block-configuration \\
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

printf '<!doctype html><h1>It works</h1>' > index.html
printf '<!doctype html><h1>Not found</h1>' > 404.html
aws s3 cp index.html "s3://$BUCKET/" --cache-control "public,max-age=0,must-revalidate"
aws s3 cp 404.html   "s3://$BUCKET/" --cache-control "public,max-age=0,must-revalidate"
```

Note the `--cache-control` at upload time. S3 stores it as object metadata and
CloudFront honours it, so the header is set once at the source rather than
patched at the edge.

## 2. Origin Access Control

OAC is how CloudFront proves it is allowed to read a private bucket. It replaces
the older Origin Access Identity.

```bash
OAC_ID=$(aws cloudfront create-origin-access-control \\
  --origin-access-control-config \\
  "Name=${BUCKET}-oac,OriginAccessControlOriginType=s3,SigningBehavior=always,SigningProtocol=sigv4" \\
  --query 'OriginAccessControl.Id' --output text)
echo "$OAC_ID"
```

## 3. The distribution

Create it in the console or with `aws cloudfront create-distribution`, with:

- **Origin**: the bucket's *REST* endpoint (`$BUCKET.s3.us-east-1.amazonaws.com`),
  **not** the website endpoint — the website endpoint is public and defeats the
  whole design.
- **Origin access**: the OAC created above.
- **Viewer protocol policy**: Redirect HTTP to HTTPS.
- **Compress objects automatically**: on.
- **Default root object**: `index.html`.

Then attach the bucket policy CloudFront prints for you, which allows
`s3:GetObject` only for that distribution's ARN.

## 4. Verify, rather than assume

```bash
DOMAIN=$(aws cloudfront get-distribution --id "$DIST_ID" \\
  --query 'Distribution.DomainName' --output text)

curl -sI "https://$DOMAIN/" | grep -iE 'HTTP/|content-encoding|cache-control|x-cache'
```

You are looking for four things:

| Header | Expected | If it is missing |
| --- | --- | --- |
| `HTTP/2 200` | The site is served | Check the default root object |
| `Content-Encoding: br` | Compression is on | Enable "compress objects automatically" |
| `Cache-Control` | What you set at upload | You forgot `--cache-control` on `s3 cp` |
| `X-Cache: Hit from cloudfront` | The edge is caching | First request is always a Miss; ask twice |

And confirm the bucket really is private:

```bash
curl -s -o /dev/null -w '%{http_code}\\n' "https://$BUCKET.s3.amazonaws.com/index.html"
# 403 — correct. A 200 here means the bucket is public.
```

That 403 is the lab's most important result.

## 5. Cache headers that make sense

Two kinds of file, two opposite requirements:

```bash
# Fingerprinted assets — the name changes when the content does
aws s3 cp ./assets "s3://$BUCKET/assets" --recursive \\
  --cache-control "public,max-age=31536000,immutable"

# HTML — the name never changes, so it must revalidate
aws s3 cp index.html "s3://$BUCKET/" \\
  --cache-control "public,max-age=0,must-revalidate"
```

Getting this backwards is the classic mistake: cache HTML for a year and your
next deploy is invisible for a year; revalidate assets on every request and you
have paid for a CDN that does nothing.
""",
        "cleanup": [
            "aws cloudfront get-distribution-config --id $DIST_ID > dist.json  # note the ETag",
            "Disable the distribution (set Enabled=false) and wait for Deployed",
            "aws cloudfront delete-distribution --id $DIST_ID --if-match $ETAG",
            "aws s3 rm s3://$BUCKET --recursive",
            "aws s3api delete-bucket --bucket $BUCKET",
            "aws cloudfront delete-origin-access-control --id $OAC_ID --if-match $OAC_ETAG",
            "Verify: aws s3 ls | grep $BUCKET  # should print nothing",
        ],
        "failures": [
            ("AccessDenied through CloudFront, not just S3",
             "The bucket policy is missing or its `AWS:SourceArn` does not match this distribution. Re-copy the policy CloudFront generated."),
            ("The site loads but every path except / returns 403",
             "S3 resolves no directory index through OAC. Either upload explicit `index.html` files per path, or add a CloudFront Function that rewrites `/dir/` to `/dir/index.html`."),
            ("Changes do not appear after re-uploading",
             "The edge is still serving a cached copy. `aws cloudfront create-invalidation --paths '/*'` — and check that HTML was uploaded with a revalidating `Cache-Control`."),
            ("`Content-Encoding` is absent",
             "Compression is off on the behaviour, or the object's content type is not in CloudFront's compressible list."),
        ],
    },
]


def frontmatter(spec: dict, tier: str) -> str:
    """Frontmatter for one tier of a lab."""
    lab_id = spec["id"] if tier == "guided" else f"{spec['id']}-{tier}"
    title = spec["title"] if tier == "guided" else f"{spec['title']} — {tier.capitalize()}"

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

    if tier == "guided":
        lines.append(f"challengeId: {spec['id']}-challenge")
    else:
        lines.append(f"guidedLabId: {spec['id']}")

    lines += ["authors: [waleed]", "updated: 2026-08-10", "---", ""]
    return "\n".join(lines)


def guided_body(spec: dict) -> str:
    parts = [
        "## The scenario\n",
        spec["scenario"] + "\n",
        spec["body"].strip() + "\n",
        "\n## When it goes wrong\n",
        "The failure is where the learning is. These are the ones that actually happen:\n",
    ]
    for symptom, cause in spec["failures"]:
        parts.append(f"\n**{symptom}**\n\n{cause}\n")

    if spec.get("cleanup"):
        parts.append("\n## Clean up\n")
        parts.append(
            "Run this even if the lab is unfinished. Everything above is inside "
            "the free tier, but an account full of half-built experiments is how "
            "a surprise bill starts.\n\n```bash\n"
        )
        parts.append("\n".join(spec["cleanup"]))
        parts.append("\n```\n")

    return "".join(parts)


def challenge_body(spec: dict) -> str:
    criteria = "\n".join(f"- {c}" for c in spec["criteria"])
    return f"""## The goal

Achieve the same outcome as **{spec['title']}**, from an empty starting point,
without the steps.

{spec['scenario']}

## What must be true when you are done

{criteria}

## Rules

- Do not open the guided lab until you are finished, or until you have been
  stuck on the same thing for 20 minutes. Being stuck is the exercise; staying
  stuck is not.
- Official documentation is allowed and encouraged. In the job it is the first
  thing you open.
- Verify every criterion yourself with a command whose output you can read. "It
  looks right" is not a check.

## If you get stuck

Work in layers rather than restarting things:

1. What did you expect to happen, exactly?
2. What happened instead — the error text, not a paraphrase?
3. Which layer is that error from?
4. What is the smallest command that proves the layer below is fine?

That sequence is the skill this tier exists to build. The commands are
lookup-able; the sequence is not.
"""


def main() -> None:
    written = 0
    for spec in LABS_SPEC:
        guided = LABS / f"{spec['id']}.en.mdx"
        guided.write_text(frontmatter(spec, "guided") + guided_body(spec), encoding="utf-8")

        challenge = LABS / f"{spec['id']}-challenge.en.mdx"
        challenge.write_text(
            frontmatter(spec, "challenge") + challenge_body(spec), encoding="utf-8"
        )
        written += 2
        print(f"  {spec['level']:<12} {spec['domain']:<11} {spec['title']}")

    print(f"\nwrote {written} file(s) — {len(LABS_SPEC)} labs with their challenges")


if __name__ == "__main__":
    main()
