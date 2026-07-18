import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // authTables.users'ı profil alanlarıyla genişletiyoruz
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    avatarId: v.optional(v.id("_storage")),
    wallpaperId: v.optional(v.id("_storage")),
    xp: v.optional(v.number()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  // Profildeki "son aksiyonlar" akışı
  activities: defineTable({
    userId: v.id("users"),
    type: v.string(), // "kanji" | "level" | "friend" | "groupCreate" | "groupJoin"
    char: v.optional(v.string()),
    level: v.optional(v.number()),
    name: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Günlük doğru cevap sayısı (gelişim haritası için)
  dailyStats: defineTable({
    userId: v.id("users"),
    day: v.string(), // "YYYY-MM-DD" (UTC)
    correct: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_day", ["userId", "day"]),

  kanji: defineTable({
    rank: v.number(),
    char: v.string(),
  })
    .index("by_rank", ["rank"])
    .index("by_char", ["char"]),

  progress: defineTable({
    userId: v.id("users"),
    rank: v.number(),
    char: v.string(),
    count: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_rank", ["userId", "rank"]),

  friendships: defineTable({
    requesterId: v.id("users"),
    addresseeId: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted")),
  })
    .index("by_requester", ["requesterId"])
    .index("by_addressee", ["addresseeId"]),

  groups: defineTable({
    name: v.string(),
    inviteCode: v.string(),
    ownerId: v.id("users"),
  }).index("by_code", ["inviteCode"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_user", ["groupId", "userId"]),
});
