#!/usr/bin/env python3
"""
Add Arabic titles and descriptions to every chapter.

Navigation is what an Arabic reader meets first: the Learn page, topic hubs,
search results, roadmap phases, prev/next. Those being English made the whole
Arabic experience read as a translated shell, even where the UI chrome was
Arabic. Titles are low-volume and high-leverage, so they come first.

Follows the terminology policy (§2.3): Arabic carries the meaning, the English
technical term stays in Latin script alongside it. Product names are never
transliterated.

This does NOT claim the chapter bodies are translated — `translationStatus`
stays `missing` until a body exists, and the fallback banner still shows.

Run: python scripts/translate_titles.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEARN = ROOT / "content" / "learn"

# contentId -> (Arabic title, Arabic description)
AR: dict[str, tuple[str, str]] = {
    # ── Orientation ────────────────────────────────────────────────────────
    "start-here": ("ابدأ من هنا — من الصفر إلى Production",
                   "تعرَّف على النظام الذي ستبنيه، وما تحتاجه قبل أن تبدأ، وتكلفته."),
    "project-overview": ("نظرة عامة على المشروع",
                         "ما الذي تبنيه هذه المنصة، ولماذا تم اختيار هذه المكوّنات تحديدًا."),
    "system-architecture": ("معمارية النظام",
                            "المكوّنات وعلاقاتها: من طلب المستخدم حتى قاعدة البيانات."),
    "requirements": ("متطلبات المنصة",
                     "ما يجب توفّره قبل تشغيل أي شيء: حسابات وأدوات ومعرفة مسبقة."),
    "repository-structure": ("هيكل المستودع",
                             "أين يقع كل شيء في المستودع، ولماذا نُظّم بهذا الشكل."),

    # ── Foundations ────────────────────────────────────────────────────────
    "linux-foundations": ("أساسيات Linux",
                          "نظام الملفات والعمليات والصلاحيات والخدمات — ما يفترضه كل ما يليه."),
    "networking-fundamentals": ("أساسيات الشبكات (Networking)",
                                "عناوين IP والـ CIDR والـ DNS والمنافذ والتوجيه و TLS."),
    "git-and-github": ("التحكم في الإصدارات (Version Control) — Git و GitHub",
                       "الفروع والدمج والـ pull requests، وسير العمل الذي ترتبط به كل أداة أخرى."),

    # ── Build & Containers ─────────────────────────────────────────────────
    "build-tools": ("أدوات البناء (Build Tools)",
                    "تحويل الكود المصدري إلى مخرَج (artifact) قابل للنشر."),
    "docker": ("الحاويات (Containerization) — Docker",
               "تحزيم التطبيق مع كل ما يحتاجه ليعمل في أي مكان."),

    # ── Cloud (AWS) ────────────────────────────────────────────────────────
    "aws-overview": ("نظرة عامة على AWS",
                     "البنية العالمية والحسابات ونموذج المسؤولية المشتركة."),
    "vpc": ("شبكات السحابة (Cloud Networking) — AWS VPC",
            "الـ VPC والـ Subnets والـ Route Tables والـ Internet و NAT Gateway."),
    "iam": ("الهوية والصلاحيات (Identity) — AWS IAM",
            "المستخدمون والأدوار والسياسات، ومبدأ أقل صلاحية (Least Privilege)."),
    "rds": ("قواعد البيانات المُدارة (Managed Databases) — Amazon RDS",
            "الـ Multi-AZ والنسخ الاحتياطي والنسخ المتماثلة (Read Replicas)."),
    "load-balancers": ("الإتاحة العالية (High Availability) — AWS Load Balancers",
                       "الـ ALB والـ NLB والـ Target Groups وفحوصات الصحة."),
    "auto-scaling": ("المرونة (Elasticity) — AWS Auto Scaling",
                     "التوسّع مع الحِمل، وما يكلّفه ذلك."),
    "secrets-manager": ("إدارة الأسرار (Secrets Management) — AWS Secrets Manager",
                        "إبقاء بيانات الاعتماد خارج الكود المصدري."),
    "ecr": ("مستودع الصور (Container Registry) — Amazon ECR",
            "دفع الصور ووسمها ومسحها بحثًا عن الثغرات."),
    "serverless": ("ما بعد Kubernetes — Serverless",
                   "متى يكون تشغيل خادم أصلًا هو الاختيار الخاطئ."),

    # ── Infrastructure as Code ─────────────────────────────────────────────
    "terraform": ("البنية التحتية ككود (Infrastructure as Code) — Terraform",
                  "الـ Providers والـ Modules والـ State، والفرق بين plan و apply."),
    "ansible": ("إدارة الإعدادات (Configuration Management) — Ansible",
                "الـ Playbooks والـ Roles والـ Inventory، ومعنى الـ Idempotency."),

    # ── Kubernetes ─────────────────────────────────────────────────────────
    "kubernetes": ("تنسيق الحاويات (Container Orchestration) — Kubernetes",
                   "الـ Control Plane والـ Pods والـ Deployments والـ Services."),
    "kubeadm": ("تهيئة الكلاستر (Cluster Bootstrapping) — kubeadm",
                "بناء كلاستر Kubernetes بنفسك بدلًا من استخدام خدمة مُدارة."),
    "helm": ("إدارة الحزم (Package Management) — Helm",
             "تحزيم ملفات Kubernetes بحيث يمكن إصدارها وإعادة استخدامها."),
    "kustomize": ("تراكبات البيئات (Environment Overlays) — Kustomize",
                  "أساس واحد وبيئات متعددة، دون تحويل كل شيء إلى قوالب."),
    "service-mesh": ("الشبكات المتقدمة (Advanced Networking) — Service Mesh",
                     "إدارة حركة المرور و mTLS بين الخدمات."),

    # ── CI/CD ──────────────────────────────────────────────────────────────
    "jenkins": ("التكامل المستمر (Continuous Integration) — Jenkins",
                "خطوط تبني وتختبر وتفحص وتُصدر مع كل commit."),
    "github-actions": ("التكامل المستمر الحديث — GitHub Actions",
                       "تكامل مستمر بجوار الكود، دون خادم تتولى صيانته."),
    "nexus-and-artifacts": ("إدارة المخرجات (Artifact Management) — Nexus",
                            "أين تستقر المخرجات والصور بين البناء والنشر."),

    # ── GitOps ─────────────────────────────────────────────────────────────
    "gitops": ("فلسفة GitOps",
               "Git بوصفه المصدر الوحيد للحقيقة لكل ما يعمل."),
    "argocd": ("التسليم المستمر (Continuous Delivery) — Argo CD",
               "المطابقة المستمرة، وكشف الانحراف، والإصلاح الذاتي."),

    # ── Observability ──────────────────────────────────────────────────────
    "observability": ("مقدمة في قابلية الرصد (Observability)",
                      "المقاييس والسجلات والتتبّع — والفرق بينها وبين المراقبة."),
    "prometheus": ("المقاييس (Metrics) — Prometheus",
                   "جمع المقاييس والتنبيه عليها قبل أن يلاحظ المستخدمون."),
    "grafana": ("عرض البيانات (Visualization) — Grafana",
                "لوحات تجيب عن سؤال، لا تعرض أرقامًا فحسب."),
    "logging": ("السجلات المركزية (Centralized Logging) — Fluentd و Loki",
                "سجلات يمكن البحث فيها فعليًا أثناء العطل."),

    # ── Security ───────────────────────────────────────────────────────────
    "container-security": ("DevSecOps — أمان الحاويات (Container Security)",
                           "فحص الصور، والمستخدم غير الجذر (non-root)، وسلسلة التوريد."),
    "network-policies": ("الثقة الصفرية (Zero Trust) — Network Policies",
                         "الرفض الافتراضي داخل الكلاستر، ولماذا هو الوضع الصحيح."),

    # ── Production & SRE ───────────────────────────────────────────────────
    "chaos-engineering": ("مرونة الأنظمة (System Resilience) — Chaos Engineering",
                          "التدرّب على العطل قبل أن يحدث في الإنتاج."),
    "cost-optimization": ("اقتصاديات السحابة (Cloud Economics) — FinOps",
                          "ما تكلّفه المعمارية، وكيف تجعلها أقل تكلفة."),
    "platform-engineering": ("هندسة المنصات (Platform Engineering)",
                             "تحويل كل ما سبق إلى شيء يستطيع مهندسون آخرون استخدامه."),
    "disaster-recovery": ("أسوأ يوم — التعافي من الكوارث (Disaster Recovery)",
                          "الـ RTO والـ RPO والنسخ الاحتياطي، والاستعادة التي جرّبتها فعلًا."),

    # ── Reference ──────────────────────────────────────────────────────────
    "hands-on-labs": ("المعامل التطبيقية (Hands-On Labs)",
                      "تمارين عملية بمخرجات متوقعة."),
    "troubleshooting": ("حل المشكلات (Troubleshooting)",
                        "ابدأ من الخطأ الذي ظهر لك، لا من الأداة التي تشك بها."),
    "glossary": ("المصطلحات (Glossary)",
                 "كل مصطلح، معرَّف مرة واحدة، بالعربية والإنجليزية."),
    "interview-prep": ("التحضير للمقابلات (Interview Preparation)",
                       "ما الذي يُسأل عنه، وكيف تبدو الإجابة القوية."),
    "architecture-summary": ("ملخّص المعمارية",
                             "النظام كاملًا في صفحة واحدة — لمن يقرأ سيرتك الذاتية."),
    "conclusion": ("الخاتمة",
                   "ما بنيته، وما يستحق أن تتعلّمه بعده."),
}


def main() -> None:
    written = 0
    missing: list[str] = []

    for path in sorted(LEARN.rglob("*.en.mdx")):
        text = path.read_text(encoding="utf-8")
        match = re.match(r"^---\r?\n([\s\S]*?)\r?\n---", text)
        if not match:
            continue

        front = match.group(1)
        content_id = re.search(r"^contentId:\s*(.+)$", front, re.M)
        if not content_id:
            continue
        cid = content_id.group(1).strip()

        entry = AR.get(cid)
        if not entry:
            missing.append(cid)
            continue

        title_ar, desc_ar = entry
        # Insert after `title:` so the pair reads together in the file.
        front_new = re.sub(r"^(title:.*)$", rf'\1\ntitleAr: "{title_ar}"', front, count=1, flags=re.M)
        front_new = re.sub(
            r"^(description:.*)$", rf'\1\ndescriptionAr: "{desc_ar}"', front_new, count=1, flags=re.M
        )
        # Idempotent: strip any previous pass before re-adding.
        front_new = re.sub(r"^titleAr: .*\ntitleAr: .*$", lambda m: m.group(0).split("\n")[0],
                           front_new, flags=re.M)

        if "titleAr:" in front and "descriptionAr:" in front:
            front_new = re.sub(r"^titleAr: .*$", f'titleAr: "{title_ar}"', front, flags=re.M)
            front_new = re.sub(r"^descriptionAr: .*$", f'descriptionAr: "{desc_ar}"',
                               front_new, flags=re.M)

        path.write_text(text.replace(front, front_new, 1), encoding="utf-8")
        written += 1

    print(f"Arabic titles written to {written} chapter(s)")
    if missing:
        print(f"  ! no Arabic title for: {', '.join(missing)}")


if __name__ == "__main__":
    main()
