import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";

// ✅ use your laptop IP
const socket = io("http://10.200.68.91:3001", {
  transports: ["websocket"],
});

export default function LiveMonitor() {
  const { mode } = useParams();

  const [connected, setConnected] = useState(false);
  const [vitals, setVitals] = useState({
    spo2: 0,
    heart_rate: 0,
    presence: "NO",
    breathing: 0,
    ecg: 0,
    alpha: 0,
    beta: 0,
    gamma: 0,
  });

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Socket connected");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      console.log(" Socket disconnected");
      setConnected(false);
    });

    socket.on("sensor-update", (data) => {
      console.log("📡 Incoming:", data);

      setVitals({
        spo2: data.spo2 || 0,
        heart_rate: data.heart_rate || 0,

        // ✅ convert pressure to YES / NO
        presence: data.presence > 0 ? "YES" : "NO",

        breathing: data.breathing || 0,
        ecg: data.ecg || 0,
        alpha: data.alpha || 0,
        beta: data.beta || 0,
        gamma: data.gamma || 0,
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensor-update");
    };
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Live Monitor ({mode})</h2>
      <p>Status: {connected ? "🟢 Connected" : "🔴 Disconnected"}</p>

      <h3>Vitals</h3>
      <p>SpO₂: {vitals.spo2}</p>
      <p>BPM: {vitals.heart_rate}</p>
      <p>Presence: {vitals.presence}</p>
      <p>Breathing: {vitals.breathing}</p>

      <h3>ECG</h3>
      <p>Last ECG: {vitals.ecg}</p>

      <h3>EEG</h3>
      <p>Alpha: {vitals.alpha}</p>
      <p>Beta: {vitals.beta}</p>
      <p>Gamma: {vitals.gamma}</p>
    </div>
  );
}
