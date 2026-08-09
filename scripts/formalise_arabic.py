#!/usr/bin/env python3
"""
Rewrite the Arabic UI catalogue in formal Modern Standard Arabic.

MASTER_PROMPT §2.3. The register is now formal MSA — the voice an international
engineering company uses — not Egyptian dialect. What does NOT change is the
terminology model: product names and technical terms stay in Latin script
(Category A), resource names keep the definite article with the English term
(Category B), and only the explanation is Arabic (Category C).

  Dialect                          Formal MSA
  ─────────────────────────────    ─────────────────────────────
  مش أربعين درس متفرّق              ليست أربعين درساً متفرقاً
  بيتبني بـ Terraform               يُبنى باستخدام Terraform
  علشان / عشان                      لكي / حتى
  اللي                              الذي / التي
  إزاي                              كيف
  دلوقتي                            الآن
  شوف                               اطّلع على

Run: python scripts/formalise_arabic.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AR = ROOT / "apps" / "web" / "messages" / "ar.json"

FORMAL: dict[str, str] = {
    # ── Brand ────────────────────────────────────────────────────────────────
    "brand.tagline": "تعلّم. ابنِ. انشر.",
    "brand.promise": "كل مسار ينتهي بمشروع production حقيقي قابل للنشر.",
    "brand.philosophy": "تعلّم بالبناء. ابنِ بالتشغيل. أثبت ذلك في الإنتاج.",
    "brand.descriptor": "منصة الـ Cloud و الـ DevOps المفتوحة — بالعربية والإنجليزية.",

    # ── Navigation & actions ────────────────────────────────────────────────
    "nav.skipToContent": "تخطَّ إلى المحتوى",
    "action.seePlatform": "استعرض المنصة",
    "action.startLearning": "ابدأ التعلّم",
    "action.viewAll": "عرض الكل",

    # ── Home ────────────────────────────────────────────────────────────────
    "home.heroTitle": "تعلّم الـ Cloud و الـ DevOps من خلال بناء منصة production حقيقية واحدة.",
    "home.heroBody": "ليست أربعين درساً متفرقاً، بل نظام واحد: يُبنى باستخدام Terraform، ويُهيّأ عبر Ansible، ويعمل على Kubernetes تديره بنفسك، ويُنشر عبر GitOps، ويخضع للمراقبة من أوله إلى آخره. أنت من يبنيه، مرحلةً تلو الأخرى.",
    "home.whyTitle": "لماذا وُجدت هذه المنصة",
    "home.why1Title": "نظام حقيقي واحد",
    "home.why1Body": "كل فصل يرتبط بالمعمارية نفسها — وحدات Terraform حقيقية، وأدوار Ansible حقيقية، وخطوط pipelines حقيقية. المشروع نفسه هو المنهج.",
    "home.why2Title": "بالعربية والإنجليزية",
    "home.why2Body": "العربية لغة أساسية هنا، وليست طبقة ترجمة. الواجهة RTL بطبيعتها، والمصطلحات التقنية مُعالَجة بدقة.",
    "home.why3Title": "مجاني ومفتوح",
    "home.why3Body": "رخصة MIT للكود، و CC BY-SA للمحتوى. بلا اشتراكات ولا إعلانات، ومبني ليُساهم فيه الآخرون.",
    "home.pathBody": "عشر مراحل، من سطر أوامر Linux إلى منصة قابلة للنشر والتشغيل.",
    "home.continueHeading": "تابع من حيث توقفت",
    "home.continueResume": "متابعة",
    "home.continueDone": "اكتمل المسار. حان وقت بناء مشروع الإنتاج.",
    "home.continueNext": "استعرض المشاريع",

    # ── Learn ───────────────────────────────────────────────────────────────
    "learn.subtitle": "المنهج مُرتَّباً. ابدأ من المرحلة 01، أو انتقل مباشرةً إلى ما تحتاجه.",
    "learn.referenceBody": "ليست جزءاً من المسار المرتَّب — ارجع إليها عند الحاجة.",
    "chapter.objectives": "بعد هذا الفصل ستكون قادراً على",
    "chapter.onThisPage": "في هذه الصفحة",
    "chapter.improve": "حسّن هذه الصفحة",
    "chapter.notTranslated": "هذا الفصل غير متاح بالعربية بعد.",
    "chapter.notTranslatedCta": "ساهم في ترجمته",

    # ── Roadmaps ────────────────────────────────────────────────────────────
    "roadmaps.subtitle": "مسارات مرتَّبة عبر المحتوى نفسه، ينتهي كل منها بشيء تقوم بنشره.",
    "roadmap.privacyNote": "يُحفظ تقدّمك في هذا المتصفح فقط. المزامنة مع الحساب قادمة قريباً.",
    "roadmap.remaining": "يتبقى نحو {time} من القراءة",

    # ── Topics ──────────────────────────────────────────────────────────────
    "topics.subtitle": "مفاهيم، لا أدوات فحسب. يعرض كل موضوع الفصول والمعامل والمسارات والمشاريع التي تغطيه فعلياً.",
    "topics.derivedNote": "{count} موضوعاً، مستخلصة من المحتوى — لا يظهر الموضوع إلا إذا كانت وراءه مادة.",
    "topics.browseByTool": "أو تصفَّح حسب الأداة",
    "topics.startHere": "ابدأ بالفصل الأول",
    "topics.inRoadmaps": "جزء من هذه المسارات",
    "topics.inProjects": "مستخدَم في هذه المشاريع",

    # ── Projects ────────────────────────────────────────────────────────────
    "build.subtitle": "أنظمة حقيقية بكودها، وبالمفاضلات التي تنطوي عليها، وبمن قام ببنائها.",
    "build.viewSource": "استعرض الكود",
    "build.viewProject": "استعرض المشروع",
    "build.sourceUnpublished": "الكود غير منشور بعد",
    "build.why": "لماذا وُجد",
    "build.whatsInside": "ما الذي يحتويه",
    "build.importedNotice": "مستورد من GitHub. يبقى الكود ملكاً لصاحبه، وتكتفي EgyKode بالربط بالمستودع الأصلي.",

    # ── Labs ────────────────────────────────────────────────────────────────
    "labs.subtitle": "نفّذ بنفسك. لكل معمل معايير نجاح تتحقق منها بنفسك، ويصاحبه challenge يحذف التعليمات.",
    "labs.pairNote": "يأتي كل معمل بمستويين: مع الخطوات، ثم الهدف نفسه بدونها.",
    "labs.guided": "معمل موجَّه",
    "labs.criteriaChallenge": "تكون قد أنجزت العمل عندما",
    "labs.allDone": "تحققت جميع المعايير. بهذا يكتمل المعمل.",
    "labs.costTitle": "ينشئ هذا موارد مدفوعة.",
    "labs.costBody": "شغّله في بيئة dev واحذفه عند الانتهاء، واضبط تنبيه ميزانية أولاً.",
    "labs.readyToTry": "مستعد لتجربته دون مساعدة؟",
    "labs.doItAlone": "ابدأ الـ challenge",
    "labs.needTheSteps": "تعثّرت؟",
    "labs.backToGuided": "افتح المعمل الموجَّه",

    # ── Code blocks ─────────────────────────────────────────────────────────
    "code.copied": "تم النسخ",
    "code.destructive": "أمر تدميري",
    "code.destructiveBody": "يحذف هذا موارد حقيقية. تحقق أولاً من البيئة التي تعمل فيها.",

    # ── Auth & profile ──────────────────────────────────────────────────────
    "auth.createBody": "تابع تقدّمك، واحفظ الفصول، وابنِ ملفاً شخصياً يوضّح ما أنجزته فعلياً.",
    "auth.handleHint": "سيكون ملفك على /u/المعرّف. حروف وأرقام وشرطة أو شرطة سفلية.",
    "auth.passwordHint": "عشرة أحرف على الأقل.",
    "auth.networkError": "تعذّر الوصول إلى الخادم. تحقق من اتصالك ثم أعد المحاولة.",
    "profile.subtitle": "هذا ما يراه الآخرون.",
    "profile.photoHint": "يُفضَّل أن تكون الصورة مربعة. JPG أو PNG أو WebP، حتى 2 ميجابايت.",
    "profile.saved": "تم الحفظ",
    "profile.signedOut": "أنت غير مسجَّل الدخول.",

    # ── Upcoming sections ───────────────────────────────────────────────────
    "prepare.intent": "كل ما تحتاجه في الأسبوع السابق للمقابلة، وفي الساعة التالية لفشل عملية نشر.",
    "prepare.interviewBody": "أسئلة مرتَّبة من junior إلى staff، مع إجابة موجزة في ثلاثين ثانية، وإجابة كاملة، والسؤال الذي يليها.",
    "prepare.troubleshootBody": "نبدأ من العَرَض لا من الأداة. الصق رسالة الخطأ التي ظهرت لك، وستجد أوامر التشخيص مرتَّبة.",
    "prepare.quizBody": "مراجعة متباعدة لكل ما قرأته، حتى يبقى راسخاً بعد ثلاثة أشهر.",
    "prepare.cheatsheetBody": "kubectl و terraform و docker و helm و git — الخيارات المهمة بمخرجات حقيقية.",
    "community.intent": "المجتمع هو الجزء الذي يتراكم أثره. سيُفتح عندما يستحق المحتوى أن يجتمع الناس حوله.",
    "community.feedBody": "ضمن نطاق الـ Cloud و الـ DevOps حصراً. تظهر الأسئلة بلا إجابة أولاً — فالمجتمع الذي لا يُجاب فيه أحد مجتمع ميت.",
    "community.chatBody": "غرف لكل مجال، ومجموعات صغيرة خاصة حول مسار أو معمل.",
    "community.contributeBody": "صحّح خطأً إملائياً، أو ترجم فصلاً، أو اكتب معملاً. الترجمة هي الأعلى قيمة والأقل حاجزاً.",
    "community.profileBody": "لا تظهر المهارة إلا بدليل: فصل مقروء، واختبار مجتاز، ومعمل منجَز.",
    "jobs.intent": "وظائف Cloud و DevOps و SRE و Platform، مطابَقة مع ما أثبته فعلياً.",
    "jobs.boardBody": "مصر والشرق الأوسط أولاً، والعمل عن بُعد من أي مكان. ذكر نطاق الراتب إلزامي، وإلا وُسم الإعلان وتراجع ترتيبه.",
    "jobs.matchBody": "مهاراتك الموثَّقة مقابل متطلبات الوظيفة، مع ربط الفجوات بالفصول التي تسدّها.",
    "jobs.alertsBody": "تنبيهات بالبريد أو إشعار عند ظهور إعلان مناسب.",
    "jobs.employerBody": "النشر مجاني، ويراجع إنسانٌ أول إعلان لكل حساب قبل ظهوره.",
    "courses.intent": "مسارات فيديو موجَّهة عبر الفصول نفسها، لمن لا يفضّل البدء بالقراءة.",
    "courses.videoBody": "يُستضاف الفيديو على YouTube ويُحمَّل بعد النقر. استضافة الفيديو ذاتياً أسرع طريق إلى فاتورة، ولا تضيف شيئاً يشعر به المتعلّم.",
    "courses.structureBody": "يجمع كل درس تسجيلاً مع الفصل الذي يشرحه، والمعمل الذي يثبته، واختباراً قصيراً. الفيديو نقطة بداية لا بديل.",
    "courses.bilingualBody": "شرح بالعربية مع ترجمة مراجَعة لا تلقائية. تبقى تسجيلات الـ terminal من اليسار إلى اليمين ومقروءة في اللغتين.",
    "courses.certBody": "قابلة للتحقق، وصريحة فيما هي: سجل إتمام، لا شهادة معتمدة من الصناعة.",

    # ── Search & filters ────────────────────────────────────────────────────
    "search.placeholder": "ابحث في الفصول والمسارات والمشاريع…",
    "search.empty": "لا توجد نتائج مطابقة. جرّب كلمات أقل.",
    "search.hint": "اكتب للبحث. ↑↓ للتنقل، ↵ للفتح.",
    "filter.search": "تصفية بالاسم…",
    "filter.empty": "لا يوجد ما يطابق هذه الفلاتر.",
    "filter.clear": "امسح الفلاتر",

    # ── Errors & footer ─────────────────────────────────────────────────────
    "error.notFoundBody": "هذه الصفحة غير موجودة، أو تم نقلها.",
    "footer.builtWith": "مبني في العلن.",
    "footer.license": "رخصة MIT للكود، و CC BY-SA 4.0 للمحتوى.",
}


def main() -> None:
    data = json.loads(AR.read_text(encoding="utf-8"))
    changed = 0
    for key, value in FORMAL.items():
        if key not in data:
            print(f"  ! key not in catalogue, skipped: {key}")
            continue
        if data[key] != value:
            data[key] = value
            changed += 1

    AR.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"formalised {changed} of {len(FORMAL)} Arabic strings ({len(data)} keys total)")


if __name__ == "__main__":
    main()
