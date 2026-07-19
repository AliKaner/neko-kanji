"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import { kanaToRomaji } from "@/lib/romaji";
import { WORDS_EN } from "@/lib/en";
import { speak } from "@/lib/tts";

const ALL_MODES = ["meaning", "reading", "word", "revMeaning", "revReading"];
const DEFAULT_MODES = ["meaning", "reading", "revMeaning", "revReading"];

// "た.べる" / "ひと(つ)" / "-び" → "たべる" gibi temiz okunuş
function cleanReading(r) {
  return (r || "")
    .replace(/\(.*?\)/g, "")
    .replace(/[.\-()]/g, "")
    .trim();
}

function normalize(s) {
  return (s || "")
    .toLocaleLowerCase("tr")
    .replace(/\(.*?\)/g, "")
    .replace(/[.,;!?'"‘’]/g, "")
    .trim();
}

// "gün, güneş; day" → ["gün", "güneş", "day"]
function tokens(str) {
  return (str || "")
    .split(/[,;/·]/)
    .map((x) => normalize(x))
    .filter((x) => x.length > 0);
}

function readingAnswers(item) {
  const out = new Set();
  for (const r of [...(item.on || []), ...(item.kun || [])]) {
    const clean = cleanReading(r);
    if (!clean) continue;
    out.add(normalize(clean));
    out.add(normalize(kanaToRomaji(clean)));
  }
  return [...out].filter(Boolean);
}

function meaningAnswers(item) {
  const out = new Set();
  // İngilizce anlamlar esas; Türkçe bilenler için m_tr de kabul edilir
  for (const m of item.meanings || []) for (const tk of tokens(m)) out.add(tk);
  for (const tk of tokens(item.m_tr || "")) out.add(tk);
  return [...out].filter(Boolean);
}

function wordAnswers(item) {
  const out = new Set();
  for (const tk of tokens(item.ex?.m || "")) out.add(tk);
  const en = WORDS_EN[item.ex?.w];
  if (en) for (const tk of tokens(en)) out.add(tk);
  return [...out].filter(Boolean);
}

function primaryRomaji(item) {
  const rs = [...(item.on || []), ...(item.kun || [])]
    .map((r) => cleanReading(r))
    .filter(Boolean)
    .slice(0, 2)
    .map((r) => kanaToRomaji(r));
  return [...new Set(rs)].join(" / ");
}

// Cevap açıklaması: TR + EN anlam, okunuşlar (kana + romaji), kelime bilgisi
function AnswerInfo({ q }) {
  const item = q.item;
  const readings = [...(item.on || []), ...(item.kun || [])]
    .map((r) => {
      const clean = cleanReading(r);
      return clean ? `${clean} (${kanaToRomaji(clean)})` : null;
    })
    .filter(Boolean)
    .slice(0, 6);
  const wordEn = item.ex ? WORDS_EN[item.ex.w] : null;

  return (
    <div className="ktest-answer">
      {q.mode.startsWith("rev") && (
        <div className="jp ktest-answer-word" style={{ fontSize: "2rem" }}>
          {item.c}
        </div>
      )}
      {q.mode === "word" && item.ex && (
        <div className="jp ktest-answer-word">
          {item.ex.w} 「{item.ex.r}」{" "}
          <span className="hint">({kanaToRomaji(item.ex.r)})</span>
        </div>
      )}
      {q.mode === "word" && item.ex && (
        <div>
          🇹🇷 <b>{item.ex.m}</b>
          {wordEn && (
            <>
              {" "}· 🇬🇧 <b>{wordEn}</b>
            </>
          )}
        </div>
      )}
      {item.m_tr && (
        <div>
          🇹🇷 <b>{item.m_tr}</b>
        </div>
      )}
      {item.meanings?.length > 0 && (
        <div>
          🇬🇧 <b>{item.meanings.slice(0, 4).join(", ")}</b>
        </div>
      )}
      {readings.length > 0 && (
        <div className="jp ktest-answer-readings">📖 {readings.join("、")}</div>
      )}
    </div>
  );
}

export default function KanjiTestPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const kanjiList = useQuery(api.kanji.list);
  const myMap = useQuery(api.progress.myMap);
  const recordCorrect = useMutation(api.progress.recordCorrect);

  const [modes, setModes] = useState(DEFAULT_MODES);
  const [modesLoaded, setModesLoaded] = useState(false);
  const [question, setQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState(null); // seçmeli modlarda tıklanan kanji
  const [result, setResult] = useState(null); // "ok" | "no" | "shown"
  const [session, setSession] = useState({ ok: 0, total: 0 });
  const [loadingQ, setLoadingQ] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("ktestModes") || "null");
      if (Array.isArray(saved)) {
        const valid = saved.filter((m) => ALL_MODES.includes(m));
        if (valid.length) setModes(valid);
      }
    } catch {}
    setModesLoaded(true);
  }, []);

  useEffect(() => {
    if (modesLoaded)
      window.localStorage.setItem("ktestModes", JSON.stringify(modes));
  }, [modes, modesLoaded]);

  const toggleMode = (m) => {
    setModes((cur) => {
      if (cur.includes(m)) {
        if (cur.length === 1) return cur; // en az bir tip
        return cur.filter((x) => x !== m);
      }
      return [...cur, m];
    });
  };

  const countByRank = useMemo(() => {
    const m = new Map();
    for (const row of myMap || []) m.set(row.rank, row.count);
    return m;
  }, [myMap]);

  // Soru için kanji seç: %70 sıradaki öğrenilmemişler, %30 pekiştirme
  const pickChar = useCallback(() => {
    if (!kanjiList?.length) return null;
    const unlearned = [];
    const review = [];
    for (const k of kanjiList) {
      const c = countByRank.get(k.rank) || 0;
      if (c === 0) {
        if (unlearned.length < 15) unlearned.push(k);
      } else if (c < 20) {
        review.push(k);
      }
    }
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (review.length && (Math.random() < 0.3 || !unlearned.length))
      return pick(review);
    if (unlearned.length) return pick(unlearned);
    return pick(kanjiList);
  }, [kanjiList, countByRank]);

  const nextQuestion = useCallback(async () => {
    const chosen = pickChar();
    if (!chosen) return;
    setLoadingQ(true);
    setResult(null);
    setInput("");
    setPicked(null);
    try {
      const res = await fetch(`/api/kanji?c=${encodeURIComponent(chosen.char)}`);
      const item = await res.json();
      if (!item || item.error) throw new Error("kanji yok");

      // Bu kanji için uygulanabilir modlar (kullanıcının seçtikleriyle kesişim)
      const usable = modes.filter((m) => {
        if (m === "meaning") return meaningAnswers(item).length > 0;
        if (m === "reading") return readingAnswers(item).length > 0;
        if (m === "word") return item.ex && wordAnswers(item).length > 0;
        if (m === "revMeaning") return item.meanings?.length > 0;
        if (m === "revReading") return primaryRomaji(item).length > 0;
        return false;
      });
      const mode = usable[Math.floor(Math.random() * usable.length)];
      if (!mode) {
        setLoadingQ(false);
        return nextQuestion();
      }

      if (mode === "revMeaning" || mode === "revReading") {
        // 3 çeldirici kanji seç
        const opts = new Set([chosen.char]);
        let guard = 0;
        while (opts.size < 4 && guard++ < 100) {
          const other = kanjiList[Math.floor(Math.random() * kanjiList.length)];
          opts.add(other.char);
        }
        setQuestion({
          kind: "choice",
          item,
          mode,
          prompt:
            mode === "revMeaning"
              ? item.meanings.slice(0, 2).join(", ")
              : primaryRomaji(item),
          options: [...opts].sort(() => Math.random() - 0.5),
        });
      } else {
        const answers =
          mode === "meaning"
            ? meaningAnswers(item)
            : mode === "reading"
            ? readingAnswers(item)
            : wordAnswers(item);
        setQuestion({ kind: "typed", item, mode, answers });
      }
    } catch (e) {
      setQuestion(null);
    } finally {
      setLoadingQ(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pickChar, modes, kanjiList]);

  useEffect(() => {
    if (
      modesLoaded &&
      kanjiList?.length &&
      myMap !== undefined &&
      question === null &&
      !loadingQ
    ) {
      nextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanjiList, myMap, modesLoaded]);

  if (isLoading || kanjiList === undefined || !modesLoaded) {
    return <p className="hint">{t("loading")}</p>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h1>{t("ktest.title")}</h1>
        <div className="card">
          <p>
            <Link href="/account">{t("needLogin")}</Link>
          </p>
        </div>
      </div>
    );
  }

  const finish = (ok) => {
    setResult(ok ? "ok" : "no");
    setSession((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) recordCorrect({ char: question.item.c }).catch(() => {});
  };

  const check = (e) => {
    e?.preventDefault();
    if (!question || result) return;
    const guess = normalize(input);
    if (!guess) return;
    finish(question.answers.includes(guess));
  };

  const pickKanji = (c) => {
    if (!question || result) return;
    setPicked(c);
    finish(c === question.item.c);
  };

  const promptText = question
    ? {
        meaning: t("ktest.modeMeaning"),
        reading: t("ktest.modeReading"),
        word: t("ktest.modeWord"),
        revMeaning: t("ktest.modeRevMeaning"),
        revReading: t("ktest.modeRevReading"),
      }[question.mode]
    : "";

  return (
    <div>
      <h1>{t("ktest.title")}</h1>
      <p className="subtitle">{t("ktest.subtitle")}</p>

      <div className="card" style={{ marginBottom: 14 }}>
        <span className="setup-label">{t("ktest.modes")}</span>
        <div className="tabs" style={{ margin: "8px 0 0" }}>
          {ALL_MODES.map((m) => (
            <button
              key={m}
              className={`tab ${modes.includes(m) ? "active" : ""}`}
              onClick={() => toggleMode(m)}
            >
              {t(`ktest.m.${m}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="card ktest-card">
        {loadingQ || !question ? (
          <p className="hint" style={{ textAlign: "center" }}>{t("loading")}</p>
        ) : (
          <>
            <div className="ktest-head">
              <span className="badge">#{question.item.rank}</span>
              <span className="hint">
                {t("ktest.session", { ok: session.ok, total: session.total })}
              </span>
            </div>

            {question.kind === "choice" ? (
              <div className="ktest-prompt">{question.prompt}</div>
            ) : question.mode === "word" && question.item.ex ? (
              <div
                className="big-char jp ktest-word"
                onClick={() => speak(question.item.ex.r)}
                title="🔊"
              >
                {question.item.ex.w}
              </div>
            ) : (
              <div className="big-char jp">{question.item.c}</div>
            )}

            <p className="hint" style={{ textAlign: "center", margin: "0 0 12px" }}>
              {promptText}
            </p>

            {question.kind === "typed" ? (
              <form onSubmit={check} className="inline-form ktest-form">
                <input
                  ref={inputRef}
                  className="input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t("ktest.answerPh")}
                  disabled={!!result}
                  autoFocus
                />
                {!result && (
                  <button className="btn" type="submit">
                    {t("ktest.check")}
                  </button>
                )}
              </form>
            ) : (
              <div className="ktest-choices jp">
                {question.options.map((c) => (
                  <button
                    key={c}
                    className={`ktest-choice ${
                      result
                        ? c === question.item.c
                          ? "correct"
                          : c === picked
                          ? "wrong"
                          : ""
                        : ""
                    }`}
                    disabled={!!result}
                    onClick={() => pickKanji(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {result === "ok" && (
              <>
                <p className="ktest-ok">{t("ktest.correctMsg")}</p>
                <AnswerInfo q={question} />
              </>
            )}
            {result === "no" && (
              <div className="ktest-no">
                <p className="error-text" style={{ margin: "8px 0 2px" }}>
                  {t("ktest.wrongMsg")}
                </p>
                <AnswerInfo q={question} />
              </div>
            )}
            {result === "shown" && (
              <div className="ktest-no">
                <p className="hint" style={{ margin: "8px 0 2px" }}>
                  {t("ktest.answerIs")}
                </p>
                <AnswerInfo q={question} />
              </div>
            )}

            <div className="ktest-actions">
              {result ? (
                <button className="btn" onClick={nextQuestion}>
                  {t("ktest.next")}
                </button>
              ) : (
                <>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setResult("shown");
                      setSession((s) => ({ ...s, total: s.total + 1 }));
                    }}
                  >
                    {t("ktest.reveal")}
                  </button>
                  <button className="btn secondary" onClick={nextQuestion}>
                    {t("ktest.skip")}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
