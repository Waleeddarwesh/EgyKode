# Killercoda scenarios

Free, browser-based terminals for the labs that can run in one. No account, no
install, no cost to the learner and none to EgyKode.

Every scenario here ships **disabled**. The lab pages show "a free environment
is being prepared" rather than a button, because a scenario becomes a URL only
once a human connects this repository to a Killercoda account — and a button
pointing at a URL that does not exist is worse than no button.

## What is here

| Scenario | Lab | Backend |
| --- | --- | --- |
| `git-branching-collaboration` | Git Branching & Collaboration | ubuntu |
| `docker-multi-stage-build` | Production-Grade Multi-Stage Dockerfile | ubuntu |
| `k8s-workloads` | Kubernetes Workloads | kubernetes-kubeadm-1node |

Each is three steps with a `verify*.sh` per step, an `intro.md`, a `setup.sh`
that builds the starting state, and a `finish.md`.

`index.json` carries a non-standard `labId` key. Killercoda ignores keys it
does not know; it is there so enabling a scenario attaches it to the right lab
by declaration rather than by matching directory names against lab ids.

## Publishing

1. Sign in at [killercoda.com](https://killercoda.com) with the GitHub account
   that owns this repository.
2. Open the creator dashboard and add this repository as a source.
3. Killercoda scans it for directories containing `index.json` and lists what
   it finds. Confirm all three appear before going further — if it only looks
   at the repository root, move `killercoda/*` up a level or publish from a
   dedicated scenarios repository. This is the step most likely to need
   adjusting, and the UI tells you which case you are in.
4. Set each scenario to public and open it in a browser. Click through every
   step and let each `verify` run.
5. Enable them on the site:

   ```bash
   node scripts/enable-killercoda.mjs <your-profile>          # shows the URLs
   node scripts/enable-killercoda.mjs <your-profile> --write  # writes them
   npm run content:lint
   ```

Step 4 is not optional politeness. Nothing in this repository can check a
Killercoda URL: the site serves an identical 5062-byte application shell for
every path, so a real scenario and a typo are byte-identical over HTTP, and a
headless browser gets no further than the consent gate. You are the only
verifier there is.

## Changing a scenario

```bash
npm run lint:killercoda
```

Checks that every file `index.json` references exists, that each scenario names
a real lab, that shell scripts have a shebang and LF endings, and that step
pages have `{{exec}}` buttons. Killercoda fails silently on all of these — a
step whose `text` names a missing file renders blank, and a broken `verify`
makes the step impossible to complete — so this runs in `npm run verify`.

Killercoda pulls from the default branch, so a merged change is a published
change. Re-open the affected scenario afterwards.

## Testing a scenario locally

The `ubuntu` backend is close enough to a plain container to exercise a
scenario end to end before publishing:

```bash
docker run --rm -it -v "$PWD/killercoda/git-branching-collaboration:/s:ro" ubuntu:22.04 bash
apt-get update -qq && apt-get install -y -qq git
bash /s/setup.sh
bash /s/verify1.sh    # must FAIL here
# ...do the work from step1.md...
bash /s/verify1.sh    # must PASS
```

Run each `verify` **before** doing the step as well as after. A check that
passes on an untouched environment is the one failure mode that looks like
success from every angle.
