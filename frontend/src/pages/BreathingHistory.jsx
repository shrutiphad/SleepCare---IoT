import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { ArrowLeft, Wind, RefreshCw, AlertTriangle, CheckCircle, Droplets, Heart, Activity } from "lucide-react";
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

/* ── Status config (maps ESP32 Breathing Mode strings exactly) ── */
const STATUS_MAP = {
  "NORMAL BREATHING":   { color:"#0891b2", icon:"✓", label:"Normal",          tip:"12–20 breaths/min — healthy" },
  "FAST BREATHING":     { color:"#f97316", icon:"⚡", label:"Fast",             tip:"Breathing faster than normal" },
  "ABNORMAL BREATHING": { color:"#ef4444", icon:"⚠", label:"Abnormal",         tip:"Struggle to exhale detected" },
  "NO BREATHING":       { color:"#dc2626", icon:"🚨", label:"No Breathing",    tip:"APNEA — no breath detected!" },
  "ARTIFACT REJECTED":  { color:"#f59e0b", icon:"🔄", label:"Artifact",         tip:"Patient moved — noise rejected" },
  "RESTING":            { color:"#10b981", icon:"😴", label:"Resting",          tip:"Patient settled on bed" },
  "BED EMPTY":          { color:"#94a3b8", icon:"—",  label:"Off Bed",          tip:"Patient not on bed" },
  "INHALING":           { color:"#22c55e", icon:"↑",  label:"Inhaling",         tip:"Chest rising" },
  "EXHALING":           { color:"#3b82f6", icon:"↓",  label:"Exhaling",         tip:"Chest falling" },
  "CALIBRATING":        { color:"#a78bfa", icon:"⚙",  label:"Calibrating",      tip:"Sensor calibrating" },
  "Normal":             { color:"#0891b2", icon:"✓",  label:"Normal",           tip:"Normal breathing" },
};
function sConf(s) {
  if (!s) return { color:"#e2e8f0", icon:"—", label:"No data", tip:"--" };
  // case-insensitive match
  const key = Object.keys(STATUS_MAP).find(k => k.toLowerCase() === s.toLowerCase()) || "";
  return STATUS_MAP[key] || { color:"#94a3b8", icon:"?", label:s, tip:"Unknown status" };
}

/* ── bar heights for rhythm strip ── */
function barHeight(d) {
  if (!d.status) return 25;
  const sl = d.status.toLowerCase();
  if (sl.includes("no breath") || sl.includes("apnea")) return 30;
  if (sl.includes("abnormal"))  return 60;
  if (sl.includes("fast"))      return 85;
  if (sl.includes("inhaling"))  return 95;
  if (sl.includes("exhaling"))  return 55;
  if (d.rate) return Math.min(95, Math.max(20, d.rate * 4));
  return 50;
}

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

function MetricCard({ icon:Icon, label, value, unit, color, sub, pulse }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:`2px solid ${color}22`, position:"relative", overflow:"hidden" }}>
      {pulse && <span style={{ position:"absolute", top:10, right:10, width:8, height:8, borderRadius:"50%", background:color, animation:"pulseRing 1.5s infinite" }} />}
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

/* ── Breathing rhythm strip ── */
function RhythmStrip({ data, minutes }) {
  const [hov, setHov] = useState(null);
  const counts  = data.reduce((a, d) => { const k = sConf(d.status).label; a[k]=(a[k]||0)+1; return a; }, {});
  const total   = data.length;
  const apneas  = data.filter(d => { const sl=(d.status||"").toLowerCase(); return sl.includes("no breath")||sl.includes("apnea"); });

  // Group unique visible statuses
  const seen = [...new Set(data.map(d => sConf(d.status).label))];

  return (
    <Section title={`Breathing Rhythm Strip — ${minutes}m`} sub="Bar height shows breathing effort. Hover each bar for details.">
      {/* Status breakdown */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {seen.map(lbl => {
          const conf = Object.values(STATUS_MAP).find(c => c.label === lbl) || { color:"#94a3b8", icon:"?" };
          const pct  = total ? Math.round((counts[lbl]||0)/total*100) : 0;
          return (
            <div key={lbl} style={{ flex:"1 1 100px", background:`${conf.color}10`, borderRadius:10, padding:"8px 12px", border:`1px solid ${conf.color}30` }}>
              <div style={{ fontSize:11, color:conf.color, fontWeight:600 }}>{conf.icon} {lbl}</div>
              <div style={{ height:5, borderRadius:3, background:`${conf.color}25`, margin:"5px 0", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:conf.color, borderRadius:3, transition:"width .6s" }} />
              </div>
              <div style={{ fontSize:10, color:"#64748b" }}>{counts[lbl]||0} · {pct}%</div>
            </div>
          );
        })}
      </div>

      {/* Rhythm bars */}
      <div style={{ display:"flex", gap:4, height:56, alignItems:"flex-end", background:"#f8fafc", borderRadius:10, padding:"0 8px" }}>
        {data.map((d, i) => {
          const conf  = sConf(d.status);
          const h     = barHeight(d);
          const isHov = hov === i;
          return (
            <div key={i} title={`${d.time}\n${d.status}`}
              onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}
              style={{
                flex:1, borderRadius:"4px 4px 0 0", cursor:"pointer",
                background: conf.color,
                height:`${h}%`,
                opacity: isHov ? 1 : 0.75,
                transition:"all .2s ease",
                boxShadow: isHov ? `0 0 14px ${conf.color}90` : "none",
                minWidth:4,
              }} />
          );
        })}
      </div>

      {hov !== null && data[hov] && (
        <div style={{ marginTop:8, padding:"6px 12px", background:"#1e293b", color:"#f8fafc", borderRadius:8, fontSize:12, display:"inline-flex", alignItems:"center", gap:8 }}>
          <span style={{ color:sConf(data[hov].status).color, fontSize:14 }}>{sConf(data[hov].status).icon}</span>
          <span style={{ color:"#94a3b8" }}>{data[hov].time}</span>
          <strong style={{ color:sConf(data[hov].status).color }}>{data[hov].status}</strong>
          {data[hov].rate > 0 && <span style={{ color:"#64748b" }}>· {data[hov].rate} br/min</span>}
          <span style={{ color:"#64748b", fontSize:10 }}>— {sConf(data[hov].status).tip}</span>
        </div>
      )}

      {apneas.length > 0 && (
        <div style={{ marginTop:10, padding:"8px 14px", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:8, fontSize:12, color:"#b91c1c", display:"flex", alignItems:"center", gap:6 }}>
          <AlertTriangle size={13} /> {apneas.length} apnea/no-breath event{apneas.length>1?"s":""} detected in this window!
        </div>
      )}
    </Section>
  );
}

/* ════════════════════════════════════════════════ */
export default function BreathingHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("rate");
  const [lastRef, setLastRef] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/breathing?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:   fmt(r.timestamp),
          spo2:   r.spo2          || 0,
          hr:     r.heart_rate    || 0,
          status: r.breathing_status || "Normal",
          rate:   typeof r.breathing_rate === "number" ? r.breathing_rate : 0,
          risk:   r.risk_score    || 0,
          rl:     r.risk_level    || "normal",
        })));
        setLastRef(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, REFRESH); return () => clearInterval(id); }, [load]);

  const avgSpo2   = safeAvg(data, "spo2");
  const avgHR     = safeAvg(data, "hr");
  const avgRate   = safeAvg(data, "rate");
  const apneas    = data.filter(d => { const sl=(d.status||"").toLowerCase(); return sl.includes("no breath")||sl.includes("apnea"); });
  const abnormal  = data.filter(d => (d.status||"").toLowerCase().includes("abnormal"));
  const artifacts = data.filter(d => (d.status||"").toLowerCase().includes("artifact"));
  const normalPct = data.length ? Math.round(data.filter(d => (d.status||"").toLowerCase().includes("normal")).length/data.length*100) : 0;
  const alerts    = [...apneas, ...abnormal];

  function spo2C(v) { if (!v) return "#e2e8f0"; if (v<90) return "#ef4444"; if (v<94) return "#f59e0b"; return "#0891b2"; }
  function hrC(v)   { if (!v) return "#e2e8f0"; if (v>120) return "#ef4444"; if (v<50) return "#f59e0b"; return "#3b82f6"; }
  function rateC(v) { if (!v) return "#e2e8f0"; if (v>24||v<8) return "#ef4444"; if (v>20||v<12) return "#f59e0b"; return "#0891b2"; }

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f8fafc 0%,#eff6ff 50%,#e0f2fe 100%)" }}>
      <style>{`@keyframes pulseRing{0%{box-shadow:0 0 0 0 currentColor80}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}`}</style>

      {/* HEADER */}
      <header style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/breathing")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#38bdf8,#0891b2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Wind size={16} color="#fff" />
              </div>
              <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>Breathing Mode — Analytics</span>
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
                  background: minutes===m ? "#0891b2" : "#f8fafc",
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
          <div style={{
            background: apneas.length ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${apneas.length ? "#fca5a5" : "#bbf7d0"}`,
            borderRadius:99, padding:"6px 16px", fontSize:12, fontWeight:500,
            color: apneas.length ? "#b91c1c" : "#166534",
            display:"flex", alignItems:"center", gap:6,
          }}>
            {apneas.length ? <><AlertTriangle size={13} /> {apneas.length} apnea events!</> : <><CheckCircle size={13} /> No apnea detected</>}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>Loading breathing data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem" }}>
            <Wind size={40} color="#bae6fd" style={{ marginBottom:12 }} />
            <div style={{ color:"#64748b", fontSize:14 }}>No breathing mode data in last {minutes}m. Start monitoring.</div>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
              <MetricCard icon={Droplets}     label="Avg SpO₂"        value={avgSpo2}        unit="%"      color={avgSpo2<94&&avgSpo2>0?"#ef4444":"#0891b2"} sub={avgSpo2<94&&avgSpo2>0?"⚠ Low oxygen":"✓ Normal"} pulse={avgSpo2<94&&avgSpo2>0} />
              <MetricCard icon={Heart}        label="Avg Heart Rate"   value={avgHR}          unit="BPM"    color="#e11d48" sub={avgHR>110?"⚠ Elevated":"✓ Normal"} />
              <MetricCard icon={Wind}         label="Avg Breath Rate"  value={avgRate||"--"}  unit="br/min" color={avgRate>20||avgRate<12?"#f59e0b":"#0891b2"} sub="Normal: 12–20" />
              <MetricCard icon={CheckCircle}  label="Normal %"         value={normalPct}      unit="%"      color="#10b981" sub="of all buckets" />
              <MetricCard icon={AlertTriangle} label="Apnea Events"    value={apneas.length}  unit=""       color={apneas.length?"#ef4444":"#10b981"} sub={apneas.length?"🚨 Urgent attention":"✓ None detected"} pulse={apneas.length>0} />
              <MetricCard icon={Activity}     label="Artifacts"        value={artifacts.length} unit=""     color={artifacts.length?"#f59e0b":"#10b981"} sub="Movement noise" />
            </div>

            {/* Rhythm Strip */}
            <RhythmStrip data={data} minutes={minutes} />

            {/* Tab selector */}
            <div style={{ display:"flex", gap:6 }}>
              {[["rate","💨 Breath Rate"],["spo2","🩸 SpO₂"],["hr","❤️ Heart Rate"]].map(([k,l]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  background: tab===k ? "#0891b2" : "#fff",
                  color: tab===k ? "#fff" : "#64748b",
                  border: `1px solid ${tab===k ? "#0891b2" : "#e2e8f0"}`,
                  borderRadius:99, padding:"6px 16px", fontSize:12, cursor:"pointer",
                  fontWeight: tab===k ? 600 : 400, transition:"all .2s",
                }}>{l}</button>
              ))}
            </div>

            {/* Breathing Rate bars */}
            {tab === "rate" && (
              <Section title="Breathing Rate Per Bucket" sub="Green = normal (12–20 br/min). Yellow = slightly off. Red = abnormal or apnea.">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                    <YAxis domain={[0,35]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="br/min" note={v => v>24||v<8 ? "🚨 Abnormal breathing rate" : v>20||v<12 ? "⚠ Slightly off normal" : "✓ Normal (12–20 br/min)"} />} />
                    <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"High limit", fill:"#f59e0b", fontSize:9 }} />
                    <ReferenceLine y={12} stroke="#0891b2" strokeDasharray="4 3" label={{ value:"Low limit", fill:"#0891b2", fontSize:9 }} />
                    <Bar dataKey="rate" name="Breath Rate" radius={[4,4,0,0]} maxBarSize={32}>
                      {data.map((d, i) => <Cell key={i} fill={rateC(d.rate)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {tab === "spo2" && (
              <Section title="Blood Oxygen (SpO₂) — Breathing Quality" sub="SpO₂ dips during apnea events. Below 94% needs attention.">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                    <YAxis domain={[80,100]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="%" note={v => v<90?"🚨 Critical hypoxia":v<94?"⚠ Low oxygen":"✓ Good oxygen level"} />} />
                    <ReferenceLine y={94} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"94% danger line", fill:"#ef4444", fontSize:9 }} />
                    <Bar dataKey="spo2" name="SpO₂ %" radius={[4,4,0,0]} maxBarSize={32}>
                      {data.map((d, i) => <Cell key={i} fill={spo2C(d.spo2)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {tab === "hr" && (
              <Section title="Heart Rate — Breathing Correlation" sub="HR often spikes briefly right after an apnea event (arousal response).">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data} barCategoryGap="12%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f9ff" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                    <YAxis domain={[0,160]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="BPM" note={v => v>120?"⚠ Post-apnea spike possible":v<50&&v>0?"⚠ Low HR":"✓ Normal range"} />} />
                    <ReferenceLine y={110} stroke="#ef4444" strokeDasharray="4 3" />
                    <Bar dataKey="hr" name="HR BPM" radius={[4,4,0,0]} maxBarSize={32}>
                      {data.map((d, i) => <Cell key={i} fill={hrC(d.hr)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {/* Alert log */}
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:16, padding:"16px 20px" }}>
              <div style={{ fontWeight:600, color:"#1e40af", marginBottom:10, fontSize:13 }}>🫁 Respiratory Event Log — last {minutes}m</div>
              {alerts.length === 0 ? (
                <div style={{ fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={14} color="#10b981" /> No respiratory events in this window.</div>
              ) : alerts.slice(-8).reverse().map((a, i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:"1px solid #bfdbfe30", fontSize:12 }}>
                  <span style={{ color:"#94a3b8", minWidth:64 }}>{a.time}</span>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:sConf(a.status).color, marginTop:3, flexShrink:0 }} />
                  <span style={{ color:"#1e3a5f" }}>
                    {sConf(a.status).icon} <strong>{a.status}</strong>
                    {a.spo2>0 && <> · SpO₂ {a.spo2}%</>}
                    {a.hr>0 && <> · HR {a.hr} BPM</>}
                    <span style={{ color:"#94a3b8", marginLeft:4, fontSize:11 }}>— {sConf(a.status).tip}</span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}