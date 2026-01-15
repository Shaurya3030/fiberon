import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, ArrowRight, Shield, Activity } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const riskSummary = useQuery(api.hftMonitoring.getRiskSummary);
  const navigate = useNavigate();

  // Filter only zones with anomalies (Medium or High risk)
  const anomalyZones = riskSummary?.filter(
    (zone) => zone.riskLevel === "High" || zone.riskLevel === "Medium"
  );

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

  const totalZones = riskSummary?.length || 0;
  const highRiskCount = riskSummary?.filter((z) => z.riskLevel === "High").length || 0;
  const mediumRiskCount = riskSummary?.filter((z) => z.riskLevel === "Medium").length || 0;

  return (
    <div className="min-h-screen bg-background dark">
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="border-b-4 border-foreground bg-card"
      >
        <div className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl"
          >
            <div className="brutal-border inline-block bg-primary px-4 py-2 mb-6">
              <span className="font-black text-sm uppercase tracking-wide text-primary-foreground">
                FIBERON
              </span>
            </div>
            <h1 className="text-6xl md:text-7xl font-black uppercase mb-6 leading-tight bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">
              PREDICT LATENCY
              <br />
              BEFORE IT STRIKES
            </h1>
            <p className="text-xl text-muted-foreground font-mono mb-8 max-w-2xl">
              Real-time baseline analysis detects physical stress on fiber infrastructure
              before it impacts trading performance. Early warning = zero downtime.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => navigate("/home")}
                className="brutal-button text-primary-foreground px-8 py-4 text-lg"
              >
                VIEW ALL ZONES
              </button>
              <button
                onClick={() => anomalyZones && anomalyZones.length > 0 && navigate(`/dashboard?zone=${anomalyZones[0].zoneId}`)}
                className="px-8 py-4 text-lg rounded-lg font-semibold uppercase bg-destructive text-white border-2 border-destructive hover:bg-destructive/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                INVESTIGATE ANOMALIES
              </button>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Live Status Section */}
      <section className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
        >
          <div className="brutal-card bg-card p-6">
            <Activity className="w-8 h-8 mb-3 text-primary" />
            <div className="text-3xl font-black mb-2">{totalZones}</div>
            <div className="text-sm font-mono text-muted-foreground uppercase">
              Zones Monitored
            </div>
          </div>
          <div className="brutal-card bg-card p-6">
            <AlertTriangle className="w-8 h-8 mb-3 text-destructive" />
            <div className="text-3xl font-black mb-2">{highRiskCount}</div>
            <div className="text-sm font-mono text-muted-foreground uppercase">
              High Risk Alerts
            </div>
          </div>
          <div className="brutal-card bg-card p-6">
            <TrendingUp className="w-8 h-8 mb-3 text-accent" />
            <div className="text-3xl font-black mb-2">{mediumRiskCount}</div>
            <div className="text-sm font-mono text-muted-foreground uppercase">
              Medium Risk Alerts
            </div>
          </div>
          <div className="brutal-card bg-card p-6">
            <Shield className="w-8 h-8 mb-3 text-primary" />
            <div className="text-3xl font-black mb-2">{totalZones - highRiskCount - mediumRiskCount}</div>
            <div className="text-sm font-mono text-muted-foreground uppercase">
              Healthy Zones
            </div>
          </div>
        </motion.div>

        {/* Active Anomalies Section */}
        {anomalyZones && anomalyZones.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-black uppercase flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-destructive" />
                ACTIVE ANOMALIES
              </h2>
              <button
                onClick={() => navigate("/home")}
                className="brutal-button bg-card px-6 py-3 text-sm"
              >
                VIEW ALL ZONES
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {anomalyZones.map((zone, idx) => (
                <motion.div
                  key={zone.zoneId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.1 }}
                  onClick={() => navigate(`/dashboard?zone=${zone.zoneId}`)}
                  className="brutal-card cursor-pointer bg-card p-6 hover:scale-[1.02] transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-xs font-mono text-muted-foreground mb-1">
                        {zone.zoneId}
                      </div>
                      <h3 className="font-black text-xl mb-1">{zone.name}</h3>
                      <div className="text-xs text-muted-foreground">
                        {zone.location}
                      </div>
                    </div>
                    <div
                      className={`brutal-border px-3 py-1 text-xs font-black ${getRiskColor(
                        zone.riskLevel
                      )}`}
                    >
                      {zone.riskLevel}
                    </div>
                  </div>

                  {/* Primary Cause */}
                  <div className="brutal-border bg-destructive/10 border-destructive p-3 mb-4">
                    <div className="text-xs font-mono text-muted-foreground mb-1">
                      DETECTED ISSUE
                    </div>
                    <div className="font-black text-sm">{zone.primaryCause}</div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="brutal-border bg-background p-2">
                      <div className="text-xs font-mono text-muted-foreground">
                        LATENCY
                      </div>
                      <div className="font-black text-sm">
                        {zone.currentLatency.toFixed(2)}ms
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          Math.abs(zone.latencyDeviation) > 15
                            ? "text-destructive"
                            : "text-accent"
                        }`}
                      >
                        {zone.latencyDeviation > 0 ? "+" : ""}
                        {zone.latencyDeviation.toFixed(1)}%
                      </div>
                    </div>

                    <div className="brutal-border bg-background p-2">
                      <div className="text-xs font-mono text-muted-foreground">
                        TEMP
                      </div>
                      <div className="font-black text-sm">
                        {zone.currentTemperature.toFixed(1)}°C
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          Math.abs(zone.temperatureDeviation) > 15
                            ? "text-destructive"
                            : "text-accent"
                        }`}
                      >
                        {zone.temperatureDeviation > 0 ? "+" : ""}
                        {zone.temperatureDeviation.toFixed(1)}%
                      </div>
                    </div>

                    <div className="brutal-border bg-background p-2">
                      <div className="text-xs font-mono text-muted-foreground">
                        VIBR
                      </div>
                      <div className="font-black text-sm">
                        {zone.currentVibration.toFixed(2)}g
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          Math.abs(zone.vibrationDeviation) > 15
                            ? "text-destructive"
                            : "text-accent"
                        }`}
                      >
                        {zone.vibrationDeviation > 0 ? "+" : ""}
                        {zone.vibrationDeviation.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Action */}
                  <button className="brutal-button bg-destructive text-foreground w-full py-2 flex items-center justify-center gap-2">
                    <span className="font-black text-xs">INVESTIGATE</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="brutal-card bg-primary/20 border-primary p-12 text-center"
          >
            <Shield className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="text-3xl font-black uppercase mb-3">
              ALL SYSTEMS NOMINAL
            </h3>
            <p className="text-muted-foreground font-mono text-lg mb-6">
              No anomalies detected. All infrastructure zones operating within baseline parameters.
            </p>
            <button
              onClick={() => navigate("/home")}
              className="brutal-button bg-primary text-foreground px-8 py-3"
            >
              VIEW ALL ZONES
            </button>
          </motion.div>
        )}
      </section>

      {/* Features Section */}
      <section className="border-t-4 border-foreground bg-card">
        <div className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <h2 className="text-4xl font-black uppercase mb-12 text-center">
              HOW IT WORKS
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="brutal-card bg-background p-8">
                <div className="brutal-border inline-block bg-primary text-primary-foreground px-3 py-2 mb-4 font-black text-2xl">
                  01
                </div>
                <h3 className="text-2xl font-black uppercase mb-4 text-primary">
                  BASELINE LEARNING
                </h3>
                <p className="text-muted-foreground font-mono">
                  System establishes normal behavior patterns for each rack by analyzing latency, temperature, and vibration over time.
                </p>
              </div>

              <div className="brutal-card bg-background p-8">
                <div className="brutal-border inline-block bg-primary text-primary-foreground px-3 py-2 mb-4 font-black text-2xl">
                  02
                </div>
                <h3 className="text-2xl font-black uppercase mb-4 text-primary">
                  DEVIATION DETECTION
                </h3>
                <p className="text-muted-foreground font-mono">
                  Real-time comparison identifies deviations from baseline, calculating risk levels based on magnitude and correlation.
                </p>
              </div>

              <div className="brutal-card bg-background p-8">
                <div className="brutal-border inline-block bg-destructive text-white px-3 py-2 mb-4 font-black text-2xl">
                  03
                </div>
                <h3 className="text-2xl font-black uppercase mb-4 text-destructive">
                  EARLY WARNING
                </h3>
                <p className="text-muted-foreground font-mono">
                  Actionable alerts provide root cause analysis, enabling preemptive maintenance before trading impact occurs.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
