import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ArrowLeft, Wind } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";
import { roll, Counter, SCard, CCard, Tip } from "./History";


export default function BreathingHistory() {
  const navigate = useNavigate();
  const [data, setData]   = useState([]);
  const [hours, setHours] = useState(8);
  const [tab, setTab]     = useState("breathing");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://10.99.232.91:3001/history/breathing?hours=${hours}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:     new Date(r.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
          spo2:     r.spo2,
          hr:       r.heart_rate,
          status:   r.breathing_status || "Normal",
          breathing: typeof r.breathing_status === "number" ? r.breathing_status : null,
        })));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [hours]);

  const brD   = roll(data, "breathing");
  const spo2D = roll(data, "spo2");
  const hrD   = roll(data, "hr");

  const apneas    = data.filter(d => d.status === "Apnea" || d.status?.toLowerCase().includes("apnea"));
  const lowSpo2   = data.filter(d => (d.spo2||100) < 94);
  const avgSpo2   = data.length ? +(data.reduce((s,d)=>s+(d.spo2||0),0)/data.length).toFixed(1) : 0;
  const avgHR     = data.length ? +(data.reduce((s,d)=>s+(d.hr||0),0)/data.length).toFixed(1) : 0;
  const normalPct = data.length ? Math.round(data.filter(d=>d.status==="Normal").length/data.length*100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/breathing")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Monitor
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-sky-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Wind className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Breathing Mode — Session History</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[1,4,8,24].map(h=>(
              <button key={h} onClick={()=>setHours(h)} style={{
                background: hours===h?"#0891b2":"transparent",
                color: hours===h?"#fff":"var(--color-text-secondary)",
                border:"0.5px solid var(--color-border-tertiary)",
                borderRadius:99, padding:"4px 14px", fontSize:12, cursor:"pointer", transition:"all .2s",
              }}>{h}h</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:860, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {/* Patient */}
        <div style={{ background:"var(--color-background-primary)", border:"0.5px solid var(--color-border-tertiary)", borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.5rem", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:"linear-gradient(135deg,#2dd4bf,#06b6d4)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:500, fontSize:16 }}>
              {mockPatient.fullName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight:500, fontSize:14 }}>{mockPatient.fullName}</div>
              <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>{mockPatient.age} · {mockPatient.gender} · {mockPatient.id}</div>
            </div>
          </div>
          <div style={{ background: apneas.length?"#fef2f2":"#f0fdf4", border:`0.5px solid ${apneas.length?"#fca5a5":"#bbf7d0"}`, borderRadius:99, padding:"5px 14px", fontSize:11, color: apneas.length?"#b91c1c":"#166534" }}>
            {apneas.length ? `${apneas.length} apnea events` : "No apnea detected"}
          </div>
        </div>

        {loading ? <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-tertiary)", fontSize:14 }}>Loading history...</div>
        : data.length===0 ? <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-tertiary)", fontSize:14 }}>No breathing mode data found for this time range.</div>
        : (
          <>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:"1.5rem" }}>
              <SCard label="Avg SpO₂"       val={avgSpo2}        unit="%"      color="#0891b2" i={0}/>
              <SCard label="Avg Heart Rate"  val={avgHR}          unit="BPM"    color="#e11d48" i={1}/>
              <SCard label="Apnea events"    val={apneas.length}  unit=""       color="#e11d48" i={2}/>
              <SCard label="Normal %"        val={normalPct}      unit="%"      color="#10b981" i={3}/>
              <SCard label="Low SpO₂ events" val={lowSpo2.length} unit=""       color="#f59e0b" i={4}/>
            </div>

            {/* Rhythm strip */}
            <CCard title="Breathing rhythm strip" sub="Bar height = rate · red = apnea · hover to inspect">
              <div style={{ display:"flex", gap:3, height:36, alignItems:"flex-end", marginBottom:8 }}>
                {data.filter((_,i)=>i%2===0).map((d,i)=>{
                  const isApnea = d.status==="Apnea"||d.status?.toLowerCase().includes("apnea");
                  const c = isApnea?"#e11d48":d.status==="Normal"?"#0891b2":"#f59e0b";
                  const h = isApnea?20:Math.min(100,Math.max(15,(d.breathing||15)*4));
                  return <div key={i} title={`${d.time}: ${d.status}`} style={{ flex:1, background:c, borderRadius:"2px 2px 0 0", opacity:.8, cursor:"pointer", height:`${h}%`, transition:"transform .15s" }}
                    onMouseEnter={e=>e.target.style.transform="scaleY(1.3)"} onMouseLeave={e=>e.target.style.transform="scaleY(1)"}/>;
                })}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {[["Normal","#0891b2"],["Elevated","#f59e0b"],["Apnea","#e11d48"]].map(([l,c])=>(
                  <span key={l} style={{ fontSize:11, color:"var(--color-text-secondary)", display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:c, display:"inline-block" }}/>{l}
                  </span>
                ))}
              </div>
            </CCard>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, marginBottom:"1rem", background:"var(--color-background-secondary)", borderRadius:10, padding:4, width:"fit-content" }}>
              {[["breathing","Breathing"],["spo2","SpO₂"],["hr","Heart Rate"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{
                  background: tab===k?"var(--color-background-primary)":"transparent",
                  border: tab===k?"0.5px solid #0891b2":"none",
                  borderRadius:7, padding:"6px 16px", fontSize:12,
                  fontWeight: tab===k?500:400,
                  color: tab===k?"#0891b2":"var(--color-text-secondary)",
                  cursor:"pointer", transition:"all .2s",
                }}>{l}</button>
              ))}
            </div>

            {tab==="breathing" && (
              <CCard title="Breathing rate over session" sub="Normal range 12–20 breaths/min">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={brD}>
                    <defs>
                      <linearGradient id="brG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15}/><stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)"/>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(brD.length/8)}/>
                    <YAxis domain={[0,28]} tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="3 3" label={{value:"High",fontSize:9,fill:"#f59e0b"}}/>
                    <ReferenceLine y={12} stroke="#f59e0b" strokeDasharray="3 3" label={{value:"Low",fontSize:9,fill:"#f59e0b"}}/>
                    <Area type="monotone" dataKey="breathing" stroke="#0891b2" strokeOpacity={.25} fill="url(#brG)" dot={false} name="Rate raw"/>
                    <Line type="monotone" dataKey="breathing_s" stroke="#0891b2" strokeWidth={2.5} dot={false} name="Rate avg"/>
                  </AreaChart>
                </ResponsiveContainer>
              </CCard>
            )}
            {tab==="spo2" && (
              <CCard title="SpO₂ — breathing correlation" sub="Drops visible during apnea events">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={spo2D}>
                    <defs>
                      <linearGradient id="sp3G" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15}/><stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)"/>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(spo2D.length/8)}/>
                    <YAxis domain={[88,100]} tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={94} stroke="#e11d48" strokeDasharray="3 3" label={{value:"Low SpO₂",fontSize:9,fill:"#e11d48"}}/>
                    <Area type="monotone" dataKey="spo2" stroke="#0284c7" strokeOpacity={.2} fill="url(#sp3G)" dot={false} name="SpO₂ raw"/>
                    <Line type="monotone" dataKey="spo2_s" stroke="#0284c7" strokeWidth={2.5} dot={false} name="SpO₂ avg"/>
                  </AreaChart>
                </ResponsiveContainer>
              </CCard>
            )}
            {tab==="hr" && (
              <CCard title="Heart Rate — apnea co-occurrence" sub="HR spikes often co-occur with apnea events">
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={hrD}>
                    <defs>
                      <linearGradient id="hrB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)"/>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(hrD.length/8)}/>
                    <YAxis domain={[50,120]} tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="hr" stroke="#3b82f6" strokeOpacity={.2} fill="url(#hrB)" dot={false} name="HR raw"/>
                    <Line type="monotone" dataKey="hr_s" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="HR avg"/>
                  </AreaChart>
                </ResponsiveContainer>
              </CCard>
            )}

            <div style={{ background:"#eff6ff", border:"0.5px solid #bfdbfe", borderRadius:10, padding:"1rem" }}>
              <div style={{ fontSize:13, fontWeight:500, color:"#1e40af", marginBottom:8 }}>Respiratory event log</div>
              <div style={{ maxHeight:130, overflowY:"auto" }}>
                {apneas.length===0
                  ? <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>No respiratory events in this time range.</div>
                  : apneas.slice(-8).reverse().map((a,i)=>(
                    <div key={i} style={{ display:"flex", gap:10, fontSize:12, padding:"5px 6px", borderRadius:6 }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{ color:"var(--color-text-tertiary)", minWidth:52 }}>{a.time}</span>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"#e11d48", marginTop:4, flexShrink:0 }}/>
                      <span style={{ color:"var(--color-text-secondary)" }}>Apnea event · SpO₂ {a.spo2}% · HR {a.hr} BPM</span>
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