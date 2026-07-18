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

// XP → kullanıcı seviyesi. Seviye l, [10*(l-1)², 10*l²) XP aralığını kapsar.
export function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 10)) + 1;
}

export function xpForLevel(level) {
  return 10 * (level - 1) * (level - 1);
}

// Seviye aralığına göre unvan anahtarı (i18n'de karşılığı var)
export function titleKeyOf(level) {
  if (level >= 50) return "title.sage";
  if (level >= 35) return "title.master";
  if (level >= 20) return "title.sensei";
  if (level >= 10) return "title.samurai";
  if (level >= 5) return "title.student";
  return "title.novice";
}

export async function logActivity(ctx, userId, activity) {
  await ctx.db.insert("activities", { userId, ...activity });
}

// Bir kullanıcının özet istatistikleri: öğrenilen kanji sayısı, puan,
// frekans sırasında kesintisiz gelinen nokta, XP ve seviye.
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
  const user = await ctx.db.get(userId);
  const xp = user?.xp || 0;
  const level = levelFromXp(xp);
  return {
    learned: learnedRanks.size,
    score,
    consecutive,
    position: consecutive + 1,
    xp,
    level,
    titleKey: titleKeyOf(level),
    levelStartXp: xpForLevel(level),
    nextLevelXp: xpForLevel(level + 1),
  };
}
