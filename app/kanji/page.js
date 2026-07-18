"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import KanjiHeatmap, { levelOf } from "@/components/KanjiHeatmap";

export default function KanjiMapPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const kanjiList = useQuery(api.kanji.list);
  const myMap = useQuery(api.progress.myMap);
  const stats = useQuery(api.progress.myStats);
  const [selected, setSelected] = useState(null);

  const countByRank = useMemo(() => {
    const m = new Map();
    for (const row of myMap || []) m.set(row.rank, row.count);
    return m;
  }, [myMap]);

  if (isLoading || kanjiList === undefined) {
    return <p className="hint">{t("loading")}</p>;
  }

  return (
    <div>
      <h1>{t("kanji.title")}</h1>
      <p className="subtitle">
        {t("kanji.subtitle", { n: kanjiList.length, t: t("thresholds") })}
      </p>

      {!isAuthenticated && (
        <div className="card">
          <p>
            <Link href="/account">{t("needLogin")}</Link>
          </p>
        </div>
      )}

      {isAuthenticated && stats && (
        <div className="kanji-stats">
          <span>
            📚 {t("stats.learned")}: <b>{stats.learned}</b> / {kanjiList.length}
          </span>
          <span>
            📍 {t("stats.next")}: <b>#{stats.position}</b>
          </span>
          <span>
            ⭐ {t("stats.score")}: <b>{stats.score}</b>
          </span>
        </div>
      )}

      <div className="kanji-legend">
        {[0, 1, 2, 3, 4].map((lv) => (
          <span key={lv} className="legend-item">
            <span className={`kcell lv${lv}`} /> {t(`level.${lv}`)}
          </span>
        ))}
      </div>

      <KanjiHeatmap
        countByRank={countByRank}
        onSelect={setSelected}
        selectedRank={selected?.rank}
      />

      {selected && (
        <div className="kanji-detail card">
          <span className="kanji-detail-char jp">{selected.char}</span>
          <div>
            <div>
              <b>#{selected.rank}</b> {t("kanji.freqRank")} ·{" "}
              <b>{selected.count}</b> {t("kanji.timesCorrect")} ·{" "}
              {t(`level.${levelOf(selected.count)}`)}
            </div>
            <div className="hint">
              {t("kanji.levelHint")} {t("thresholds")}
            </div>
            <Link
              className="btn secondary small"
              href={`/dictionary?q=${encodeURIComponent(selected.char)}`}
              style={{ marginTop: 6, display: "inline-block" }}
            >
              {t("kanji.searchDict")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
