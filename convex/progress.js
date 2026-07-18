import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statsOf, levelOf, levelFromXp, logActivity } from "./helpers";

// Kullanıcı bir kanjiyi doğru bildiğinde çağrılır; sayacı 1 artırır,
// XP verir, günlük istatistiği ve aktivite akışını günceller.
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

    // Kanji sayacı
    const row = await ctx.db
      .query("progress")
      .withIndex("by_user_rank", (q) =>
        q.eq("userId", userId).eq("rank", kanji.rank)
      )
      .unique();
    let newCount;
    if (row) {
      newCount = row.count + 1;
      await ctx.db.patch(row._id, { count: newCount });
    } else {
      newCount = 1;
      await ctx.db.insert("progress", {
        userId,
        rank: kanji.rank,
        char,
        count: 1,
      });
    }

    // Kanji seviye atladıysa aktivite yaz (1, 5, 10, 20 eşikleri)
    const oldLevel = levelOf(newCount - 1);
    const newLevel = levelOf(newCount);
    if (newLevel > oldLevel) {
      await logActivity(ctx, userId, {
        type: "kanji",
        char,
        level: newLevel,
      });
    }

    // XP ve kullanıcı seviyesi
    const user = await ctx.db.get(userId);
    const oldXp = user?.xp || 0;
    const newXp = oldXp + 1;
    await ctx.db.patch(userId, { xp: newXp });
    if (levelFromXp(newXp) > levelFromXp(oldXp)) {
      await logActivity(ctx, userId, {
        type: "level",
        level: levelFromXp(newXp),
      });
    }

    // Günlük sayaç (gelişim haritası)
    const day = new Date(Date.now()).toISOString().slice(0, 10);
    const daily = await ctx.db
      .query("dailyStats")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
      .unique();
    if (daily) await ctx.db.patch(daily._id, { correct: daily.correct + 1 });
    else await ctx.db.insert("dailyStats", { userId, day, correct: 1 });

    return { rank: kanji.rank, count: newCount };
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

