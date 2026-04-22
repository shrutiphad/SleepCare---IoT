import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { ArrowLeft, Activity } from "lucide-react";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

// ────────────────────────────────────────────────
// Shared Utilities (exported for other History pages)
// ────────────────────────────────────────────────

/** Rolling average over a numeric field */
export function roll(arr, key, w = 8) {
  return arr.map((d, i) => {
    const sl = arr
      .slice(Math.max(0, i - w), i + 1)
      .map((x) => x[key])
      .filter((n) => n != null);
    return {
      ...d,
      [`${key}_s`]: sl.length
        ? +(sl.reduce((a, b) => a + b, 0) / sl.length).toFixed(1)
        : null,
    };
  });
}

/** Animated number counter */
export function Counter({ val, color }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = parseFloat(val) || 0;
    let cur = 0;
    const step = target / 35;
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setN(target); clearInterval(id); }
      else setN(+cur.toFixed(1));
    }, 18);
    return () => clearInterval(id);
  }, [val]);
  return <span style={{ fontSize: 26, fontWeight: 500, color }}>{n}</span>;
}

/** Summary stat card */
export function SCard({ label, val, unit, color, i, numeric = true }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), i * 90 + 80);
    return () => clearTimeout(t);
  }, [i]);
  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 10, padding: "12px 14px",
        transition: "all .4s ease",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(14px)",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px) scale(1.02)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>{label}</div>
      {numeric
        ? <Counter val={val} color={color} />
        : <span style={{ fontSize: 18, fontWeight: 500, color }}>{val}</span>}
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginLeft: 4 }}>{unit}</span>
    </div>
  );
}

/** Section chart card */
export function CCard({ title, sub, children }) {
  const [h, setH] = useState(false);
  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.25rem",
        transform: h ? "translateY(-2px)" : "translateY(0)",
        boxShadow: h ? "0 8px 28px rgba(0,0,0,0.07)" : "none",
        transition: "all .25s ease",
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 12 }}>{sub}</div>}
      {children}
    </div>
  );
}

/** Recharts custom tooltip */
export const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: "0.5px solid var(--color-border-secondary)",
      borderRadius: 8, padding: "8px 12px", fontSize: 12,
    }}>
      <div style={{ color: "var(--color-text-tertiary)", marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>{p.name}: <b>{p.value}</b></div>
      ))}
    </div>
  );
};

// ────────────────────────────────────────────────
// Default Export: Normal Mode History Page
// ────────────────────────────────────────────────
export default function NormalHistory() {
  const navigate = useNavigate();
  const [data, setData]     = useState([]);
  const [hours, setHours]   = useState(8);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Normal mode = mode 1 — fetch heart data as proxy for basic vitals
    fetch(`${API_URL}/history/heart?hours=${hours}`)
      .then((r) => r.json())
      .then((rows) => {
        setData(
          rows.map((r) => ({
            time:  new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            hr:    r.heart_rate,
            spo2:  r.spo2,
          }))
        );
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [hours]);

  const hrD   = roll(data, "hr");
  const spo2D = roll(data, "spo2");
  const avgHR   = data.length ? +(data.reduce((s, d) => s + (d.hr   || 0), 0) / data.length).toFixed(1) : 0;
  const avgSpo2 = data.length ? +(data.reduce((s, d) => s + (d.spo2 || 0), 0) / data.length).toFixed(1) : 0;
  const alerts  = data.filter((d) => (d.hr > 95) || (d.spo2 < 95));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/monitor/normal")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Monitor
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Normal Mode — Session History</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 4, 8, 24].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                style={{
                  background: hours === h ? "#10b981" : "transparent",
                  color: hours === h ? "#fff" : "var(--color-text-secondary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 99, padding: "4px 14px", fontSize: 12,
                  cursor: "pointer", transition: "all .2s",
                }}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {/* Patient */}
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid var(--color-border-tertiary)",
          borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "1.5rem",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg,#2dd4bf,#06b6d4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 500, fontSize: 16,
            }}>
              {mockPatient.fullName.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{mockPatient.fullName}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                {mockPatient.age} · {mockPatient.gender} · {mockPatient.id}
              </div>
            </div>
          </div>
          <div style={{
            background: "#f0fdf4", border: "0.5px solid #bbf7d0",
            borderRadius: 99, padding: "5px 14px", fontSize: 11, color: "#166534",
          }}>
            {alerts.length} events in {hours}h
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>
            Loading history...
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-tertiary)", fontSize: 14 }}>
            No data found for this time range.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: "1.5rem" }}>
              <SCard label="Avg Heart Rate" val={avgHR}   unit="BPM" color="#e11d48" i={0} />
              <SCard label="Avg SpO₂"       val={avgSpo2} unit="%"   color="#0891b2" i={1} />
              <SCard label="Events"          val={alerts.length} unit="" color="#f59e0b" i={2} />
            </div>

            <CCard title="Heart Rate" sub="Rolling average">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hrD}>
                  <defs>
                    <linearGradient id="hrNG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.floor(hrD.length / 8)} />
                  <YAxis domain={[40, 130]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={100} stroke="#e11d48" strokeDasharray="3 3" />
                  <ReferenceLine y={60}  stroke="#f59e0b" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="hr"   stroke="#10b981" strokeOpacity={0.2} fill="url(#hrNG)" dot={false} name="HR raw" />
                  <Line type="monotone" dataKey="hr_s" stroke="#10b981" strokeWidth={2.5} dot={false} name="HR avg" />
                </AreaChart>
              </ResponsiveContainer>
            </CCard>

            <CCard title="SpO₂" sub="Danger zone below 94%">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={spo2D}>
                  <defs>
                    <linearGradient id="spNG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.floor(spo2D.length / 8)} />
                  <YAxis domain={[88, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip content={<Tip />} />
                  <ReferenceLine y={94} stroke="#e11d48" strokeDasharray="3 3" label={{ value: "Low", fontSize: 9, fill: "#e11d48" }} />
                  <Area type="monotone" dataKey="spo2"   stroke="#0891b2" strokeOpacity={0.25} fill="url(#spNG)" dot={false} name="SpO₂ raw" />
                  <Line type="monotone" dataKey="spo2_s" stroke="#0891b2" strokeWidth={2.5} dot={false} name="SpO₂ avg" />
                </AreaChart>
              </ResponsiveContainer>
            </CCard>
          </>
        )}
      </main>
    </div>
  );
}

// export function roll(arr, key, w = 8) {
//   return arr.map((d, i) => {
//     const sl = arr.slice(Math.max(0, i - w), i + 1).map(x => x[key]).filter(n => n != null);
//     return { ...d, [`${key}_s`]: sl.length ? +(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(1) : null };
//   });
// }

// export function Counter({ val, color }) { /* same as in artifact */ }
// export function SCard({ label, val, unit, color, i, numeric=true }) { /* same */ }
// export function CCard({ title, sub, children }) { /* same */ }
// export const Tip = ({ active, payload, label }) => { /* same */ };