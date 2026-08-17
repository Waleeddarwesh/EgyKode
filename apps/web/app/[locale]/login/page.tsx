import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
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

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslations(locale as Locale);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-content">{t("auth.signInTitle")}</h1>
      <p className="mt-2 mb-8 text-content-secondary">{t("auth.signInBody")}</p>
      <AuthForm
        mode="login"
        locale={locale as Locale}
        labels={{
          name: t("auth.name"),
          handle: t("auth.handle"),
          handleHint: t("auth.handleHint"),
          email: t("auth.email"),
          password: t("auth.password"),
          passwordHint: t("auth.passwordHint"),
          createAccount: t("auth.createAccount"),
          signIn: t("auth.signIn"),
          haveAccount: t("auth.haveAccount"),
          noAccount: t("auth.noAccount"),
          networkError: t("auth.networkError"),
        }}
      />
    </div>
  );
}
