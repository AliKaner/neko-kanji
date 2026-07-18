"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useI18n } from "@/lib/i18n";
import KanjiHeatmap from "@/components/KanjiHeatmap";

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
  const act = (fn) => fn().catch((e) => setError(e.message?.split("Error: ").pop() || t("error")));

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
              act(() => respond({ friendshipId: f.friendshipId, accept: false }))
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

export default function ProfilePage() {
  const { t } = useI18n();
  const params = useParams();
  const profile = useQuery(api.users.profile, { userId: String(params.userId) });

  const countByRank = useMemo(() => {
    const m = new Map();
    for (const row of profile?.map || []) m.set(row.rank, row.count);
    return m;
  }, [profile]);

  if (profile === undefined) return <p className="hint">{t("loading")}</p>;
  if (profile === null) return <p className="hint">{t("profile.notFound")}</p>;

  return (
    <div>
      <div className="profile-head">
        <div className="avatar">
          {(profile.name || "?").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h1 style={{ margin: 0 }}>{profile.name}</h1>
          <p className="hint" style={{ margin: "2px 0 6px" }}>
            📚 <b>{profile.stats.learned}</b> {t("stats.kanji")} ·{" "}
            {t("stats.at")} <b>#{profile.stats.position}</b> · ⭐{" "}
            <b>{profile.stats.score}</b>
          </p>
          <FriendButton profile={profile} />
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>{t("profile.map")}</h2>
      <KanjiHeatmap countByRank={countByRank} />
    </div>
  );
}
