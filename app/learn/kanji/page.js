"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import CharModal from "@/components/CharModal";

const JLPT_LEVELS = [
  { id: "all", labelKey: "learn.allLevels" },
  { id: "5", label: "N5" },
  { id: "4", label: "N4" },
  { id: "3", label: "N3" },
  { id: "2", label: "N2" },
  { id: "1", label: "N1" },
];

export default function LearnKanjiPage() {
  const { t, lang } = useI18n();
  const [kanjis, setKanjis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [jlpt, setJlpt] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = `/api/kanji?page=${page}&limit=100&search=${encodeURIComponent(debouncedSearch)}&jlpt=${jlpt}`;
        const res = await fetch(url);
        const data = await res.json();
        if (active) {
          setKanjis(data.kanjis || []);
          setPages(data.pages || 1);
          setTotal(data.total || 0);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchData();
    return () => {
      active = false;
    };
  }, [page, debouncedSearch, jlpt]);

  const selectKanji = async (char) => {
    try {
      const res = await fetch(`/api/kanji?c=${encodeURIComponent(char)}`);
      const data = await res.json();
      setSelected({ type: "kanji", ...data });
    } catch (e) {
      console.error(e);
    }
  };

  const learnRandom = async () => {
    try {
      const res = await fetch(`/api/kanji?random=true&jlpt=${jlpt}`);
      const data = await res.json();
      if (data && !data.error) {
        setSelected({ type: "kanji", ...data });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <h1>{t("learn.titleKanji")}</h1>
      <p className="subtitle">{t("learn.subtitleKanji")}</p>

      <div className="search-row" style={{ marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <input
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("learn.searchKanji")}
          style={{ flex: "1 1 200px" }}
        />
        <div className="tabs" style={{ margin: 0, padding: 0, flex: "0 0 auto" }}>
          {JLPT_LEVELS.map((level) => (
            <button
              key={level.id}
              className={`tab ${jlpt === level.id ? "active" : ""}`}
              onClick={() => {
                setJlpt(level.id);
                setPage(1);
              }}
              style={{ padding: "6px 12px", fontSize: "0.85rem" }}
            >
              {level.label || t(level.labelKey)}
            </button>
          ))}
        </div>
        <button
          className="btn"
          onClick={learnRandom}
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          🎲 Rastgele
        </button>
      </div>

      {loading ? (
        <p className="hint">{t("loading")}</p>
      ) : (
        <>
          {kanjis.length === 0 ? (
            <p className="hint">{t("dict.noResults")}</p>
          ) : (
            <div className="kanji-grid">
              {kanjis.map((k) => (
                <div
                  key={k.c}
                  className="kanji-cell"
                  onClick={() => setSelected({ type: "kanji", ...k })}
                  style={{ cursor: "pointer" }}
                >
                  <span className="glyph jp">{k.c}</span>
                  <span className="meaning">
                    {lang === "tr" && k.m_tr ? k.m_tr : k.meanings[0]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 24 }}>
              <button
                className="btn secondary small"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                ◀
              </button>
              <span className="hint">
                {t("learn.page", { current: page, total: pages })}
              </span>
              <button
                className="btn secondary small"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(p + 1, pages))}
              >
                ▶
              </button>
            </div>
          )}
        </>
      )}

      {selected && (
        <CharModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
