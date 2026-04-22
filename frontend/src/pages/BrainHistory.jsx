import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { ArrowLeft, Brain, RefreshCw, AlertTriangle, CheckCircle, Zap, Waves, Activity } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const REFRESH  = 15000;

function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}
function safeAvg(arr, key) {
  const v = arr.map(d => d[key]).filter(x => x != null && x > 0);
  return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0;
}

/* ── stage config ── */
const STAGES = {
  "Awake":             { color:"#ef4444", icon:"👁", label:"Awake",             tip:"Fully conscious" },
  "Awake (Relaxed)":   { color:"#f97316", icon:"😌", label:"Awake (Relaxed)",   tip:"Relaxed but awake" },
  "Light Sleep (N1)":  { color:"#3b82f6", icon:"💤", label:"Light Sleep",       tip:"Drifting off" },
  "Light Sleep (N2)":  { color:"#6366f1", icon:"💤", label:"Stable Light Sleep",tip:"Sleep spindles" },
  "REM":               { color:"#8b5cf6", icon:"🌙", label:"REM Sleep",         tip:"Dreaming phase" },
  "Deep Sleep":        { color:"#7c3aed", icon:"🌑", label:"Deep Sleep",        tip:"Most restorative" },
  "Relaxed / Drowsy":  { color:"#f59e0b", icon:"😴", label:"Drowsy",           tip:"Nearly asleep" },
  "Light Sleep":       { color:"#3b82f6", icon:"💤", label:"Light Sleep",       tip:"Light rest" },
  "--":                { color:"#e2e8f0", icon:"—",  label:"Unknown",           tip:"No data" },
};
function stageConf(s) { return STAGES[s] || STAGES["--"]; }

/* ── band colours ── */
function alphaColor(v) { if (!v) return "#e2e8f0"; if (v > 100) return "#7c3aed"; if (v > 50) return "#8b5cf6"; return "#a78bfa"; }
function betaColor(v)  { if (!v) return "#e2e8f0"; if (v > 100) return "#6d28d9"; if (v > 50) return "#7c3aed"; return "#c4b5fd"; }
function rmsColor(v)   { if (!v) return "#e2e8f0"; if (v > 400) return "#ef4444"; if (v > 250) return "#f59e0b"; return "#10b981"; }

const BarTip = ({ active, payload, label, unit, note }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{ background:"#1e293b", color:"#f8fafc", borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
      <div style={{ color:"#94a3b8", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color:payload[0]?.fill }}>{v ?? "--"}<span style={{ fontSize:11, marginLeft:3 }}>{unit}</span></div>
      {note && <div style={{ color:"#94a3b8", marginTop:4, fontSize:11 }}>{note(v)}</div>}
    </div>
  );
};

function MetricCard({ icon:Icon, label, value, unit, color, sub }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:`2px solid ${color}22` }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <div style={{ width:34, height:34, borderRadius:10, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize:11, color:"#94a3b8", fontWeight:500 }}>{label}</span>
      </div>
      <div style={{ fontSize:26, fontWeight:700, color:"#1e293b", lineHeight:1 }}>{value}<span style={{ fontSize:12, fontWeight:400, color:"#94a3b8", marginLeft:4 }}>{unit}</span></div>
      {sub && <div style={{ fontSize:11, color:color, marginTop:4, fontWeight:500 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, sub, children }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"18px 20px", border:"1px solid #f1f5f9", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:14, fontWeight:600, color:"#1e293b" }}>{title}</div>
        {sub && <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Sleep stage timeline strip ── */
function SleepTimeline({ data }) {
  const [hov, setHov] = useState(null);
  const counts = data.reduce((a, d) => { const s = d.stage || "--"; a[s] = (a[s]||0)+1; return a; }, {});
  const total  = data.length;

  return (
    <Section title="Sleep Stage Timeline" sub="What sleep stage was the patient in during each moment?">
      {/* Stage legend with % bars */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {Object.entries(STAGES).filter(([k]) => k !== "--" && counts[k]).map(([s, conf]) => {
          const pct = total ? Math.round((counts[s]||0)/total*100) : 0;
          return (
            <div key={s} style={{ flex:"1 1 120px", background:`${conf.color}10`, borderRadius:10, padding:"8px 12px", border:`1px solid ${conf.color}30` }}>
              <div style={{ fontSize:12 }}>{conf.icon} <span style={{ color:conf.color, fontWeight:600, fontSize:11 }}>{conf.label}</span></div>
              <div style={{ height:5, borderRadius:3, background:`${conf.color}25`, margin:"5px 0", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:conf.color, borderRadius:3, transition:"width .6s ease" }} />
              </div>
              <div style={{ fontSize:10, color:"#64748b" }}>{counts[s]||0} buckets · {pct}%</div>
            </div>
          );
        })}
      </div>
      {/* Timeline strip */}
      <div style={{ display:"flex", gap:4, height:48, alignItems:"flex-end" }}>
        {data.map((d, i) => {
          const conf  = stageConf(d.stage);
          const isHov = hov === i;
          return (
            <div key={i} title={`${d.time}: ${d.stage || "--"}`}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                flex:1, borderRadius:"4px 4px 0 0", cursor:"pointer",
                background: conf.color,
                height: isHov ? "100%" : "65%",
                opacity: isHov ? 1 : 0.75,
                transition:"all .2s ease",
                boxShadow: isHov ? `0 0 14px ${conf.color}90` : "none",
              }} />
          );
        })}
      </div>
      {hov !== null && data[hov] && (
        <div style={{ marginTop:8, padding:"6px 12px", background:"#1e293b", color:"#f8fafc", borderRadius:8, fontSize:12, display:"inline-flex", alignItems:"center", gap:8 }}>
          {stageConf(data[hov].stage).icon}
          <span style={{ color:"#94a3b8" }}>{data[hov].time}</span>
          <strong style={{ color: stageConf(data[hov].stage).color }}>{data[hov].stage || "--"}</strong>
          <span style={{ color:"#64748b" }}>· {stageConf(data[hov].stage).tip}</span>
        </div>
      )}
    </Section>
  );
}

/* ════════════════════════════════════════════════ */
export default function BrainHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("bands");
  const [lastRef, setLastRef] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/brain?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:  fmt(r.timestamp),
          alpha: r.alpha   || 0,
          beta:  r.beta    || 0,
          gamma: r.gamma   || 0,
          rms:   r.rms     || 0,
          hr:    r.heart_rate || 0,
          spo2:  r.spo2    || 0,
          stage: r.sleep_stage || "--",
          risk:  r.risk_score  || 0,
        })));
        setLastRef(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, REFRESH); return () => clearInterval(id); }, [load]);

  const avgAlpha  = safeAvg(data, "alpha");
  const avgBeta   = safeAvg(data, "beta");
  const avgGamma  = safeAvg(data, "gamma");
  const avgRms    = safeAvg(data, "rms");
  const abnormal  = data.filter(d => d.rms > 300);
  const last      = data[data.length-1] || {};
  const curStage  = last.stage || "--";
  const curConf   = stageConf(curStage);

  const radarData = [
    { subject:"Alpha",  v: last.alpha||0 },
    { subject:"Beta",   v: last.beta ||0 },
    { subject:"Gamma",  v: last.gamma||0 },
    { subject:"RMS/5",  v: Math.min((last.rms||0)/5, 80) },
    { subject:"HR-50",  v: Math.max(0,(last.hr||50)-50) },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f8fafc 0%,#f5f3ff 50%,#ede9fe 100%)" }}>
      <style>{`@keyframes pulseRing{0%{box-shadow:0 0 0 0 currentColor80}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}`}</style>

      {/* HEADER */}
      <header style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/brain")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#6366f1,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Brain size={16} color="#fff" />
              </div>
              <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>Brain Mode — Analytics</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:"#94a3b8" }}>{lastRef.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>
            <button onClick={load} style={{ padding:6, borderRadius:8, border:"none", background:"#f1f5f9", cursor:"pointer" }}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} color="#64748b" />
            </button>
            <div style={{ display:"flex", gap:4 }}>
              {[1,5,10].map(m => (
                <button key={m} onClick={() => setMinutes(m)} style={{
                  background: minutes===m ? "#7c3aed" : "#f8fafc",
                  color: minutes===m ? "#fff" : "#64748b",
                  border: minutes===m ? "none" : "1px solid #e2e8f0",
                  borderRadius:99, padding:"4px 14px", fontSize:12, cursor:"pointer",
                  fontWeight: minutes===m ? 600 : 400, transition:"all .2s",
                }}>{m}m</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:900, margin:"0 auto", padding:"20px 16px", display:"flex", flexDirection:"column", gap:16 }}>

        {/* Patient */}
        <div style={{ background:"#fff", borderRadius:16, padding:"14px 20px", border:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:"linear-gradient(135deg,#2dd4bf,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:16 }}>
              {mockPatient.fullName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:14, color:"#1e293b" }}>{mockPatient.fullName}</div>
              <div style={{ fontSize:12, color:"#94a3b8" }}>{mockPatient.age} · {mockPatient.gender} · {mockPatient.id}</div>
            </div>
          </div>
          <div style={{ background:`${curConf.color}15`, border:`1px solid ${curConf.color}40`, borderRadius:99, padding:"6px 16px", fontSize:12, fontWeight:600, color:curConf.color, display:"flex", alignItems:"center", gap:6 }}>
            {curConf.icon} Current: {curConf.label}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>Loading EEG data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem" }}>
            <Brain size={40} color="#c4b5fd" style={{ marginBottom:12 }} />
            <div style={{ color:"#64748b", fontSize:14 }}>No brain mode data in last {minutes}m. Start monitoring.</div>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <MetricCard icon={Zap}           label="Avg EEG Alpha"     value={avgAlpha}       unit="µV"     color="#7c3aed" sub="Relaxation wave" />
              <MetricCard icon={Waves}         label="Avg EEG Beta"      value={avgBeta}        unit="µV"     color="#6d28d9" sub="Alertness wave" />
              <MetricCard icon={Activity}      label="Avg EEG Gamma"     value={avgGamma}       unit="µV"     color="#a21caf" sub="High cognition" />
              <MetricCard icon={Activity}      label="Avg RMS Power"     value={avgRms}         unit=""       color={avgRms > 300 ? "#ef4444" : "#0891b2"} sub={avgRms > 300 ? "⚠ Elevated noise" : "✓ Normal range"} />
              <MetricCard icon={AlertTriangle} label="Abnormal Events"   value={abnormal.length} unit=""      color={abnormal.length ? "#ef4444" : "#10b981"} sub={abnormal.length ? "RMS > 300 threshold" : "None detected"} />
            </div>

            {/* Sleep Stage Timeline */}
            <SleepTimeline data={data} />

            {/* Tab selector */}
            <div style={{ display:"flex", gap:6 }}>
              {[["bands","🧠 EEG Bands"],["snapshot","📡 Signal Snapshot"],["rms","⚡ RMS Power"]].map(([k,l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: tab===k ? "#7c3aed" : "#fff",
                  color: tab===k ? "#fff" : "#64748b",
                  border: `1px solid ${tab===k ? "#7c3aed" : "#e2e8f0"}`,
                  borderRadius:99, padding:"6px 16px", fontSize:12, cursor:"pointer",
                  fontWeight: tab===k ? 600 : 400, transition:"all .2s",
                }}>{l}</button>
              ))}
            </div>

            {/* EEG Bands — 3 bar charts */}
            {tab === "bands" && (
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <Section title="Alpha Wave (8–12 Hz) — Relaxation & Calmness" sub="Higher alpha = more relaxed. Drops when stressed or fully awake.">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data} barCategoryGap="12%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ff" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                      <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
                      <Tooltip content={<BarTip unit="µV" note={v => v > 80 ? "🧘 Very relaxed / drowsy" : v > 30 ? "😌 Calm" : "😬 Alert or stressed"} />} />
                      <Bar dataKey="alpha" name="Alpha µV" radius={[4,4,0,0]} maxBarSize={32}>
                        {data.map((d, i) => <Cell key={i} fill={alphaColor(d.alpha)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Beta Wave (13–30 Hz) — Alertness & Activity" sub="Higher beta = more alert / stressed. Increases when awake and active.">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data} barCategoryGap="12%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ff" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                      <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
                      <Tooltip content={<BarTip unit="µV" note={v => v > 80 ? "😤 High alertness / stress" : v > 30 ? "🧐 Mentally active" : "😴 Relaxed / asleep"} />} />
                      <Bar dataKey="beta" name="Beta µV" radius={[4,4,0,0]} maxBarSize={32}>
                        {data.map((d, i) => <Cell key={i} fill={betaColor(d.beta)} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Section>

                <Section title="Gamma Wave (30–40 Hz) — High-level Brain Activity" sub="Higher gamma = active processing. Elevated during REM sleep.">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data} barCategoryGap="12%">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ff" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                      <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
                      <Tooltip content={<BarTip unit="µV" note={() => "Active brain processing"} />} />
                      <Bar dataKey="gamma" name="Gamma µV" radius={[4,4,0,0]} maxBarSize={32}>
                        {data.map((d, i) => <Cell key={i} fill="#a21caf" fillOpacity={0.7 + (d.gamma/200)*0.3} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Section>
              </div>
            )}

            {tab === "snapshot" && (
              <Section title="Current Signal Snapshot" sub="Radar showing the most recent bucket's EEG readings at a glance.">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"center" }}>
                  <ResponsiveContainer width="100%" height={230}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="#ede9fe" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize:12, fill:"#6d28d9" }} />
                      <Radar name="Now" dataKey="v" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {[
                      ["Current Stage",     `${curConf.icon} ${curConf.label}`,       curConf.color ],
                      ["Brain State",       curConf.tip,                               "#64748b"     ],
                      ["Dominant Wave",     (last.alpha||0)>(last.beta||0)?"Alpha (calm)":"Beta (alert)", (last.alpha||0)>(last.beta||0)?"#7c3aed":"#6d28d9"],
                      ["Alpha/Beta Ratio",  last.beta ? (last.alpha/last.beta).toFixed(2)+" (>1 = relaxed)" : "--", "#94a3b8"],
                      ["Signal Quality",    (last.alpha>5&&last.beta>5)?"Good signal":"Weak signal",    (last.alpha>5&&last.beta>5)?"#10b981":"#f59e0b"],
                    ].map(([l,v,c],i) => (
                      <div key={i} style={{ background:"#f5f3ff", borderRadius:10, padding:"10px 14px", borderLeft:`3px solid ${c}` }}>
                        <div style={{ fontSize:10, color:"#94a3b8" }}>{l}</div>
                        <div style={{ fontSize:13, fontWeight:600, color:c, marginTop:2 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>
            )}

            {tab === "rms" && (
              <Section title="EEG RMS Power — Signal Amplitude" sub="Green = calm. Yellow = elevated (movement or stress). Red = abnormal — possible artefact or seizure-like activity.">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f3ff" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                    <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="" note={v => v > 400 ? "🚨 Abnormal — check patient" : v > 250 ? "⚠ Elevated amplitude" : "✓ Normal brain activity"} />} />
                    <ReferenceLine y={300} stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"Warning threshold", fill:"#f59e0b", fontSize:9 }} />
                    <ReferenceLine y={400} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"Abnormal threshold", fill:"#ef4444", fontSize:9 }} />
                    <Bar dataKey="rms" name="EEG RMS" radius={[4,4,0,0]} maxBarSize={32}>
                      {data.map((d, i) => <Cell key={i} fill={rmsColor(d.rms)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {/* Abnormal log */}
            <div style={{ background:"#f5f3ff", border:"1px solid #ddd6fe", borderRadius:16, padding:"16px 20px" }}>
              <div style={{ fontWeight:600, color:"#5b21b6", marginBottom:10, fontSize:13 }}>🧠 EEG Event Log — last {minutes}m</div>
              {abnormal.length === 0 ? (
                <div style={{ fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={14} color="#10b981" /> No abnormal EEG events in this window.</div>
              ) : abnormal.slice(-8).reverse().map((a, i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:"1px solid #ddd6fe30", fontSize:12 }}>
                  <span style={{ color:"#94a3b8", minWidth:64 }}>{a.time}</span>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:rmsColor(a.rms), marginTop:3, flexShrink:0 }} />
                  <span style={{ color:"#5b21b6" }}>Elevated EEG RMS: <strong>{a.rms}</strong> · Stage: {stageConf(a.stage).icon} {a.stage}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}