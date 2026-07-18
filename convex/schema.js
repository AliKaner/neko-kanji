import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

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
