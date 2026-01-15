# HFT Latency Monitoring Dashboard

A production-grade, real-time monitoring dashboard for High-Frequency Trading (HFT) data center infrastructure, designed to detect and predict latency risks before they impact trading performance.

## Features

### 1. **Infrastructure Risk Summary**
- Real-time risk assessment for all monitored zones/racks
- Color-coded risk levels (Low/Medium/High) with Neo Brutalism styling
- Interactive cards showing:
  - Zone identification and location
  - Current risk level with visual indicators
  - Primary cause of deviation
  - Real-time metrics with percentage deviation from baseline

### 2. **Baseline vs Current Behavior Analysis**
- Establishes normal latency behavior for each rack/cable zone
- Visual comparison between baseline averages and current performance
- Clear deviation indicators with threshold crossings
- Area chart with reference lines showing:
  - Baseline average latency
  - High risk threshold (15% above baseline)
  - Current latency trend

### 3. **Time-Series Monitoring**
- **Latency Chart**: Real-time latency tracking with baseline comparison
- **Temperature Monitoring**: Tracks thermal conditions that affect fiber performance
- **Vibration Analysis**: Monitors physical stress on infrastructure
- All charts aligned on the same timeline for correlation analysis

### 4. **Deviation Explanation Layer**
- Automatic correlation between latency drift and environmental factors
- Visual markers and shaded regions explain when deviation begins
- Percentage-based deviation metrics for each parameter
- Risk level determination based on combined deviation factors

### 5. **Early Warning System**
- Risk levels calculated from deviation magnitude:
  - **Low Risk**: < 8% deviation from baseline
  - **Medium Risk**: 8-15% deviation
  - **High Risk**: > 15% deviation
- Actionable insights such as "thermal drift detected" or "vibration anomaly detected"
- Non-disruptive visual indicators instead of binary alerts

## Design Principles

### Neo Brutalism Theme
- Bold, high-contrast colors optimized for 24/7 monitoring
- Thick black borders (4px) with offset shadows (6-8px)
- Chunky geometric shapes with zero border radius
- Dark theme optimized for low-light operations environments
- Clear typography with uppercase headings and monospace data

### Data-First Design
- Minimal visual clutter
- High information density without overwhelming the operator
- Fast scanning with color-coded indicators
- No decorative animations - clarity and speed are prioritized

### Production-Grade UX
- Immediate visibility into risk status
- Click-to-drill-down interaction model
- Real-time reactive updates (Convex backend)
- Responsive design for multiple screen sizes

## Technical Architecture

### Backend (Convex)
- **Schema Tables**:
  - `zones`: Infrastructure zone definitions
  - `latencyData`: Time-series data points
  - `baselines`: Calculated baseline metrics per zone
  - `riskAlerts`: Historical risk events

- **Query Functions**:
  - `getZones()`: Fetch all monitored zones
  - `getBaseline(zoneId)`: Get baseline metrics for a zone
  - `getLatencyData(zoneId, limit)`: Get recent time-series data
  - `getRiskSummary()`: Calculate current risk levels for all zones

### Frontend (React + Recharts)
- Real-time data subscriptions via Convex queries
- Framer Motion animations for smooth state transitions
- Recharts for production-grade data visualization
- Tailwind CSS + custom Neo Brutalism styles

### Data Generation
- Realistic test data simulating:
  - 5 data center racks across 3 locations
  - 24 hours of baseline behavior
  - 2 hours of recent data with anomalies in 2 zones
  - Temperature spikes and vibration anomalies correlated with latency drift

## Usage

### Access the Dashboard
Navigate to `/` (root path) to view the dashboard immediately.

### Interact with Zones
Click any zone card to view detailed time-series analysis for that specific infrastructure zone.

### Interpret Risk Levels
- **Green (Primary)**: Normal operation within baseline parameters
- **Yellow (Accent)**: Elevated metrics requiring attention
- **Red (Destructive)**: High risk requiring immediate action

### Monitor Trends
- Observe the area chart for latency trends
- Check reference lines for baseline and high-risk thresholds
- Correlate latency spikes with temperature or vibration changes

## Seed Data Command
```bash
npx convex run seedData:seedHFTData
```

This generates realistic monitoring data for 5 racks with:
- 12 hours of baseline data (every 2 minutes)
- 2 hours of recent data showing gradual drift in RACK-01 and RACK-03
- Temperature spike in RACK-01 after 80 minutes
- Vibration anomaly in RACK-03 after 80 minutes

## Color Palette (Neo Brutalism)
- **Primary (Green)**: `oklch(0.65 0.22 142)` - Low risk, success states
- **Accent (Yellow)**: `oklch(0.75 0.25 65)` - Medium risk, warnings
- **Destructive (Red)**: `oklch(0.68 0.22 25)` - High risk, critical alerts
- **Secondary (Blue)**: `oklch(0.85 0.18 85)` - Info, neutral data
- **Background**: `oklch(0.15 0 0)` - Dark theme base
- **Foreground**: `oklch(0.95 0 0)` - Text and borders

## Performance Considerations
- Data queries limited to 60-100 recent points for fast rendering
- Indexed queries for efficient database access
- Real-time subscriptions only for active views
- Calculated risk summaries prevent N+1 queries

---

Built for HFT infrastructure teams who need to detect and prevent latency degradation before it impacts trading performance.
