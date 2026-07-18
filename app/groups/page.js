"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";

export default function GroupsPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const myGroups = useQuery(api.groups.mine);
  const leaderboard = useQuery(api.groups.leaderboard);
  const create = useMutation(api.groups.create);
  const join = useMutation(api.groups.join);
  const leave = useMutation(api.groups.leave);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);

  if (isLoading) return <p className="hint">{t("loading")}</p>;

  const onCreate = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await create({ name });
      setMessage({ ok: true, text: t("groups.created", { code: res.inviteCode }) });
      setName("");
    } catch (err) {
      setMessage({
        ok: false,
        text: err.message?.split("Error: ").pop() || t("error"),
      });
    }
  };

  const onJoin = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await join({ code });
      setMessage({ ok: true, text: t("groups.joined", { name: res.name }) });
      setCode("");
    } catch (err) {
      setMessage({
        ok: false,
        text: err.message?.split("Error: ").pop() || t("error"),
      });
    }
  };

  return (
    <div>
      <h1>{t("groups.title")}</h1>
      <p className="subtitle">{t("groups.subtitle")}</p>

      {!isAuthenticated && (
        <div className="card">
          <p>
            <Link href="/account">{t("needLogin")}</Link>
          </p>
        </div>
      )}

      {isAuthenticated && (
        <div className="practice-grid">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("groups.create")}</h2>
            <form onSubmit={onCreate} className="inline-form">
              <input
                className="input"
                placeholder={t("groups.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <button className="btn" type="submit">
                {t("groups.createBtn")}
              </button>
            </form>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>{t("groups.join")}</h2>
            <form onSubmit={onJoin} className="inline-form">
              <input
                className="input"
                placeholder={t("groups.code")}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button className="btn" type="submit">
                {t("groups.joinBtn")}
              </button>
            </form>
          </div>
        </div>
      )}

      {message && (
        <p className={message.ok ? "hint" : "error-text"}>{message.text}</p>
      )}

      {myGroups?.map((g) => (
        <div key={g.groupId} className="card" style={{ marginTop: 14 }}>
          <div className="friend-row">
            <h2 style={{ margin: 0 }}>{g.name}</h2>
            <span className="hint">
              {t("groups.invite")} <b className="invite-code">{g.inviteCode}</b>
            </span>
          </div>
          <p className="hint">
            👥 {g.memberCount} {t("groups.members")} · ⭐ {g.totalScore} · 📚{" "}
            {g.totalLearned} {t("stats.kanji")}
          </p>
          {g.members.map((m, i) => (
            <div key={m.userId} className="friend-row">
              <span>
                <b>#{i + 1}</b>{" "}
                <Link href={`/profile/${m.userId}`}>{m.name}</Link>{" "}
                {m.isOwner ? "👑" : ""}
              </span>
              <span className="friend-stats">
                📚 <b>{m.stats.learned}</b> {t("stats.kanji")} · {t("stats.at")}{" "}
                <b>#{m.stats.position}</b> · ⭐ <b>{m.stats.score}</b>
              </span>
            </div>
          ))}
          <button
            className="btn secondary small"
            style={{ marginTop: 8 }}
            onClick={() => leave({ groupId: g.groupId })}
          >
            {t("groups.leave")}
          </button>
        </div>
      ))}

      <div className="card" style={{ marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>{t("groups.leaderboard")}</h2>
        {!leaderboard?.length && <p className="hint">{t("groups.none")}</p>}
        {leaderboard?.map((g, i) => (
          <div key={g.groupId} className={`friend-row ${g.isMine ? "me" : ""}`}>
            <span>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}{" "}
              <b>{g.name}</b> {g.isMine ? t("groups.mine") : ""}
            </span>
            <span className="friend-stats">
              👥 {g.memberCount} · 📚 {g.totalLearned} · ⭐{" "}
              <b>{g.totalScore}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
