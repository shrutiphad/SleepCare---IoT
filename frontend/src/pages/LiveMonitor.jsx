import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";
import {
  Activity,
  Heart,
  Brain,
  Wind,
  ArrowLeft,
  Bell,
  Settings,
  Droplets,
  Gauge,
  Zap,
  Waves,
  AlertTriangle,
  Power,
  RefreshCw,
} from "lucide-react";

const socket = io("http://10.200.68.91:3001", {
  transports: ["websocket"],
});

export default function LiveMonitor() {
  const { mode } = useParams();
  const navigate = useNavigate();

  const [connected, setConnected] = useState(false);
  const [alertActive, setAlertActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const [vitals, setVitals] = useState({
    spo2: 0,
    bpm: 0,
    pressure: 0,
    breathing: 0,
    ecg: 0,
    eegAlpha: 0,
    eegBeta: 0,
    eegGamma: 0,
  });

  useEffect(() => {
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("sensor-update", (data) => {
      console.log("📡 Incoming:", data);

      setVitals({
        spo2: data.spo2 || 0,
        bpm: data.heart_rate || 0,
        pressure: data.presence || 0,
        breathing: data.breathing || 0,
        ecg: data.ecg || 0,
        eegAlpha: data.alpha || 0,
        eegBeta: data.beta || 0,
        eegGamma: data.gamma || 0,
      });

      setLastUpdate(new Date());
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("sensor-update");
    };
  }, []);

  const modeConfig = {
    normal: { name: "Normal Mode", icon: Activity, gradient: "from-emerald-500 to-teal-500" },
    heart: { name: "Heart Mode", icon: Heart, gradient: "from-rose-500 to-red-500" },
    brain: { name: "Brain Mode", icon: Brain, gradient: "from-indigo-500 to-violet-500" },
    breathing: { name: "Breathing Mode", icon: Wind, gradient: "from-sky-500 to-blue-500" },
  };

  const currentMode = modeConfig[mode] || modeConfig.normal;
  const IconComponent = currentMode.icon;

  const colorMap = {
    cyan: "bg-cyan-50 text-cyan-500",
    rose: "bg-rose-50 text-rose-500",
    amber: "bg-amber-50 text-amber-500",
    emerald: "bg-emerald-50 text-emerald-500",
    red: "bg-red-50 text-red-500",
    indigo: "bg-indigo-50 text-indigo-500",
    violet: "bg-violet-50 text-violet-500",
    purple: "bg-purple-50 text-purple-500",
  };

  const VitalCard = ({ icon: Icon, label, value, unit, color }) => (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <p className="text-sm text-slate-500 mt-3">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-800">{value}</span>
          <span className="text-sm text-slate-400">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/mode-select")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 bg-gradient-to-br ${currentMode.gradient} rounded-lg flex items-center justify-center`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">{currentMode.name}</span>
            </div>
          </div>

          <span className={`px-3 py-1.5 rounded-full text-sm ${
            connected ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          }`}>
            {connected ? "🟢 Live" : "🔴 Disconnected"}
          </span>
        </div>
      </header>

      {alertActive && (
        <div className="bg-rose-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span>Abnormal vital signs detected.</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Card className="mb-6 border-0 shadow-lg bg-white/80">
          <CardContent className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold">
                {mockPatient.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold">{mockPatient.fullName}</h2>
                <p className="text-sm text-slate-500">
                  {mockPatient.age} • {mockPatient.gender} • {mockPatient.id}
                </p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">Last Updated</p>
              <p className="text-sm">{lastUpdate.toLocaleTimeString()}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalCard icon={Droplets} label="SpO₂" value={vitals.spo2} unit="%" color="cyan" />
          <VitalCard icon={Heart} label="Heart Rate" value={vitals.bpm} unit="BPM" color="rose" />
          <VitalCard icon={Gauge} label="Pressure" value={vitals.pressure} unit="mmHg" color="amber" />
          <VitalCard icon={Wind} label="Breathing" value={vitals.breathing} unit="/min" color="emerald" />
          <VitalCard icon={Activity} label="ECG" value={vitals.ecg} unit="" color="red" />
          <VitalCard icon={Zap} label="EEG Alpha" value={vitals.eegAlpha} unit="µV" color="indigo" />
          <VitalCard icon={Waves} label="EEG Beta" value={vitals.eegBeta} unit="µV" color="violet" />
          <VitalCard icon={Brain} label="EEG Gamma" value={vitals.eegGamma} unit="µV" color="purple" />
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <Button variant="outline">
            <Power className="w-4 h-4 mr-2" /> End Session
          </Button>
          <Button className={`bg-gradient-to-r ${currentMode.gradient} text-white`}>
            Download Report
          </Button>
        </div>
      </main>
    </div>
  );
}
