import { query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statsOf, findFriendship } from "./helpers";

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return { _id: user._id, name: user.name, email: user.email };
  },
});

// Herkese açık profil: isim, istatistikler, ısı haritası ve
// ziyaretçiyle olan arkadaşlık durumu.
export const profile = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userId = ctx.db.normalizeId("users", args.userId);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const stats = await statsOf(ctx, userId);
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const me = await getAuthUserId(ctx);
    let friendship = null;
    if (me && me !== userId) {
      const f = await findFriendship(ctx, me, userId);
      if (f)
        friendship = {
          friendshipId: f._id,
          status: f.status,
          incoming: f.addresseeId === me,
        };
    }

    return {
      userId,
      name: user.name || user.email,
      isMe: me === userId,
      signedIn: !!me,
      stats,
      map: rows.map((r) => ({ rank: r.rank, count: r.count })),
      friendship,
    };
  },
});
