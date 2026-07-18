"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KANA_GROUPS, KANJI } from "@/lib/data";
import { KANJI_EN, WORDS_EN } from "@/lib/en";
import { kanaToRomaji } from "@/lib/romaji";
import { speak } from "@/lib/tts";
import { wordsStartingWith, wordsContainingKanji } from "@/lib/words";
import { useI18n } from "@/lib/i18n";
import CharModal from "@/components/CharModal";

const MODES = [
  { id: "hiragana", label: "ひらがな" },
  { id: "katakana", label: "カタカナ" },
  { id: "kanji", label: "漢字" },
  { id: "mixed", label: "MIX" },
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

function kanjiMeaning(item, lang) {
  return lang === "en" ? KANJI_EN[item.c] || item.m : item.m;
}

function wordMeaning(w, lang) {
  return lang === "en" ? WORDS_EN[w.w] || w.m : w.m;
}

function answerOf(item, lang) {
  // Kana için romaji, kanji için seçili dilde anlam
  return item.type === "kanji" ? kanjiMeaning(item, lang) : item.r;
}

// ---------- Rastgele harf kartı ----------
function RandomChar() {
  const { t, lang } = useI18n();
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
      <h2 style={{ marginTop: 0 }}>{t("practice.random")}</h2>
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
                  <b>{kanjiMeaning(item, lang)}</b>{" "}
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
                  {t("practice.listen")}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", margin: "6px 0 14px" }}>
              <button className="btn secondary" onClick={() => setRevealed(true)}>
                {t("practice.reveal")}
              </button>
            </div>
          )}

          {revealed && words.length > 0 && (
            <div className="word-list">
              <div className="trace-title">
                {item.type === "kanji"
                  ? t("practice.wordsWithKanji")
                  : t("practice.wordsStarting")}
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
                  <span className="m">{wordMeaning(w, lang)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="hint" style={{ textAlign: "center" }}>
          {t("practice.hint")}
        </p>
      )}

      <div style={{ textAlign: "center", marginTop: 14 }}>
        <button className="btn" onClick={next}>
          {t("practice.newChar")}
        </button>
      </div>

      {detail && <CharModal item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ---------- Çoktan seçmeli quiz ----------
function makeQuestion(mode, lang) {
  const item = randomItem(mode);
  const correct = answerOf(item, lang);
  const options = new Set([correct]);
  let guard = 0;
  while (options.size < 4 && guard++ < 200) {
    const other = answerOf(
      randomItem(mode === "mixed" ? (item.type === "kanji" ? "kanji" : "hiragana") : mode),
      lang
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
  const { t, lang } = useI18n();
  const [mode, setMode] = useState("hiragana");
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 });
  const { isAuthenticated } = useConvexAuth();
  const recordCorrect = useMutation(api.progress.recordCorrect);

  const next = (m = mode) => {
    setQ(makeQuestion(m, lang));
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
      <h2 style={{ marginTop: 0 }}>{t("practice.quiz")}</h2>
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
            {q.item.type === "kanji"
              ? t("practice.quizHintKanji")
              : t("practice.quizHintKana")}
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
                {t("practice.next")}
              </button>
            </div>
          )}
          <div className="scoreboard">
            <span>
              {t("practice.correct")}: <b>{score.ok}</b> / {score.total}
            </span>
            <span>
              {t("practice.streak")}: <b>{score.streak}</b> 🔥
            </span>
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center" }}>
          <p className="hint">{t("practice.quizIntro")}</p>
          <button className="btn" onClick={() => next()}>
            {t("practice.start")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  const { t } = useI18n();
  return (
    <div>
      <h1>{t("practice.title")}</h1>
      <p className="subtitle">{t("practice.intro")}</p>
      <div className="practice-grid">
        <RandomChar />
        <Quiz />
      </div>
    </div>
  );
}
