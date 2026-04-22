import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { ArrowLeft, Activity, RefreshCw, AlertTriangle, CheckCircle, Heart, Droplets, Gauge } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL  = process.env.REACT_APP_API_URL || "http://localhost:3001";
const REFRESH  = 15000;

/* ═══════════════════════════════════════════════
   SHARED NAMED EXPORTS (used by other history pages)
═══════════════════════════════════════════════ */

export function roll(arr, key, w=8) {
  return arr.map((d, i) => {
    const sl = arr.slice(Math.max(0,i-w),i+1).map(x=>x[key]).filter(n=>n!=null);
    return { ...d, [`${key}_s`]: sl.length ? +(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(1) : null };
  });
}

export function Counter({ val, color }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = parseFloat(val)||0; let cur=0;
    const step=target/35;
    const id=setInterval(()=>{ cur+=step; if(cur>=target){setN(target);clearInterval(id);}else setN(+cur.toFixed(1)); },18);
    return ()=>clearInterval(id);
  }, [val]);
  return <span style={{ fontSize:24, fontWeight:500, color }}>{n}</span>;
}

export function SCard({ label, val, unit, color, i, numeric=true }) {
  const [show, setShow] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setShow(true),i*90+80); return ()=>clearTimeout(t); },[i]);
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"12px 14px", transition:"all .4s ease", opacity:show?1:0, transform:show?"translateY(0)":"translateY(14px)" }}
      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px) scale(1.02)"; e.currentTarget.style.boxShadow="0 6px 20px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}>
      <div style={{ fontSize:11, color:"#94a3b8", marginBottom:4 }}>{label}</div>
      {numeric ? <Counter val={val} color={color}/> : <span style={{ fontSize:18, fontWeight:500, color }}>{val}</span>}
      <span style={{ fontSize:11, color:"#94a3b8", marginLeft:4 }}>{unit}</span>
    </div>
  );
}

export function CCard({ title, sub, children }) {
  const [h, setH] = useState(false);
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:12, padding:"14px 16px", marginBottom:"1rem", transform:h?"translateY(-2px)":"translateY(0)", boxShadow:h?"0 8px 28px rgba(0,0,0,0.07)":"none", transition:"all .25s" }}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}>
      <div style={{ fontSize:13, fontWeight:500, marginBottom:2 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:"#94a3b8", marginBottom:12 }}>{sub}</div>}
      {children}
    </div>
  );
}

export const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
      <div style={{ color:"#94a3b8", marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => <div key={i} style={{ color:p.color }}>{p.name}: <b>{p.value}</b></div>)}
    </div>
  );
};


function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });
}
function safeAvg(arr, key) {
  const v = arr.map(d=>d[key]).filter(x=>x!=null&&x>0);
  return v.length ? +(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1) : 0;
}

function hrColor(v)   { if(!v) return "#e2e8f0"; if(v>110) return "#ef4444"; if(v<50) return "#f59e0b"; if(v>95) return "#f97316"; return "#10b981"; }
function spo2Color(v) { if(!v) return "#e2e8f0"; if(v<90) return "#ef4444"; if(v<94) return "#f59e0b"; return "#0891b2"; }
function riskColor(v) { if(!v) return "#e2e8f0"; if(v>=50) return "#ef4444"; if(v>=20) return "#f59e0b"; return "#10b981"; }

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

export default function NormalHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [lastRef, setLastRef] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/normal?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:     fmt(r.timestamp),
          hr:       r.heart_rate  || 0,
          spo2:     r.spo2        || 0,
          presence: r.presence,
          risk:     r.risk_score  || 0,
          rl:       r.risk_level  || "normal",
        })));
        setLastRef(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, REFRESH); return () => clearInterval(id); }, [load]);

  const avgHR      = safeAvg(data, "hr");
  const avgSpo2    = safeAvg(data, "spo2");
  const alerts     = data.filter(d => d.rl !== "normal");
  const presentPct = data.length ? Math.round(data.filter(d=>d.presence).length/data.length*100) : 0;
  const hrC_   = avgHR > 110 || (avgHR < 50 && avgHR > 0) ? "#ef4444" : "#10b981";
  const spo2C_ = avgSpo2 < 94 && avgSpo2 > 0 ? "#f59e0b" : "#0891b2";
  const maxRisk = data.length ? Math.max(...data.map(d=>d.risk)) : 0;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f8fafc 0%,#f0fdf4 50%,#ecfdf5 100%)" }}>
      <style>{`@keyframes pulseRing{0%{box-shadow:0 0 0 0 currentColor80}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}`}</style>

      {/* HEADER */}
      <header style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/normal")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#10b981,#14b8a6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Activity size={16} color="#fff" />
              </div>
              <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>Normal Mode — Analytics</span>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:11, color:"#94a3b8" }}>{lastRef.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</span>
            <button onClick={load} style={{ padding:6, borderRadius:8, border:"none", background:"#f1f5f9", cursor:"pointer" }}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} color="#64748b" />
            </button>
            {/* FIXED: 1m / 5m / 10m — NOT hours */}
            <div style={{ display:"flex", gap:4 }}>
              {[1,5,10].map(m => (
                <button key={m} onClick={() => setMinutes(m)} style={{
                  background: minutes===m ? "#10b981" : "#f8fafc",
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
            background: alerts.length ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${alerts.length ? "#fca5a5" : "#bbf7d0"}`,
            borderRadius:99, padding:"6px 16px", fontSize:12, fontWeight:500,
            color: alerts.length ? "#b91c1c" : "#166534",
            display:"flex", alignItems:"center", gap:6,
          }}>
            {alerts.length ? <><AlertTriangle size={13}/> {alerts.length} alerts in {minutes}m</> : <><CheckCircle size={13}/> All clear — {minutes}m</>}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>Loading data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem" }}>
            <Activity size={40} color="#a7f3d0" style={{ marginBottom:12 }} />
            <div style={{ color:"#64748b", fontSize:14 }}>No normal mode data in last {minutes}m. Start monitoring.</div>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12 }}>
              <MetricCard icon={Heart}         label="Avg Heart Rate"   value={avgHR}         unit="BPM" color={hrC_}  sub={avgHR>110?"⚠ Elevated":avgHR<50&&avgHR>0?"⚠ Low":"✓ Normal"} pulse={avgHR>110} />
              <MetricCard icon={Droplets}      label="Avg SpO₂"         value={avgSpo2}        unit="%"   color={spo2C_} sub={avgSpo2<94&&avgSpo2>0?"⚠ Below normal":"✓ Good oxygen"} pulse={avgSpo2<94&&avgSpo2>0} />
              <MetricCard icon={Gauge}         label="Presence"          value={`${presentPct}%`} unit="" color="#10b981" sub={`${Math.round(data.filter(d=>d.presence).length)} of ${data.length} buckets`} />
              <MetricCard icon={AlertTriangle} label="Alert Events"      value={alerts.length} unit=""    color={alerts.length?"#ef4444":"#10b981"} sub={alerts.length?"Needs review":"Stable session"} />
              <MetricCard icon={Activity}      label="Max Risk Score"    value={maxRisk}       unit="/100" color={maxRisk>=50?"#ef4444":maxRisk>=20?"#f59e0b":"#10b981"} sub={maxRisk>=50?"🚨 Critical":maxRisk>=20?"⚠ Warning":"✓ Low risk"} />
            </div>

            {/* SpO₂ Bar Chart */}
            <Section title="Blood Oxygen (SpO₂) — Per Bucket" sub="Each bar = one time bucket. Green = normal. Yellow = slightly low. Red = needs immediate attention.">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                  <YAxis domain={[80,100]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                  <Tooltip content={<BarTip unit="%" note={v=>v<90?"🚨 Critical – check patient now":v<94?"⚠ Below 94% – keep monitoring":"✓ Healthy oxygen level"} />} />
                  <ReferenceLine y={94} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"94% — danger line", fill:"#ef4444", fontSize:9 }} />
                  <ReferenceLine y={98} stroke="#10b981" strokeDasharray="4 3" label={{ value:"98% — ideal",       fill:"#10b981", fontSize:9 }} />
                  <Bar dataKey="spo2" name="SpO₂" radius={[5,5,0,0]} maxBarSize={36}>
                    {data.map((d,i) => <Cell key={i} fill={spo2Color(d.spo2)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Heart Rate Bar Chart */}
            <Section title="Heart Rate — Per Bucket" sub="Normal resting heart rate is 60–100 BPM. Orange/red bars need attention.">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                  <YAxis domain={[0,160]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                  <Tooltip content={<BarTip unit="BPM" note={v=>v>110?"⚠ Tachycardia – heart beating too fast":v<50&&v>0?"⚠ Bradycardia – heart beating too slow":"✓ Normal heart rate"} />} />
                  <ReferenceLine y={100} stroke="#f97316" strokeDasharray="4 3" label={{ value:"High limit",  fill:"#f97316", fontSize:9 }} />
                  <ReferenceLine y={60}  stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"Low limit",   fill:"#f59e0b", fontSize:9 }} />
                  <Bar dataKey="hr" name="Heart Rate" radius={[5,5,0,0]} maxBarSize={36}>
                    {data.map((d,i) => <Cell key={i} fill={hrColor(d.hr)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Presence Timeline */}
            <Section title="Patient Presence on Bed" sub="Green = patient detected on bed. Red = patient off bed. Data from FSR pressure sensor.">
              <div style={{ display:"flex", gap:4, height:32, borderRadius:8, overflow:"hidden" }}>
                {data.map((d,i) => (
                  <div key={i} title={`${d.time}: ${d.presence?"On bed":"Off bed"}`} style={{
                    flex:1, background:d.presence?"#10b981":"#ef4444",
                    cursor:"pointer", transition:"opacity .2s", opacity:0.82,
                  }}
                    onMouseEnter={e=>e.target.style.opacity=1}
                    onMouseLeave={e=>e.target.style.opacity=0.82} />
                ))}
              </div>
              <div style={{ display:"flex", gap:16, marginTop:8, fontSize:12, color:"#64748b" }}>
                <span>🟢 On bed: {presentPct}% of time</span>
                <span>🔴 Off bed: {100-presentPct}% of time</span>
                <span style={{ marginLeft:"auto", color:"#94a3b8" }}>FSR pressure sensor · {data.length} buckets</span>
              </div>
            </Section>

            {/* Risk Score Bar Chart */}
            <Section title="Risk Score — How Stable Is the Patient?" sub="Computed from SpO₂ + heart rate combined. Green = stable. Yellow = monitor closely. Red = check immediately.">
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={data} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0,Math.floor(data.length/6)-1)} />
                  <YAxis domain={[0,100]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                  <Tooltip content={<BarTip unit="/100" note={v=>v>=50?"🚨 Critical – urgent attention needed":v>=20?"⚠ Warning – keep monitoring":"✓ Patient is stable"} />} />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"Critical (50)", fill:"#ef4444", fontSize:9 }} />
                  <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"Warning (20)",  fill:"#f59e0b", fontSize:9 }} />
                  <Bar dataKey="risk" name="Risk Score" radius={[5,5,0,0]} maxBarSize={36}>
                    {data.map((d,i) => <Cell key={i} fill={riskColor(d.risk)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Alert log */}
            {alerts.length > 0 && (
              <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:16, padding:"16px 20px" }}>
                <div style={{ fontWeight:600, color:"#92400e", marginBottom:10, fontSize:13 }}>📋 Alert Log — last {minutes}m</div>
                {alerts.slice(-8).reverse().map((a,i) => (
                  <div key={i} style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:"1px solid #fed7aa20", fontSize:12 }}>
                    <span style={{ color:"#94a3b8", minWidth:64 }}>{a.time}</span>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:a.rl==="critical"?"#ef4444":"#f59e0b", marginTop:3, flexShrink:0 }} />
                    <span style={{ color:"#78350f" }}>
                      {a.spo2<94&&a.spo2>0 ? `SpO₂ at ${a.spo2}%` : `HR at ${a.hr} BPM`}
                      {" · "}<span style={{ color:a.rl==="critical"?"#ef4444":"#f59e0b", fontWeight:600 }}>Risk {a.risk}/100</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}