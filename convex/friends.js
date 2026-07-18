import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { statsOf, findFriendship, logActivity } from "./helpers";

export const sendRequestTo = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    if (userId === me) throw new Error("Kendini arkadaş olarak ekleyemezsin.");
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("Kullanıcı bulunamadı.");
    const existing = await findFriendship(ctx, me, userId);
    if (existing) {
      throw new Error(
        existing.status === "accepted"
          ? "Zaten arkadaşsınız."
          : "Zaten bekleyen bir istek var."
      );
    }
    await ctx.db.insert("friendships", {
      requesterId: me,
      addresseeId: userId,
      status: "pending",
    });
  },
});

export const respond = mutation({
  args: { friendshipId: v.id("friendships"), accept: v.boolean() },
  handler: async (ctx, { friendshipId, accept }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    const f = await ctx.db.get(friendshipId);
    if (!f || f.addresseeId !== me) throw new Error("İstek bulunamadı.");
    if (accept) {
      await ctx.db.patch(friendshipId, { status: "accepted" });
      const meUser = await ctx.db.get(me);
      const other = await ctx.db.get(f.requesterId);
      await logActivity(ctx, me, {
        type: "friend",
        name: other?.name || other?.email || "?",
      });
      await logActivity(ctx, f.requesterId, {
        type: "friend",
        name: meUser?.name || meUser?.email || "?",
      });
    } else {
      await ctx.db.delete(friendshipId);
    }
  },
});

export const remove = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, { friendshipId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) throw new Error("Giriş yapmalısın.");
    const f = await ctx.db.get(friendshipId);
    if (!f || (f.requesterId !== me && f.addresseeId !== me))
      throw new Error("İstek bulunamadı.");
    await ctx.db.delete(friendshipId);
  },
});

// Arkadaş listesi + gelen/giden istekler + herkesin ilerleme istatistikleri.
export const overview = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;

    const sent = await ctx.db
      .query("friendships")
      .withIndex("by_requester", (q) => q.eq("requesterId", me))
      .collect();
    const received = await ctx.db
      .query("friendships")
      .withIndex("by_addressee", (q) => q.eq("addresseeId", me))
      .collect();

    const friends = [];
    const incoming = [];
    const outgoing = [];

    for (const f of [...sent, ...received]) {
      const otherId = f.requesterId === me ? f.addresseeId : f.requesterId;
      const other = await ctx.db.get(otherId);
      if (!other) continue;
      const base = {
        friendshipId: f._id,
        userId: otherId,
        name: other.name || other.email,
      };
      if (f.status === "accepted") {
        friends.push({ ...base, stats: await statsOf(ctx, otherId) });
      } else if (f.addresseeId === me) {
        incoming.push(base);
      } else {
        outgoing.push(base);
      }
    }

    const myStats = await statsOf(ctx, me);
    friends.sort((a, b) => b.stats.score - a.stats.score);
    return { friends, incoming, outgoing, myStats };
  },
});
