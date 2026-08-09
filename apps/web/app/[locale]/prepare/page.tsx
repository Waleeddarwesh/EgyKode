import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Upcoming } from "@/components/layout/upcoming";
import { getTranslations, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslations(locale);
  return { title: t("prepare.title"), description: t("prepare.intent") };
}

export default async function PreparePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const typed = locale as Locale;
  const t = getTranslations(typed);

  return (
    <Upcoming
      locale={typed}
      phase={t("upcoming.phase2")}
      title={t("prepare.title")}
      intent={t("prepare.intent")}
      items={[
        { title: t("prepare.interviewTitle"), body: t("prepare.interviewBody") },
        { title: t("prepare.troubleshootTitle"), body: t("prepare.troubleshootBody") },
        { title: t("prepare.quizTitle"), body: t("prepare.quizBody") },
        { title: t("prepare.cheatsheetTitle"), body: t("prepare.cheatsheetBody") },
      ]}
      elsewhere={[
        { href: `/${typed}/prepare/questions`, label: t("questions.title") },
        { href: `/${typed}/learn`, label: t("nav.learn") },
        { href: `/${typed}/roadmaps`, label: t("nav.roadmaps") },
      ]}
    />
  );
}
