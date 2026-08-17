import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileForm } from "@/components/auth/profile-form";
import { getTranslations, isLocale, type Locale } from "@/lib/i18n";

/**
 * Not indexed. The root layout marks the whole site `index: true`, which is
 * right for content and wrong for an account form — there is nothing here to
 * rank for, and the property already has a backlog of real pages waiting to
 * be crawled. Links are still followed.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function ProfileSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslations(locale as Locale);

  return (
    <div className="mx-auto max-w-xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-content">{t("profile.title")}</h1>
      <p className="mt-2 mb-10 text-content-secondary">{t("profile.subtitle")}</p>
      <ProfileForm
        labels={{
          name: t("auth.name"),
          nameAr: t("profile.nameAr"),
          headline: t("profile.headline"),
          location: t("profile.location"),
          bio: t("profile.bio"),
          social: t("profile.social"),
          website: t("profile.website"),
          changePhoto: t("profile.changePhoto"),
          photoHint: t("profile.photoHint"),
          save: t("profile.save"),
          saved: t("profile.saved"),
          signedOut: t("profile.signedOut"),
          networkError: t("auth.networkError"),
        }}
      />
    </div>
  );
}
