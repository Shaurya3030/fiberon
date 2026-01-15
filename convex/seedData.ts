import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedHFTData = mutation({
  args: {},
  handler: async (ctx) => {
    // Create zones
    const zones = [
      { zoneId: "RACK-01", name: "Primary Trading Rack", location: "Data Center A - Row 3", status: "active" as const },
      { zoneId: "RACK-02", name: "Backup Trading Rack", location: "Data Center A - Row 4", status: "active" as const },
      { zoneId: "RACK-03", name: "Market Data Feed", location: "Data Center B - Row 1", status: "active" as const },
      { zoneId: "RACK-04", name: "Execution Engine", location: "Data Center B - Row 2", status: "active" as const },
      { zoneId: "RACK-05", name: "Risk Analytics", location: "Data Center C - Row 1", status: "active" as const },
    ];

    // Clear existing data
    const existingZones = await ctx.db.query("zones").collect();
    for (const zone of existingZones) {
      await ctx.db.delete(zone._id);
    }

    const existingData = await ctx.db.query("latencyData").collect();
    for (const data of existingData) {
      await ctx.db.delete(data._id);
    }

    const existingBaselines = await ctx.db.query("baselines").collect();
    for (const baseline of existingBaselines) {
      await ctx.db.delete(baseline._id);
    }

    // Insert zones
    for (const zone of zones) {
      await ctx.db.insert("zones", zone);
    }

    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const MINUTE = 60 * 1000;

    // Generate baseline data (24 hours ago to 12 hours ago)
    for (const zone of zones) {
      const baseLatency = 0.5 + Math.random() * 0.5; // 0.5-1.0ms
      const baseTemp = 22 + Math.random() * 3; // 22-25°C
      const baseVibration = 0.1 + Math.random() * 0.1; // 0.1-0.2 g-force

      let totalLatency = 0;
      let totalTemp = 0;
      let totalVibration = 0;
      let count = 0;
      let maxLatency = 0;
      let maxTemp = 0;
      let maxVibration = 0;

      // Generate baseline period data (every 2 minutes for 12 hours)
      for (let i = 0; i < 360; i++) {
        const timestamp = now - 24 * HOUR + (i * 2 * MINUTE);
        const latency = baseLatency + (Math.random() - 0.5) * 0.1;
        const temperature = baseTemp + (Math.random() - 0.5) * 1;
        const vibration = baseVibration + (Math.random() - 0.5) * 0.02;

        await ctx.db.insert("latencyData", {
          zoneId: zone.zoneId,
          timestamp,
          latency,
          temperature,
          vibration,
          isBaseline: true,
        });

        totalLatency += latency;
        totalTemp += temperature;
        totalVibration += vibration;
        count++;
        maxLatency = Math.max(maxLatency, latency);
        maxTemp = Math.max(maxTemp, temperature);
        maxVibration = Math.max(maxVibration, vibration);
      }

      // Create baseline record
      await ctx.db.insert("baselines", {
        zoneId: zone.zoneId,
        avgLatency: totalLatency / count,
        avgTemperature: totalTemp / count,
        avgVibration: totalVibration / count,
        maxLatency,
        maxTemperature: maxTemp,
        maxVibration,
        sampleCount: count,
        updatedAt: now - 12 * HOUR,
      });

      // Generate recent data (last 2 hours) with some zones showing drift
      const isDriftZone = zone.zoneId === "RACK-01" || zone.zoneId === "RACK-03";

      for (let i = 0; i < 60; i++) {
        const timestamp = now - 2 * HOUR + (i * 2 * MINUTE);
        const driftFactor = isDriftZone ? 1 + (i / 60) * 0.25 : 1; // 25% drift over time

        let latency = baseLatency * driftFactor + (Math.random() - 0.5) * 0.1;
        let temperature = baseTemp + (Math.random() - 0.5) * 1;
        let vibration = baseVibration + (Math.random() - 0.5) * 0.02;

        // Add anomalies for drift zones
        if (isDriftZone && i > 40) {
          if (zone.zoneId === "RACK-01") {
            // Temperature spike
            temperature = baseTemp + 3 + (i - 40) * 0.15;
            latency *= 1.1;
          } else {
            // Vibration anomaly
            vibration = baseVibration + (i - 40) * 0.01;
            latency *= 1.15;
          }
        }

        await ctx.db.insert("latencyData", {
          zoneId: zone.zoneId,
          timestamp,
          latency,
          temperature,
          vibration,
          isBaseline: false,
        });
      }
    }

    return { success: true, message: "HFT monitoring data seeded successfully" };
  },
});
