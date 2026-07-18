"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const LEVEL_NAMES = ["Öğrenilmedi", "Mavi", "Yeşil", "Mor", "Altın"];
const THRESHOLD_TEXT = "1+ mavi · 5+ yeşil · 10+ mor · 20+ altın";

function levelOf(count) {
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 1) return 1;
  return 0;
}

export default function KanjiMapPage() {
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
    return <p className="hint">Yükleniyor...</p>;
  }

  return (
    <div>
      <h1>🗾 Kanji Haritası</h1>
      <p className="subtitle">
        En sık kullanılan {kanjiList.length} kanji, frekans sırasıyla. Bir
        kanjiyi her doğru bildiğinde karesi renklenir: {THRESHOLD_TEXT}.
      </p>

      {!isAuthenticated && (
        <div className="card">
          <p>
            İlerlemenin kaydedilmesi için{" "}
            <Link href="/account">giriş yapman</Link> gerekiyor.
          </p>
        </div>
      )}

      {isAuthenticated && stats && (
        <div className="kanji-stats">
          <span>
            📚 Öğrenilen: <b>{stats.learned}</b> / {kanjiList.length}
          </span>
          <span>
            📍 Sıradaki kanji: <b>#{stats.position}</b>
          </span>
          <span>
            ⭐ Puan: <b>{stats.score}</b>
          </span>
        </div>
      )}

      <div className="kanji-legend">
        {LEVEL_NAMES.map((name, lv) => (
          <span key={lv} className="legend-item">
            <span className={`kcell lv${lv}`} /> {name}
          </span>
        ))}
      </div>

      <div className="kanji-map jp">
        {kanjiList.map(({ rank, char }) => {
          const count = countByRank.get(rank) || 0;
          return (
            <button
              key={rank}
              className={`kcell lv${levelOf(count)} ${
                selected?.rank === rank ? "selected" : ""
              }`}
              title={`#${rank} ${char} — ${count} kez doğru`}
              onClick={() => setSelected({ rank, char, count })}
            >
              {char}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="kanji-detail card">
          <span className="kanji-detail-char jp">{selected.char}</span>
          <div>
            <div>
              <b>#{selected.rank}</b>. sıklıkta ·{" "}
              <b>{selected.count}</b> kez doğru bildin ·{" "}
              {LEVEL_NAMES[levelOf(selected.count)]}
            </div>
            <div className="hint">
              Pratikte doğru bildikçe seviye atlar. {THRESHOLD_TEXT}
            </div>
            <Link
              className="btn secondary small"
              href={`/dictionary?q=${encodeURIComponent(selected.char)}`}
              style={{ marginTop: 6, display: "inline-block" }}
            >
              🔍 Sözlükte ara
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
