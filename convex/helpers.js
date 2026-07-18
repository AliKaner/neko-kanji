// Renk kademeleri: 0 = hiç, 1+ = mavi, 5+ = yeşil, 10+ = mor, 20+ = altın
export const LEVEL_THRESHOLDS = [1, 5, 10, 20];

export function levelOf(count) {
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 1) return 1;
  return 0;
}

// İki kullanıcı arasındaki arkadaşlık kaydını (her iki yönde) bulur.
export async function findFriendship(ctx, a, b) {
  const x = await ctx.db
    .query("friendships")
    .withIndex("by_requester", (q) => q.eq("requesterId", a))
    .filter((q) => q.eq(q.field("addresseeId"), b))
    .unique();
  if (x) return x;
  return await ctx.db
    .query("friendships")
    .withIndex("by_requester", (q) => q.eq("requesterId", b))
    .filter((q) => q.eq(q.field("addresseeId"), a))
    .unique();
}

// Bir kullanıcının özet istatistikleri: öğrenilen kanji sayısı, puan,
// frekans sırasında kesintisiz gelinen nokta.
export async function statsOf(ctx, userId) {
  const rows = await ctx.db
    .query("progress")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const learnedRanks = new Set();
  let score = 0;
  for (const r of rows) {
    if (r.count >= 1) {
      learnedRanks.add(r.rank);
      score += levelOf(r.count);
    }
  }
  let consecutive = 0;
  while (learnedRanks.has(consecutive + 1)) consecutive++;
  return {
    learned: learnedRanks.size,
    score,
    consecutive,
    position: consecutive + 1,
  };
}
