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



import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
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
  Waves,
  Zap,
  AlertTriangle,
  Power,
  RefreshCw
} from "lucide-react";
import { mockPatient, mockVitalSigns, generateLiveData } from "../data/mock";

export const LiveMonitor = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const [vitals, setVitals] = useState(mockVitalSigns[mode] || mockVitalSigns.normal);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [alertActive, setAlertActive] = useState(false);
  const [ecgData, setEcgData] = useState([]);
  const [eegData, setEegData] = useState({ alpha: [], beta: [], gamma: [] });

  const modeConfig = {
    normal: {
      name: "Normal Mode",
      icon: Activity,
      gradient: "from-emerald-500 to-teal-500",
      color: "emerald"
    },
    heart: {
      name: "Heart Mode",
      icon: Heart,
      gradient: "from-rose-500 to-red-500",
      color: "rose"
    },
    brain: {
      name: "Brain Mode",
      icon: Brain,
      gradient: "from-indigo-500 to-violet-500",
      color: "violet"
    },
    breathing: {
      name: "Breathing Mode",
      icon: Wind,
      gradient: "from-sky-500 to-blue-500",
      color: "sky"
    }
  };

  const currentMode = modeConfig[mode] || modeConfig.normal;
  const IconComponent = currentMode.icon;

  // Generate ECG-like waveform data
  const generateEcgPoint = useCallback((index) => {
    const baseValue = 50;
    const t = index % 100;
    if (t >= 20 && t <= 22) return baseValue + 60; // R peak
    if (t >= 18 && t <= 19) return baseValue - 10; // Q wave
    if (t >= 23 && t <= 25) return baseValue - 15; // S wave
    if (t >= 40 && t <= 50) return baseValue + 8; // T wave
    return baseValue + (Math.random() - 0.5) * 4;
  }, []);

  // Generate EEG-like waveform data
  const generateEegPoint = useCallback((type, index) => {
    const frequencies = { alpha: 0.8, beta: 1.5, gamma: 2.5 };
    const amplitudes = { alpha: 15, beta: 8, gamma: 4 };
    return (
      Math.sin(index * frequencies[type]) * amplitudes[type] +
      (Math.random() - 0.5) * 3 +
      30
    );
  }, []);

  // Update vitals every second
  useEffect(() => {
    const interval = setInterval(() => {
      const baseVitals = mockVitalSigns[mode] || mockVitalSigns.normal;
      const newVitals = {};

      Object.keys(baseVitals).forEach((key) => {
        const variance = key.includes("eeg") || key.includes("ratio") ? 1 : 3;
        newVitals[key] = parseFloat(generateLiveData(baseVitals[key], variance).toFixed(1));
      });

      // Check for alerts
      if (newVitals.spo2 < 94 || newVitals.bpm > 100 || newVitals.bpm < 50) {
        setAlertActive(true);
      } else {
        setAlertActive(false);
      }

      setVitals(newVitals);
      setLastUpdate(new Date());

      // Update ECG data for heart mode
      if (mode === "heart") {
        setEcgData((prev) => {
          const newData = [...prev, generateEcgPoint(prev.length)];
          return newData.slice(-100);
        });
      }

      // Update EEG data for brain mode
      if (mode === "brain") {
        setEegData((prev) => ({
          alpha: [...prev.alpha, generateEegPoint("alpha", prev.alpha.length)].slice(-50),
          beta: [...prev.beta, generateEegPoint("beta", prev.beta.length)].slice(-50),
          gamma: [...prev.gamma, generateEegPoint("gamma", prev.gamma.length)].slice(-50)
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, generateEcgPoint, generateEegPoint]);

  const VitalCard = ({ icon: Icon, label, value, unit, color, isAlert }) => (
    <Card className={`border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm transition-all duration-300 ${
      isAlert ? "ring-2 ring-rose-400 animate-pulse" : ""
    }`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-${color}-50`}>
            <Icon className={`w-5 h-5 text-${color}-500`} />
          </div>
          {isAlert && <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />}
        </div>
        <p className="text-sm text-slate-500 mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-bold ${isAlert ? "text-rose-500" : "text-slate-800"}`}>
            {value}
          </span>
          <span className="text-sm text-slate-400">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );

  const WaveformChart = ({ data, color, label, height = 80 }) => {
    const maxValue = Math.max(...data, 100);
    const minValue = Math.min(...data, 0);
    const range = maxValue - minValue || 1;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((value - minValue) / range) * 100;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <div className="relative">
        <p className="text-sm text-slate-500 mb-2">{label}</p>
        <div className={`bg-slate-900 rounded-xl p-4`} style={{ height }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            {/* Grid lines */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" strokeDasharray="2" />
            <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.3" strokeDasharray="2" />
            <line x1="0" y1="75" x2="100" y2="75" stroke="#374151" strokeWidth="0.3" strokeDasharray="2" />
            {/* Waveform */}
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                points={points}
                className="drop-shadow-lg"
              />
            )}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/mode-select")}
                className="text-slate-500 hover:text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 bg-gradient-to-br ${currentMode.gradient} rounded-lg flex items-center justify-center`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-slate-800">{currentMode.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                isConnected
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                {isConnected ? "Live" : "Disconnected"}
              </span>
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Alert Banner */}
      {alertActive && (
        <div className="bg-rose-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Alert: Abnormal vital signs detected. Please check patient immediately.</span>
            </div>
            <Button variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white">
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Patient Header */}
        <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white text-xl font-bold">
                  {mockPatient.fullName.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{mockPatient.fullName}</h2>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <span>{mockPatient.age} years</span>
                    <span>•</span>
                    <span>{mockPatient.gender}</span>
                    <span>•</span>
                    <span>{mockPatient.id}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-slate-400">Last Updated</p>
                  <p className="text-sm font-medium text-slate-600">
                    {lastUpdate.toLocaleTimeString()}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="border-slate-200">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vitals Grid - Normal Mode */}
        {mode === "normal" && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <VitalCard
              icon={Droplets}
              label="SpO₂"
              value={vitals.spo2}
              unit="%"
              color="cyan"
              isAlert={vitals.spo2 < 94}
            />
            <VitalCard
              icon={Heart}
              label="Heart Rate"
              value={vitals.bpm}
              unit="BPM"
              color="rose"
              isAlert={vitals.bpm > 100 || vitals.bpm < 50}
            />
            <VitalCard
              icon={Gauge}
              label="Pressure"
              value={vitals.pressure}
              unit="mmHg"
              color="amber"
            />
            <VitalCard
              icon={Wind}
              label="Breathing"
              value={vitals.breathing}
              unit="/min"
              color="emerald"
            />
          </div>
        )}

        {/* Vitals Grid - Heart Mode */}
        {mode === "heart" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <VitalCard
                icon={Droplets}
                label="SpO₂"
                value={vitals.spo2}
                unit="%"
                color="cyan"
                isAlert={vitals.spo2 < 94}
              />
              <VitalCard
                icon={Heart}
                label="PPG Heart Rate"
                value={vitals.bpm}
                unit="BPM"
                color="rose"
                isAlert={vitals.bpm > 100 || vitals.bpm < 50}
              />
              <VitalCard
                icon={Activity}
                label="ECG BPM"
                value={vitals.ecgBpm}
                unit="BPM"
                color="red"
              />
              <VitalCard
                icon={Gauge}
                label="Pressure"
                value={vitals.pressure}
                unit="mmHg"
                color="amber"
              />
              <VitalCard
                icon={Wind}
                label="Breathing"
                value={vitals.breathing}
                unit="/min"
                color="emerald"
              />
            </div>
            {/* ECG Waveform */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  ECG Waveform
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WaveformChart data={ecgData} color="#f43f5e" label="Real-time ECG" height={120} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Vitals Grid - Brain Mode */}
        {mode === "brain" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <VitalCard
                icon={Droplets}
                label="SpO₂"
                value={vitals.spo2}
                unit="%"
                color="cyan"
                isAlert={vitals.spo2 < 94}
              />
              <VitalCard
                icon={Heart}
                label="Heart Rate"
                value={vitals.bpm}
                unit="BPM"
                color="rose"
              />
              <VitalCard
                icon={Gauge}
                label="Pressure"
                value={vitals.pressure}
                unit="mmHg"
                color="amber"
              />
              <VitalCard
                icon={Wind}
                label="Breathing"
                value={vitals.breathing}
                unit="/min"
                color="emerald"
              />
            </div>
            {/* EEG Values */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <VitalCard
                icon={Zap}
                label="EEG Alpha"
                value={vitals.eegAlpha}
                unit="µV"
                color="indigo"
              />
              <VitalCard
                icon={Waves}
                label="EEG Beta"
                value={vitals.eegBeta}
                unit="µV"
                color="violet"
              />
              <VitalCard
                icon={Activity}
                label="EEG Gamma"
                value={vitals.eegGamma}
                unit="µV"
                color="purple"
              />
              <VitalCard
                icon={Brain}
                label="Alpha/Beta Ratio"
                value={vitals.alphaBetaRatio}
                unit=""
                color="fuchsia"
              />
            </div>
            {/* EEG Waveforms */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-indigo-500" />
                  EEG Waveforms
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <WaveformChart data={eegData.alpha} color="#6366f1" label="Alpha Waves (8-13 Hz)" height={80} />
                <WaveformChart data={eegData.beta} color="#8b5cf6" label="Beta Waves (13-30 Hz)" height={80} />
                <WaveformChart data={eegData.gamma} color="#a855f7" label="Gamma Waves (30+ Hz)" height={80} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Vitals Grid - Breathing Mode */}
        {mode === "breathing" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <VitalCard
                icon={Droplets}
                label="SpO₂"
                value={vitals.spo2}
                unit="%"
                color="cyan"
                isAlert={vitals.spo2 < 94}
              />
              <VitalCard
                icon={Heart}
                label="Heart Rate"
                value={vitals.bpm}
                unit="BPM"
                color="rose"
              />
              <VitalCard
                icon={Gauge}
                label="Pressure"
                value={vitals.pressure}
                unit="mmHg"
                color="amber"
              />
              <div className="lg:col-span-1">
                <Card className="border-0 shadow-lg shadow-slate-200/50 bg-gradient-to-br from-sky-500 to-blue-600 text-white h-full">
                  <CardContent className="p-5 h-full flex flex-col justify-between">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
                        <Wind className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Enhanced</span>
                    </div>
                    <div>
                      <p className="text-sm text-white/80 mb-1">Breathing Rate</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">{vitals.breathing}</span>
                        <span className="text-sm text-white/80">/min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            {/* Breathing Pattern Info */}
            <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                  <Wind className="w-5 h-5 text-sky-500" />
                  Breathing Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-sky-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Pattern</p>
                    <p className="text-lg font-semibold text-slate-800">Regular</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Depth</p>
                    <p className="text-lg font-semibold text-slate-800">Normal</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Apnea Events</p>
                    <p className="text-lg font-semibold text-slate-800">0</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Quality</p>
                    <p className="text-lg font-semibold text-emerald-600">Good</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer Actions */}
        <div className="mt-6 flex justify-center gap-4">
          <Button variant="outline" className="border-slate-200">
            <Power className="w-4 h-4 mr-2" />
            End Session
          </Button>
          <Button className={`bg-gradient-to-r ${currentMode.gradient} text-white shadow-lg`}>
            Download Report
          </Button>
        </div>
      </main>
    </div>
  );
};

export default LiveMonitor;