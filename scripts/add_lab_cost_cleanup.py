#!/usr/bin/env python3
"""
Give every billable lab an honest cost line and a cleanup section.

Seventeen labs provisioned real AWS resources — EKS control planes, NAT
Gateways, RDS instances — and said nothing about what they cost or how to
destroy them. A learner who follows the EKS lab on a Friday and forgets it has
spent about $73 on the control plane alone by month end, before nodes or the
NAT Gateway.

Costs below are us-east-1 on-demand list prices at the time of writing and are
deliberately stated as ranges. The point is not a precise forecast; it is that
nobody is surprised.

Run: python scripts/add_lab_cost_cleanup.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LABS = ROOT / "content" / "labs"

FREE_TIER = "Free tier — inside the 12-month allowance for a new account, and cents outside it."

# labId prefix -> (cost estimate, cleanup steps)
PLAN: dict[str, tuple[str, list[str]]] = {
    "lab-01": (
        "**Billable.** The NAT Gateway is ~$0.045/hour (~$32/month) plus $0.045/GB "
        "processed, and it bills whether or not traffic flows. The VPC, subnets and "
        "route tables are free. Destroy the NAT Gateway the moment you are done.",
        [
            "terraform destroy -auto-approve",
            "# Verify the NAT Gateway is really gone — it is the only costly resource here:",
            "aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[].NatGatewayId'",
            "# Release any Elastic IP left behind (an unattached EIP is billed hourly):",
            "aws ec2 describe-addresses --query 'Addresses[?AssociationId==`null`].[PublicIp,AllocationId]' --output table",
        ],
    ),
    "lab-02": (
        "Free — IAM roles, policies and security groups cost nothing. Only the "
        "resources they are attached to do.",
        [
            "terraform destroy -auto-approve",
            "aws iam list-roles --query 'Roles[?starts_with(RoleName, `ivolve`)].RoleName'",
        ],
    ),
    "lab-03": (
        "Free tier — 500 MB of ECR storage and 5 GB of S3 are free for 12 months. "
        "Container images are large, so delete the repository rather than leaving a "
        "few GB of layers behind.",
        [
            "aws ecr delete-repository --repository-name <name> --force",
            "aws s3 rm s3://<bucket> --recursive && aws s3api delete-bucket --bucket <bucket>",
            "terraform destroy -auto-approve",
        ],
    ),
    "lab-04": (
        "**Partly billable.** A `db.t3.micro` RDS instance is free for 12 months on a "
        "new account and ~$13/month after. AWS Secrets Manager is $0.40 per secret per "
        "month with no free tier — small, but it does not stop on its own.",
        [
            "terraform destroy -auto-approve",
            "# RDS leaves a final snapshot unless told otherwise; snapshots are billed:",
            "aws rds describe-db-snapshots --snapshot-type manual --query 'DBSnapshots[].DBSnapshotIdentifier'",
            "aws secretsmanager delete-secret --secret-id <name> --force-delete-without-recovery",
        ],
    ),
    "lab-05": (
        "**Billable, and never free.** An EKS control plane is $0.10/hour (~$73/month) "
        "from the moment it exists, with no free tier — plus the node group's EC2 "
        "instances and any NAT Gateway. Budget a few dollars for an afternoon, and "
        "destroy the cluster the same day.",
        [
            "terraform destroy -auto-approve",
            "# The control plane is the expensive part. Confirm no cluster survives:",
            "aws eks list-clusters --query 'clusters'",
            "# Node groups can outlive a failed destroy:",
            "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].[InstanceId,InstanceType]' --output table",
            "# And load balancers created by Kubernetes Services are not in Terraform state:",
            "aws elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerArn'",
        ],
    ),
    "lab-06": (
        "Free tier — a `t3.micro` EC2 instance and S3 storage are inside the 12-month "
        "allowance. Outside it, expect ~$8/month for the instance if left running. "
        "AWS Backup charges for stored recovery points.",
        [
            "terraform destroy -auto-approve",
            "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId'",
            "aws backup list-recovery-points-by-backup-vault --backup-vault-name <vault> --query 'RecoveryPoints[].RecoveryPointArn'",
        ],
    ),
    "lab-07": (
        "Free tier — Ansible itself is free; the cost is whichever EC2 instances it "
        "configures. A `t3.micro` control node is inside the free tier.",
        ["terraform destroy -auto-approve", "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId'"],
    ),
    "lab-08": (
        "Free tier — one `t3.micro` for Jenkins. Note that Jenkins wants more memory "
        "than a micro provides for real builds; a `t3.small` is ~$15/month.",
        ["terraform destroy -auto-approve", "aws ec2 describe-instances --filters Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId'"],
    ),
    "lab-11": (
        "**Depends on an existing cluster.** The Kubernetes objects here cost nothing; "
        "the EKS cluster underneath them is $0.10/hour. If you created it in the EKS "
        "lab, destroy it when you finish this one.",
        ["kubectl delete -f . --ignore-not-found", "kubectl get all -A | grep -v kube-system", "# Then destroy the cluster if you are finished for the day."],
    ),
    "lab-12": (
        "**Billable.** An Ingress backed by the AWS Load Balancer Controller creates a "
        "real ALB at ~$0.0225/hour (~$16/month) plus LCU charges — and it is created "
        "by Kubernetes, so `terraform destroy` will not remove it.",
        [
            "kubectl delete ingress --all -A",
            "# The ALB is deleted by the controller, asynchronously. Confirm it is gone:",
            "aws elbv2 describe-load-balancers --query 'LoadBalancers[].[LoadBalancerName,State.Code]' --output table",
            "# An orphaned ALB keeps billing after the cluster is destroyed.",
        ],
    ),
    "lab-13": (
        "**Depends on an existing cluster.** NetworkPolicies and HPA objects are free; "
        "the cluster and any nodes the HPA scales up are not.",
        ["kubectl delete networkpolicy --all -A", "kubectl delete hpa --all -A", "kubectl get nodes  # confirm the HPA did not leave extra nodes running"],
    ),
    "lab-14": (
        "**Depends on an existing cluster.** Helm itself is free; the workloads it "
        "installs consume cluster capacity.",
        ["helm uninstall <release> -n <namespace>", "kubectl get all -n <namespace>"],
    ),
    "lab-15": (
        "**Billable.** Cluster add-ons commonly provision real infrastructure — a load "
        "balancer, EBS volumes for persistent storage — that outlives `helm uninstall` "
        "if a finalizer fails.",
        [
            "helm list -A",
            "helm uninstall <release> -n <namespace>",
            "aws elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerName'",
            "# Unattached EBS volumes are billed per GB-month:",
            "aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].[VolumeId,Size]' --output table",
        ],
    ),
    "lab-16": (
        "Free tier for the Jenkins instance itself; SonarQube wants ~2 GB of RAM, so a "
        "`t3.small` (~$15/month) is realistic. ECR storage for the images the pipeline "
        "pushes is inside the free tier at this scale.",
        [
            "terraform destroy -auto-approve",
            "aws ecr list-images --repository-name <repo> --query 'imageIds[].imageTag'",
            "aws ecr batch-delete-image --repository-name <repo> --image-ids imageTag=<tag>",
        ],
    ),
    "lab-17": (
        "**Depends on an existing cluster.** kube-prometheus-stack requests persistent "
        "volumes — EBS at ~$0.08/GB-month — which survive `helm uninstall` because the "
        "PVCs are retained deliberately.",
        [
            "helm uninstall kube-prometheus-stack -n monitoring",
            "kubectl delete pvc --all -n monitoring   # PVCs are NOT removed by uninstall",
            "aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].[VolumeId,Size]' --output table",
        ],
    ),
    "lab-18": (
        "**Depends on an existing cluster.** Alert rules and dashboards are "
        "configuration and cost nothing; the Prometheus stack under them holds EBS "
        "volumes.",
        ["kubectl delete prometheusrule --all -n monitoring", "kubectl delete configmap -l grafana_dashboard -n monitoring"],
    ),
    "lab-19": (
        "**Billable — this exercises the whole platform.** Expect an EKS control plane, "
        "nodes, a load balancer and a NAT Gateway to be running simultaneously: roughly "
        "$0.20–0.30/hour while the lab is up. Work through it in one sitting and "
        "destroy everything afterwards.",
        [
            "kubectl delete ingress --all -A     # removes the ALB first",
            "helm list -A                        # then any releases holding volumes",
            "terraform destroy -auto-approve     # then the cluster and network",
            "# Finally sweep for anything Kubernetes created outside Terraform state:",
            "aws elbv2 describe-load-balancers --query 'LoadBalancers[].LoadBalancerName'",
            "aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[].VolumeId'",
            "aws ec2 describe-nat-gateways --filter Name=state,Values=available --query 'NatGateways[].NatGatewayId'",
            "aws eks list-clusters --query 'clusters'",
        ],
    ),
}


def patch(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---\r?\n", text)
    if not match:
        return False

    front, rest = match.group(1), text[match.end():]

    lab_id = re.search(r"^labId:\s*(.+)$", front, re.M)
    if not lab_id:
        return False
    prefix = lab_id.group(1).strip()[:6]

    if prefix not in PLAN or "costEstimate:" in front:
        return False

    cost, cleanup = PLAN[prefix]
    is_guided = re.search(r"^tier:\s*guided\s*$", front, re.M)

    block = [f'costEstimate: "{cost}"']
    if cleanup:
        block.append("cleanup:")
        block += [f'  - "{step}"' for step in cleanup]

    # Insert after cloudCost so the cost story reads together.
    front_new = re.sub(r"^(cloudCost:.*)$", lambda m: m.group(1) + "\n" + "\n".join(block),
                       front, count=1, flags=re.M)

    body = rest
    # Only the guided tier gets a prose cleanup section; the challenge inherits
    # the same resources and links back.
    if is_guided and cleanup and "## Clean up" not in body:
        steps = "\n".join(cleanup)
        body = body.rstrip() + f"""

---

## Clean up

Run this even if you did not finish. Everything above is destroyable, and an
account full of half-built experiments is how a surprise bill starts.

```bash
{steps}
```

**Cost of this lab:** {cost}
"""

    path.write_text("---\n" + front_new + "\n---\n" + body, encoding="utf-8")
    return True


def main() -> None:
    changed = 0
    for path in sorted(LABS.glob("*.en.mdx")):
        if patch(path):
            changed += 1
            print(f"  {path.name}")
    print(f"\n{changed} lab file(s) given a cost line and cleanup")


if __name__ == "__main__":
    main()
