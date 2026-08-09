#!/usr/bin/env python3
"""
Formalise the Arabic strings inside content JSON (§2.3).

Same register change as the UI catalogue: formal Modern Standard Arabic, with
the terminology model untouched — Latin-script product names, `الـ` + English
resource names, Arabic only for the explanation.

Run: python scripts/formalise_content_arabic.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REPLACEMENTS: dict[str, dict[str, str]] = {
    "content/authors/waleed.json": {
        "bioAr": "أبني منصات وأوثّق كيفية عملها. معظم ما تجده على EgyKode جاء من تشغيل هذه الأنظمة بنفسي، بما في ذلك المواضع التي أخفقت فيها.",
        "headlineAr": "مهندس Cloud و DevOps",
    },
    "content/projects/cloud-native-devops-platform.json": {
        "summaryAr": "منصة Kubernetes ذاتية الإدارة على AWS — تُبنى بـ Terraform، وتُهيّأ بـ Ansible، وتُسلَّم عبر Jenkins و Argo CD.",
        "highlightsAr": [
            "12 وحدة Terraform موزَّعة على بيئات dev و staging و prod",
            "13 دور Ansible، من التأمين الأساسي للخادم حتى الكلاستر كاملاً",
            "control plane عالي الإتاحة عبر kubeadm مع etcd quorum على ثلاث AZs",
            "خط Jenkins مع quality gate إلزامي من SonarQube وفحص صور عبر Trivy",
            "Argo CD بنمط app-of-apps مع self-heal وكشف الانحراف",
            "kube-prometheus-stack مع توجيه التنبيهات",
        ],
    },
    "content/projects/ivolve-cloud-devops-capstone.json": {
        "summaryAr": "ثلاث microservices من الكود المصدري حتى نشر يعمل ويخضع للمراقبة ويُدار عبر GitOps على AWS EKS.",
        "highlightsAr": [
            "AWS EKS 1.31 مُنشأ عبر Terraform 1.10",
            "ثلاث microservices تُبنى وتُفحص وتُصدَر كل منها على حدة",
            "Jenkins shared library يجعل منطق الـ pipeline في مكان واحد",
            "Argo CD يدير جميع البيئات انطلاقاً من git",
            "ملف START-HERE يسرد كل أمر بالترتيب",
        ],
    },
    "content/projects/jenkins-shared-library.json": {
        "summaryAr": "اثنتا عشرة خطوة قابلة لإعادة الاستخدام، بحيث يصبح الـ Jenkinsfile تعريفاً لا سكربتاً.",
        "highlightsAr": [
            "microservicePipeline — نقطة دخول واحدة للخدمة بأكملها",
            "sonarQubeScan و trivyScan بوصفهما بوابتين إلزاميتين لا خطوتين استرشاديتين",
            "ecrPush بوسوم غير قابلة للتغيير",
            "updateGitOpsRepo — لا يلمس الـ pipeline الكلاستر مباشرةً إطلاقاً",
        ],
    },
    "content/projects/ivolve-cloud-devops-internship.json": {
        "summaryAr": "سجل التدريب كاملاً — كل معمل بالترتيب، وبالأوامر التي نُفّذت فعلياً.",
    },
    "content/projects/nti-final-project.json": {
        "summaryAr": "ثماني وحدات من البداية إلى النهاية: بنية تحتية بـ Terraform، وتهيئة بـ Ansible، و Docker، و Kubernetes، و Helm، وخط Jenkins، ومنظومة مراقبة.",
    },
    "content/roadmaps/kubernetes-specialist.json": {
        "descriptionAr": "شغّل كلاستر بنيته بنفسك، ثم أمّنه وحزّمه وراقبه.",
    },
    "content/roadmaps/aws-cloud-engineer.json": {
        "descriptionAr": "ابنِ VPC خاصة فعلاً، ثم كل ما يعمل بداخلها — واعرف تكلفة كل جزء.",
    },
    "content/roadmaps/devsecops.json": {
        "descriptionAr": "ضع البوابات داخل الـ pipeline، لا في مستند لا يقرؤه أحد.",
    },
    "content/roadmaps/cloud-devops-engineer.json": {
        "descriptionAr": "من Linux إلى منصة production تنشرها بنفسك.",
    },
}

# Domain blurbs: `byAr` is a flat map inside domains.json.
DOMAIN_BLURBS: dict[str, str] = {
    "linux": "نظام التشغيل الذي يعمل عليه كل خادم. الملفات والعمليات والصلاحيات والخدمات.",
    "networking": "كيف تتعارف الأجهزة وتتواصل. IP و DNS والمنافذ والتوجيه و TLS.",
    "git": "إدارة الإصدارات والفروع، وسير العمل الذي ترتبط به كل أداة أخرى.",
    "build": "تحويل الكود المصدري إلى مخرَج قابل للنشر.",
    "docker": "تحزيم التطبيق مع كل ما يحتاجه للعمل في أي مكان.",
    "kubernetes": "تشغيل الحاويات عبر أجهزة متعددة، وإبقاؤها عاملة.",
    "helm": "تحزيم ملفات Kubernetes بحيث يمكن إصدارها وإعادة استخدامها.",
    "kustomize": "أساس واحد وبيئات متعددة، دون تحويل كل شيء إلى قوالب.",
    "aws": "الشبكات والحوسبة وقواعد البيانات والهوية — وتكلفة كل منها.",
    "terraform": "وصف البنية التحتية ككود بحيث يمكن مراجعتها وإعادة بنائها.",
    "ansible": "تهيئة الخوادم بشكل قابل للتكرار، دون الدخول إليها.",
    "jenkins": "خطوط تبني وتختبر وتفحص وتُصدر مع كل commit.",
    "github-actions": "تكامل مستمر يقع بجوار الكود، دون خادم تتولى صيانته.",
    "nexus": "أين تستقر المخرجات والصور بين البناء والنشر.",
    "gitops": "Git بوصفه المصدر الوحيد للحقيقة لكل ما يعمل.",
    "argocd": "مطابقة الكلاستر مع git بشكل مستمر.",
    "observability": "المقاييس والسجلات والتتبّع — أن تعرف ما يجري في الداخل.",
    "prometheus": "جمع المقاييس والتنبيه قبل أن يلاحظ المستخدمون.",
    "grafana": "لوحات تجيب عن سؤال، لا تعرض أرقاماً فحسب.",
    "logging": "سجلات مركزية يمكن البحث فيها فعلياً أثناء العطل.",
    "security": "فحص الصور، وأقل صلاحية، والأسرار، وشبكة ترفض افتراضياً.",
    "sre": "التصميم تحسباً ليوم العطل، والتدرّب عليه.",
    "cost": "كم تكلّف المعمارية، وكيف تجعلها أقل تكلفة.",
    "platform-engineering": "تحويل كل ما سبق إلى شيء يستطيع مهندسون آخرون استخدامه.",
    "platform": "النظام الذي يعود إليه كل فصل — معماريته وقراراته.",
    "labs": "تمارين عملية بمخرجات متوقعة.",
    "troubleshooting": "ابدأ من الخطأ الذي ظهر لك، لا من الأداة التي تشك بها.",
    "glossary": "كل مصطلح، معرَّف مرة واحدة، باللغتين.",
    "interview": "ما الذي يُسأل عنه، وكيف تبدو الإجابة القوية.",
}

GROUP_BLURBS: dict[str, str] = {
    "foundations": "الأمور التي يفترض كل ما يليها أنك تعرفها.",
    "containers": "تحزيم تطبيق واحد، ثم تشغيل الآلاف منه.",
    "cloud": "استئجار الخوادم والشبكات وقواعد البيانات — ووصفها ككود.",
    "delivery": "إيصال الـ commit إلى الإنتاج دون لمس الخادم.",
    "operate": "أن تعرف ما يفعله نظامك، وكم يكلّف.",
    "security": "تأمينه، وجعله صالحاً للاستخدام من مهندسين آخرين.",
}


def main() -> None:
    changed = 0

    for rel, fields in REPLACEMENTS.items():
        path = ROOT / rel
        if not path.exists():
            print(f"  ! missing, skipped: {rel}")
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        for key, value in fields.items():
            if key in data and data[key] != value:
                data[key] = value
                changed += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    domains_path = ROOT / "content" / "domains.json"
    domains = json.loads(domains_path.read_text(encoding="utf-8"))
    for domain, blurb in DOMAIN_BLURBS.items():
        entry = domains["domains"].get(domain)
        if entry and entry.get("blurbAr") != blurb:
            entry["blurbAr"] = blurb
            changed += 1
    for group in domains["groups"]:
        blurb = GROUP_BLURBS.get(group["id"])
        if blurb and group.get("blurbAr") != blurb:
            group["blurbAr"] = blurb
            changed += 1
    domains_path.write_text(
        json.dumps(domains, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print(f"formalised {changed} Arabic strings across content files")


if __name__ == "__main__":
    main()
