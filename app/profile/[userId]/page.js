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

  if (profile.isMe) return null;
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

function currentStreak(daily) {
  const byDay = new Map(daily.map((d) => [d.day, d.correct]));
  let streak = 0;
  const today = new Date();
  for (let i = 0; ; i++) {
    const key = new Date(today.getTime() - i * 86400000)
      .toISOString()
      .slice(0, 10);
    if ((byDay.get(key) || 0) > 0) streak++;
    else if (i === 0) continue; // bugün henüz çalışmamış olabilir, seriyi bozma
    else break;
  }
  return streak;
}

function Badges({ stats, starCounts, daily }) {
  const { t } = useI18n();
  const streak = currentStreak(daily);
  const badges = [
    { key: "badge.first", icon: "🐣", earned: stats.learned >= 1 },
    { key: "badge.k100", icon: "📚", earned: stats.learned >= 100 },
    { key: "badge.k500", icon: "🎯", earned: stats.learned >= 500 },
    { key: "badge.k1000", icon: "🏔", earned: stats.learned >= 1000 },
    { key: "badge.all", icon: "🗾", earned: stats.learned >= TOTAL_KANJI },
    { key: "badge.s100", icon: "⭐", earned: stats.score >= 100 },
    { key: "badge.s500", icon: "💫", earned: stats.score >= 500 },
    { key: "badge.gold10", icon: "🥇", earned: starCounts[4] >= 10 },
    { key: "badge.streak7", icon: "🔥", earned: streak >= 7 },
  ];
  return (
    <div className="badge-grid">
      {badges.map((b) => (
        <div
          key={b.key}
          className={`badge-hex-wrap ${b.earned ? "earned" : "locked"}`}
          title={t(b.key)}
        >
          <div className="badge-hex">{b.earned ? b.icon : "🔒"}</div>
          <span className="badge-name">{t(b.key)}</span>
        </div>
      ))}
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

  const cls = (n) =>
    n === 0 ? "d0" : n < 5 ? "d1" : n < 15 ? "d2" : n < 30 ? "d3" : "d4";

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
        return t("act.kanji", {
          char: a.char,
          levelName: t(`level.${a.level}`),
        });
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
    a.type === "kanji"
      ? "🈷"
      : a.type === "level"
      ? "⬆️"
      : a.type === "friend"
      ? "🤝"
      : "🏆";
  return (
    <div className="activity-list">
      {activities.map((a, i) => (
        <div key={i} className="activity-row">
          <span className="activity-icon">{icon(a)}</span>
          <span className="activity-text">
            {a.type === "kanji" && (
              <span className="jp activity-char">{a.char}</span>
            )}
            {text(a)}
          </span>
          <span className="activity-time hint">{timeAgo(a.time, t)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const { t, lang } = useI18n();
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
  const handle =
    "@" + (profile.name || "").toLowerCase().replace(/[^a-z0-9ğüşöçı]/g, "");
  const joined = new Date(profile.memberSince).toLocaleDateString(
    lang === "en" ? "en-GB" : "tr-TR",
    { year: "numeric", month: "long" }
  );

  return (
    <div className="profile-page">
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

      <div className="profile-header card">
        <div className="profile-header-top">
          <div className="avatar-wrap">
            {profile.avatarUrl ? (
              <img className="avatar-img" src={profile.avatarUrl} alt="" />
            ) : (
              <div className="avatar">
                {(profile.name || "?").slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-header-actions">
            {profile.isMe ? (
              <ImageUploadButton
                kind="avatar"
                label={t("profile.changeAvatar")}
              />
            ) : (
              <FriendButton profile={profile} />
            )}
          </div>
        </div>

        <h1 className="profile-name">{profile.name}</h1>
        <p className="profile-handle">
          {handle} · <span className="level-title">{t(s.titleKey)}</span>
        </p>
        <p className="hint">{t("profile.joined", { d: joined })}</p>

        <div className="profile-stats-row">
          <span>
            <b>{s.learned}</b> {t("stats.kanji")}
          </span>
          <span>
            <b>{s.score}</b> ⭐
          </span>
          <span>
            <b>{profile.friendsCount}</b> {t("profile.friendsCount")}
          </span>
          <span>
            <b>{profile.groupsCount}</b> {t("profile.groupsCount")}
          </span>
        </div>

        <div className="level-row">
          <span className="level-badge">
            {t("profile.level")} {s.level}
          </span>
          <div style={{ flex: 1 }}>
            <ProgressBar value={xpInLevel} max={xpNeeded} className="xp" />
            <span className="hint" style={{ fontSize: "0.78rem" }}>
              ⚡ {s.xp} XP ·{" "}
              {t("profile.toNext", { n: s.nextLevelXp - s.xp, l: s.level + 1 })}
            </span>
          </div>
        </div>
      </div>

      <div className="profile-columns">
        <div className="profile-side">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("profile.badges")}</h2>
            <Badges stats={s} starCounts={starCounts} daily={profile.daily} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>⭐ {t("profile.starProgress")}</h2>
            <div className="star-breakdown">
              <span className="star-chip lv1">{starCounts[1]}</span>
              <span className="star-chip lv2">{starCounts[2]}</span>
              <span className="star-chip lv3">{starCounts[3]}</span>
              <span className="star-chip lv4">{starCounts[4]}</span>
            </div>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>📚 {t("profile.kanjiProgress")}</h2>
            <p>
              <b>{s.learned}</b> / {TOTAL_KANJI} · {t("stats.next")}:{" "}
              <b>#{s.position}</b>
            </p>
            <ProgressBar value={s.learned} max={TOTAL_KANJI} className="kanji" />
          </div>
        </div>

        <div className="profile-main">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("profile.daily")}</h2>
            <DailyMap daily={profile.daily} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("profile.activity")}</h2>
            <ActivityFeed activities={profile.activities} />
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("profile.map")}</h2>
            <KanjiHeatmap countByRank={countByRank} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
