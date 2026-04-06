import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function History() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("http://10.99.232.91:3001/history")
      .then(r => r.json())
      .then(readings => {
        setData(readings.map(r => ({
          time:  new Date(r.timestamp).toLocaleTimeString(),
          spo2:  r.spo2,
          hr:    r.heart_rate,
          alpha: r.alpha,
          beta:  r.beta,
        })));
      });
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Heart Rate over time</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={30} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="hr" stroke="#e11d48" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <h2 style={{ marginTop: "2rem" }}>SpO₂ over time</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={30} />
          <YAxis domain={[85, 100]} />
          <Tooltip />
          <Line type="monotone" dataKey="spo2" stroke="#0891b2" dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <h2 style={{ marginTop: "2rem" }}>EEG Bands over time</h2>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={30} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="alpha" stroke="#7c3aed" dot={false} />
          <Line type="monotone" dataKey="beta"  stroke="#6d28d9" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}