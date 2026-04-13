import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import { ArrowLeft, Brain } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";
import { roll, Counter, SCard, CCard, Tip } from "./History";

// roll + Counter + SCard + CCard + Tip — same as HeartHistory, copy them here

function stg(a, b, g) {
  if (!a && !b) return "—";
  if (b > a && b > g) return "Awake";
  if (a > b && a > g) return "Drowsy";
  if (a < 5 && b < 5) return "Deep Sleep";
  return "Light Sleep";
}
const SC = { Awake:"#e11d48", Drowsy:"#f59e0b", "Light Sleep":"#0891b2", "Deep Sleep":"#7c3aed", "—":"#aaa" };

export default function BrainHistory() {
  const navigate = useNavigate();
  const [data, setData]   = useState([]);
  const [hours, setHours] = useState(8);
  const [tab, setTab]     = useState("bands");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`http://10.99.232.91:3001/history/brain?hours=${hours}`)
      .then(r => r.json())
      .then(rows => {
        setData(rows.map(r => ({
          time:  new Date(r.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}),
          alpha: r.alpha,
          beta:  r.beta,
          gamma: r.gamma,
          rms:   r.rms,
          hr:    r.heart_rate,
          spo2:  r.spo2,
          stage: r.sleep_stage || stg(r.alpha, r.beta, r.gamma),
        })));
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [hours]);

  const aD = roll(data,"alpha"); const bD = roll(data,"beta");
  const last = data[data.length-1] || {};
  const avgAlpha = data.length ? +(data.reduce((s,d)=>s+(d.alpha||0),0)/data.length).toFixed(1) : 0;
  const avgBeta  = data.length ? +(data.reduce((s,d)=>s+(d.beta||0),0)/data.length).toFixed(1) : 0;
  const avgRMS   = data.length ? +(data.reduce((s,d)=>s+(d.rms||0),0)/data.length).toFixed(0) : 0;
  const abnormal = data.filter(d => (d.rms||0) > 250);
  const curStage = last.stage || "—";
  const stageCounts = data.reduce((acc,d)=>{ const s=d.stage||"—"; acc[s]=(acc[s]||0)+1; return acc; },{});

  const radarData = [
    { subject:"Alpha", v: last.alpha||0 },
    { subject:"Beta",  v: last.beta||0  },
    { subject:"Gamma", v: last.gamma||0 },
    { subject:"HR-50", v: Math.min((last.hr||50)-50,40) },
    { subject:"SpO₂-90", v: (last.spo2||90)-90 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/brain")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Monitor
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-lg flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Brain Mode — Session History</span>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[1,4,8,24].map(h=>(
              <button key={h} onClick={()=>setHours(h)} style={{
                background: hours===h?"#7c3aed":"transparent",
                color: hours===h?"#fff":"var(--color-text-secondary)",
                border:"0.5px solid var(--color-border-tertiary)",
                borderRadius:99, padding:"4px 14px", fontSize:12, cursor:"pointer", transition:"all .2s",
              }}>{h}h</button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth:860, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {/* Patient card */}
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
          <div style={{ background:"#ede9fe", border:"0.5px solid #c4b5fd", borderRadius:99, padding:"5px 14px", fontSize:11, color:"#5b21b6" }}>
            Current stage: {curStage}
          </div>
        </div>

        {loading ? <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-tertiary)", fontSize:14 }}>Loading history...</div>
        : data.length===0 ? <div style={{ textAlign:"center", padding:"3rem", color:"var(--color-text-tertiary)", fontSize:14 }}>No brain mode data found for this time range.</div>
        : (
          <>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:10, marginBottom:"1.5rem" }}>
              <SCard label="Avg EEG Alpha" val={avgAlpha} unit="µV" color="#7c3aed" i={0}/>
              <SCard label="Avg EEG Beta"  val={avgBeta}  unit="µV" color="#6d28d9" i={1}/>
              <SCard label="Avg RMS Power" val={avgRMS}   unit=""   color="#a21caf" i={2}/>
              <SCard label="Current Stage" val={curStage} unit=""   color={SC[curStage]} i={3} numeric={false}/>
              <SCard label="Abnormal EEG"  val={abnormal.length} unit="events" color="#e11d48" i={4}/>
            </div>

            {/* Sleep stage timeline strip */}
            <CCard title="Sleep stage timeline" sub="Hover to inspect — derived from Alpha/Beta dominance">
              <div style={{ display:"flex", gap:3, height:28, marginBottom:8 }}>
                {data.filter((_,i)=>i%2===0).map((d,i)=>{
                  const s = d.stage || stg(d.alpha,d.beta,d.gamma);
                  const c = SC[s]||"#ccc";
                  return <div key={i} title={`${d.time}: ${s}`} style={{ flex:1, background:c, borderRadius:3, opacity:.8, cursor:"pointer", transition:"transform .15s" }}
                    onMouseEnter={e=>e.target.style.transform="scaleY(1.4)"} onMouseLeave={e=>e.target.style.transform="scaleY(1)"}/>;
                })}
              </div>
              <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                {Object.entries(SC).filter(([k])=>k!=="—").map(([l,c])=>(
                  <span key={l} style={{ fontSize:11, color:"var(--color-text-secondary)", display:"flex", alignItems:"center", gap:4 }}>
                    <span style={{ width:9, height:9, borderRadius:2, background:c, display:"inline-block" }}/>{l} ({stageCounts[l]||0})
                  </span>
                ))}
              </div>
            </CCard>

            {/* Tabs */}
            <div style={{ display:"flex", gap:4, marginBottom:"1rem", background:"var(--color-background-secondary)", borderRadius:10, padding:4, width:"fit-content" }}>
              {[["bands","EEG Bands"],["radar","Radar"],["rms","RMS Power"]].map(([k,l])=>(
                <button key={k} onClick={()=>setTab(k)} style={{
                  background: tab===k?"var(--color-background-primary)":"transparent",
                  border: tab===k?"0.5px solid #7c3aed":"none",
                  borderRadius:7, padding:"6px 16px", fontSize:12,
                  fontWeight: tab===k?500:400,
                  color: tab===k?"#7c3aed":"var(--color-text-secondary)",
                  cursor:"pointer", transition:"all .2s",
                }}>{l}</button>
              ))}
            </div>

            {tab==="bands" && (
              <CCard title="EEG Alpha / Beta / Gamma over session" sub="Rolling average — µV">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={aD}>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)"/>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(aD.length/8)}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="alpha"   stroke="#7c3aed" strokeWidth={1}   strokeOpacity={.3} dot={false} name="Alpha raw"/>
                    <Line type="monotone" dataKey="alpha_s" stroke="#7c3aed" strokeWidth={2.5} dot={false} name="Alpha avg"/>
                    <Line type="monotone" dataKey="beta"    stroke="#6d28d9" strokeWidth={1}   strokeOpacity={.3} dot={false} name="Beta raw"/>
                    <Line type="monotone" dataKey="beta_s"  stroke="#6d28d9" strokeWidth={2}   dot={false} name="Beta avg" strokeDasharray="5 2"/>
                  </LineChart>
                </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={90} style={{marginTop:6}}>
                  <LineChart data={data}>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(data.length/8)}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <Line type="monotone" dataKey="gamma" stroke="#a21caf" strokeWidth={1.5} dot={false} name="Gamma"/>
                  </LineChart>
                </ResponsiveContainer>
              </CCard>
            )}

            {tab==="radar" && (
              <CCard title="Current signal snapshot" sub="All parameters normalised">
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-border-secondary)"/>
                    <PolarAngleAxis dataKey="subject" tick={{fontSize:12}}/>
                    <Radar name="Now" dataKey="v" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.25} strokeWidth={2}/>
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8 }}>
                  {[
                    ["Alpha/Beta ratio", last.beta ? (last.alpha/last.beta).toFixed(2) : "—", "#7c3aed"],
                    ["Dominant band",    (last.alpha||0)>(last.beta||0)?"Alpha":"Beta", "#6d28d9"],
                    ["Sleep stage",      curStage, SC[curStage]],
                    ["EEG quality",      (last.alpha>5&&last.beta>5)?"Good":"Low signal", "#10b981"],
                  ].map(([l,v,c],i)=>(
                    <div key={i} style={{ background:"var(--color-background-secondary)", borderRadius:8, padding:"8px 12px" }}>
                      <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>{l}</div>
                      <div style={{ fontSize:15, fontWeight:500, color:c, marginTop:2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </CCard>
            )}

            {tab==="rms" && (
              <CCard title="EEG RMS Power" sub="Elevated RMS >250 may indicate abnormal neural activity">
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={data}>
                    <defs>
                      <linearGradient id="rmsG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a21caf" stopOpacity={0.2}/><stop offset="95%" stopColor="#a21caf" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)"/>
                    <XAxis dataKey="time" tick={{fontSize:10}} interval={Math.floor(data.length/8)}/>
                    <YAxis tick={{fontSize:10}}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={250} stroke="#e11d48" strokeDasharray="3 3" label={{value:"Threshold",fontSize:9,fill:"#e11d48"}}/>
                    <Area type="monotone" dataKey="rms" stroke="#a21caf" fill="url(#rmsG)" strokeWidth={2} dot={false} name="EEG RMS"/>
                  </AreaChart>
                </ResponsiveContainer>
              </CCard>
            )}

            {/* EEG event log */}
            <div style={{ background:"#f5f3ff", border:"0.5px solid #ddd6fe", borderRadius:10, padding:"1rem" }}>
              <div style={{ fontSize:13, fontWeight:500, color:"#5b21b6", marginBottom:8 }}>EEG event log</div>
              <div style={{ maxHeight:130, overflowY:"auto" }}>
                {abnormal.length===0
                  ? <div style={{ fontSize:12, color:"var(--color-text-tertiary)" }}>No abnormal EEG events in this time range.</div>
                  : abnormal.slice(-8).reverse().map((a,i)=>(
                    <div key={i} style={{ display:"flex", gap:10, fontSize:12, padding:"5px 6px", borderRadius:6 }}
                      onMouseEnter={e=>e.currentTarget.style.background="var(--color-background-secondary)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <span style={{ color:"var(--color-text-tertiary)", minWidth:52 }}>{a.time}</span>
                      <span style={{ width:6, height:6, borderRadius:"50%", background:"#a21caf", marginTop:4, flexShrink:0 }}/>
                      <span style={{ color:"var(--color-text-secondary)" }}>Elevated EEG RMS: {a.rms} · Stage: {a.stage||"—"}</span>
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