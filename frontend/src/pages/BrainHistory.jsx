import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { ArrowLeft, Brain, RefreshCw, AlertTriangle, Zap, Waves, Activity } from "lucide-react";
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

const STAGE_COLORS = {
  "Awake":            "#e11d48",
  "Awake (Relaxed)":  "#f59e0b",
  "Light Sleep (N1)": "#0891b2",
  "Light Sleep (N2)": "#6366f1",
  "REM":              "#8b5cf6",
  "Deep Sleep":       "#7c3aed",
  "Relaxed / Drowsy": "#f59e0b",
  "Light Sleep":      "#0891b2",
  "--":               "#e2e8f0",
};
function stageColor(s) { return STAGE_COLORS[s] || "#94a3b8"; }

export default function BrainHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("bands");
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/brain?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:   fmt(r.timestamp),
          alpha:  r.alpha,
          beta:   r.beta,
          gamma:  r.gamma,
          rms:    r.rms,
          hr:     r.heart_rate,
          spo2:   r.spo2,
          stage:  r.sleep_stage || "--",
          risk:   r.risk_score || 0,
        })));
        setLastRefresh(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { const id = setInterval(fetchData, REFRESH_INTERVAL); return () => clearInterval(id); }, [fetchData]);

  const avgAlpha  = avg(data, "alpha");
  const avgBeta   = avg(data, "beta");
  const avgGamma  = avg(data, "gamma");
  const avgRms    = avg(data, "rms");
  const abnormal  = data.filter(d => (d.rms || 0) > 300);
  const last      = data[data.length - 1] || {};
  const curStage  = last.stage || "--";
  const stageCounts = data.reduce((a, d) => { a[d.stage] = (a[d.stage] || 0) + 1; return a; }, {});

  const radarData = [
    { subject: "Alpha",  v: last.alpha || 0 },
    { subject: "Beta",   v: last.beta  || 0 },
    { subject: "Gamma",  v: last.gamma || 0 },
    { subject: "RMS/10", v: Math.min((last.rms || 0) / 10, 50) },
    { subject: "HR-50",  v: Math.max(0, (last.hr || 50) - 50) },
  ];

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/brain")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-slate-800">Brain Mode — Analytics</span>
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
                  background: minutes === m ? "#7c3aed" : "transparent",
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
          <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 99, padding: "4px 12px", fontSize: 11, color: "#5b21b6" }}>
            Current stage: {curStage}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>Loading EEG data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#94a3b8", fontSize: 14 }}>
            No brain mode data in last {minutes} minute{minutes > 1 ? "s" : ""}. Start monitoring in Brain Mode.
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
              <StatCard label="Avg Alpha"    value={avgAlpha}        unit="µV"     color="#7c3aed" />
              <StatCard label="Avg Beta"     value={avgBeta}         unit="µV"     color="#6d28d9" />
              <StatCard label="Avg Gamma"    value={avgGamma}        unit="µV"     color="#a21caf" />
              <StatCard label="Avg RMS"      value={avgRms}          unit=""       color="#0891b2" />
              <StatCard label="Abnormal EEG" value={abnormal.length} unit="events" color="#e11d48" />
            </div>

            {/* Sleep Stage Timeline */}
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Sleep Stage Timeline — {minutes}m</div>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>Hover to inspect each bucket</div>
              <div style={{ display: "flex", gap: 3, height: 30, alignItems: "stretch" }}>
                {data.map((d, i) => (
                  <div key={i} title={`${d.time}: ${d.stage}`}
                    style={{ flex: 1, background: stageColor(d.stage), borderRadius: 3, opacity: 0.82, cursor: "pointer", transition: "transform .15s" }}
                    onMouseEnter={e => e.target.style.transform = "scaleY(1.35)"}
                    onMouseLeave={e => e.target.style.transform = "scaleY(1)"} />
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {Object.entries(STAGE_COLORS).filter(([k]) => k !== "--" && stageCounts[k]).map(([l, c]) => (
                  <span key={l} style={{ fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: c, display: "inline-block" }} />
                    {l} ({stageCounts[l] || 0})
                  </span>
                ))}
              </div>
            </div>

            {/* Tab selector */}
            <div style={{ display: "flex", gap: 4, background: "#f8fafc", borderRadius: 10, padding: 4, width: "fit-content" }}>
              {[["bands", "EEG Bands"], ["radar", "Snapshot"], ["rms", "RMS Power"]].map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: tab === k ? "#fff" : "transparent",
                  border: tab === k ? "1px solid #7c3aed" : "none",
                  borderRadius: 7, padding: "5px 14px", fontSize: 12,
                  fontWeight: tab === k ? 500 : 400,
                  color: tab === k ? "#7c3aed" : "#64748b",
                  cursor: "pointer", transition: "all .2s",
                }}>{l}</button>
              ))}
            </div>

            {tab === "bands" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Alpha / Beta / Gamma — {minutes}m</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>µV amplitude per band over time</div>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="alpha" stroke="#7c3aed" strokeWidth={2}   dot={false} name="Alpha µV" />
                    <Line type="monotone" dataKey="beta"  stroke="#6d28d9" strokeWidth={1.5} dot={false} name="Beta µV"  strokeDasharray="5 2" />
                    <Line type="monotone" dataKey="gamma" stroke="#a21caf" strokeWidth={1.5} dot={false} name="Gamma µV" strokeDasharray="2 2" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {tab === "radar" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>Current Signal Snapshot</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Most recent bucket values</div>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                    <Radar name="Now" dataKey="v" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.22} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  {[
                    ["Stage",         curStage, stageColor(curStage)],
                    ["Alpha/Beta",    last.beta ? (last.alpha / last.beta).toFixed(2) : "--", "#7c3aed"],
                    ["Dominant Band", (last.alpha || 0) > (last.beta || 0) ? "Alpha" : "Beta", "#6d28d9"],
                    ["EEG Quality",   (last.alpha > 5 && last.beta > 5) ? "Good" : "Low signal", "#10b981"],
                  ].map(([l, v, c], i) => (
                    <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: c, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "rms" && (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px" }}>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>EEG RMS Power — {minutes}m</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10 }}>RMS &gt;300 = elevated neural activity / movement artefact</div>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="brms" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#a21caf" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#a21caf" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor(data.length / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={300} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Threshold", fontSize: 9, fill: "#e11d48" }} />
                    <Area type="monotone" dataKey="rms" stroke="#a21caf" fill="url(#brms)" strokeWidth={2} dot={false} name="EEG RMS" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* EEG Event log */}
            <div style={{ background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#5b21b6", marginBottom: 8 }}>Abnormal EEG Events — last {minutes}m</div>
              <div style={{ maxHeight: 110, overflowY: "auto" }}>
                {abnormal.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>No abnormal EEG events in this window.</div>
                ) : abnormal.slice(-8).reverse().map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, fontSize: 12, padding: "4px 6px", borderRadius: 6 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#ede9fe"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <span style={{ color: "#94a3b8", minWidth: 58 }}>{a.time}</span>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a21caf", marginTop: 4, flexShrink: 0 }} />
                    <span style={{ color: "#5b21b6" }}>
                      Elevated EEG RMS: {a.rms} · Stage: {a.stage}
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