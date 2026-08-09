import { notFound } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getTranslations, isLocale, type Locale } from "@/lib/i18n";

export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getTranslations(locale as Locale);

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-content">{t("auth.createTitle")}</h1>
      <p className="mt-2 mb-8 text-content-secondary">{t("auth.createBody")}</p>
      <AuthForm
        mode="register"
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
