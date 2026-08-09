#!/usr/bin/env python3
"""
Restructure the roadmaps against the technical review.

The review proposed 8 phases for AWS, 9 for DevSecOps and 11 for Kubernetes.
Where the corpus supports that, it is applied. Where it does not, the phase is
NOT created — a phase with no chapters is a promise the platform cannot keep,
and §6.0 already forbids shipping one. The unfillable phases are recorded in
`contentGaps` so they appear as a content roadmap rather than disappearing.

Run: python scripts/restructure_roadmaps.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROADMAPS = ROOT / "content" / "roadmaps"


def phase(pid: str, number: str, title: str, title_ar: str, chapters: list[str]) -> dict:
    return {
        "id": pid,
        "number": number,
        "title": title,
        "titleAr": title_ar,
        "chapters": chapters,
    }


# ── AWS Cloud Engineer: 6 → 8 phases ────────────────────────────────────────
# High Availability & Scalability earns its own phase: it is what separates
# "I know the services" from "I can design the architecture".
AWS = {
    "id": "aws-cloud-engineer",
    "title": "AWS Cloud Engineer",
    "titleAr": "مهندس AWS Cloud",
    "description": "Cloud infrastructure: build a VPC that is actually private, "
    "then everything that runs inside it — and know what each piece costs.",
    "descriptionAr": "بنية تحتية سحابية: ابنِ VPC خاصة فعلًا، ثم كل ما يعمل بداخلها — "
    "واعرف تكلفة كل جزء.",
    "level": "intermediate",
    "phases": [
        phase("cloud-foundations", "01", "Cloud & AWS Foundations",
              "أساسيات السحابة و AWS", ["linux-foundations", "aws-overview"]),
        phase("networking", "02", "Networking", "الشبكات",
              ["networking-fundamentals", "vpc"]),
        phase("identity-security", "03", "Identity & Security", "الهوية والأمان",
              ["iam", "secrets-manager"]),
        phase("compute", "04", "Compute", "الحوسبة",
              ["load-balancers", "serverless"]),
        phase("storage-data", "05", "Storage & Databases", "التخزين وقواعد البيانات",
              ["rds", "ecr"]),
        phase("availability", "06", "High Availability & Scalability",
              "الإتاحة العالية وقابلية التوسع", ["auto-scaling", "disaster-recovery"]),
        phase("iac", "07", "Infrastructure as Code", "البنية التحتية ككود",
              ["terraform", "ansible"]),
        phase("operations", "08", "Operations & Cost", "التشغيل والتكلفة",
              ["observability", "cost-optimization"]),
    ],
    "reference": ["troubleshooting", "glossary", "interview-prep"],
    "productionProject": {
        "id": "cloud-native-devops-platform",
        "title": "A VPC you can defend in review",
        "titleAr": "VPC يمكنك الدفاع عنها في المراجعة",
        "summary": "Multi-AZ VPC with private data subnets, least-privilege IAM, "
        "secrets out of source control, an autoscaling tier behind a load balancer, "
        "and a monthly cost you can explain line by line.",
        "repo": "Cloud-Native-DevOps-Platform",
    },
    "contentGaps": [
        "AWS global infrastructure, regions and the Shared Responsibility Model",
        "EC2 in depth: AMIs, EBS, launch templates, target groups",
        "S3 and EFS as their own chapter (currently only referenced)",
        "CloudWatch, CloudTrail and Cost Explorer as an operations chapter",
    ],
}

# ── DevSecOps: 6 → 8 phases ─────────────────────────────────────────────────
# Security moves earlier and runs through delivery rather than sitting at the
# end, which is how NIST frames supply-chain controls in CI/CD.
DEVSECOPS = {
    "id": "devsecops",
    "title": "DevSecOps",
    "titleAr": "DevSecOps",
    "description": "Security throughout delivery: put the gates in the pipeline, "
    "not in a document nobody reads.",
    "descriptionAr": "الأمان عبر مراحل التسليم: ضع البوابات داخل الـ pipeline، "
    "لا في مستند لا يقرؤه أحد.",
    "level": "advanced",
    "phases": [
        phase("foundations", "01", "Security Foundations", "أساسيات الأمان",
              ["linux-foundations", "networking-fundamentals"]),
        phase("identity", "02", "Identity & Secrets", "الهوية والأسرار",
              ["iam", "secrets-manager"]),
        phase("source", "03", "Secure Source & Dependencies", "الكود والاعتماديات",
              ["git-and-github", "nexus-and-artifacts"]),
        phase("supply-chain", "04", "Secure Build & Supply Chain",
              "البناء الآمن وسلسلة التوريد", ["docker", "container-security", "ecr"]),
        phase("gates", "05", "Security Gates", "بوابات الأمان",
              ["jenkins", "github-actions"]),
        phase("runtime", "06", "Infrastructure & Runtime Security",
              "أمان البنية التحتية والتشغيل", ["terraform", "network-policies", "service-mesh"]),
        phase("detection", "07", "Detection & Response", "الكشف والاستجابة",
              ["observability", "logging"]),
        phase("resilience", "08", "Resilience", "المرونة",
              ["chaos-engineering", "disaster-recovery"]),
    ],
    "reference": ["troubleshooting", "interview-prep", "glossary"],
    "productionProject": {
        "id": "jenkins-shared-library",
        "title": "A pipeline that can say no",
        "titleAr": "Pipeline قادر على الرفض",
        "summary": "An enforced SonarQube quality gate, Trivy filesystem and image "
        "scans that block on high severity, immutable image tags, secrets outside "
        "source control, and default-deny network policies in the cluster.",
        "repo": "jenkins-shared-library",
    },
    "contentGaps": [
        "Threat modelling and the secure SDLC as an opening chapter",
        "Dependency scanning (SCA), secret scanning and SBOM generation",
        "Image signing and provenance (Sigstore / cosign)",
        "Kubernetes admission control and Pod Security Standards",
    ],
}

# ── Kubernetes Specialist: 6 → 8 phases ─────────────────────────────────────
# The review asked for 11. The corpus has six Kubernetes-adjacent chapters, so
# eight is the honest ceiling; the missing four are listed as gaps.
KUBERNETES = {
    "id": "kubernetes-specialist",
    "title": "Kubernetes Specialist",
    "titleAr": "متخصص Kubernetes",
    "description": "Deep Kubernetes operations: run a cluster you built yourself, "
    "then secure it, package it, deliver to it and observe it.",
    "descriptionAr": "تشغيل Kubernetes بعمق: شغّل كلاستر بنيته بنفسك، ثم أمّنه "
    "وحزّمه وانشر عليه وراقبه.",
    "level": "advanced",
    "phases": [
        phase("prerequisites", "01", "Prerequisites", "المتطلبات",
              ["linux-foundations", "networking-fundamentals", "docker"]),
        phase("architecture", "02", "Cluster Architecture", "بنية الكلاستر",
              ["kubernetes"]),
        phase("administration", "03", "Cluster Administration", "إدارة الكلاستر",
              ["kubeadm"]),
        phase("networking", "04", "Services & Networking", "الخدمات والشبكات",
              ["network-policies"]),
        phase("traffic", "05", "Traffic Management", "إدارة حركة المرور",
              ["service-mesh"]),
        phase("packaging", "06", "Packaging & Environments", "التحزيم والبيئات",
              ["helm", "kustomize"]),
        phase("delivery", "07", "Delivery", "النشر", ["gitops", "argocd"]),
        phase("operate", "08", "Observability & Operations", "المراقبة والتشغيل",
              ["observability", "prometheus", "grafana", "disaster-recovery"]),
    ],
    "reference": ["troubleshooting", "interview-prep", "glossary"],
    "productionProject": {
        "id": "cloud-native-devops-platform",
        "title": "Self-managed Kubernetes platform on AWS",
        "titleAr": "منصة Kubernetes ذاتية الإدارة على AWS",
        "summary": "A kubeadm control plane with an etcd quorum across three "
        "availability zones, Calico networking, default-deny network policies, "
        "Helm-packaged workloads, Argo CD reconciliation and a Prometheus stack.",
        "repo": "Cloud-Native-DevOps-Platform",
    },
    "contentGaps": [
        "Workloads in depth: DaemonSets, StatefulSets, Jobs and CronJobs",
        "Configuration & storage: ConfigMaps, Secrets, PV/PVC, StorageClasses",
        "Scheduling: taints, tolerations, affinity, requests and limits",
        "Gateway API — the Ingress API is frozen upstream and Gateway is the "
        "current direction, so the curriculum must teach Ingress then Gateway",
        "RBAC, ServiceAccounts, Pod Security Standards and admission control",
    ],
}


def main() -> None:
    for roadmap in (AWS, DEVSECOPS, KUBERNETES):
        path = ROADMAPS / f"{roadmap['id']}.json"
        before = json.loads(path.read_text(encoding="utf-8"))
        path.write_text(
            json.dumps(roadmap, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(
            f"{roadmap['id']}: {len(before['phases'])} -> {len(roadmap['phases'])} phases, "
            f"{len(roadmap['contentGaps'])} gap(s) recorded"
        )

    # The flagship keeps its 11 phases; only the security phase is renamed to
    # match how the discipline actually describes itself.
    path = ROADMAPS / "cloud-devops-engineer.json"
    flagship = json.loads(path.read_text(encoding="utf-8"))
    for p in flagship["phases"]:
        if p["id"] == "security":
            p["title"] = "Cloud Native Security"
            p["titleAr"] = "أمان Cloud Native"
    flagship["description"] = (
        "Breadth plus a production platform: from a Linux shell to a system you "
        "deploy and operate yourself."
    )
    flagship["descriptionAr"] = (
        "اتساع المعرفة مع منصة إنتاج: من سطر أوامر Linux إلى نظام تنشره وتشغّله بنفسك."
    )
    path.write_text(json.dumps(flagship, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"cloud-devops-engineer: {len(flagship['phases'])} phases (unchanged), security renamed")


if __name__ == "__main__":
    main()
