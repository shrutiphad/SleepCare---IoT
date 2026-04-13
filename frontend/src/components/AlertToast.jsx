import { useEffect, useState } from "react";

export default function AlertToast({ alerts }) {
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    if (!alerts.length) return;
    setVisible(prev => [...prev, ...alerts].slice(-4)); // max 4 toasts
    const t = setTimeout(() => setVisible([]), 6000);
    return () => clearTimeout(t);
  }, [alerts]);

  return (
    <div style={{
      position: "fixed", top: 20, right: 20,
      display: "flex", flexDirection: "column", gap: 8, zIndex: 9999,
    }}>
      {visible.map((a, i) => (
        <div key={i} style={{
          background: a.severity === "critical" ? "#fef2f2" : "#fffbeb",
          border: `1px solid ${a.severity === "critical" ? "#fca5a5" : "#fcd34d"}`,
          borderLeft: `4px solid ${a.severity === "critical" ? "#ef4444" : "#f59e0b"}`,
          borderRadius: 10, padding: "12px 16px", maxWidth: 320,
          fontSize: 13, color: "#1c1c1c",
          animation: "slideIn .3s ease",
          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
        }}>
          <div style={{ fontWeight: 500, marginBottom: 3 }}>
            {a.severity === "critical" ? "⚠ Critical Alert" : "Notice"}
          </div>
          <div style={{ color: "#555", lineHeight: 1.5 }}>{a.message}</div>
        </div>
      ))}
      <style>{`@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}