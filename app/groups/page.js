"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function GroupsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const myGroups = useQuery(api.groups.mine);
  const leaderboard = useQuery(api.groups.leaderboard);
  const create = useMutation(api.groups.create);
  const join = useMutation(api.groups.join);
  const leave = useMutation(api.groups.leave);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState(null);

  if (isLoading) return <p className="hint">Yükleniyor...</p>;

  const onCreate = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await create({ name });
      setMessage({ ok: true, text: `Grup kuruldu! Davet kodu: ${res.inviteCode}` });
      setName("");
    } catch (err) {
      setMessage({ ok: false, text: err.message?.split("Error: ").pop() || "Hata oluştu." });
    }
  };

  const onJoin = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await join({ code });
      setMessage({ ok: true, text: `"${res.name}" grubuna katıldın! 🎉` });
      setCode("");
    } catch (err) {
      setMessage({ ok: false, text: err.message?.split("Error: ").pop() || "Hata oluştu." });
    }
  };

  return (
    <div>
      <h1>🏆 Gruplar</h1>
      <p className="subtitle">
        Grup kur, arkadaşlarını davet et; kanji yolculuğunda diğer gruplarla
        yarışın. Grup puanı = üyelerin kanji puanlarının toplamı.
      </p>

      {!isAuthenticated && (
        <div className="card">
          <p>
            Grup kurmak ve katılmak için <Link href="/account">giriş yapman</Link>{" "}
            gerekiyor.
          </p>
        </div>
      )}

      {isAuthenticated && (
        <div className="practice-grid">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>➕ Grup Kur</h2>
            <form onSubmit={onCreate} className="inline-form">
              <input
                className="input"
                placeholder="Grup adı"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <button className="btn" type="submit">
                Kur
              </button>
            </form>
          </div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>🎟 Gruba Katıl</h2>
            <form onSubmit={onJoin} className="inline-form">
              <input
                className="input"
                placeholder="Davet kodu (örn. A3K9ZQ)"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <button className="btn" type="submit">
                Katıl
              </button>
            </form>
          </div>
        </div>
      )}

      {message && (
        <p className={message.ok ? "hint" : "error-text"}>{message.text}</p>
      )}

      {myGroups?.map((g) => (
        <div key={g.groupId} className="card">
          <div className="friend-row">
            <h2 style={{ margin: 0 }}>{g.name}</h2>
            <span className="hint">
              Davet kodu: <b className="invite-code">{g.inviteCode}</b>
            </span>
          </div>
          <p className="hint">
            {g.memberCount} üye · toplam ⭐ {g.totalScore} puan · 📚{" "}
            {g.totalLearned} kanji
          </p>
          {g.members.map((m, i) => (
            <div key={m.userId} className="friend-row">
              <span>
                <b>#{i + 1}</b> {m.name} {m.isOwner ? "👑" : ""}
              </span>
              <span className="friend-stats">
                📚 <b>{m.stats.learned}</b> kanji · sırada{" "}
                <b>#{m.stats.position}</b> · ⭐ <b>{m.stats.score}</b>
              </span>
            </div>
          ))}
          <button
            className="btn secondary small"
            style={{ marginTop: 8 }}
            onClick={() => leave({ groupId: g.groupId })}
          >
            Gruptan Ayrıl
          </button>
        </div>
      ))}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>🌍 Gruplar Arası Yarış</h2>
        {!leaderboard?.length && <p className="hint">Henüz hiç grup yok. İlk grubu sen kur!</p>}
        {leaderboard?.map((g, i) => (
          <div key={g.groupId} className={`friend-row ${g.isMine ? "me" : ""}`}>
            <span>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}{" "}
              <b>{g.name}</b> {g.isMine ? "(senin grubun)" : ""}
            </span>
            <span className="friend-stats">
              👥 {g.memberCount} · 📚 {g.totalLearned} · ⭐ <b>{g.totalScore}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
