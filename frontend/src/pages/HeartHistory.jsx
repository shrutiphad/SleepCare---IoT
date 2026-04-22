import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ArrowLeft, Heart, RefreshCw, AlertTriangle, TrendingUp, Activity, Droplets } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const REFRESH_INTERVAL = 15000; // auto-refresh every 15 s


function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function avg(arr, key) {
  const vals = arr.map(d => d[key]).filter(v => v != null && v > 0);
  return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 0;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ color: "#94a3b8", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => <div key={i} style={{ color: p.color }}>{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
}

const CNN_COLORS = { Normal: "#10b981", AFib: "#7c3aed", Tachycardia: "#e11d48", Bradycardia: "#f59e0b", "Analysing...": "#94a3b8" };

export default function HeartHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/heart?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:       fmt(r.timestamp),
          hr:         r.heart_rate,
          spo2:       r.spo2,
          ecg_fast:   r.ecg_hr,
          ecg_stable: r.ecg_hr_stable,
          cnn:        r.cnn_label || "Normal",
          risk:       r.risk_score || 0,
          risk_level: r.risk_level || "normal",
        })));
        setLastRefresh(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const id = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchData]);

  // Derived stats
  const avgHR    = avg(data, "hr");
  const avgSpo2  = avg(data, "spo2");
  const avgECG   = avg(data, "ecg_fast");
  const alerts   = data.filter(d => d.risk_level === "critical" || d.risk_level === "warning");
  const cnnCounts= data.reduce((a, d) => { a[d.cnn] = (a[d.cnn] || 0) + 1; return a; }, {});
  const maxRisk  = data.length ? Math.max(...data.map(d => d.risk)) : 0;

  const StatCard = ({ label, value, unit, color, Icon }) => (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 16px",
      display: "flex", alignItems: "center", gap: 12,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#1e293b" }}>
          {value}<span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginLeft: 3 }}>{unit}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/heart")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-red-500 rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-800">Heart Mode — Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Updated {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            {/* Time range */}
            <div className="flex gap-1">
              {[1, 5, 10].map(m => (
                <button key={m} onClick={() => setMinutes(m)} style={{
                  background: minutes === m ? "#e11d48" : "transparent",
                  color: minutes === m ? "#fff" : "#64748b",
                  border: "1px solid #e2e8f0", borderRadius: 99,
                  padding: "3px 12px", fontSize: 12, cursor: "pointer", transition: "all .15s",
                }}>{m}m</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Patient row */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="flex items-center gap-3">
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#2dd4bf,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600 }}>
              {mockPatient.fullName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{mockPatient.fullName}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{mockPatient.age} · {mockPatient.gender} · {mockPatient.id}</div>
            </div>
          </div>
          <div style={{
            background: alerts.length ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${alerts.length ? "#fca5a5" : "#bbf7d0"}`,
            borderRadius: 99, padding: "4px 12px", fontSize: 11,
            color: alerts.length ? "#b91c1c" : "#166534",
          }}>
            {alerts.length ? `${alerts.length} alert events in last ${minutes}m` : `No alerts in last ${minutes}m`}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>Loading heart data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>
            No heart mode data in last {minutes} minute{minutes > 1 ? "s" : ""}. Start monitoring in Heart Mode.
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
              <StatCard label="Avg Heart Rate"  value={avgHR}         unit="BPM" color="#e11d48" Icon={Heart} />
              <StatCard label="Avg SpO₂"        value={avgSpo2}       unit="%"   color="#0891b2" Icon={Droplets} />
              <StatCard label="Avg ECG HR"       value={avgECG}        unit="BPM" color="#dc2626" Icon={Activity} />
              <StatCard label="Max Risk Score"   value={maxRisk}       unit="/100" color="#f59e0b" Icon={AlertTriangle} />
              <StatCard label="Alert Events"     value={alerts.length} unit=""    color="#7c3aed" Icon={TrendingUp} />
            </div>

            {/* CNN Classification Strip */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>CNN ECG Classification — {minutes}m window</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Each bar = one data bucket. Hover to inspect.</div>
              <div style={{ display: "flex", gap: 3, height: 28, alignItems: "stretch" }}>
                {data.map((d, i) => (
                  <div key={i} title={`${d.time}: ${d.cnn}`}
                    style={{ flex: 1, background: CNN_COLORS[d.cnn] || "#ccc", borderRadius: 3, opacity: 0.85, cursor: "pointer", transition: "transform .15s" }}
                    onMouseEnter={e => e.target.style.transform = "scaleY(1.35)"}
                    onMouseLeave={e => e.target.style.transform = "scaleY(1)"} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
                {Object.entries(CNN_COLORS).filter(([k]) => k !== "Analysing...").map(([l, c]) => (
                  <span key={l} style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />
                    {l} ({cnnCounts[l] || 0})
                  </span>
                ))}
              </div>
            </div>

            {/* ECG HR Trend */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>ECG Heart Rate Trend</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Fast HR (raw) vs Stable HR (median-smoothed)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                  <YAxis domain={[40, 160]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={110} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Tachy", fontSize: 9, fill: "#e11d48" }} />
                  <ReferenceLine y={50}  stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Brady", fontSize: 9, fill: "#f59e0b" }} />
                  <Line type="monotone" dataKey="ecg_fast"   stroke="#e11d48" strokeWidth={1.5} dot={false} name="ECG Fast HR" />
                  <Line type="monotone" dataKey="ecg_stable" stroke="#f43f5e" strokeWidth={2.5} dot={false} name="ECG Stable HR" strokeDasharray="5 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* SpO₂ + HR side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>SpO₂</div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="hsp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0891b2" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(data.length / 4) - 1)} />
                    <YAxis domain={[88, 100]} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={94} stroke="#e11d48" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="spo2" stroke="#0891b2" strokeWidth={2} fill="url(#hsp)" dot={false} name="SpO₂ %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 10 }}>SparkFun HR</div>
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="hhr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(data.length / 4) - 1)} />
                    <YAxis domain={[40, 150]} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="hr" stroke="#f43f5e" strokeWidth={2} fill="url(#hhr)" dot={false} name="HR BPM" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Risk Score Trend */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Risk Score Over Time</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>0 = normal, 50+ = critical</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="hrisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={50} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Critical", fontSize: 9, fill: "#e11d48" }} />
                  <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Warning", fontSize: 9, fill: "#f59e0b" }} />
                  <Area type="monotone" dataKey="risk" stroke="#f59e0b" strokeWidth={2} fill="url(#hrisk)" dot={false} name="Risk Score" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Alert Event Log */}
            <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#92400e", marginBottom: 8 }}>Cardiac Alert Log — last {minutes}m</div>
              <div style={{ maxHeight: 120, overflowY: "auto" }}>
                {alerts.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>No alert events in this window.</div>
                ) : alerts.slice(-10).reverse().map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "4px 6px", borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fef3c7"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: "#94a3b8", minWidth: 58 }}>{a.time}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.risk_level === "critical" ? "#e11d48" : "#f59e0b", marginTop: 4, flexShrink: 0 }} />
                    <span style={{ color: "#78350f" }}>
                      {a.cnn !== "Normal" && a.cnn !== "Analysing..." ? `CNN: ${a.cnn}` : a.spo2 < 94 ? `SpO₂ ${a.spo2}%` : `HR ${a.hr} BPM`}
                      {" · "}<span style={{ color: a.risk_level === "critical" ? "#e11d48" : "#f59e0b" }}>Risk {a.risk}/100</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}