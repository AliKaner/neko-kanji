import { query } from "./_generated/server";
import { v } from "convex/values";

// Header'daki tek arama kutusu: hem kullanıcı hem kanji arar.
export const all = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    const t = term.trim();
    if (!t) return { users: [], kanji: [] };

    const lower = t.toLowerCase();
    const allUsers = await ctx.db.query("users").collect();
    const users = allUsers
      .filter((u) => (u.name || u.email || "").toLowerCase().includes(lower))
      .slice(0, 8)
      .map((u) => ({ userId: u._id, name: u.name || u.email }));

    const kanji = [];
    const seen = new Set();
    for (const ch of t) {
      if (seen.has(ch)) continue;
      seen.add(ch);
      const k = await ctx.db
        .query("kanji")
        .withIndex("by_char", (q) => q.eq("char", ch))
        .unique();
      if (k) kanji.push({ rank: k.rank, char: k.char });
      if (kanji.length >= 8) break;
    }
    // Sayı yazıldıysa o sıradaki kanjiyi de göster (örn. "42")
    if (/^\d+$/.test(t)) {
      const k = await ctx.db
        .query("kanji")
        .withIndex("by_rank", (q) => q.eq("rank", parseInt(t, 10)))
        .unique();
      if (k && !kanji.some((x) => x.rank === k.rank))
        kanji.unshift({ rank: k.rank, char: k.char });
    }

    return { users, kanji };
  },
});
