import { useState } from "react";

export default function Chat() {
  const [question, setQuestion] = useState("");
  const [answer,   setAnswer]   = useState("");
  const [loading,  setLoading]  = useState(false);

  const ask = async () => {
    setLoading(true);
    const res = await fetch("http://10.99.232.91:3001/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
      <h2 style={{ marginBottom: "1rem" }}>Ask about your patient</h2>
      <input
        value={question}
        onChange={e => setQuestion(e.target.value)}
        placeholder="e.g. Was there any SpO₂ drop in the last hour?"
        style={{ width: "100%", marginBottom: ".75rem" }}
      />
      <button onClick={ask} disabled={loading}>
        {loading ? "Thinking..." : "Ask →"}
      </button>
      {answer && (
        <div style={{ marginTop: "1.5rem", padding: "1rem",
          background: "var(--color-background-secondary)",
          borderRadius: "var(--border-radius-md)",
          fontSize: 14, lineHeight: 1.7 }}>
          {answer}
        </div>
      )}
    </div>
  );
}