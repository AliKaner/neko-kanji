"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import { kanaToRomaji } from "@/lib/romaji";
import { WORDS_EN } from "@/lib/en";
import { speak } from "@/lib/tts";

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
  for (const tk of tokens(item.m_tr || "")) out.add(tk);
  for (const m of item.meanings || []) for (const tk of tokens(m)) out.add(tk);
  for (const tk of tokens(item.m || "")) out.add(tk);
  return [...out].filter(Boolean);
}

function wordAnswers(item) {
  const out = new Set();
  for (const tk of tokens(item.ex?.m || "")) out.add(tk);
  const en = WORDS_EN[item.ex?.w];
  if (en) for (const tk of tokens(en)) out.add(tk);
  return [...out].filter(Boolean);
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

  const [question, setQuestion] = useState(null); // { item, mode, answers }
  const [input, setInput] = useState(null);
  const [result, setResult] = useState(null); // "ok" | "no"
  const [session, setSession] = useState({ ok: 0, total: 0 });
  const [loadingQ, setLoadingQ] = useState(false);
  const inputRef = useRef(null);

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
    try {
      const res = await fetch(`/api/kanji?c=${encodeURIComponent(chosen.char)}`);
      const item = await res.json();
      if (!item || item.error) throw new Error("kanji yok");

      const modes = [];
      if (meaningAnswers(item).length) modes.push("meaning");
      if (readingAnswers(item).length) modes.push("reading");
      if (item.ex && wordAnswers(item).length) modes.push("word");
      const mode = modes[Math.floor(Math.random() * modes.length)] || "meaning";
      const answers =
        mode === "meaning"
          ? meaningAnswers(item)
          : mode === "reading"
          ? readingAnswers(item)
          : wordAnswers(item);
      setQuestion({ item, mode, answers });
    } catch (e) {
      setQuestion(null);
    } finally {
      setLoadingQ(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [pickChar]);

  useEffect(() => {
    if (kanjiList?.length && myMap !== undefined && question === null && !loadingQ) {
      nextQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kanjiList, myMap]);

  if (isLoading || kanjiList === undefined) {
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

  const check = (e) => {
    e?.preventDefault();
    if (!question || result) return;
    const guess = normalize(input);
    if (!guess) return;
    const ok = question.answers.includes(guess);
    setResult(ok ? "ok" : "no");
    setSession((s) => ({ ok: s.ok + (ok ? 1 : 0), total: s.total + 1 }));
    if (ok) {
      recordCorrect({ char: question.item.c }).catch(() => {});
    }
  };

  // Bilmiyorsan cevabı göster: doğru sayılmaz ama öğrenirsin
  const reveal = () => {
    if (!question || result) return;
    setResult("shown");
    setSession((s) => ({ ...s, total: s.total + 1 }));
  };


  return (
    <div>
      <h1>{t("ktest.title")}</h1>
      <p className="subtitle">{t("ktest.subtitle")}</p>

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

            {question.mode === "word" && question.item.ex ? (
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
              {question.mode === "meaning"
                ? t("ktest.modeMeaning")
                : question.mode === "reading"
                ? t("ktest.modeReading")
                : t("ktest.modeWord")}
            </p>

            <form onSubmit={check} className="inline-form ktest-form">
              <input
                ref={inputRef}
                className="input"
                value={input || ""}
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
                  <button className="btn secondary" onClick={reveal}>
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
