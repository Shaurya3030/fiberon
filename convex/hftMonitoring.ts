import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all zones
export const getZones = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("zones")
      .withIndex("by_zoneId")
      .collect();
  },
});

// Get baseline data for a zone
export const getBaseline = query({
  args: { zoneId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("baselines")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
      .first();
  },
});

// Get recent latency data for a zone
export const getLatencyData = query({
  args: {
    zoneId: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    const data = await ctx.db
      .query("latencyData")
      .withIndex("by_zoneId_and_timestamp", (q) => q.eq("zoneId", args.zoneId))
      .order("desc")
      .take(limit);

    return data.reverse();
  },
});

// Get risk alerts
export const getRiskAlerts = query({
  args: {
    zoneId: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    if (args.zoneId !== undefined) {
      return await ctx.db
        .query("riskAlerts")
        .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId as string))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("riskAlerts")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

// Get risk summary for all zones
export const getRiskSummary = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db.query("zones").collect();
    const summaries = [];

    for (const zone of zones) {
      const baseline = await ctx.db
        .query("baselines")
        .withIndex("by_zoneId", (q) => q.eq("zoneId", zone.zoneId))
        .first();

      const recentData = await ctx.db
        .query("latencyData")
        .withIndex("by_zoneId_and_timestamp", (q) => q.eq("zoneId", zone.zoneId))
        .order("desc")
        .take(10);

      if (recentData.length === 0 || !baseline) {
        summaries.push({
          zoneId: zone.zoneId,
          name: zone.name,
          location: zone.location,
          riskLevel: "Low" as const,
          primaryCause: "No data",
          latencyDeviation: 0,
          temperatureDeviation: 0,
          vibrationDeviation: 0,
          currentLatency: 0,
          currentTemperature: 0,
          currentVibration: 0,
        });
        continue;
      }

      const latest = recentData[0];
      const avgRecent = recentData.slice(0, 5).reduce((acc, d) => ({
        latency: acc.latency + d.latency / 5,
        temperature: acc.temperature + d.temperature / 5,
        vibration: acc.vibration + d.vibration / 5,
      }), { latency: 0, temperature: 0, vibration: 0 });

      const latencyDeviation = ((avgRecent.latency - baseline.avgLatency) / baseline.avgLatency) * 100;
      const temperatureDeviation = ((avgRecent.temperature - baseline.avgTemperature) / baseline.avgTemperature) * 100;
      const vibrationDeviation = ((avgRecent.vibration - baseline.avgVibration) / baseline.avgVibration) * 100;

      let riskLevel: "Low" | "Medium" | "High" = "Low";
      let primaryCause = "Normal operation";

      const maxDeviation = Math.max(
        Math.abs(latencyDeviation),
        Math.abs(temperatureDeviation),
        Math.abs(vibrationDeviation)
      );

      if (maxDeviation > 15) {
        riskLevel = "High";
        if (Math.abs(latencyDeviation) === maxDeviation) primaryCause = "Latency drift detected";
        else if (Math.abs(temperatureDeviation) === maxDeviation) primaryCause = "Thermal drift detected";
        else primaryCause = "Vibration anomaly detected";
      } else if (maxDeviation > 8) {
        riskLevel = "Medium";
        if (Math.abs(latencyDeviation) === maxDeviation) primaryCause = "Elevated latency";
        else if (Math.abs(temperatureDeviation) === maxDeviation) primaryCause = "Temperature elevation";
        else primaryCause = "Vibration increase";
      }

      summaries.push({
        zoneId: zone.zoneId,
        name: zone.name,
        location: zone.location,
        riskLevel,
        primaryCause,
        latencyDeviation,
        temperatureDeviation,
        vibrationDeviation,
        currentLatency: latest.latency,
        currentTemperature: latest.temperature,
        currentVibration: latest.vibration,
      });
    }

    return summaries;
  },
});

// Add new latency data point
export const addLatencyData = mutation({
  args: {
    zoneId: v.string(),
    latency: v.number(),
    temperature: v.number(),
    vibration: v.number(),
    isBaseline: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("latencyData", {
      zoneId: args.zoneId,
      timestamp: Date.now(),
      latency: args.latency,
      temperature: args.temperature,
      vibration: args.vibration,
      isBaseline: args.isBaseline,
    });
  },
});
