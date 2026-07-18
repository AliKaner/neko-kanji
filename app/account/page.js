"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function AuthForm() {
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
      setError(
        flow === "signIn"
          ? "Giriş başarısız. E-posta veya şifre hatalı."
          : "Kayıt başarısız. Şifre en az 8 karakter olmalı; bu e-posta zaten kayıtlı olabilir."
      );
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
          Giriş Yap
        </button>
        <button
          className={`tab ${flow === "signUp" ? "active" : ""}`}
          onClick={() => setFlow("signUp")}
        >
          Kayıt Ol
        </button>
      </div>
      <form onSubmit={submit} className="auth-form">
        {flow === "signUp" && (
          <input
            name="name"
            placeholder="Adın (arkadaşların böyle görecek)"
            required
            className="input"
          />
        )}
        <input
          name="email"
          type="email"
          placeholder="E-posta"
          required
          className="input"
        />
        <input
          name="password"
          type="password"
          placeholder="Şifre (en az 8 karakter)"
          required
          minLength={8}
          className="input"
        />
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {busy ? "..." : flow === "signIn" ? "Giriş Yap" : "Kayıt Ol"}
        </button>
      </form>
    </div>
  );
}

function AccountInfo() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const stats = useQuery(api.progress.myStats);

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2 style={{ marginTop: 0 }}>👤 {viewer?.name || viewer?.email || "..."}</h2>
      <p className="hint">{viewer?.email}</p>
      {stats && (
        <p>
          📚 <b>{stats.learned}</b> kanji öğrenildi · sırada{" "}
          <b>#{stats.position}</b> · puan <b>{stats.score}</b>
        </p>
      )}
      <button className="btn secondary" onClick={() => void signOut()}>
        Çıkış Yap
      </button>
    </div>
  );
}

export default function AccountPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  return (
    <div>
      <h1>👤 Hesap</h1>
      <p className="subtitle">
        Üye ol; kanji ilerlemen kaydedilsin, arkadaşlarınla ve gruplarla yarış.
      </p>
      {isLoading ? (
        <p className="hint">Yükleniyor...</p>
      ) : isAuthenticated ? (
        <AccountInfo />
      ) : (
        <AuthForm />
      )}
    </div>
  );
}
