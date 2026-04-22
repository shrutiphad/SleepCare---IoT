import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft, Send, Bot, User, Loader2 } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function Chat() {
  const navigate  = useNavigate();
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! I'm your SleepCare AI assistant. Ask me anything about your patient's vitals, sleep stages, or recent health trends." },
  ]);
  const [question, setQuestion] = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.answer || "No response received." }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `⚠ Could not reach the AI server. Make sure rag_server.py is running on port 5002. (${err.message})` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50 flex flex-col">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/mode-select")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">AI Health Assistant</span>
          </div>
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            Powered by RAG + Llama3
          </span>
        </div>
      </header>

      {/* CHAT BODY */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-4">
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto" style={{ minHeight: 0 }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                m.role === "assistant"
                  ? "bg-gradient-to-br from-teal-500 to-cyan-600 text-white"
                  : "bg-gradient-to-br from-slate-500 to-slate-600 text-white"
              }`}>
                {m.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <Card className={`max-w-[75%] border-0 ${
                m.role === "user"
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-teal-200"
                  : "bg-white/80 shadow-slate-200/50"
              } shadow-lg backdrop-blur-sm`}>
                <CardContent className="p-3">
                  <p className={`text-sm leading-relaxed ${m.role === "user" ? "text-white" : "text-slate-700"}`}>
                    {m.text}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <Card className="border-0 bg-white/80 shadow-lg shadow-slate-200/50 backdrop-blur-sm">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* SUGGESTED QUESTIONS */}
        <div className="flex flex-wrap gap-2">
          {[
            "Was SpO₂ low in the last hour?",
            "Any apnea events last night?",
            "What was the sleep stage pattern?",
            "Show ECG abnormalities today",
          ].map((q) => (
            <button
              key={q}
              onClick={() => setQuestion(q)}
              className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600 transition-all"
            >
              {q}
            </button>
          ))}
        </div>

        {/* INPUT */}
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your patient's health data…"
            disabled={loading}
            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent disabled:opacity-50"
          />
          <Button
            onClick={ask}
            disabled={loading || !question.trim()}
            className="h-11 px-5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-200"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}

// import { useState } from "react";

// export default function Chat() {
//   const [question, setQuestion] = useState("");
//   const [answer,   setAnswer]   = useState("");
//   const [loading,  setLoading]  = useState(false);

//   const ask = async () => {
//     setLoading(true);
//     const res = await fetch("http://10.99.232.91:3001/query", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ question }),
//     });
//     const data = await res.json();
//     setAnswer(data.answer);
//     setLoading(false);
//   };

//   return (
//     <div style={{ maxWidth: 600, margin: "2rem auto", padding: "0 1rem" }}>
//       <h2 style={{ marginBottom: "1rem" }}>Ask about your patient</h2>
//       <input
//         value={question}
//         onChange={e => setQuestion(e.target.value)}
//         placeholder="e.g. Was there any SpO₂ drop in the last hour?"
//         style={{ width: "100%", marginBottom: ".75rem" }}
//       />
//       <button onClick={ask} disabled={loading}>
//         {loading ? "Thinking..." : "Ask →"}
//       </button>
//       {answer && (
//         <div style={{ marginTop: "1.5rem", padding: "1rem",
//           background: "var(--color-background-secondary)",
//           borderRadius: "var(--border-radius-md)",
//           fontSize: 14, lineHeight: 1.7 }}>
//           {answer}
//         </div>
//       )}
//     </div>
//   );
// }