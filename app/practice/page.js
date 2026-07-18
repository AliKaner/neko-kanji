"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KANA_GROUPS, KANJI } from "@/lib/data";
import { kanaToRomaji } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import { wordsStartingWith, wordsContainingKanji } from "@/lib/words";
import CharModal from "@/components/CharModal";

const MODES = [
  { id: "hiragana", label: "ひらがな" },
  { id: "katakana", label: "カタカナ" },
  { id: "kanji", label: "漢字" },
  { id: "mixed", label: "Karışık" },
];

const ALL_KANA = KANA_GROUPS.flatMap((g) => g.rows.flat()).filter(Boolean);

function randomItem(mode) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const m = mode === "mixed" ? pick(["hiragana", "katakana", "kanji"]) : mode;
  if (m === "kanji") return { type: "kanji", ...pick(KANJI) };
  return { type: "kana", ...pick(ALL_KANA), script: m };
}

function displayChar(item) {
  if (item.type === "kanji") return item.c;
  return item.script === "katakana" ? item.k : item.h;
}

function answerOf(item) {
  // Kana için romaji, kanji için Türkçe anlam
  return item.type === "kanji" ? item.m : item.r;
}

// ---------- Rastgele harf kartı ----------
function RandomChar() {
  const [mode, setMode] = useState("hiragana");
  const [item, setItem] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [detail, setDetail] = useState(null);

  const next = () => {
    setItem(randomItem(mode));
    setRevealed(false);
  };

  const words = useMemo(() => {
    if (!item) return [];
    if (item.type === "kanji") return wordsContainingKanji(item.c);
    return wordsStartingWith(item.script === "katakana" ? item.k : item.h);
  }, [item]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>🎲 Rastgele Harf</h2>
      <div className="tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`tab jp ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {item ? (
        <>
          <div
            className="big-char jp"
            onClick={() => setDetail(item)}
            title="Detay için tıkla"
          >
            {displayChar(item)}
          </div>
          {revealed ? (
            <div className="reveal">
              {item.type === "kanji" ? (
                <>
                  <b>{item.m}</b>{" "}
                  <span className="romaji">
                    {[...item.on, ...item.kun].join("、")}
                  </span>
                </>
              ) : (
                <>
                  <b>{item.r}</b>{" "}
                  <span className="romaji jp">
                    ({item.h} / {item.k})
                  </span>
                </>
              )}
              <div style={{ marginTop: 6 }}>
                <button
                  className="btn secondary small"
                  onClick={() =>
                    speak(
                      item.type === "kanji"
                        ? (item.kun[0] || item.on[0] || item.c).replace(/\(.*\)/, "")
                        : item.h
                    )
                  }
                >
                  🔊 Dinle
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", margin: "6px 0 14px" }}>
              <button className="btn secondary" onClick={() => setRevealed(true)}>
                👁️ Okunuşu Göster
              </button>
            </div>
          )}

          {revealed && words.length > 0 && (
            <div className="word-list">
              <div className="trace-title">
                {item.type === "kanji"
                  ? "Bu kanjiyi içeren kelimeler:"
                  : "Bu harfle başlayan kelimeler:"}
              </div>
              {words.slice(0, 4).map((w) => (
                <div
                  key={w.w}
                  className="word-item"
                  onClick={() => speak(w.kana)}
                  title="Dinlemek için tıkla"
                >
                  <span className="w jp">{w.w}</span>
                  <span className="r jp">{w.kana}</span>
                  <span className="romaji">{kanaToRomaji(w.kana)}</span>
                  <span className="m">{w.m}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="hint" style={{ textAlign: "center" }}>
          Butona bas, rastgele bir karakter gelsin. Okunuşunu tahmin etmeye
          çalış!
        </p>
      )}

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button className="btn" onClick={next}>
          🎲 Yeni Harf Gönder
        </button>
      </div>

      {detail && <CharModal item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ---------- Çoktan seçmeli quiz ----------
function makeQuestion(mode) {
  const item = randomItem(mode);
  const correct = answerOf(item);
  const options = new Set([correct]);
  let guard = 0;
  while (options.size < 4 && guard++ < 200) {
    const other = answerOf(
      randomItem(mode === "mixed" ? (item.type === "kanji" ? "kanji" : "hiragana") : mode)
    );
    options.add(other);
  }
  return {
    item,
    correct,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

function Quiz() {
  const [mode, setMode] = useState("hiragana");
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 });
  const { isAuthenticated } = useConvexAuth();
  const recordCorrect = useMutation(api.progress.recordCorrect);

  const next = (m = mode) => {
    setQ(makeQuestion(m));
    setPicked(null);
  };

  const changeMode = (m) => {
    setMode(m);
    setScore({ ok: 0, total: 0, streak: 0 });
    next(m);
  };

  const pick = (opt) => {
    if (picked !== null) return;
    setPicked(opt);
    const good = opt === q.correct;
    setScore((s) => ({
      ok: s.ok + (good ? 1 : 0),
      total: s.total + 1,
      streak: good ? s.streak + 1 : 0,
    }));
    if (good && q.item.type === "kanji" && isAuthenticated) {
      // Kanji haritasındaki sayacı artır (top 2500 listesindeyse)
      recordCorrect({ char: q.item.c }).catch(() => {});
    }
    if (q.item.type !== "kanji") speak(q.item.h);
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>❓ Quiz</h2>
      <div className="tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            className={`tab jp ${mode === m.id ? "active" : ""}`}
            onClick={() => changeMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {q ? (
        <>
          <div className="big-char jp">{displayChar(q.item)}</div>
          <p className="hint" style={{ textAlign: "center", margin: 0 }}>
            {q.item.type === "kanji" ? "Bu kanjinin anlamı ne?" : "Bu harfin okunuşu ne?"}
          </p>
          <div className="quiz-options">
            {q.options.map((opt) => (
              <button
                key={opt}
                className={`quiz-option ${
                  picked !== null
                    ? opt === q.correct
                      ? "correct"
                      : opt === picked
                      ? "wrong"
                      : ""
                    : ""
                }`}
                disabled={picked !== null}
                onClick={() => pick(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
          {picked !== null && (
            <div style={{ textAlign: "center", marginTop: 14 }}>
              <button className="btn" onClick={() => next()}>
                Sonraki Soru →
              </button>
            </div>
          )}
          <div className="scoreboard">
            <span>Doğru: <b>{score.ok}</b> / {score.total}</span>
            <span>Seri: <b>{score.streak}</b> 🔥</span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <p className="hint">Karakteri gör, doğru okunuşu / anlamı seç.</p>
          <button className="btn" onClick={() => next()}>
            ▶ Quize Başla
          </button>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <div>
      <h1>🎲 Pratik</h1>
      <p className="subtitle">
        Rastgele karakterlerle kendini test et — o harfle başlayan kelimeleri
        keşfet.
      </p>
      <div className="practice-grid">
        <RandomChar />
        <Quiz />
      </div>
    </div>
  );
}
