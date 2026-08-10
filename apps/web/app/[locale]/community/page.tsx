import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Upcoming } from "@/components/layout/upcoming";
import { getTranslations, isLocale, type Locale } from "@/lib/i18n";
import { SITE } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getTranslations(locale);
  return { title: t("community.title"), description: t("community.intent") };
}

export default async function CommunityPage({
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
      phase={t("upcoming.phase3")}
      title={t("community.title")}
      intent={t("community.intent")}
      items={[
        {
          title: t("community.feedTitle"),
          body: t("community.feedBody"),
          // The bank is live today — 215 questions — so this card leads there
          // rather than describing something the reader cannot reach.
          href: `/${typed}/prepare/questions`,
          cta: t("questions.title"),
        },
        { title: t("community.chatTitle"), body: t("community.chatBody") },
        { title: t("community.contributeTitle"), body: t("community.contributeBody") },
        { title: t("community.profileTitle"), body: t("community.profileBody") },
      ]}
      elsewhere={[
        { href: `/${typed}/projects`, label: t("nav.projects") },
        { href: SITE.repo, label: "GitHub" },
      ]}
    />
  );
}
