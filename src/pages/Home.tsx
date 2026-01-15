import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

export default function Home() {
  const riskSummary = useQuery(api.hftMonitoring.getRiskSummary);
  const navigate = useNavigate();

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-destructive text-foreground border-foreground";
      case "Medium":
        return "bg-accent text-foreground border-foreground";
      default:
        return "bg-primary text-foreground border-foreground";
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-destructive/10";
      case "Medium":
        return "bg-accent/10";
      default:
        return "bg-primary/10";
    }
  };

  return (
    <div className="min-h-screen bg-background dark">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b-4 border-foreground bg-card"
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tight">
                FIBERON
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="brutal-border bg-card px-6 py-3">
                <div className="text-xs font-mono text-muted-foreground">
                  TOTAL ZONES
                </div>
                <div className="text-2xl font-black">{riskSummary?.length || 0}</div>
              </div>
              <div className="brutal-border bg-card px-6 py-3">
                <div className="text-xs font-mono text-muted-foreground">
                  HIGH RISK
                </div>
                <div className="text-2xl font-black text-destructive">
                  {riskSummary?.filter(z => z.riskLevel === "High").length || 0}
                </div>
              </div>
              <div className="brutal-border bg-card px-6 py-3">
                <div className="text-xs font-mono text-muted-foreground">
                  MEDIUM RISK
                </div>
                <div className="text-2xl font-black text-accent">
                  {riskSummary?.filter(z => z.riskLevel === "Medium").length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container mx-auto px-6 py-8">
        {/* Critical Alerts Banner */}
        {riskSummary && riskSummary.some(z => z.riskLevel === "High" || z.riskLevel === "Medium") && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="brutal-card bg-destructive/20 border-destructive p-6 mb-8"
          >
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-2xl font-black uppercase">
                ACTIVE ANOMALIES DETECTED
              </h2>
            </div>
            <p className="text-muted-foreground font-mono text-sm">
              {riskSummary.filter(z => z.riskLevel === "High" || z.riskLevel === "Medium").length} zone(s) showing deviation from baseline behavior. Immediate review recommended.
            </p>
          </motion.div>
        )}

        {/* All Racks Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
            <Activity className="w-6 h-6" />
            ALL INFRASTRUCTURE ZONES
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {riskSummary?.map((zone, idx) => (
              <motion.div
                key={zone.zoneId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/dashboard?zone=${zone.zoneId}`)}
                className={`cursor-pointer bg-card p-6 hover:scale-[1.02] transition-all border-2 rounded ${
                  zone.riskLevel === "High"
                    ? 'border-destructive bg-destructive/5 hover:bg-destructive/10'
                    : zone.riskLevel === "Medium"
                      ? 'border-accent bg-accent/5 hover:bg-accent/10'
                      : 'border-primary bg-primary/5 hover:bg-primary/10'
                } ${getRiskBgColor(zone.riskLevel)}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-xs font-mono text-muted-foreground mb-1">
                      {zone.zoneId}
                    </div>
                    <h3 className="font-black text-2xl mb-1">{zone.name}</h3>
                    <div className="text-sm text-muted-foreground font-mono">
                      {zone.location}
                    </div>
                  </div>
                  <div
                    className={`brutal-border px-4 py-2 text-sm font-black ${getRiskColor(
                      zone.riskLevel
                    )}`}
                  >
                    {zone.riskLevel}
                  </div>
                </div>

                {/* Status */}
                <div className="brutal-border bg-background p-4 mb-4">
                  <div className="text-xs font-mono text-muted-foreground mb-1">
                    PRIMARY CAUSE
                  </div>
                  <div className="font-black text-lg">{zone.primaryCause}</div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="brutal-border bg-background p-3">
                    <div className="text-xs font-mono text-muted-foreground mb-1">
                      LATENCY
                    </div>
                    <div className="font-black text-base">
                      {zone.currentLatency.toFixed(2)}
                    </div>
                    <div className="text-xs">ms</div>
                    <div
                      className={`text-xs font-bold mt-1 ${
                        Math.abs(zone.latencyDeviation) > 15
                          ? "text-destructive"
                          : Math.abs(zone.latencyDeviation) > 8
                            ? "text-accent"
                            : "text-primary"
                      }`}
                    >
                      {zone.latencyDeviation > 0 ? "+" : ""}
                      {zone.latencyDeviation.toFixed(1)}%
                    </div>
                  </div>

                  <div className="brutal-border bg-background p-3">
                    <div className="text-xs font-mono text-muted-foreground mb-1">
                      TEMP
                    </div>
                    <div className="font-black text-base">
                      {zone.currentTemperature.toFixed(1)}
                    </div>
                    <div className="text-xs">°C</div>
                    <div
                      className={`text-xs font-bold mt-1 ${
                        Math.abs(zone.temperatureDeviation) > 15
                          ? "text-destructive"
                          : Math.abs(zone.temperatureDeviation) > 8
                            ? "text-accent"
                            : "text-primary"
                      }`}
                    >
                      {zone.temperatureDeviation > 0 ? "+" : ""}
                      {zone.temperatureDeviation.toFixed(1)}%
                    </div>
                  </div>

                  <div className="brutal-border bg-background p-3">
                    <div className="text-xs font-mono text-muted-foreground mb-1">
                      VIBR
                    </div>
                    <div className="font-black text-base">
                      {zone.currentVibration.toFixed(2)}
                    </div>
                    <div className="text-xs">g</div>
                    <div
                      className={`text-xs font-bold mt-1 ${
                        Math.abs(zone.vibrationDeviation) > 15
                          ? "text-destructive"
                          : Math.abs(zone.vibrationDeviation) > 8
                            ? "text-accent"
                            : "text-primary"
                      }`}
                    >
                      {zone.vibrationDeviation > 0 ? "+" : ""}
                      {zone.vibrationDeviation.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button className="brutal-button bg-primary text-foreground w-full py-3 flex items-center justify-center gap-2 hover:bg-primary/90">
                  <span className="font-black text-sm">VIEW DETAILED ANALYSIS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12 brutal-border bg-card p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-black text-lg uppercase mb-2">Risk Levels</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary brutal-border"></div>
                  <span className="font-mono">Low: &lt; 8% deviation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-accent brutal-border"></div>
                  <span className="font-mono">Medium: 8-15% deviation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-destructive brutal-border"></div>
                  <span className="font-mono">High: &gt; 15% deviation</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-black text-lg uppercase mb-2">Monitoring</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Real-time baseline comparison tracks latency, temperature, and vibration to detect infrastructure stress before it impacts trading performance.
              </p>
            </div>
            <div>
              <h3 className="font-black text-lg uppercase mb-2">Actions</h3>
              <p className="text-sm text-muted-foreground font-mono">
                Click any zone card to view detailed time-series analysis and correlation between environmental factors and latency drift.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
