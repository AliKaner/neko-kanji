import { query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("kanji")
      .withIndex("by_rank")
      .collect();
    return rows.map((r) => ({ rank: r.rank, char: r.char }));
  },
});
