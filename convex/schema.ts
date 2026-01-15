import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // HFT Latency Monitoring Tables
    zones: defineTable({
      zoneId: v.string(),
      name: v.string(),
      location: v.string(),
      status: v.union(v.literal("active"), v.literal("inactive")),
    }).index("by_zoneId", ["zoneId"]),

    latencyData: defineTable({
      zoneId: v.string(),
      timestamp: v.number(),
      latency: v.number(),
      temperature: v.number(),
      vibration: v.number(),
      isBaseline: v.boolean(),
    })
      .index("by_zoneId", ["zoneId"])
      .index("by_timestamp", ["timestamp"])
      .index("by_zoneId_and_timestamp", ["zoneId", "timestamp"]),

    baselines: defineTable({
      zoneId: v.string(),
      avgLatency: v.number(),
      avgTemperature: v.number(),
      avgVibration: v.number(),
      maxLatency: v.number(),
      maxTemperature: v.number(),
      maxVibration: v.number(),
      sampleCount: v.number(),
      updatedAt: v.number(),
    }).index("by_zoneId", ["zoneId"]),

    riskAlerts: defineTable({
      zoneId: v.string(),
      timestamp: v.number(),
      riskLevel: v.union(v.literal("Low"), v.literal("Medium"), v.literal("High")),
      primaryCause: v.string(),
      latencyDeviation: v.number(),
      temperatureDeviation: v.number(),
      vibrationDeviation: v.number(),
      acknowledged: v.boolean(),
    })
      .index("by_zoneId", ["zoneId"])
      .index("by_timestamp", ["timestamp"])
      .index("by_acknowledged", ["acknowledged"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
