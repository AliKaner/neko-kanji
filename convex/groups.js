import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statsOf } from "./helpers";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let code = "";
  for (let i = 0; i < 6; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Grup adı boş olamaz.");
    let inviteCode = makeCode();
    while (
      await ctx.db
        .query("groups")
        .withIndex("by_code", (q) => q.eq("inviteCode", inviteCode))
        .unique()
    ) {
      inviteCode = makeCode();
    }
    const groupId = await ctx.db.insert("groups", {
      name: trimmed,
      inviteCode,
      ownerId: me,
    });
    await ctx.db.insert("groupMembers", { groupId, userId: me });
    return { groupId, inviteCode };
  },
});

export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    const group = await ctx.db
      .query("groups")
      .withIndex("by_code", (q) => q.eq("inviteCode", code.toUpperCase().trim()))
      .unique();
    if (!group) throw new Error("Bu davet koduyla bir grup bulunamadı.");
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) =>
        q.eq("groupId", group._id).eq("userId", me)
      )
      .unique();
    if (existing) throw new Error("Zaten bu gruptasın.");
    await ctx.db.insert("groupMembers", { groupId: group._id, userId: me });
    return { groupId: group._id, name: group.name };
  },
});

export const leave = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_user", (q) => q.eq("groupId", groupId).eq("userId", me))
      .unique();
    if (!membership) throw new Error("Bu grupta değilsin.");
    await ctx.db.delete(membership._id);
    const remaining = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .first();
    if (!remaining) await ctx.db.delete(groupId);
  },
});

async function groupWithStats(ctx, group) {
  const memberships = await ctx.db
    .query("groupMembers")
    .withIndex("by_group", (q) => q.eq("groupId", group._id))
    .collect();
  const members = [];
  let totalScore = 0;
  let totalLearned = 0;
  for (const m of memberships) {
    const user = await ctx.db.get(m.userId);
    if (!user) continue;
    const stats = await statsOf(ctx, m.userId);
    totalScore += stats.score;
    totalLearned += stats.learned;
    members.push({
      userId: m.userId,
      name: user.name || user.email,
      stats,
      isOwner: group.ownerId === m.userId,
    });
  }
  members.sort((a, b) => b.stats.score - a.stats.score);
  return {
    groupId: group._id,
    name: group.name,
    inviteCode: group.inviteCode,
    memberCount: members.length,
    totalScore,
    totalLearned,
    members,
  };
}

// Üyesi olduğum gruplar, üye katkı sıralamasıyla birlikte.
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", me))
      .collect();
    const groups = [];
    for (const m of memberships) {
      const group = await ctx.db.get(m.groupId);
      if (group) groups.push(await groupWithStats(ctx, group));
    }
    groups.sort((a, b) => b.totalScore - a.totalScore);
    return groups;
  },
});

// Gruplar arası yarış: tüm grupların liderlik tablosu.
export const leaderboard = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    const all = await ctx.db.query("groups").collect();
    const rows = [];
    for (const group of all) {
      const memberships = await ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      let totalScore = 0;
      let totalLearned = 0;
      let isMine = false;
      for (const m of memberships) {
        if (me && m.userId === me) isMine = true;
        const stats = await statsOf(ctx, m.userId);
        totalScore += stats.score;
        totalLearned += stats.learned;
      }
      rows.push({
        groupId: group._id,
        name: group.name,
        memberCount: memberships.length,
        totalScore,
        totalLearned,
        isMine,
      });
    }
    rows.sort((a, b) => b.totalScore - a.totalScore);
    return rows;
  },
});
