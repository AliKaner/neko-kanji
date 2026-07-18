"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function levelOf(count) {
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 1) return 1;
  return 0;
}

function FriendMap({ userId, name }) {
  const kanjiList = useQuery(api.kanji.list);
  const map = useQuery(api.progress.mapOf, { userId });
  const countByRank = useMemo(() => {
    const m = new Map();
    for (const row of map || []) m.set(row.rank, row.count);
    return m;
  }, [map]);

  if (!kanjiList || map === undefined) return <p className="hint">Yükleniyor...</p>;
  return (
    <div>
      <h3>{name} — kanji haritası</h3>
      <div className="kanji-map jp compact">
        {kanjiList.map(({ rank, char }) => (
          <span
            key={rank}
            className={`kcell lv${levelOf(countByRank.get(rank) || 0)}`}
            title={`#${rank} ${char}`}
          />
        ))}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const overview = useQuery(api.friends.overview);
  const viewer = useQuery(api.users.viewer);
  const sendRequest = useMutation(api.friends.sendRequest);
  const respond = useMutation(api.friends.respond);
  const remove = useMutation(api.friends.remove);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(null);
  const [openMap, setOpenMap] = useState(null);

  if (isLoading) return <p className="hint">Yükleniyor...</p>;
  if (!isAuthenticated) {
    return (
      <div>
        <h1>👥 Arkadaşlar</h1>
        <div className="card">
          <p>
            Arkadaş eklemek için <Link href="/account">giriş yapman</Link>{" "}
            gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  const addFriend = async (e) => {
    e.preventDefault();
    setMessage(null);
    try {
      await sendRequest({ email });
      setMessage({ ok: true, text: "İstek gönderildi! 🎉" });
      setEmail("");
    } catch (err) {
      setMessage({ ok: false, text: err.message?.split("Error: ").pop() || "Bir hata oluştu." });
    }
  };

  const rows = overview
    ? [
        ...overview.friends.map((f) => ({ ...f, isMe: false })),
        {
          userId: viewer?._id,
          name: (viewer?.name || "Sen") + " (sen)",
          stats: overview.myStats,
          isMe: true,
        },
      ].sort((a, b) => b.stats.score - a.stats.score)
    : [];

  return (
    <div>
      <h1>👥 Arkadaşlar</h1>
      <p className="subtitle">
        Arkadaşlarını ekle; kim kaçıncı kanjide, kim kaç puanda gör.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>➕ Arkadaş Ekle</h2>
        <form onSubmit={addFriend} className="inline-form">
          <input
            className="input"
            type="email"
            placeholder="Arkadaşının e-postası"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className="btn" type="submit">
            İstek Gönder
          </button>
        </form>
        {message && (
          <p className={message.ok ? "hint" : "error-text"}>{message.text}</p>
        )}
      </div>

      {overview?.incoming.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>📬 Gelen İstekler</h2>
          {overview.incoming.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <span>
                <b>{r.name}</b> <span className="hint">({r.email})</span>
              </span>
              <span className="friend-actions">
                <button
                  className="btn small"
                  onClick={() => respond({ friendshipId: r.friendshipId, accept: true })}
                >
                  ✔ Kabul Et
                </button>
                <button
                  className="btn secondary small"
                  onClick={() => respond({ friendshipId: r.friendshipId, accept: false })}
                >
                  ✖ Reddet
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {overview?.outgoing.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>📤 Bekleyen İstekler</h2>
          {overview.outgoing.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <span>
                <b>{r.name}</b> <span className="hint">({r.email})</span>
              </span>
              <button
                className="btn secondary small"
                onClick={() => remove({ friendshipId: r.friendshipId })}
              >
                İptal
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>🏅 Sıralama</h2>
        {rows.length <= 1 && (
          <p className="hint">Henüz arkadaşın yok. Yukarıdan e-posta ile ekle!</p>
        )}
        {rows.map((f, i) => (
          <div key={f.userId || i} className={`friend-row ${f.isMe ? "me" : ""}`}>
            <span>
              <b>#{i + 1}</b> {f.name}
            </span>
            <span className="friend-stats">
              📚 <b>{f.stats.learned}</b> kanji · sırada{" "}
              <b>#{f.stats.position}</b> · ⭐ <b>{f.stats.score}</b>
              {!f.isMe && (
                <>
                  {" "}
                  <button
                    className="btn secondary small"
                    onClick={() =>
                      setOpenMap(openMap === f.userId ? null : f.userId)
                    }
                  >
                    {openMap === f.userId ? "Haritayı gizle" : "🗾 Harita"}
                  </button>
                  <button
                    className="btn secondary small"
                    title="Arkadaşlıktan çıkar"
                    onClick={() => remove({ friendshipId: f.friendshipId })}
                  >
                    🗑
                  </button>
                </>
              )}
            </span>
          </div>
        ))}
      </div>

      {openMap &&
        rows
          .filter((f) => f.userId === openMap)
          .map((f) => <FriendMap key={f.userId} userId={f.userId} name={f.name} />)}
    </div>
  );
}
