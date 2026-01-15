import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Circle } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
  ReferenceArea,
} from "recharts";

interface AnomalyEvent {
  id: string;
  zoneId: string;
  startTime: number;
  endTime: number;
  peakLatency: number;
  peakTemperature: number;
  peakVibration: number;
  riskLevel: "Medium" | "High";
  dataPoints: Array<{
    timestamp: number;
    latency: number;
    temperature: number;
    vibration: number;
  }>;
}

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [anomalyEvents, setAnomalyEvents] = useState<AnomalyEvent[]>([]);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [liveDataBuffer, setLiveDataBuffer] = useState<Array<{
    timestamp: number;
    latency: number;
    temperature: number;
    vibration: number;
  }>>([]);

  const riskSummary = useQuery(api.hftMonitoring.getRiskSummary);
  const zones = useQuery(api.hftMonitoring.getZones);
  const latencyData = useQuery(
    api.hftMonitoring.getLatencyData,
    selectedZone ? { zoneId: selectedZone, limit: 120 } : "skip"
  );
  const baseline = useQuery(
    api.hftMonitoring.getBaseline,
    selectedZone ? { zoneId: selectedZone } : "skip"
  );
  const addLatencyData = useMutation(api.hftMonitoring.addLatencyData);

  // Live data generator - stores last values for smooth transitions
  const lastValuesRef = useRef<{
    latency: number;
    temperature: number;
    vibration: number;
  }>({
    latency: 0.285,
    temperature: 68.5,
    vibration: 0.012,
  });

  useEffect(() => {
    const zoneParam = searchParams.get("zone");
    if (zoneParam) {
      setSelectedZone(zoneParam);
    } else if (zones && zones.length > 0 && !selectedZone) {
      setSelectedZone(zones[0].zoneId);
    }
  }, [zones, selectedZone, searchParams]);

  // Initialize last values from latest data
  useEffect(() => {
    if (latencyData && latencyData.length > 0) {
      const latest = latencyData[latencyData.length - 1];
      lastValuesRef.current = {
        latency: latest.latency,
        temperature: latest.temperature,
        vibration: latest.vibration,
      };
    }
  }, [latencyData]);

  // Live data generator - produces realistic streaming data
  useEffect(() => {
    if (!isLiveMode || !selectedZone || !baseline) return;

    const generateNextValue = (current: number, baseValue: number, volatility: number) => {
      // Random walk with mean reversion
      const randomDelta = (Math.random() - 0.5) * volatility;
      const meanReversion = (baseValue - current) * 0.05; // Pull towards baseline

      // Occasionally introduce stress patterns
      const stressChance = Math.random();
      let stressFactor = 0;
      if (stressChance > 0.95) {
        // 5% chance of stress spike
        stressFactor = volatility * (Math.random() * 3 + 1);
      }

      return current + randomDelta + meanReversion + stressFactor;
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const last = lastValuesRef.current;

      // Generate new values with realistic variation
      const newLatency = Math.max(0.001, generateNextValue(
        last.latency,
        baseline.avgLatency,
        baseline.avgLatency * 0.02 // 2% volatility
      ));

      const newTemperature = Math.max(20, generateNextValue(
        last.temperature,
        baseline.avgTemperature,
        0.5 // 0.5°C volatility
      ));

      const newVibration = Math.max(0, generateNextValue(
        last.vibration,
        baseline.avgVibration,
        baseline.avgVibration * 0.05 // 5% volatility
      ));

      // Update ref for next iteration
      lastValuesRef.current = {
        latency: newLatency,
        temperature: newTemperature,
        vibration: newVibration,
      };

      // Add to local buffer for immediate UI update
      setLiveDataBuffer(prev => {
        const newBuffer = [...prev, {
          timestamp: now,
          latency: newLatency,
          temperature: newTemperature,
          vibration: newVibration,
        }];
        // Keep last 50 points in buffer
        return newBuffer.slice(-50);
      });

      // Persist to database every 3rd data point to reduce write load
      if (Math.random() > 0.66) {
        addLatencyData({
          zoneId: selectedZone,
          latency: newLatency,
          temperature: newTemperature,
          vibration: newVibration,
          isBaseline: false,
        }).catch(err => console.error("Failed to add latency data:", err));
      }
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, [isLiveMode, selectedZone, baseline, addLatencyData]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":
        return "text-destructive";
      case "Medium":
        return "text-accent";
      default:
        return "text-primary";
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case "High":
        return "bg-destructive/10 border-destructive";
      case "Medium":
        return "bg-accent/10 border-accent";
      default:
        return "bg-primary/10 border-primary";
    }
  };

  // Merge database data with live buffer for seamless real-time updates
  const mergedData = useMemo(() => {
    const merged = latencyData ? [...latencyData] : [];
    if (isLiveMode && liveDataBuffer.length > 0 && selectedZone) {
      // Only add buffer points that are newer than latest DB point
      const latestDbTimestamp = merged.length > 0 ? merged[merged.length - 1].timestamp : 0;
      const newBufferPoints = liveDataBuffer.filter(p => p.timestamp > latestDbTimestamp);
      merged.push(...newBufferPoints.map(p => ({
        ...p,
        zoneId: selectedZone,
        isBaseline: false,
        _id: `live-${p.timestamp}` as any,
        _creationTime: p.timestamp,
      })));
    }
    return merged;
  }, [latencyData, liveDataBuffer, isLiveMode, selectedZone]);

  const chartData = useMemo(() => mergedData.map((d) => ({
    time: formatTime(d.timestamp),
    timestamp: d.timestamp,
    latency: d.latency,
    temperature: d.temperature,
    vibration: d.vibration * 100,
  })), [mergedData]);

  // Calculate aggregate stats and trends (memoized)
  const currentZoneData = riskSummary?.find(z => z.zoneId === selectedZone);

  const avgLatency = useMemo(() =>
    chartData.length > 0 ? chartData.slice(-10).reduce((a, b) => a + b.latency, 0) / 10 : 0,
    [chartData]
  );

  const latencyVolatility = useMemo(() =>
    chartData.length > 0 ? Math.sqrt(chartData.slice(-10).reduce((acc, d) => acc + Math.pow(d.latency - avgLatency, 2), 0) / 10) : 0,
    [chartData, avgLatency]
  );

  // Calculate latency trend (comparing recent vs earlier data)
  const latencyTrend = useMemo(() => {
    if (chartData.length >= 20) {
      const recent = chartData.slice(-10).reduce((a, b) => a + b.latency, 0) / 10;
      const earlier = chartData.slice(-20, -10).reduce((a, b) => a + b.latency, 0) / 10;
      const change = ((recent - earlier) / earlier) * 100;
      return { change, direction: change > 2 ? 'up' : change < -2 ? 'down' : 'stable' as const };
    }
    return { change: 0, direction: 'stable' as const };
  }, [chartData]);

  // Calculate real-time risk score
  const riskScore = useMemo(() => {
    if (!baseline || !avgLatency) return 0;
    const deviation = Math.abs(((avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100);
    const volatilityFactor = latencyVolatility / baseline.avgLatency * 100;
    const trendFactor = latencyTrend.direction === 'up' ? Math.abs(latencyTrend.change) : 0;
    const score = (deviation * 0.6) + (volatilityFactor * 0.2) + (trendFactor * 0.2);
    return Math.min(100, Math.max(0, score));
  }, [baseline, avgLatency, latencyVolatility, latencyTrend]);

  const riskStatus = riskScore < 8 ? 'Stable' : riskScore < 15 ? 'Stress Building' : 'High Risk';
  const riskStatusColor = riskScore < 8 ? 'text-primary' : riskScore < 15 ? 'text-accent' : 'text-destructive';

  // Anomaly detection logic - uses merged data including live buffer
  useEffect(() => {
    if (!mergedData || mergedData.length === 0 || !baseline || !selectedZone) return;

    type AnomalyBuilder = {
      startIdx: number;
      dataPoints: Array<{
        timestamp: number;
        latency: number;
        temperature: number;
        vibration: number;
      }>;
      peakLatency: number;
      peakTemperature: number;
      peakVibration: number;
    };

    const detectedAnomalies: AnomalyEvent[] = [];
    let currentAnomaly: AnomalyBuilder | null = null;

    const closeAnomaly = (anomalyBuilder: AnomalyBuilder) => {
      if (anomalyBuilder.dataPoints.length >= 3) {
        const maxDev = Math.max(
          Math.abs(((anomalyBuilder.peakLatency - baseline.avgLatency) / baseline.avgLatency) * 100),
          Math.abs(((anomalyBuilder.peakTemperature - baseline.avgTemperature) / baseline.avgTemperature) * 100),
          Math.abs(((anomalyBuilder.peakVibration - baseline.avgVibration) / baseline.avgVibration) * 100)
        );
        const anomaly: AnomalyEvent = {
          id: `${selectedZone}-${anomalyBuilder.dataPoints[0].timestamp}`,
          zoneId: selectedZone,
          startTime: anomalyBuilder.dataPoints[0].timestamp,
          endTime: anomalyBuilder.dataPoints[anomalyBuilder.dataPoints.length - 1].timestamp,
          peakLatency: anomalyBuilder.peakLatency,
          peakTemperature: anomalyBuilder.peakTemperature,
          peakVibration: anomalyBuilder.peakVibration,
          riskLevel: maxDev > 15 ? "High" : "Medium",
          dataPoints: anomalyBuilder.dataPoints,
        };
        detectedAnomalies.push(anomaly);
      }
    };

    mergedData.forEach((point, idx) => {
      const latencyDev = Math.abs(((point.latency - baseline.avgLatency) / baseline.avgLatency) * 100);
      const tempDev = Math.abs(((point.temperature - baseline.avgTemperature) / baseline.avgTemperature) * 100);
      const vibDev = Math.abs(((point.vibration - baseline.avgVibration) / baseline.avgVibration) * 100);
      const maxDev = Math.max(latencyDev, tempDev, vibDev);

      // Anomaly threshold: Medium = 8%, High = 15%
      if (maxDev > 8) {
        if (!currentAnomaly) {
          // Start new anomaly period
          currentAnomaly = {
            startIdx: idx,
            dataPoints: [{
              timestamp: point.timestamp,
              latency: point.latency,
              temperature: point.temperature,
              vibration: point.vibration,
            }],
            peakLatency: point.latency,
            peakTemperature: point.temperature,
            peakVibration: point.vibration,
          };
        } else {
          // Continue existing anomaly
          currentAnomaly.dataPoints.push({
            timestamp: point.timestamp,
            latency: point.latency,
            temperature: point.temperature,
            vibration: point.vibration,
          });
          currentAnomaly.peakLatency = Math.max(currentAnomaly.peakLatency, point.latency);
          currentAnomaly.peakTemperature = Math.max(currentAnomaly.peakTemperature, point.temperature);
          currentAnomaly.peakVibration = Math.max(currentAnomaly.peakVibration, point.vibration);
        }
      } else {
        // End anomaly period if it exists
        if (currentAnomaly) {
          closeAnomaly(currentAnomaly);
        }
        currentAnomaly = null;
      }
    });

    // Close out last anomaly if still active
    if (currentAnomaly) {
      closeAnomaly(currentAnomaly);
    }

    setAnomalyEvents(detectedAnomalies);
  }, [mergedData, baseline, selectedZone]);

  return (
    <div className="min-h-screen bg-background text-foreground dark font-mono">
      {/* System Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/home")}
                className="px-2 py-1 text-xs border border-border hover:border-primary transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <div>
                <h1 className="text-sm font-semibold uppercase tracking-wide">
                  Fiberon Latency Monitor
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setIsLiveMode(!isLiveMode)}
                className={`flex items-center gap-2 px-3 py-1 text-xs border transition-colors ${
                  isLiveMode
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-primary'
                }`}
              >
                <Circle className={`w-2 h-2 ${isLiveMode ? 'fill-primary text-primary animate-pulse' : 'fill-muted-foreground text-muted-foreground'}`} />
                <span className="uppercase">{isLiveMode ? 'Live' : 'Paused'}</span>
              </button>
              <div className="text-xs text-muted-foreground">
                {new Date().toLocaleString()}
              </div>
              {isLiveMode && liveDataBuffer.length > 0 && (
                <div className="text-xs text-primary font-mono">
                  +{liveDataBuffer.length} streaming
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 py-4 space-y-4">
        {/* System Health Overview */}
        <section>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">System Health</div>
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-2 border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Overall Risk Status</div>
              <div className="flex items-baseline gap-3">
                <div className={`text-2xl font-bold uppercase ${riskStatusColor}`}>
                  {riskStatus}
                </div>
                <div className="text-sm font-mono text-muted-foreground">
                  {riskScore.toFixed(1)}
                </div>
              </div>
              {currentZoneData && (
                <div className="text-xs text-muted-foreground mt-1">{currentZoneData.primaryCause}</div>
              )}
              <div className="mt-2 h-1 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    riskScore < 8 ? 'bg-primary' : riskScore < 15 ? 'bg-accent' : 'bg-destructive'
                  }`}
                  style={{ width: `${Math.min(100, riskScore * 6.67)}%` }}
                />
              </div>
            </div>
            <div className="border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Avg Latency</div>
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-bold">{avgLatency.toFixed(3)}</div>
                {latencyTrend.direction !== 'stable' && (
                  <div className={`text-xs font-mono ${
                    latencyTrend.direction === 'up' ? 'text-destructive' : 'text-primary'
                  }`}>
                    {latencyTrend.direction === 'up' ? '↑' : '↓'}{Math.abs(latencyTrend.change).toFixed(1)}%
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">milliseconds</div>
            </div>
            <div className="border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Volatility</div>
              <div className="text-xl font-bold">{latencyVolatility.toFixed(4)}</div>
              <div className="text-xs text-muted-foreground">std deviation</div>
            </div>
            <div className="border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Temperature</div>
              <div className="text-xl font-bold">{currentZoneData?.currentTemperature.toFixed(1) || "—"}</div>
              <div className="text-xs text-muted-foreground">celsius</div>
            </div>
            <div className="border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground mb-1">Vibration</div>
              <div className="text-xl font-bold">{currentZoneData?.currentVibration.toFixed(3) || "—"}</div>
              <div className="text-xs text-muted-foreground">g-force</div>
            </div>
          </div>
        </section>

        {/* Zone Selector */}
        <section className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Selected Zone:</div>
          <div className="flex gap-2">
            {zones?.map((zone) => (
              <button
                key={zone.zoneId}
                onClick={() => setSelectedZone(zone.zoneId)}
                className={`px-3 py-1 text-xs border transition-colors ${
                  selectedZone === zone.zoneId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card hover:border-primary'
                }`}
              >
                {zone.zoneId}
              </button>
            ))}
          </div>
        </section>

        {/* Baseline vs Current */}
        {chartData && baseline && (
          <section>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Baseline vs Current Behavior
            </div>
            <div className="border border-border bg-card p-4">
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-muted-foreground">Baseline Avg</div>
                  <div className="text-lg font-bold text-primary">{baseline.avgLatency.toFixed(3)} ms</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Current Avg</div>
                  <div className="text-lg font-bold">{avgLatency.toFixed(3)} ms</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Deviation</div>
                  <div className={`text-lg font-bold ${
                    Math.abs(((avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100) > 15
                      ? 'text-destructive'
                      : Math.abs(((avgLatency - baseline.avgLatency) / baseline.avgLatency) * 100) > 8
                        ? 'text-accent'
                        : 'text-primary'
                  }`}>
                    {((avgLatency - baseline.avgLatency) / baseline.avgLatency * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Risk Threshold</div>
                  <div className="text-lg font-bold text-destructive">{(baseline.avgLatency * 1.15).toFixed(3)} ms</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="latencyArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(0.62 0.15 150)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="oklch(0.62 0.15 150)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                  <XAxis
                    dataKey="time"
                    stroke="oklch(0.58 0.008 260)"
                    style={{ fontSize: "10px" }}
                    tick={{ fill: "oklch(0.58 0.008 260)" }}
                  />
                  <YAxis
                    stroke="oklch(0.58 0.008 260)"
                    style={{ fontSize: "10px" }}
                    tick={{ fill: "oklch(0.58 0.008 260)" }}
                    label={{
                      value: "Latency (ms)",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: "10px", fill: "oklch(0.58 0.008 260)" },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "oklch(0.22 0.008 260)",
                      border: "1px solid oklch(0.32 0.010 260)",
                      borderRadius: "2px",
                      fontSize: "10px",
                    }}
                  />
                  <ReferenceLine
                    y={baseline.avgLatency}
                    stroke="oklch(0.62 0.15 150)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    label={{
                      value: "Baseline",
                      position: "right",
                      style: { fontSize: "10px", fill: "oklch(0.62 0.15 150)" },
                    }}
                  />
                  <ReferenceLine
                    y={baseline.avgLatency * 1.15}
                    stroke="oklch(0.58 0.20 25)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    label={{
                      value: "Risk Threshold",
                      position: "right",
                      style: { fontSize: "10px", fill: "oklch(0.58 0.20 25)" },
                    }}
                  />
                  {/* Highlight deviation zone */}
                  {chartData.some(d => d.latency > baseline.avgLatency * 1.08) && (
                    <ReferenceArea
                      y1={baseline.avgLatency * 1.08}
                      y2={baseline.avgLatency * 1.20}
                      fill="oklch(0.58 0.20 25)"
                      fillOpacity={0.05}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="latency"
                    stroke="oklch(0.62 0.15 150)"
                    strokeWidth={2}
                    fill="url(#latencyArea)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Time-Series Environmental Monitoring */}
        {chartData && baseline && (
          <section>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Time-Series Environmental Monitoring
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Temperature */}
              <div className="border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground mb-3">Temperature (°C)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                    <XAxis
                      dataKey="time"
                      stroke="oklch(0.58 0.008 260)"
                      style={{ fontSize: "9px" }}
                      tick={{ fill: "oklch(0.58 0.008 260)" }}
                    />
                    <YAxis
                      stroke="oklch(0.58 0.008 260)"
                      style={{ fontSize: "9px" }}
                      tick={{ fill: "oklch(0.58 0.008 260)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.22 0.008 260)",
                        border: "1px solid oklch(0.32 0.010 260)",
                        borderRadius: "2px",
                        fontSize: "10px",
                      }}
                    />
                    <ReferenceLine
                      y={baseline.avgTemperature}
                      stroke="oklch(0.58 0.008 260)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="oklch(0.70 0.16 85)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Vibration */}
              <div className="border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground mb-3">Vibration (g-force × 100)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                    <XAxis
                      dataKey="time"
                      stroke="oklch(0.58 0.008 260)"
                      style={{ fontSize: "9px" }}
                      tick={{ fill: "oklch(0.58 0.008 260)" }}
                    />
                    <YAxis
                      stroke="oklch(0.58 0.008 260)"
                      style={{ fontSize: "9px" }}
                      tick={{ fill: "oklch(0.58 0.008 260)" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.22 0.008 260)",
                        border: "1px solid oklch(0.32 0.010 260)",
                        borderRadius: "2px",
                        fontSize: "10px",
                      }}
                    />
                    <ReferenceLine
                      y={baseline.avgVibration * 100}
                      stroke="oklch(0.58 0.008 260)"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                    <Line
                      type="monotone"
                      dataKey="vibration"
                      stroke="oklch(0.60 0.12 200)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        )}

        {/* Infrastructure Risk Summary */}
        <section>
          <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
            Infrastructure Risk Summary
          </div>
          <div className="border border-border bg-card">
            <table className="w-full text-xs">
              <thead className="border-b border-border bg-muted">
                <tr>
                  <th className="text-left p-3 font-semibold uppercase tracking-wider">Zone ID</th>
                  <th className="text-left p-3 font-semibold uppercase tracking-wider">Location</th>
                  <th className="text-left p-3 font-semibold uppercase tracking-wider">Risk Level</th>
                  <th className="text-left p-3 font-semibold uppercase tracking-wider">Primary Cause</th>
                  <th className="text-right p-3 font-semibold uppercase tracking-wider">Latency</th>
                  <th className="text-right p-3 font-semibold uppercase tracking-wider">Deviation</th>
                </tr>
              </thead>
              <tbody>
                {riskSummary?.map((zone, idx) => (
                  <tr
                    key={zone.zoneId}
                    className={`cursor-pointer transition-colors ${
                      zone.riskLevel === "High"
                        ? 'border-b-2 border-l-4 border-b-border border-l-destructive bg-destructive/5 hover:bg-destructive/10'
                        : zone.riskLevel === "Medium"
                          ? 'border-b-2 border-l-4 border-b-border border-l-accent bg-accent/5 hover:bg-accent/10'
                          : 'border-b-2 border-l-4 border-b-border border-l-primary bg-primary/5 hover:bg-primary/10'
                    } ${selectedZone === zone.zoneId ? 'ring-2 ring-inset ring-foreground/20' : ''}`}
                    onClick={() => setSelectedZone(zone.zoneId)}
                  >
                    <td className="p-3 font-mono font-semibold">{zone.zoneId}</td>
                    <td className="p-3 text-muted-foreground">{zone.location}</td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 border ${getRiskBg(zone.riskLevel)} ${getRiskColor(zone.riskLevel)} font-semibold`}>
                        {zone.riskLevel}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{zone.primaryCause}</td>
                    <td className="p-3 text-right font-mono">{zone.currentLatency.toFixed(3)} ms</td>
                    <td className={`p-3 text-right font-mono font-semibold ${
                      Math.abs(zone.latencyDeviation) > 15
                        ? 'text-destructive'
                        : Math.abs(zone.latencyDeviation) > 8
                          ? 'text-accent'
                          : 'text-primary'
                    }`}>
                      {zone.latencyDeviation > 0 ? '+' : ''}{zone.latencyDeviation.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Early Warning Panel */}
        {currentZoneData && currentZoneData.riskLevel !== "Low" && (
          <section>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Early Warning Analysis
            </div>
            <div className={`border p-4 ${getRiskBg(currentZoneData.riskLevel)}`}>
              <div className="flex items-start justify-between mb-2">
                <div className={`text-sm font-bold uppercase ${getRiskColor(currentZoneData.riskLevel)}`}>
                  {currentZoneData.riskLevel} Risk Detected
                </div>
                <div className="text-xs text-muted-foreground">
                  Confidence: {(100 - Math.abs(currentZoneData.latencyDeviation) * 2).toFixed(0)}%
                </div>
              </div>
              <div className="text-xs space-y-2">
                <div>
                  <span className="text-muted-foreground">Zone:</span>{" "}
                  <span className="font-mono font-semibold">{currentZoneData.zoneId}</span> ({currentZoneData.name})
                </div>
                <div>
                  <span className="text-muted-foreground">Primary Cause:</span>{" "}
                  <span className="font-semibold">{currentZoneData.primaryCause}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-border">
                  <div>
                    <div className="text-muted-foreground">Latency Deviation</div>
                    <div className={`font-mono font-bold ${getRiskColor(currentZoneData.riskLevel)}`}>
                      {currentZoneData.latencyDeviation > 0 ? '+' : ''}{currentZoneData.latencyDeviation.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Temperature Deviation</div>
                    <div className={`font-mono font-bold ${
                      Math.abs(currentZoneData.temperatureDeviation) > 10 ? 'text-accent' : 'text-muted-foreground'
                    }`}>
                      {currentZoneData.temperatureDeviation > 0 ? '+' : ''}{currentZoneData.temperatureDeviation.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Vibration Deviation</div>
                    <div className={`font-mono font-bold ${
                      Math.abs(currentZoneData.vibrationDeviation) > 10 ? 'text-accent' : 'text-muted-foreground'
                    }`}>
                      {currentZoneData.vibrationDeviation > 0 ? '+' : ''}{currentZoneData.vibrationDeviation.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Anomaly Events Timeline */}
        {anomalyEvents.length > 0 && (
          <section>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Detected Anomaly Events ({anomalyEvents.length})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {anomalyEvents.map((anomaly) => (
                <motion.div
                  key={anomaly.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSelectedAnomaly(anomaly)}
                  className={`cursor-pointer border p-4 transition-all hover:scale-[1.02] ${
                    selectedAnomaly?.id === anomaly.id
                      ? 'ring-2 ring-foreground/30'
                      : ''
                  } ${getRiskBg(anomaly.riskLevel)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`text-xs font-bold uppercase ${getRiskColor(anomaly.riskLevel)}`}>
                      {anomaly.riskLevel} Risk Anomaly
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {anomaly.dataPoints.length} pts
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Start:</span>{" "}
                      <span className="font-mono">{new Date(anomaly.startTime).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End:</span>{" "}
                      <span className="font-mono">{new Date(anomaly.endTime).toLocaleTimeString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>{" "}
                      <span className="font-mono">
                        {Math.floor((anomaly.endTime - anomaly.startTime) / 60000)}m {Math.floor(((anomaly.endTime - anomaly.startTime) % 60000) / 1000)}s
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
                      <div>
                        <div className="text-muted-foreground text-[10px]">PEAK LAT</div>
                        <div className="font-mono font-bold text-xs">{anomaly.peakLatency.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px]">PEAK TEMP</div>
                        <div className="font-mono font-bold text-xs">{anomaly.peakTemperature.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px]">PEAK VIB</div>
                        <div className="font-mono font-bold text-xs">{anomaly.peakVibration.toFixed(3)}</div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Detailed Anomaly View */}
        {selectedAnomaly && baseline && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                Anomaly Event Details
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="px-3 py-1 text-xs border border-border hover:border-destructive transition-colors"
              >
                Close
              </button>
            </div>
            <div className={`border p-4 ${getRiskBg(selectedAnomaly.riskLevel)}`}>
              <div className="mb-4">
                <div className={`text-sm font-bold uppercase mb-2 ${getRiskColor(selectedAnomaly.riskLevel)}`}>
                  {selectedAnomaly.riskLevel} Risk Event Analysis
                </div>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Event ID:</span>{" "}
                    <span className="font-mono">{selectedAnomaly.id.split('-').pop()?.slice(0, 8)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started:</span>{" "}
                    <span className="font-mono">{new Date(selectedAnomaly.startTime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ended:</span>{" "}
                    <span className="font-mono">{new Date(selectedAnomaly.endTime).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Data Points:</span>{" "}
                    <span className="font-mono font-bold">{selectedAnomaly.dataPoints.length}</span>
                  </div>
                </div>
              </div>

              {/* Anomaly Timeline Charts */}
              <div className="space-y-4">
                {/* Latency During Anomaly */}
                <div className="border border-border bg-background p-3">
                  <div className="text-xs text-muted-foreground mb-2">Latency During Anomaly Event</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={selectedAnomaly.dataPoints.map(p => ({
                      time: formatTime(p.timestamp),
                      latency: p.latency,
                      baseline: baseline.avgLatency,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                      <XAxis
                        dataKey="time"
                        stroke="oklch(0.58 0.008 260)"
                        style={{ fontSize: "9px" }}
                        tick={{ fill: "oklch(0.58 0.008 260)" }}
                      />
                      <YAxis
                        stroke="oklch(0.58 0.008 260)"
                        style={{ fontSize: "9px" }}
                        tick={{ fill: "oklch(0.58 0.008 260)" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.22 0.008 260)",
                          border: "1px solid oklch(0.32 0.010 260)",
                          borderRadius: "2px",
                          fontSize: "10px",
                        }}
                      />
                      <ReferenceLine
                        y={baseline.avgLatency}
                        stroke="oklch(0.62 0.15 150)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        label={{
                          value: "Baseline",
                          position: "right",
                          style: { fontSize: "10px", fill: "oklch(0.62 0.15 150)" },
                        }}
                      />
                      <ReferenceLine
                        y={baseline.avgLatency * 1.15}
                        stroke="oklch(0.58 0.20 25)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        label={{
                          value: "High Risk",
                          position: "right",
                          style: { fontSize: "10px", fill: "oklch(0.58 0.20 25)" },
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke="oklch(0.58 0.20 25)"
                        strokeWidth={2}
                        dot={{ fill: "oklch(0.58 0.20 25)", r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Peak: <span className="font-mono font-bold text-destructive">{selectedAnomaly.peakLatency.toFixed(3)} ms</span>
                    {" "}(+{(((selectedAnomaly.peakLatency - baseline.avgLatency) / baseline.avgLatency) * 100).toFixed(1)}% from baseline)
                  </div>
                </div>

                {/* Temperature and Vibration Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Temperature During Anomaly */}
                  <div className="border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground mb-2">Temperature During Event</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={selectedAnomaly.dataPoints.map(p => ({
                        time: formatTime(p.timestamp),
                        temperature: p.temperature,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                        <XAxis
                          dataKey="time"
                          stroke="oklch(0.58 0.008 260)"
                          style={{ fontSize: "9px" }}
                          tick={{ fill: "oklch(0.58 0.008 260)" }}
                        />
                        <YAxis
                          stroke="oklch(0.58 0.008 260)"
                          style={{ fontSize: "9px" }}
                          tick={{ fill: "oklch(0.58 0.008 260)" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.22 0.008 260)",
                            border: "1px solid oklch(0.32 0.010 260)",
                            borderRadius: "2px",
                            fontSize: "10px",
                          }}
                        />
                        <ReferenceLine
                          y={baseline.avgTemperature}
                          stroke="oklch(0.58 0.008 260)"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="temperature"
                          stroke="oklch(0.70 0.16 85)"
                          strokeWidth={2}
                          dot={{ fill: "oklch(0.70 0.16 85)", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Peak: <span className="font-mono font-bold text-accent">{selectedAnomaly.peakTemperature.toFixed(1)} °C</span>
                      {" "}(+{(((selectedAnomaly.peakTemperature - baseline.avgTemperature) / baseline.avgTemperature) * 100).toFixed(1)}%)
                    </div>
                  </div>

                  {/* Vibration During Anomaly */}
                  <div className="border border-border bg-background p-3">
                    <div className="text-xs text-muted-foreground mb-2">Vibration During Event</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={selectedAnomaly.dataPoints.map(p => ({
                        time: formatTime(p.timestamp),
                        vibration: p.vibration,
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.32 0.010 260)" />
                        <XAxis
                          dataKey="time"
                          stroke="oklch(0.58 0.008 260)"
                          style={{ fontSize: "9px" }}
                          tick={{ fill: "oklch(0.58 0.008 260)" }}
                        />
                        <YAxis
                          stroke="oklch(0.58 0.008 260)"
                          style={{ fontSize: "9px" }}
                          tick={{ fill: "oklch(0.58 0.008 260)" }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "oklch(0.22 0.008 260)",
                            border: "1px solid oklch(0.32 0.010 260)",
                            borderRadius: "2px",
                            fontSize: "10px",
                          }}
                        />
                        <ReferenceLine
                          y={baseline.avgVibration}
                          stroke="oklch(0.58 0.008 260)"
                          strokeWidth={1}
                          strokeDasharray="3 3"
                        />
                        <Line
                          type="monotone"
                          dataKey="vibration"
                          stroke="oklch(0.60 0.12 200)"
                          strokeWidth={2}
                          dot={{ fill: "oklch(0.60 0.12 200)", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Peak: <span className="font-mono font-bold">{selectedAnomaly.peakVibration.toFixed(3)} g</span>
                      {" "}(+{(((selectedAnomaly.peakVibration - baseline.avgVibration) / baseline.avgVibration) * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>

                {/* Event Timeline Breakdown */}
                <div className="border border-border bg-background p-3">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Event Timeline Breakdown</div>
                  <div className="space-y-1 text-xs max-h-48 overflow-y-auto">
                    {selectedAnomaly.dataPoints.map((point, idx) => {
                      const latencyDev = ((point.latency - baseline.avgLatency) / baseline.avgLatency) * 100;
                      const tempDev = ((point.temperature - baseline.avgTemperature) / baseline.avgTemperature) * 100;
                      const vibDev = ((point.vibration - baseline.avgVibration) / baseline.avgVibration) * 100;

                      return (
                        <div key={idx} className="grid grid-cols-5 gap-2 py-1 border-b border-border/50">
                          <div className="font-mono text-muted-foreground">{formatTime(point.timestamp)}</div>
                          <div className={`font-mono ${Math.abs(latencyDev) > 15 ? 'text-destructive font-bold' : Math.abs(latencyDev) > 8 ? 'text-accent font-bold' : ''}`}>
                            {point.latency.toFixed(3)} ms {latencyDev > 0 ? '+' : ''}{latencyDev.toFixed(1)}%
                          </div>
                          <div className={`font-mono ${Math.abs(tempDev) > 15 ? 'text-destructive font-bold' : Math.abs(tempDev) > 8 ? 'text-accent font-bold' : ''}`}>
                            {point.temperature.toFixed(1)} °C {tempDev > 0 ? '+' : ''}{tempDev.toFixed(1)}%
                          </div>
                          <div className={`font-mono ${Math.abs(vibDev) > 15 ? 'text-destructive font-bold' : Math.abs(vibDev) > 8 ? 'text-accent font-bold' : ''}`}>
                            {point.vibration.toFixed(3)} g {vibDev > 0 ? '+' : ''}{vibDev.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground text-[10px]">
                            {Math.abs(latencyDev) > 15 || Math.abs(tempDev) > 15 || Math.abs(vibDev) > 15 ? 'HIGH RISK' :
                             Math.abs(latencyDev) > 8 || Math.abs(tempDev) > 8 || Math.abs(vibDev) > 8 ? 'MEDIUM' : 'STABLE'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
