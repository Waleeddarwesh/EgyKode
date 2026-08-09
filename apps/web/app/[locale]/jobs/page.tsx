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
  return { title: t("jobs.title"), description: t("jobs.intent") };
}

export default async function JobsPage({
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
      phase={t("upcoming.phase4")}
      title={t("jobs.title")}
      intent={t("jobs.intent")}
      items={[
        { title: t("jobs.boardTitle"), body: t("jobs.boardBody") },
        { title: t("jobs.matchTitle"), body: t("jobs.matchBody") },
        { title: t("jobs.alertsTitle"), body: t("jobs.alertsBody") },
        { title: t("jobs.employerTitle"), body: t("jobs.employerBody") },
      ]}
      elsewhere={[
        { href: `/${typed}/learn`, label: t("nav.learn") },
        { href: `/${typed}/roadmaps`, label: t("nav.roadmaps") },
      ]}
    />
  );
}
