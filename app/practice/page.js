"use client";

import { useMemo, useState, useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { KANA_GROUPS } from "@/lib/data";
import { WORDS_EN } from "@/lib/en";
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

function randomLocalKana(script) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return { type: "kana", ...pick(ALL_KANA), script };
}

function makeLocalKanaQuestion(script) {
  const item = randomLocalKana(script);
  const correct = item.r;
  const options = new Set([correct]);
  let guard = 0;
  while (options.size < 4 && guard++ < 200) {
    options.add(randomLocalKana(script).r);
  }
  return {
    item,
    correct,
    options: [...options].sort(() => Math.random() - 0.5),
  };
}

function displayChar(item) {
  if (!item || item.error) return "";
  if (item.type === "kanji") return item.c;
  return item.script === "katakana" ? item.k : item.h;
}

function wordMeaning(w, lang) {
  return lang === "en" ? WORDS_EN[w.w] || w.m : w.m;
}

// ---------- Random Character Card ----------
function RandomChar() {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState("hiragana");
  const [jlpt, setJlpt] = useState("all");
  const [item, setItem] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const next = async (m = mode, l = jlpt) => {
    setLoading(true);
    setRevealed(false);
    try {
      if (m === "kanji") {
        const res = await fetch(`/api/kanji?random=true&jlpt=${l}`);
        const data = await res.json();
        if (data && !data.error) {
          setItem({ type: "kanji", ...data });
        } else {
          setItem(null);
        }
      } else if (m === "mixed") {
        const subMode = ["hiragana", "katakana", "kanji"][Math.floor(Math.random() * 3)];
        if (subMode === "kanji") {
          const res = await fetch(`/api/kanji?random=true&jlpt=${l}`);
          const data = await res.json();
          if (data && !data.error) {
            setItem({ type: "kanji", ...data });
          } else {
            setItem(null);
          }
        } else {
          setItem(randomLocalKana(subMode));
        }
      } else {
        setItem(randomLocalKana(m));
      }
    } catch (err) {
      console.error(err);
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    next(mode, jlpt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, jlpt]);

  const words = useMemo(() => {
    if (!item || item.error) return [];
    if (item.type === "kanji") return wordsContainingKanji(item.c);
    return wordsStartingWith(item.script === "katakana" ? item.k : item.h);
  }, [item]);

  const changeMode = (m) => {
    setMode(m);
  };

  const changeJlpt = (l) => {
    setJlpt(l);
  };

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>{t("practice.random")}</h2>
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

      {(mode === "kanji" || mode === "mixed") && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{t("practice.level")}:</span>
          <select
            value={jlpt}
            onChange={(e) => changeJlpt(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--ink)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="all">{t("practice.all")}</option>
            <option value="5">N5</option>
            <option value="4">N4</option>
            <option value="3">N3</option>
            <option value="2">N2</option>
            <option value="1">N1</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="hint" style={{ textAlign: "center", margin: "40px 0" }}>
          {t("loading")}
        </p>
      ) : item ? (
        <>
          <div
            className="big-char jp"
            onClick={() => setDetail(item)}
            title="Detay için tıkla"
            style={{ cursor: "pointer" }}
          >
            {displayChar(item)}
          </div>
          {revealed ? (
            <div className="reveal">
              {item.type === "kanji" ? (
                <>
                  <b>{lang === "tr" && item.m_tr ? item.m_tr : item.meanings[0]}</b>{" "}
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
        <button className="btn" onClick={() => next(mode, jlpt)}>
          {t("practice.newChar")}
        </button>
      </div>

      {detail && <CharModal item={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

// ---------- Multiple Choice Quiz ----------
function Quiz() {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState("hiragana");
  const [jlpt, setJlpt] = useState("all");
  const [q, setQ] = useState(null);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState({ ok: 0, total: 0, streak: 0 });
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const recordCorrect = useMutation(api.progress.recordCorrect);

  const next = async (m = mode, l = jlpt) => {
    setLoading(true);
    setPicked(null);
    try {
      if (m === "kanji") {
        const res = await fetch(`/api/kanji?quiz=true&lang=${lang}&jlpt=${l}`);
        const data = await res.json();
        if (data && !data.error) {
          setQ(data);
        } else {
          setQ(null);
        }
      } else if (m === "mixed") {
        const subMode = ["hiragana", "katakana", "kanji"][Math.floor(Math.random() * 3)];
        if (subMode === "kanji") {
          const res = await fetch(`/api/kanji?quiz=true&lang=${lang}&jlpt=${l}`);
          const data = await res.json();
          if (data && !data.error) {
            setQ(data);
          } else {
            setQ(null);
          }
        } else {
          setQ(makeLocalKanaQuestion(subMode));
        }
      } else {
        setQ(makeLocalKanaQuestion(m));
      }
    } catch (err) {
      console.error(err);
      setQ(null);
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (m) => {
    setMode(m);
    setScore({ ok: 0, total: 0, streak: 0 });
    next(m, jlpt);
  };

  const changeJlpt = (l) => {
    setJlpt(l);
    setScore({ ok: 0, total: 0, streak: 0 });
    next(mode, l);
  };

  useEffect(() => {
    next(mode, jlpt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const pick = (opt) => {
    if (picked !== null || !q) return;
    setPicked(opt);
    const good = opt === q.correct;
    setScore((s) => ({
      ok: s.ok + (good ? 1 : 0),
      total: s.total + 1,
      streak: good ? s.streak + 1 : 0,
    }));
    if (good && q.item.type === "kanji" && isAuthenticated) {
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

      {(mode === "kanji" || mode === "mixed") && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{t("practice.level")}:</span>
          <select
            value={jlpt}
            onChange={(e) => changeJlpt(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "6px",
              border: "1.5px solid var(--border)",
              background: "var(--card)",
              color: "var(--ink)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          >
            <option value="all">{t("practice.all")}</option>
            <option value="5">N5</option>
            <option value="4">N4</option>
            <option value="3">N3</option>
            <option value="2">N2</option>
            <option value="1">N1</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="hint" style={{ textAlign: "center", margin: "40px 0" }}>
          {t("loading")}
        </p>
      ) : q ? (
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
              <button className="btn" onClick={() => next(mode, jlpt)}>
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
          <button className="btn" onClick={() => next(mode, jlpt)}>
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
