import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import { ArrowLeft, Heart, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, Activity, Droplets, Brain } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";
const REFRESH  = 15000;

/* ── helpers ── */
function fmt(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function safeAvg(arr, key) {
  const v = arr.map(d => d[key]).filter(x => x != null && x > 0);
  return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : 0;
}

/* ── colour helpers ── */
function hrColor(v)   { if (!v) return "#e2e8f0"; if (v > 110) return "#ef4444"; if (v < 50) return "#f59e0b"; if (v > 95) return "#f97316"; return "#10b981"; }
function spo2Color(v) { if (!v) return "#e2e8f0"; if (v < 90) return "#ef4444"; if (v < 94) return "#f59e0b"; return "#0891b2"; }
function ecgColor(v)  { if (!v) return "#e2e8f0"; if (v > 110) return "#ef4444"; if (v < 50) return "#f59e0b"; return "#e11d48"; }
function riskColor(v) { if (!v) return "#e2e8f0"; if (v >= 50) return "#ef4444"; if (v >= 20) return "#f59e0b"; return "#10b981"; }
const CNN_C = { Normal:"#10b981", AFib:"#7c3aed", Tachycardia:"#ef4444", Bradycardia:"#f59e0b", "Analysing...":"#94a3b8" };

/* ── custom tooltip ── */
const BarTip = ({ active, payload, label, unit, note }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  return (
    <div style={{ background:"#1e293b", color:"#f8fafc", borderRadius:10, padding:"10px 14px", fontSize:12, boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
      <div style={{ color:"#94a3b8", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:18, fontWeight:700, color: payload[0]?.fill }}>{v ?? "--"}<span style={{ fontSize:11, marginLeft:3 }}>{unit}</span></div>
      {note && <div style={{ color:"#94a3b8", marginTop:4, fontSize:11 }}>{note(v)}</div>}
    </div>
  );
};

/* ── metric card ── */
function MetricCard({ icon: Icon, label, value, unit, color, sub, pulse }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"16px 18px", border:`2px solid ${color}22`, position:"relative", overflow:"hidden" }}>
      {pulse && (
        <span style={{ position:"absolute", top:10, right:10, width:8, height:8, borderRadius:"50%", background:color, boxShadow:`0 0 0 0 ${color}`, animation:"pulseRing 1.5s infinite" }} />
      )}
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

/* ── section wrapper ── */
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

/* ── CNN classification strip ── */
function CnnStrip({ data }) {
  const [hovered, setHovered] = useState(null);
  const counts = data.reduce((a, d) => { a[d.cnn] = (a[d.cnn] || 0) + 1; return a; }, {});
  const total  = data.length;

  return (
    <Section title="ECG Rhythm Classification" sub="What type of heartbeat pattern was detected in each time bucket?">
      {/* Legend pct bars */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {Object.entries(CNN_C).filter(([k]) => k !== "Analysing...").map(([lbl, c]) => {
          const pct = total ? Math.round((counts[lbl] || 0) / total * 100) : 0;
          return (
            <div key={lbl} style={{ flex:"1 1 100px", background:`${c}12`, borderRadius:10, padding:"8px 12px", border:`1px solid ${c}30` }}>
              <div style={{ fontSize:10, color:c, fontWeight:600, marginBottom:4 }}>{lbl}</div>
              <div style={{ height:6, borderRadius:3, background:`${c}25`, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct}%`, background:c, borderRadius:3, transition:"width .6s ease" }} />
              </div>
              <div style={{ fontSize:11, color:"#64748b", marginTop:4 }}>{counts[lbl] || 0} buckets · {pct}%</div>
            </div>
          );
        })}
      </div>
      {/* Timeline strip */}
      <div style={{ display:"flex", gap:4, height:44, alignItems:"flex-end" }}>
        {data.map((d, i) => {
          const c = CNN_C[d.cnn] || "#94a3b8";
          const isHov = hovered === i;
          return (
            <div key={i} title={`${d.time}\n${d.cnn}`}
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}
              style={{
                flex:1, borderRadius:"4px 4px 0 0", cursor:"pointer",
                background: isHov ? c : `${c}cc`,
                height: isHov ? "100%" : "72%",
                transition:"all .2s ease",
                boxShadow: isHov ? `0 0 12px ${c}80` : "none",
              }} />
          );
        })}
      </div>
      {hovered !== null && data[hovered] && (
        <div style={{ marginTop:8, padding:"6px 10px", background:"#1e293b", color:"#f8fafc", borderRadius:8, fontSize:12, display:"inline-block" }}>
          {data[hovered].time} → <strong style={{ color: CNN_C[data[hovered].cnn] }}>{data[hovered].cnn || "Normal"}</strong>
        </div>
      )}
    </Section>
  );
}

export default function HeartHistory() {
  const navigate  = useNavigate();
  const [data,    setData]    = useState([]);
  const [minutes, setMinutes] = useState(5);
  const [loading, setLoading] = useState(true);
  const [lastRef, setLastRef] = useState(new Date());

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${API_URL}/history/heart?minutes=${minutes}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:    fmt(r.timestamp),
          hr:      r.heart_rate   || 0,
          spo2:    r.spo2         || 0,
          ecg:     r.ecg_hr       || 0,
          ecgS:    r.ecg_hr_stable|| 0,
          cnn:     r.cnn_label    || "Normal",
          risk:    r.risk_score   || 0,
          rl:      r.risk_level   || "normal",
        })));
        setLastRef(new Date());
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [minutes]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, REFRESH); return () => clearInterval(id); }, [load]);

  const avgHR   = safeAvg(data, "hr");
  const avgSpo2 = safeAvg(data, "spo2");
  const avgEcg  = safeAvg(data, "ecg");
  const maxRisk = data.length ? Math.max(...data.map(d => d.risk)) : 0;
  const alerts  = data.filter(d => d.rl !== "normal");

  const hrStatus   = avgHR > 110 ? "⚠ High" : avgHR < 50 && avgHR > 0 ? "⚠ Low" : avgHR > 0 ? "✓ Normal" : "--";
  const spo2Status = avgSpo2 < 90 && avgSpo2 > 0 ? "⚠ Critical" : avgSpo2 < 94 && avgSpo2 > 0 ? "⚠ Low" : avgSpo2 > 0 ? "✓ Normal" : "--";
  const hrColor_   = avgHR > 110 || (avgHR < 50 && avgHR > 0) ? "#ef4444" : "#10b981";
  const spo2Color_ = avgSpo2 < 90 && avgSpo2 > 0 ? "#ef4444" : avgSpo2 < 94 && avgSpo2 > 0 ? "#f59e0b" : "#0891b2";

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f8fafc 0%,#f0fdf4 50%,#ecfdf5 100%)" }}>
      <style>{`@keyframes pulseRing{0%{box-shadow:0 0 0 0 currentColor80}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}`}</style>

      {/* HEADER */}
      <header style={{ background:"rgba(255,255,255,0.85)", backdropFilter:"blur(12px)", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ maxWidth:900, margin:"0 auto", padding:"0 16px", height:64, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/heart")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#f43f5e,#e11d48)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Heart size={16} color="#fff" />
              </div>
              <span style={{ fontWeight:700, fontSize:15, color:"#1e293b" }}>Heart Mode — Analytics</span>
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
                  background: minutes===m ? "#e11d48" : "#f8fafc",
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

        {/* Patient card */}
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
            borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:500,
            color: alerts.length ? "#b91c1c" : "#166534",
            display:"flex", alignItems:"center", gap:6,
          }}>
            {alerts.length ? <AlertTriangle size={13} /> : <CheckCircle size={13} />}
            {alerts.length ? `${alerts.length} alert events in ${minutes}m` : `All clear — last ${minutes}m`}
          </div>
        </div>

        {loading && data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem", color:"#94a3b8" }}>Loading heart data…</div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:"center", padding:"4rem" }}>
            <Heart size={40} color="#fca5a5" style={{ marginBottom:12 }} />
            <div style={{ color:"#64748b", fontSize:14 }}>No heart mode data in last {minutes}m. Start monitoring.</div>
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:12 }}>
              <MetricCard icon={Heart}      label="Avg Heart Rate"  value={avgHR}   unit="BPM"  color={hrColor_}  sub={hrStatus}   pulse={avgHR > 110} />
              <MetricCard icon={Droplets}   label="Avg SpO₂"        value={avgSpo2} unit="%"    color={spo2Color_} sub={spo2Status} pulse={avgSpo2 < 94 && avgSpo2 > 0} />
              <MetricCard icon={Activity}   label="Avg ECG HR"       value={avgEcg}  unit="BPM"  color="#e11d48"   sub="ECG sensor"  />
              <MetricCard icon={TrendingUp} label="Max Risk Score"   value={maxRisk} unit="/100" color={maxRisk >= 50 ? "#ef4444" : maxRisk >= 20 ? "#f59e0b" : "#10b981"} sub={maxRisk >= 50 ? "⚠ Critical detected" : maxRisk >= 20 ? "⚠ Warning detected" : "✓ Stable"} />
              <MetricCard icon={AlertTriangle} label="Alert Events"  value={alerts.length} unit="" color={alerts.length ? "#ef4444" : "#10b981"} sub={alerts.length ? "Needs attention" : "None this window"} />
            </div>

            {/* CNN strip */}
            <CnnStrip data={data} />

            {/* ECG HR Bar Chart */}
            <Section title="ECG Heart Rate — Per Bucket" sub="Green = normal range (50–100 BPM). Orange = slightly high. Red = alert territory.">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0, Math.floor(data.length/6)-1)} />
                  <YAxis domain={[0,160]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                  <Tooltip content={<BarTip unit="BPM" note={v => v > 110 ? "⚠ Tachycardia range" : v < 50 && v > 0 ? "⚠ Bradycardia range" : "✓ Normal range"} />} />
                  <ReferenceLine y={110} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"Tachy limit", fill:"#ef4444", fontSize:9 }} />
                  <ReferenceLine y={50}  stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"Brady limit", fill:"#f59e0b", fontSize:9 }} />
                  <Bar dataKey="ecg" name="ECG Fast HR" radius={[4,4,0,0]} maxBarSize={32}>
                    {data.map((d, i) => <Cell key={i} fill={ecgColor(d.ecg)} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* SpO₂ + SparkFun HR side by side */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Section title="Blood Oxygen (SpO₂)" sub="Normal is above 94%. Below that is concerning.">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data} barCategoryGap="14%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:8, fill:"#94a3b8" }} interval={Math.max(0, Math.floor(data.length/4)-1)} />
                    <YAxis domain={[80,100]} tick={{ fontSize:8, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="%" note={v => v < 90 ? "🚨 Critical hypoxia" : v < 94 ? "⚠ Low oxygen" : "✓ Good"} />} />
                    <ReferenceLine y={94} stroke="#ef4444" strokeDasharray="4 3" />
                    <Bar dataKey="spo2" name="SpO₂" radius={[4,4,0,0]} maxBarSize={28}>
                      {data.map((d, i) => <Cell key={i} fill={spo2Color(d.spo2)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>

              <Section title="SparkFun Heart Rate" sub="Optical sensor. Compare with ECG above.">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data} barCategoryGap="14%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="time" tick={{ fontSize:8, fill:"#94a3b8" }} interval={Math.max(0, Math.floor(data.length/4)-1)} />
                    <YAxis domain={[0,160]} tick={{ fontSize:8, fill:"#94a3b8" }} />
                    <Tooltip content={<BarTip unit="BPM" note={v => v > 110 ? "⚠ High" : v < 50 && v > 0 ? "⚠ Low" : "✓ Normal"} />} />
                    <ReferenceLine y={100} stroke="#f97316" strokeDasharray="4 3" />
                    <Bar dataKey="hr" name="SparkFun HR" radius={[4,4,0,0]} maxBarSize={28}>
                      {data.map((d, i) => <Cell key={i} fill={hrColor(d.hr)} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            </div>

            {/* Risk Score Bar */}
            <Section title="Risk Score — How worried should we be?" sub="0 = completely safe · 20–49 = needs monitoring · 50+ = urgent attention needed">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} barCategoryGap="12%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize:9, fill:"#94a3b8" }} interval={Math.max(0, Math.floor(data.length/6)-1)} />
                  <YAxis domain={[0,100]} tick={{ fontSize:9, fill:"#94a3b8" }} />
                  <Tooltip content={<BarTip unit="/100" note={v => v >= 50 ? "🚨 Critical — immediate check" : v >= 20 ? "⚠ Warning — keep watching" : "✓ Patient is stable"} />} />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 3" label={{ value:"Critical", fill:"#ef4444", fontSize:9 }} />
                  <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="4 3" label={{ value:"Warning",  fill:"#f59e0b", fontSize:9 }} />
                  <Bar dataKey="risk" name="Risk Score" radius={[4,4,0,0]} maxBarSize={32}>
                    {data.map((d, i) => <Cell key={i} fill={riskColor(d.risk)} fillOpacity={0.9} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Section>

            {/* Alert Log */}
            <div style={{ background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:16, padding:"16px 20px" }}>
              <div style={{ fontWeight:600, color:"#92400e", marginBottom:10, fontSize:13 }}>📋 Cardiac Alert Log — last {minutes}m</div>
              {alerts.length === 0 ? (
                <div style={{ fontSize:13, color:"#94a3b8", display:"flex", alignItems:"center", gap:6 }}><CheckCircle size={14} color="#10b981" /> No cardiac alerts in this window.</div>
              ) : alerts.slice(-8).reverse().map((a, i) => (
                <div key={i} style={{ display:"flex", gap:12, padding:"6px 0", borderBottom:"1px solid #fed7aa20", fontSize:12 }}>
                  <span style={{ color:"#94a3b8", minWidth:64 }}>{a.time}</span>
                  <span style={{ width:8, height:8, borderRadius:"50%", background: a.rl==="critical" ? "#ef4444" : "#f59e0b", marginTop:3, flexShrink:0 }} />
                  <span style={{ color:"#78350f" }}>
                    {a.cnn !== "Normal" && a.cnn !== "Analysing..." ? `ECG: ${a.cnn}` : a.spo2 < 94 ? `SpO₂ dropped to ${a.spo2}%` : `HR at ${a.hr} BPM`}
                    {" · "}<span style={{ color: a.rl==="critical" ? "#ef4444" : "#f59e0b", fontWeight:600 }}>Risk {a.risk}/100</span>
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