"use client";

import Link from "next/link";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";

export default function FriendsPage() {
  const { t } = useI18n();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const overview = useQuery(api.friends.overview);
  const viewer = useQuery(api.users.viewer);
  const respond = useMutation(api.friends.respond);
  const remove = useMutation(api.friends.remove);

  if (isLoading) return <p className="hint">{t("loading")}</p>;
  if (!isAuthenticated) {
    return (
      <div>
        <h1>{t("friends.title")}</h1>
        <div className="card">
          <p>
            <Link href="/account">{t("needLogin")}</Link>
          </p>
        </div>
      </div>
    );
  }

  const rows = overview
    ? [
        ...overview.friends.map((f) => ({ ...f, isMe: false })),
        {
          userId: viewer?._id,
          name: `${viewer?.name || ""} ${t("friends.you")}`,
          stats: overview.myStats,
          isMe: true,
        },
      ].sort((a, b) => b.stats.score - a.stats.score)
    : [];

  return (
    <div>
      <h1>{t("friends.title")}</h1>
      <p className="subtitle">{t("friends.subtitle")}</p>

      {overview?.incoming.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("friends.incoming")}</h2>
          {overview.incoming.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <Link href={`/profile/${r.userId}`}>
                <b>{r.name}</b>
              </Link>
              <span className="friend-actions">
                <button
                  className="btn small"
                  onClick={() =>
                    respond({ friendshipId: r.friendshipId, accept: true })
                  }
                >
                  {t("friends.accept")}
                </button>
                <button
                  className="btn secondary small"
                  onClick={() =>
                    respond({ friendshipId: r.friendshipId, accept: false })
                  }
                >
                  {t("friends.reject")}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {overview?.outgoing.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>{t("friends.outgoing")}</h2>
          {overview.outgoing.map((r) => (
            <div key={r.friendshipId} className="friend-row">
              <Link href={`/profile/${r.userId}`}>
                <b>{r.name}</b>
              </Link>
              <button
                className="btn secondary small"
                onClick={() => remove({ friendshipId: r.friendshipId })}
              >
                {t("friends.cancel")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{t("friends.ranking")}</h2>
        {rows.length <= 1 && <p className="hint">{t("friends.empty")}</p>}
        {rows.map((f, i) => (
          <div key={f.userId || i} className={`friend-row ${f.isMe ? "me" : ""}`}>
            <span>
              <b>#{i + 1}</b>{" "}
              {f.isMe ? (
                f.name
              ) : (
                <Link href={`/profile/${f.userId}`}>{f.name}</Link>
              )}
            </span>
            <span className="friend-stats">
              📚 <b>{f.stats.learned}</b> {t("stats.kanji")} · {t("stats.at")}{" "}
              <b>#{f.stats.position}</b> · ⭐ <b>{f.stats.score}</b>
              {!f.isMe && (
                <button
                  className="btn secondary small"
                  title={t("profile.remove")}
                  onClick={() => remove({ friendshipId: f.friendshipId })}
                >
                  🗑
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
