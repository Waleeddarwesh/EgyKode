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
  return { title: t("courses.title"), description: t("courses.intent") };
}

export default async function CoursesPage({
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
      phase={t("upcoming.phase5")}
      title={t("courses.title")}
      intent={t("courses.intent")}
      items={[
        { title: t("courses.videoTitle"), body: t("courses.videoBody") },
        { title: t("courses.structureTitle"), body: t("courses.structureBody") },
        { title: t("courses.bilingualTitle"), body: t("courses.bilingualBody") },
        { title: t("courses.certTitle"), body: t("courses.certBody") },
      ]}
      elsewhere={[
        { href: `/${typed}/learn`, label: t("nav.learn") },
        { href: `/${typed}/roadmaps`, label: t("nav.roadmaps") },
      ]}
    />
  );
}
