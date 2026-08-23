# Lab gaps

Labs the curriculum refers to, or would benefit from, and which do not exist.
Recorded rather than papered over: a chapter pointing at a plausible-sounding
lab that teaches something else is worse than a chapter saying there is no lab
yet.

Nothing here is a commitment to build. The lab roadmap decides whether each is
worth writing.

| Gap | Found where | Why it is a gap |
| --- | --- | --- |
| **kubeadm cluster provisioning** | `k8s-cluster-administration` listed "Kubernetes Cluster Provisioning with kubeadm" in its practise list | No lab in the catalogue matches. The chapter now links the kubeadm *chapter* and says plainly there is no lab. Searching every lab title for `kubeadm` returns nothing |
| **AWS Auto Scaling + Load Balancing** | `ec2` listed "Auto Scaling & Load Balancing" | No such lab. The nearest by title is `lab-reverse-proxy-load-balancing`, which is Nginx — a different subject, and linking it would have taught the wrong thing under a plausible name. `ec2` now links the Jenkins EC2 lab instead |
| **Build tools (Maven/Gradle) standalone** | `build-tools` has no lab in its own domain | The build is currently only exercised inside the Jenkins pipeline labs. The chapter says so and links there |
| **Kustomize standalone** | `kustomize` has no lab in its own domain | Overlays are only exercised through the Argo CD lab that renders them. The chapter says so and links there |

## Environment gaps

Labs that exist but cannot currently be given an online terminal, with the
measured reason. These are environment problems, not curriculum problems — the
lab should not be distorted to fit the platform.

| Lab | Blocker | Evidence |
| --- | --- | --- |
| `lab-aws-iam-least-privilege` | LocalStack community does not enforce IAM | Measured: LocalStack 3.8.1, `is_license_activated: false`, `ENFORCE_IAM=1` silently ignored — a user holding only `s3:ListBucket` successfully deleted the bucket. The entire lab is "prove the policy denies what it should", so the environment would answer yes to everything |
| `lab-16-enterprise-multibranch-ci-cd-pipeline-with-sonarqube-trivy` | SonarQube's footprint | Measured: `sonarqube:10.7.0-community` reaches UP in 35s at **2.26 GiB** resident and 386% CPU at startup. With Jenkins and a cluster alongside, that likely exceeds a Killercoda VM. Classify as *requires a larger environment* rather than trimming the lab |
| `lab-05`, `lab-15`, `lab-17` (EKS) | EKS is not in LocalStack community | The control plane cannot be created at all |
| `lab-06` (EC2 user_data), `lab-aws-rds-backup-restore` | LocalStack community accepts the API and runs nothing | `RunInstances` is an API record with no operating system behind it; RDS is not a community service |

## Environment work proven but not built

`lab-07-ansible-architecture-configuration-automated-inventory` — a design was
verified end to end and is parked in a scratchpad, not in the repository.

The proof: the real `amazon.aws.aws_ec2` inventory plugin queries LocalStack's
EC2 API, groups hosts by tag, and `ansible -m ping all` returns `pong` from
three hosts that were never typed into a file. Both of the lab's mechanical
criteria are therefore satisfiable honestly.

The one substitution, which the scenario would have to state: LocalStack
community does not boot an instance — `EC2_VM_MANAGER=docker` was set and no
container appeared, because the Docker-backed VM manager is a Pro feature — so
setup joins each API record to a real container by giving both the same private
IP. The API, the plugin, the tags, the grouping and the SSH are all real; the
hypervisor is what is substituted.

Only `setup.sh` was written. Steps and verifiers were not, so it was kept out of
the repository rather than committed unverified.
