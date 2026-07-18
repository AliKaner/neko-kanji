"use client";

import { useRef, useState } from "react";
import { TEXTS } from "@/lib/data";
import { GLOSS_EN, TEXT_TITLE_EN, LEVEL_EN } from "@/lib/en";
import { kanaToRomaji } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import { useI18n } from "@/lib/i18n";

export default function ReadPage() {
  const { t, lang } = useI18n();
  const [textId, setTextId] = useState(TEXTS[0].id);
  const [tip, setTip] = useState(null); // { token, x, y }
  const areaRef = useRef(null);

  const text = TEXTS.find((x) => x.id === textId);

  const jpTitle = (x) => x.title.split("—")[0].trim();
  const displayTitle = (x) =>
    lang === "en" && TEXT_TITLE_EN[x.id]
      ? `${jpTitle(x)} — ${TEXT_TITLE_EN[x.id]}`
      : x.title;
  const displayLevel = (x) =>
    lang === "en" ? LEVEL_EN[x.level] || x.level : x.level;

  // Anlamı seçili dile göre bul: yeni metinlerde token.me var,
  // eski metinlerde Türkçe açıklamadan EN sözlüğüne bakılır.
  const meaningOf = (token) =>
    lang === "en" ? token.me || GLOSS_EN[token.m] || token.m : token.m;

  const showTip = (e, token) => {
    if (!token.r) return;
    setTip({ token, x: e.clientX, y: e.clientY });
  };

  const moveTip = (e) => {
    setTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
  };

  return (
    <div>
      <h1>{t("read.title")}</h1>
      <p className="subtitle">{t("read.subtitle")}</p>

      <div className="tabs">
        {TEXTS.map((x) => (
          <button
            key={x.id}
            className={`tab jp ${x.id === textId ? "active" : ""}`}
            onClick={() => setTextId(x.id)}
          >
            {jpTitle(x)}
          </button>
        ))}
      </div>

      <div className="card">
        <h2 className="jp" style={{ marginTop: 0 }}>
          {displayTitle(text)} <span className="badge">{displayLevel(text)}</span>
        </h2>
        <div style={{ marginBottom: 12 }}>
          <button
            className="btn secondary small"
            onClick={() => speak(text.tokens.map((x) => x.t).join(""))}
          >
            {t("read.listenAll")}
          </button>
        </div>
        <div className="reading-text jp" ref={areaRef}>
          {text.tokens.map((token, i) =>
            token.r ? (
              <span
                key={i}
                className="token"
                onMouseEnter={(e) => showTip(e, token)}
                onMouseMove={moveTip}
                onMouseLeave={() => setTip(null)}
                onClick={() => speak(token.t)}
              >
                {token.t}
              </span>
            ) : (
              <span key={i}>{token.t}</span>
            )
          )}
        </div>
      </div>

      {tip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(
              tip.x + 14,
              typeof window !== "undefined" ? window.innerWidth - 300 : tip.x
            ),
            top: tip.y + 18,
          }}
        >
          <div className="tt-reading jp">{tip.token.r}</div>
          <div className="tt-romaji">{kanaToRomaji(tip.token.r)}</div>
          <div className="tt-meaning">
            {lang === "en" ? "🇬🇧" : "🇹🇷"} {meaningOf(tip.token)}
          </div>
        </div>
      )}
    </div>
  );
}
