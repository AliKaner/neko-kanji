"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";

export function levelOf(count) {
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 1) return 1;
  return 0;
}

export default function KanjiHeatmap({
  countByRank,
  compact = false,
  onSelect,
  selectedRank,
}) {
  const { t } = useI18n();
  const kanjiList = useQuery(api.kanji.list);

  if (kanjiList === undefined) return <p className="hint">{t("loading")}</p>;

  return (
    <div className={`kanji-map jp ${compact ? "compact" : ""}`}>
      {kanjiList.map(({ rank, char }) => {
        const count = countByRank?.get(rank) || 0;
        const cls = `kcell lv${levelOf(count)} ${
          selectedRank === rank ? "selected" : ""
        }`;
        const title = `#${rank} ${char} — ${count}`;
        if (!onSelect) {
          return (
            <span key={rank} className={cls} title={title}>
              {compact ? "" : char}
            </span>
          );
        }
        return (
          <button
            key={rank}
            className={cls}
            title={title}
            onClick={() => onSelect({ rank, char, count })}
          >
            {char}
          </button>
        );
      })}
    </div>
  );
}
