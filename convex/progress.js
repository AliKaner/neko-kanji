import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statsOf } from "./helpers";

// Kullanıcı bir kanjiyi doğru bildiğinde çağrılır; sayacı 1 artırır.
export const recordCorrect = mutation({
  args: { char: v.string() },
  handler: async (ctx, { char }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const kanji = await ctx.db
      .query("kanji")
      .withIndex("by_char", (q) => q.eq("char", char))
      .unique();
    if (!kanji) return null; // top 2500 listesinde yoksa sayılmaz
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user_rank", (q) =>
        q.eq("userId", userId).eq("rank", kanji.rank)
      )
      .unique();
    if (row) {
      await ctx.db.patch(row._id, { count: row.count + 1 });
      return { rank: kanji.rank, count: row.count + 1 };
    }
    await ctx.db.insert("progress", {
      userId,
      rank: kanji.rank,
      char,
      count: 1,
    });
    return { rank: kanji.rank, count: 1 };
  },
});

// Isı haritası için: giriş yapan kullanıcının tüm sayaçları.
export const myMap = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({ rank: r.rank, count: r.count }));
  },
});

export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await statsOf(ctx, userId);
  },
});

// Bir arkadaşın haritasını görüntülemek için (sadece arkadaşlara açık).
export const mapOf = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;
    if (me !== userId) {
      const a = await ctx.db
        .query("friendships")
        .withIndex("by_requester", (q) => q.eq("requesterId", me))
        .filter((q) => q.eq(q.field("addresseeId"), userId))
        .unique();
      const b = await ctx.db
        .query("friendships")
        .withIndex("by_requester", (q) => q.eq("requesterId", userId))
        .filter((q) => q.eq(q.field("addresseeId"), me))
        .unique();
      const friendship = a || b;
      if (!friendship || friendship.status !== "accepted") return null;
    }
    const rows = await ctx.db
      .query("progress")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((r) => ({ rank: r.rank, count: r.count }));
  },
});
