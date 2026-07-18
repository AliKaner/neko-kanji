"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import KanjiHeatmap, { levelOf } from "@/components/KanjiHeatmap";

const TOTAL_KANJI = 2501;

function timeAgo(ts, t) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("time.now");
  if (m < 60) return t("time.m", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("time.h", { n: h });
  return t("time.d", { n: Math.floor(h / 24) });
}

function FriendButton({ profile }) {
  const { t } = useI18n();
  const sendRequestTo = useMutation(api.friends.sendRequestTo);
  const respond = useMutation(api.friends.respond);
  const remove = useMutation(api.friends.remove);
  const [error, setError] = useState(null);

  if (profile.isMe) return <span className="hint">{t("profile.itsYou")}</span>;
  if (!profile.signedIn)
    return <Link href="/account">{t("profile.loginToAdd")}</Link>;

  const f = profile.friendship;
  const act = (fn) =>
    fn().catch((e) =>
      setError(e.message?.split("Error: ").pop() || t("error"))
    );

  return (
    <span className="friend-actions" style={{ flexWrap: "wrap" }}>
      {!f && (
        <button
          className="btn small"
          onClick={() => act(() => sendRequestTo({ userId: profile.userId }))}
        >
          {t("profile.addFriend")}
        </button>
      )}
      {f?.status === "pending" && !f.incoming && (
        <>
          <span className="hint">{t("profile.requestSent")}</span>
          <button
            className="btn secondary small"
            onClick={() => act(() => remove({ friendshipId: f.friendshipId }))}
          >
            {t("friends.cancel")}
          </button>
        </>
      )}
      {f?.status === "pending" && f.incoming && (
        <>
          <button
            className="btn small"
            onClick={() =>
              act(() => respond({ friendshipId: f.friendshipId, accept: true }))
            }
          >
            {t("friends.accept")}
          </button>
          <button
            className="btn secondary small"
            onClick={() =>
              act(() =>
                respond({ friendshipId: f.friendshipId, accept: false })
              )
            }
          >
            {t("friends.reject")}
          </button>
        </>
      )}
      {f?.status === "accepted" && (
        <>
          <span className="hint">{t("profile.friends")}</span>
          <button
            className="btn secondary small"
            title={t("profile.remove")}
            onClick={() => act(() => remove({ friendshipId: f.friendshipId }))}
          >
            🗑
          </button>
        </>
      )}
      {error && <span className="error-text">{error}</span>}
    </span>
  );
}

function ImageUploadButton({ kind, label }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const setImage = useMutation(api.users.setImage);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await res.json();
      await setImage({ kind, storageId });
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <button
        className="btn secondary small"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? t("profile.uploading") : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
    </>
  );
}

function ProgressBar({ value, max, className = "" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`pbar ${className}`}>
      <div className="pbar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function DailyMap({ daily }) {
  const { t } = useI18n();
  const cells = useMemo(() => {
    const byDay = new Map(daily.map((d) => [d.day, d.correct]));
    const out = [];
    const today = new Date();
    for (let i = 104; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: key, correct: byDay.get(key) || 0 });
    }
    return out;
  }, [daily]);

  const cls = (n) => (n === 0 ? "d0" : n < 5 ? "d1" : n < 15 ? "d2" : n < 30 ? "d3" : "d4");

  return (
    <div>
      <div className="daily-grid">
        {cells.map((c) => (
          <span
            key={c.day}
            className={`dcell ${cls(c.correct)}`}
            title={`${c.day} — ${c.correct}`}
          />
        ))}
      </div>
      <p className="hint" style={{ marginTop: 6 }}>{t("profile.dailyHint")}</p>
    </div>
  );
}

function ActivityFeed({ activities }) {
  const { t } = useI18n();
  if (!activities.length)
    return <p className="hint">{t("profile.noActivity")}</p>;
  const text = (a) => {
    switch (a.type) {
      case "kanji":
        return t("act.kanji", { char: a.char, levelName: t(`level.${a.level}`) });
      case "level":
        return t("act.level", { n: a.level });
      case "friend":
        return t("act.friend", { name: a.name });
      case "groupCreate":
        return t("act.groupCreate", { name: a.name });
      case "groupJoin":
        return t("act.groupJoin", { name: a.name });
      default:
        return "";
    }
  };
  const icon = (a) =>
    a.type === "kanji" ? "🈷" : a.type === "level" ? "⬆️" : a.type === "friend" ? "🤝" : "🏆";
  return (
    <div className="activity-list">
      {activities.map((a, i) => (
        <div key={i} className="activity-row">
          <span className="activity-icon">{icon(a)}</span>
          <span className="activity-text">
            {a.type === "kanji" && <span className="jp activity-char">{a.char}</span>}
            {text(a)}
          </span>
          <span className="activity-time hint">{timeAgo(a.time, t)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useI18n();
  const params = useParams();
  const profile = useQuery(api.users.profile, {
    userId: String(params.userId),
  });

  const countByRank = useMemo(() => {
    const m = new Map();
    for (const row of profile?.map || []) m.set(row.rank, row.count);
    return m;
  }, [profile]);

  const starCounts = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const row of profile?.map || []) {
      const lv = levelOf(row.count);
      if (lv > 0) c[lv]++;
    }
    return c;
  }, [profile]);

  if (profile === undefined) return <p className="hint">{t("loading")}</p>;
  if (profile === null) return <p className="hint">{t("profile.notFound")}</p>;

  const s = profile.stats;
  const xpInLevel = s.xp - s.levelStartXp;
  const xpNeeded = s.nextLevelXp - s.levelStartXp;

  return (
    <div>
      <div
        className="profile-banner"
        style={
          profile.wallpaperUrl
            ? { backgroundImage: `url(${profile.wallpaperUrl})` }
            : undefined
        }
      >
        {profile.isMe && (
          <div className="banner-actions">
            <ImageUploadButton
              kind="wallpaper"
              label={t("profile.changeWallpaper")}
            />
          </div>
        )}
      </div>

      <div className="profile-head profile-head-overlap">
        <div className="avatar-wrap">
          {profile.avatarUrl ? (
            <img className="avatar-img" src={profile.avatarUrl} alt="" />
          ) : (
            <div className="avatar avatar-lg">
              {(profile.name || "?").slice(0, 1).toUpperCase()}
            </div>
          )}
          {profile.isMe && (
            <div className="avatar-action">
              <ImageUploadButton kind="avatar" label={t("profile.changeAvatar")} />
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ margin: 0 }}>{profile.name}</h1>
          <p className="level-line">
            <span className="level-badge">
              {t("profile.level")} {s.level}
            </span>{" "}
            <span className="level-title">{t(s.titleKey)}</span>
          </p>
          <ProgressBar value={xpInLevel} max={xpNeeded} className="xp" />
          <p className="hint" style={{ margin: "4px 0 8px" }}>
            ⚡ {s.xp} XP · {t("profile.toNext", { n: s.nextLevelXp - s.xp, l: s.level + 1 })}
          </p>
          <FriendButton profile={profile} />
        </div>
      </div>

      <div className="profile-grid">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>📚 {t("profile.kanjiProgress")}</h2>
          <p>
            <b>{s.learned}</b> / {TOTAL_KANJI} {t("stats.kanji")} ·{" "}
            {t("stats.next")}: <b>#{s.position}</b>
          </p>
          <ProgressBar value={s.learned} max={TOTAL_KANJI} className="kanji" />
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0 }}>⭐ {t("profile.starProgress")}</h2>
          <p>
            {t("stats.score")}: <b>{s.score}</b>
          </p>
          <div className="star-breakdown">
            <span className="star-chip lv1">{starCounts[1]}</span>
            <span className="star-chip lv2">{starCounts[2]}</span>
            <span className="star-chip lv3">{starCounts[3]}</span>
            <span className="star-chip lv4">{starCounts[4]}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>{t("profile.daily")}</h2>
        <DailyMap daily={profile.daily} />
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>{t("profile.activity")}</h2>
        <ActivityFeed activities={profile.activities} />
      </div>

      <h2 style={{ marginTop: 24 }}>{t("profile.map")}</h2>
      <KanjiHeatmap countByRank={countByRank} />
    </div>
  );
}
