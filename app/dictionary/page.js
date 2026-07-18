"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { speak } from "@/lib/tts";
import { kanaToRomaji } from "@/lib/romaji";

function DictionaryInner() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialQ) {
      setQuery(initialQ);
      doSearch(initialQ);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ]);

  const search = (e) => {
    e?.preventDefault();
    doSearch(query.trim());
  };

  const doSearch = async (q) => {
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dictionary?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Arama başarısız");
      setResults(data.data || []);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>🔍 Sözlük</h1>
      <p className="subtitle">
        Jisho.org üzerinden arama yap — Japonca, romaji veya İngilizce kelime
        yazabilirsin (ör: <i>ねこ</i>, <i>neko</i>, <i>cat</i>). Tanımlar
        İngilizcedir.
      </p>

      <form className="search-row" onSubmit={search}>
        <input
          className="search-input jp"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kelime ara… (örn: 水, mizu, water)"
        />
        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Aranıyor…" : "Ara"}
        </button>
      </form>

      {error && <p className="error-text">⚠️ {error}</p>}

      {results && results.length === 0 && (
        <p className="hint">Sonuç bulunamadı.</p>
      )}

      {results && results.length > 0 && (
        <div className="card">
          {results.slice(0, 12).map((entry, i) => {
            const jp = entry.japanese?.[0] || {};
            const word = jp.word || jp.reading || "";
            const reading = jp.reading || "";
            return (
              <div className="dict-entry" key={i}>
                <span
                  className="dict-word jp"
                  onClick={() => speak(reading || word)}
                  title="Dinlemek için tıkla"
                >
                  {word}
                </span>
                {reading && (
                  <span className="dict-reading jp">
                    {reading}{" "}
                    <span className="hint">({kanaToRomaji(reading)})</span>
                  </span>
                )}
                <div className="dict-tags">
                  {entry.is_common && <span className="badge">yaygın</span>}
                  {(entry.jlpt || []).map((tag) => (
                    <span className="badge" key={tag}>
                      {tag.replace("jlpt-", "JLPT ").toUpperCase()}
                    </span>
                  ))}
                </div>
                <ol className="dict-senses">
                  {(entry.senses || []).slice(0, 3).map((sense, j) => (
                    <li key={j}>
                      {sense.english_definitions?.join("; ")}
                      {sense.parts_of_speech?.length > 0 && (
                        <span className="hint">
                          {" "}
                          — {sense.parts_of_speech.join(", ")}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DictionaryPage() {
  return (
    <Suspense fallback={<p className="hint">...</p>}>
      <DictionaryInner />
    </Suspense>
  );
}
