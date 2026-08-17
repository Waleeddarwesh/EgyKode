# Zero-to-capstone dry run

Run against the production export (`apps/web/.next-export`) served through the
CloudFront edge-function logic, because the pending commit is not yet live and
the question asked was whether the platform is ready to ship.

## Executive result

**PASS WITH ISSUES — no blockers.** One P1 found and fixed within this run;
one P1 and one P2 accepted as the next iteration.

A beginner can find the start, walk the path without guessing where to go, and
reach the capstone. The first run found ten of fourteen phase transitions
explaining why the next topic is needed in terms of what the learner just
built. The four that did not were a single editorial inconsistency rather than
four separate gaps; they were rewritten and re-read, and **all fourteen now
bridge**.

The weakest part of the platform is not the teaching. It is the *proof*: most
success criteria cannot be objectively demonstrated, so a learner who believes
they have finished has, in the majority of cases, only asserted it.

## A limitation of this run, stated plainly

The instruction was to test as someone who has never seen the source. I cannot
fully honour that — I wrote a substantial part of this curriculum earlier in
the same session, and I cannot unsee it.

What I did instead: every finding below comes from a rendered page, read
through the browser, using only what a learner can see. Where I knew an answer
from having written it and the page did not say it, I recorded it as a finding.
That is the closest available approximation, and its weakness should be assumed
when reading the PASS verdicts — a genuinely cold reader would likely find more
friction than this run did, not less.

## Learner assumptions

Can use a browser, copy a command into a terminal, and understands files and
folders. Does not know what Linux, Docker, AWS or Kubernetes are, does not know
DevOps vocabulary, and has never seen the capstone architecture.

## Journey

The site does not require the learner to choose. The homepage states the
promise and offers two buttons; the first is `Start learning`.

```
/en/                     "Learn Cloud & DevOps by building one real production platform."
  → Start learning
/en/learn/               "The curriculum, ordered. Start at Phase 01 or jump to what you need."
  → Phase 00 Orientation → start-here, project-overview, system-architecture,
                           requirements, repository-structure
  → Phase 01 Foundations → Linux → Networking → Git
  → … eleven phases …
  → capstone
```

**Entry point: PASS.** There is no moment where the learner has to guess what
to open first. The homepage names one next action, and the page it leads to
names the first phase.

## Transition audit

Judged on one question: does the destination chapter explain why it comes
*now*, in terms of what the learner already built?

| transition | opens with | verdict |
| --- | --- | --- |
| Linux → Networking | "Why this chapter exists" | **PASS** |
| Networking → Git | "Why this chapter exists" | **PASS** |
| Foundations → Build Tools | "Why a DevOps engineer needs this" | **PARTIAL** |
| Build → Docker | "Why Docker sits exactly here" | **PASS** |
| Docker → AWS | "Introduction to AWS" | **PARTIAL** |
| AWS → Terraform | "Introduction to Terraform" | **PASS** |
| Terraform → Ansible | "Introduction to Ansible" | **PASS** |
| Infrastructure → Kubernetes | "Introduction to Kubernetes" | **PASS** |
| Kubernetes → Helm | "Introduction to Helm" | **PASS** |
| Kubernetes → CI/CD | "Introduction to Jenkins" | **PARTIAL** |
| CI/CD → GitOps | "Introduction to GitOps" | **PARTIAL** |
| GitOps → Observability | "Introduction to Observability" | **PASS** |
| Observability → SRE | "Why this comes before breaking things" | **PASS** |
| SRE → Security | "Introduction to Container Security" | **PASS** |

**First run: 10 PASS · 4 PARTIAL · 0 FAIL.**
**After the fix below: 14 PASS · 0 PARTIAL · 0 FAIL.**

### A note on method, because two attempts to automate this failed

Re-running the audit, I tried to score bridges mechanically. Both attempts
were wrong, in opposite directions:

- Scoring by heading text (`/^Why/`) marked six chapters PARTIAL that bridge
  perfectly well in their first paragraph — *"In Infrastructure as Code,
  Terraform built the hardware for us… but a blank server is useless."*
- Scoring by keyword (a back-reference plus a contrast word) marked
  Docker → AWS PARTIAL, even though its text reads *"That laptop sleeps when
  you close it, has an address nobody outside your network can reach"* — a gap
  statement that never uses the word "but".

Whether a transition explains itself is a judgement about meaning, and it was
made by reading the rendered pages. That is worth stating because it is the
one part of this report a future run cannot regression-test cheaply.

The strongest bridges do the same thing — they name the thing the learner is
now holding, and the problem it does not solve:

> *Docker:* "Linux gave you processes, permissions, signals and filesystems.
> Kubernetes will ask you to run those things across a fleet of machines.
> Docker is the layer in between."

> *SRE:* "You have Prometheus scraping the platform, Grafana showing it, and
> twelve alert rules that fire. What you do not yet have is a way of deciding
> which failures matter."

### The four PARTIALs — one defect, not four

**Docker → AWS** opens *"If you want to build a website, you need a computer to
host it."* The learner has just containerised an application. Nothing says the
container now needs somewhere to run that is not their laptop. The bridge is
absent, not weak.

**Kubernetes → CI/CD** opens *"When a developer finishes writing code, how do
we know if it actually works?"* True, but disconnected: the learner can already
run containers on a cluster and is still building and pushing images by hand.
That is the actual reason Jenkins comes here, and it is not stated.

**CI/CD → GitOps** says *"The next chapter covers Argo CD, the tool. This one
is about GitOps, the philosophy it implements."* That fixes an ordering error
but explains the relationship between two chapters, not why the phase follows
CI/CD at all.

**Foundations → Build Tools** opens mid-argument — *"All of that requires
knowing what the build tool is actually doing"* — with no antecedent for "all
of that" for a reader arriving from Git.

It is one editorial rule applied to some chapters and not others — the
curriculum already knew how to do this everywhere else.

*Severity: **P1**. The learner can continue — the ordering is still correct —
but at four points they are following a syllabus rather than solving a problem,
which is precisely the thing the homepage promises they will not do.*

### Fixed, and re-read

Each of the four now opens by naming what the learner is holding, the problem
it does not solve, and what the phase does about it. No new theory was added.

| chapter | now opens |
| --- | --- |
| AWS | "Why this comes after Docker" — *"It is running on exactly one machine: yours. That laptop sleeps when you close it…"* |
| Jenkins | "Why this comes after Kubernetes" — *"The cluster is automated. The path to the cluster is still a person remembering the right commands in the right order."* |
| GitOps | "Why this comes after the pipeline" — *"So far that something has been you, running `kubectl` with credentials that can change anything in the cluster."* |
| Build Tools | "Why this comes after Git" — *"The next thing that happens to source code is that it stops being source code."* |

The Build Tools edit also fixes the dangling *"All of that requires…"*, which
previously had no antecedent for a reader arriving from Git.

## Evidence gaps — the most serious finding

Across three sampled labs, the success criteria break down as:

| evidence type | count |
| --- | --- |
| Verify with a command | 4 |
| Check the running system | 5 |
| Explain it | 1 |
| **Self-assessed** | **20** |

**Two thirds of what a learner ticks is their own assertion.**

The labelling itself is honest — the interface says `SELF-ASSESSED` in plain
words and does not dress a claim up as a check, and criteria are now visually
weighted by evidence strength. That part passes.

But the acceptance question is not "are the labels honest", it is "can the
learner demonstrate the capability". For the majority of criteria the answer is
no: nothing distinguishes a learner who did the work from one who read it and
ticked the box. The completion card reports evidence counts, which makes the
weakness visible — it does not remove it.

*Severity: **P1**. Not a blocker: the learner can still build the platform. But
"how do I know I succeeded" — question six of the six — is answered weakly for
most of the curriculum.*

## Architecture and reasoning

The capstone page carries three sections: **Why it exists**, **What's inside**,
and **Decisions worth explaining**. The third is the one that matters for
production readiness, and its presence is the difference between a learner who
can run the commands and one who can defend the design.

At **787 words**, it is thin for a document meant to function as an independent
exam. It links the repository, so the learner is not stranded — but a reader
who wants to answer "why private subnets, why IRSA over static keys, why
StatefulSet rather than RDS here" is relying on the linked repo more than on
the page.

*Severity: **P2**. The reasoning exists and is reachable; the capstone page
under-carries it.*

## Navigation

No navigation gaps found. This was the area I expected to fail and did not:

- The labs index opens on the phase you are in, badged `CURRENT`.
- `Continue the project` always resolves to the next unfinished lab.
- Each lab header states `01 · FOUNDATIONS` and `LAB 1 / 59`, so position is
  never in doubt.
- Each lab ends with the next lab and, where the graph records the dependency,
  what this lab produced that the next one consumes.
- Breadcrumbs run `Labs / Foundations / <lab>`, and the phase link opens that
  phase rather than dropping the reader at a collapsed accordion.

**PASS.** A learner never has to search for what to do next.

## What I could not test in this run

Stated rather than glossed:

- **Whether a beginner can actually perform the labs.** That needs a real AWS
  account, a real terminal and hours per lab. Everything here is a reading of
  the instructions, not an execution of them.
- **Cost safety in practice.** Labs are marked `Free` / `Low` / `Billable` and
  carry cleanup blocks, but whether a distracted beginner leaves a NAT Gateway
  running overnight is not answerable from the markup.
- **Troubleshooting under real failure.** Three incident labs exist and the
  troubleshooting chapter is reachable; whether they build genuine diagnostic
  reasoning can only be judged by someone debugging a broken cluster.

## Findings

| id | severity | finding |
| --- | --- | --- |
| 1 | ~~P1~~ **FIXED** | Four transitions (AWS, Jenkins, GitOps, Build Tools) did not bridge from what the learner just built. Rewritten and re-read: 14/14 now bridge. |
| 2 | **P1** | Two thirds of success criteria are self-assessed; most capabilities cannot be objectively demonstrated. |
| 3 | **P2** | The capstone page is 787 words and leans on the linked repository for architectural reasoning. |

No P0. Nothing observed stops a learner from continuing.

## Final learner narrative

Answerable from the site, with the gaps marked:

> I started knowing only basic computer concepts. First I learned **Linux**,
> because every later phase lands on it — Terraform provisions Linux instances,
> Docker images are Linux filesystems. Then I learned **networking**, because
> the failures are silent, and **Git**, because in this platform a `git revert`
> *is* a production rollback.
>
> I built an application and containerised it with **Docker** — the layer
> between the processes Linux gave me and the fleet Kubernetes will ask me to
> run them across.
>
> *(Gap: the site does not tell me why I now need **AWS**. I infer the container
> must run somewhere that is not my laptop, but I am inferring.)*
>
> I built the infrastructure by hand, then learned **Terraform**, because
> clicking fifty servers into existence is not repeatable. Terraform gave me
> blank machines, so I learned **Ansible**, because a blank server is useless.
> Then **Kubernetes**, because ten thousand containers need a scheduler, and
> **Helm** because a Prometheus stack is forty YAML files.
>
> *(Gap: why **Jenkins** now is not stated. I am still pushing images by hand —
> that is the reason, but I worked it out rather than read it.)*
>
> **GitOps** made the repository the source of truth and the cluster its
> follower. Then I could see the system with **Prometheus** and **Grafana** —
> and **SRE** told me which of those failures actually matter. **Security** came
> last in name but ran throughout: Linux permissions, then IAM, then image
> scanning, then network policies.
>
> The final platform is an EKS cluster running three microservices and a
> database, provisioned by Terraform, configured by Ansible, built by a Jenkins
> pipeline that scans and pushes to ECR, delivered by Argo CD watching Git, and
> observed by Prometheus and Grafana.

Both gaps marked above are now closed by the finding-1 fix: AWS states why the
laptop is the wrong machine, and Jenkins states that images still arrive by hand.
Every sentence is answerable from the platform.

## Acceptance criteria

| criterion | result |
| --- | --- |
| A beginner can identify where to start | **PASS** |
| Every major transition explains why the next topic is needed | **PASS** — 14/14 after the fix |
| Major prerequisites are taught before dependent concepts | **PASS** |
| Every core capstone component has a learning path | **PASS** |
| Labs connect to the evolving platform | **PASS** |
| Evidence labels are honest | **PASS** |
| The learner can find the next required step | **PASS** |
| Security is progressive, not isolated | **PASS** |
| The learner can explain the architecture and trade-offs | **PARTIAL** — reasoning is in the repo more than the page |
| The capstone can be approached without hidden knowledge | **PASS** — finding 1 closed |

## Recommendation

Ship it. The three findings are real and worth fixing, but none of them stops a
beginner from starting, continuing, or finishing, and the two P1s are narrow:
four chapter openings, and an evidence model whose weakness the platform
already discloses rather than hides.

Fix finding 1 first. It is four paragraphs of editing against a rule the
curriculum already follows everywhere else, and it closes both gaps in the
learner narrative above.
