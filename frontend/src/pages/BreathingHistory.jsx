import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ArrowLeft, Wind, RefreshCw, AlertTriangle, Droplets, Heart } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const REFRESH_INTERVAL = 15000;

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

// Breathing status → colour mapping (matches ESP32 Breathing Mode code strings)
function statusColor(s) {
  if (!s) return "#e2e8f0";
  const sl = s.toLowerCase();
  if (sl.includes("apnea") || sl.includes("no breath"))   return "#e11d48";
  if (sl.includes("abnormal") || sl.includes("artifact")) return "#f59e0b";
  if (sl.includes("fast"))                                 return "#f97316";
  if (sl.includes("normal"))                               return "#0891b2";
  if (sl.includes("inhaling") || sl.includes("exhaling")) return "#22c55e";
  if (sl.includes("resting"))                              return "#10b981";
  return "#94a3b8";
}

export default function BreathingHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("rhythm");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/breathing?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:    fmt(r.timestamp),
          spo2:    r.spo2,
          hr:      r.heart_rate,
          status:  r.breathing_status || "Normal",
          rate:    typeof r.breathing_rate === "number" ? r.breathing_rate : null,
          risk:    r.risk_score || 0,
          rl:      r.risk_level || "normal",
        })));
        setLastRefresh(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, REFRESH_INTERVAL); return () => clearInterval(id); }, [fetchData]);

  const avgSpo2   = avg(data, "spo2");
  const avgHR     = avg(data, "hr");
  const avgRate   = avg(data, "rate");
  const apneas    = data.filter(d => d.status?.toLowerCase().includes("apnea") || d.status?.toLowerCase().includes("no breath"));
  const artifacts = data.filter(d => d.status?.toLowerCase().includes("artifact"));
  const abnormal  = data.filter(d => d.status?.toLowerCase().includes("abnormal"));
  const normalPct = data.length ? Math.round(data.filter(d => d.status?.toLowerCase().includes("normal")).length / data.length * 100) : 0;
  const alerts    = [...apneas, ...abnormal].slice(-10).reverse();

  const StatCard = ({ label, value, unit, color }) => (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
      <span style={{ fontSize: 20, fontWeight: 600, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 3 }}>{unit}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/breathing")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-800">Breathing Mode — Analytics</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button onClick={fetchData} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <div className="flex gap-1">
              {[1, 5, 10].map(m => (
                <button key={m} onClick={() => setMinutes(m)} style={{
                  background: minutes === m ? "#0891b2" : "transparent",
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

        {/* Patient */}
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
            background: apneas.length ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${apneas.length ? "#fca5a5" : "#bbf7d0"}`,
            borderRadius: 99, padding: "4px 12px", fontSize: 11,
            color: apneas.length ? "#b91c1c" : "#166534",
          }}>
            {apneas.length ? `⚠ ${apneas.length} apnea/no-breath events` : "No apnea detected"}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>Loading breathing data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>
            No breathing mode data in last {minutes} minute{minutes > 1 ? "s" : ""}. Start monitoring in Breathing Mode.
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              <StatCard label="Avg SpO₂"       value={avgSpo2}        unit="%"      color="#0891b2" />
              <StatCard label="Avg Heart Rate"  value={avgHR}          unit="BPM"    color="#e11d48" />
              <StatCard label="Avg Breath Rate" value={avgRate || "--"} unit="br/min" color="#0891b2" />
              <StatCard label="Normal %"        value={normalPct}      unit="%"      color="#10b981" />
              <StatCard label="Apnea Events"    value={apneas.length}  unit=""       color="#e11d48" />
              <StatCard label="Artifacts"       value={artifacts.length} unit=""     color="#f59e0b" />
            </div>

            {/* Breathing Rhythm Strip */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Breathing Rhythm Strip — {minutes}m</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Hover each bar to see status. Red = apnea, orange = abnormal, blue = normal.</div>
              <div style={{ display: "flex", gap: 3, height: 40, alignItems: "flex-end" }}>
                {data.map((d, i) => {
                  const isApnea = d.status?.toLowerCase().includes("apnea") || d.status?.toLowerCase().includes("no breath");
                  const h = isApnea ? 20 : Math.min(100, Math.max(15, (d.rate || 14) * 3.5));
                  return (
                    <div key={i} title={`${d.time}: ${d.status}${d.rate ? ` (${d.rate} br/min)` : ""}`}
                      style={{ flex: 1, background: statusColor(d.status), borderRadius: "2px 2px 0 0", opacity: 0.82, cursor: "pointer", height: `${h}%`, transition: "transform .15s" }}
                      onMouseEnter={e => e.target.style.transform = "scaleY(1.25)"}
                      onMouseLeave={e => e.target.style.transform = "scaleY(1)"} />
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {[["Normal", "#0891b2"], ["Inhaling/Exhaling", "#22c55e"], ["Fast", "#f97316"], ["Abnormal", "#f59e0b"], ["Apnea / No Breath", "#e11d48"], ["Artifact", "#f59e0b"]].map(([l, c]) => (
                  <span key={l} style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />{l}
                  </span>
                ))}
              </div>
            </div>

            {/* Tab selector */}
            <div style={{ display: "flex", gap: 4, background: "#f8fafc", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {[["rhythm", "Breath Rate"], ["spo2", "SpO₂"], ["hr", "Heart Rate"]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: tab === k ? "#fff" : "transparent",
                  border: tab === k ? "1px solid #0891b2" : "none",
                  borderRadius: 7, padding: "5px 14px", fontSize: 12,
                  fontWeight: tab === k ? 500 : 400,
                  color: tab === k ? "#0891b2" : "#64748b",
                  cursor: "pointer", transition: "all .2s",
                }}>{l}</button>
              ))}
            </div>

            {tab === "rhythm" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Breathing Rate — {minutes}m</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Normal: 12–20 breaths/min (from ESP32 FSR sensor)</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="brG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0891b2" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                    <YAxis domain={[0, 30]} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "High", fontSize: 9, fill: "#f59e0b" }} />
                    <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "Low", fontSize: 9, fill: "#f59e0b" }} />
                    <Area type="monotone" dataKey="rate" stroke="#0891b2" strokeWidth={2} fill="url(#brG)" dot={false} name="Breath Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {tab === "spo2" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>SpO₂ — {minutes}m</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Drops often co-occur with apnea events</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="bsG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#0284c7" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                    <YAxis domain={[86, 100]} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={94} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Low SpO₂", fontSize: 9, fill: "#e11d48" }} />
                    <Area type="monotone" dataKey="spo2" stroke="#0284c7" strokeWidth={2} fill="url(#bsG)" dot={false} name="SpO₂ %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {tab === "hr" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Heart Rate — {minutes}m</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>HR spikes often correlate with apnea events (arousal response)</div>
                <ResponsiveContainer width="100%" height={170}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="bhG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                    <YAxis domain={[40, 140]} tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={110} stroke="#e11d48" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="hr" stroke="#3b82f6" strokeWidth={2} fill="url(#bhG)" dot={false} name="HR BPM" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Alert log */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1e40af", marginBottom: 8 }}>Respiratory Event Log — last {minutes}m</div>
              <div style={{ maxHeight: 120, overflowY: "auto" }}>
                {alerts.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>No respiratory events in this window.</div>
                ) : alerts.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "4px 6px", borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#dbeafe"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: "#94a3b8", minWidth: 58 }}>{a.time}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(a.status), marginTop: 4, flexShrink: 0 }} />
                    <span style={{ color: "#1e3a5f" }}>
                      {a.status} · SpO₂ {a.spo2 || "--"}% · HR {a.hr || "--"} BPM
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