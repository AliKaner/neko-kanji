import { mutation, query } from "./_generated/server";
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

// Profil fotoğrafı / wallpaper yükleme akışı
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Giriş yapmalısın.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setImage = mutation({
  args: {
    kind: v.union(v.literal("avatar"), v.literal("wallpaper")),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { kind, storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Giriş yapmalısın.");
    const user = await ctx.db.get(userId);
    const field = kind === "avatar" ? "avatarId" : "wallpaperId";
    // Eski görseli sil ki depo şişmesin
    if (user?.[field]) {
      try {
        await ctx.storage.delete(user[field]);
      } catch (e) {
        // eski dosya zaten yoksa sorun değil
      }
    }
    await ctx.db.patch(userId, { [field]: storageId });
  },
});

// Herkese açık profil: isim, görseller, seviye/XP, istatistikler,
// ısı haritası, günlük gelişim ve son aksiyonlar.
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

    const activities = await ctx.db
      .query("activities")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(12);

    const sent = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .collect();
    const received = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", userId))
      .collect();
    const friendsCount = [...sent, ...received].filter(
      (f) => f.status === "accepted"
    ).length;
    const groupsCount = (
      await ctx.db
        .query("groupMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    ).length;

    const daily = await ctx.db
      .query("dailyStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      userId,
      name: user.name || user.email,
      isMe: me === userId,
      signedIn: !!me,
      avatarUrl: user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null,
      wallpaperUrl: user.wallpaperId
        ? await ctx.storage.getUrl(user.wallpaperId)
        : null,
      stats,
      friendsCount,
      groupsCount,
      memberSince: user._creationTime,
      map: rows.map((r) => ({ rank: r.rank, count: r.count })),
      friendship,
      activities: activities.map((a) => ({
        type: a.type,
        char: a.char,
        level: a.level,
        name: a.name,
        time: a._creationTime,
      })),
      daily: daily.map((d) => ({ day: d.day, correct: d.correct })),
    };
  },
});
