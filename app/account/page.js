"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";

function AuthForm() {
  const { t } = useI18n();
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState("signIn");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const formData = new FormData(e.target);
    formData.set("flow", flow);
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(flow === "signIn" ? t("account.signInErr") : t("account.signUpErr"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <div className="tabs">
        <button
          className={`tab ${flow === "signIn" ? "active" : ""}`}
          onClick={() => setFlow("signIn")}
        >
          {t("account.signIn")}
        </button>
        <button
          className={`tab ${flow === "signUp" ? "active" : ""}`}
          onClick={() => setFlow("signUp")}
        >
          {t("account.signUp")}
        </button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {flow === "signUp" && (
          <input
            name="name"
            placeholder={t("account.name")}
            required
            className="input"
          />
        )}
        <input
          name="email"
          type="email"
          placeholder={t("account.email")}
          required
          className="input"
        />
        <input
          name="password"
          type="password"
          placeholder={t("account.password")}
          required
          minLength={8}
          className="input"
        />
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "..." : flow === "signIn" ? t("account.signIn") : t("account.signUp")}
        </button>
      </form>
    </div>
  );
}

function AccountInfo() {
  const { t } = useI18n();
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const stats = useQuery(api.progress.myStats);

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>
        👤 {viewer?.name || viewer?.email || "..."}
      </h2>
      <p className="hint">{viewer?.email}</p>
      {stats && (
        <p>
          📚 <b>{stats.learned}</b> {t("stats.kanji")} · {t("stats.at")}{" "}
          <b>#{stats.position}</b> · ⭐ <b>{stats.score}</b>
        </p>
      )}
      <button className="btn secondary" onClick={() => void signOut()}>
        {t("account.signOut")}
      </button>
    </div>
  );
}

export default function AccountPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <div>
      <h1>{t("account.title")}</h1>
      <p className="subtitle">{t("account.subtitle")}</p>
      {isLoading ? (
        <p className="hint">{t("loading")}</p>
      ) : isAuthenticated ? (
        <AccountInfo />
      ) : (
        <AuthForm />
      )}
    </div>
  );
}
