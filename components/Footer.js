"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  return <footer className="footer">{t("footer.text")}</footer>;
}
