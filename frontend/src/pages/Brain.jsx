import { useEffect, useState } from "react";
import socket from "../services/socket";
import { useNavigate } from "react-router-dom";
import VitalCard from "../components/data-ui/VitalCard";
import { evaluate } from "../services/alertEngine";
import AlertToast from "../components/AlertToast";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { mockPatient } from "../data/mock";
import {
  Brain, ArrowLeft, Droplets, Gauge,
  Zap, Waves, AlertTriangle, Power, Heart,
} from "lucide-react";

export default function BrainMonitor() {
  const [toastAlerts, setToastAlerts] = useState([]);
  const navigate = useNavigate();

  const [vitals, setVitals] = useState({
    spo2: "--", bpm: "--", presence: "NO",
    alpha: "--", beta: "--", gamma: "--",
    rms: "--", sleepStage: "--", insight: "--", alert: "--",
  });

  const [connected, setConnected] = useState(socket.connected);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const handleConnect    = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleSensorUpdate = (data) => {
      // Fire alert engine
      const fired = evaluate(data);
      if (fired.length) setToastAlerts(fired);

      const a = data.alpha ?? 0;
      const b = data.beta  ?? 0;
      const g = data.gamma ?? 0;

      let stage = "--";
      if (a > 8 && b > g)          stage = "Awake";
      else if (a > b && a > g)     stage = "Relaxed / Drowsy";
      else if (a < 5 && b < 5)     stage = "Deep Sleep";
      else if (a > 0 || b > 0)     stage = "Light Sleep";

      const ratio = b > 0 ? a / b : 0;
      let insight = "--";
      if      (ratio > 1.5)  insight = "Deeply Relaxed";
      else if (ratio > 1.0)  insight = "Calm / Drowsy";
      else if (ratio < 0.5 && ratio > 0) insight = "Alert / Stressed";
      else if (ratio > 0)    insight = "Neutral";

      setVitals({
        spo2:       data.spo2       ?? "--",
        bpm:        data.heart_rate ?? "--",
        presence:   data.presence ? "YES" : "NO",
        alpha:      a               || "--",
        beta:       b               || "--",
        gamma:      g               || "--",
        rms:        data.rms        ?? "--",
        sleepStage: stage,
        insight:    insight,
        alert:      data.alert      ?? "--",
      });

      setLastUpdate(new Date());
    };

    socket.on("connect",       handleConnect);
    socket.on("disconnect",    handleDisconnect);
    socket.on("sensor-update", handleSensorUpdate);

    return () => {
      socket.off("connect",       handleConnect);
      socket.off("disconnect",    handleDisconnect);
      socket.off("sensor-update", handleSensorUpdate);
    };
  }, []);

  const currentMode = {
    name: "Brain Mode", icon: Brain,
    gradient: "from-indigo-500 to-violet-500",
  };
  const IconComponent = currentMode.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
      {/* AlertToast MUST be outside the header flow */}
      <AlertToast alerts={toastAlerts} />

      {/* HEADER */}
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

      {/* ALERT BANNER */}
      {vitals.alert !== "--" && vitals.alert !== "Normal" && vitals.alert !== "NORMAL" && (
        <div className="bg-rose-500 text-white py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <span>{vitals.alert}</span>
          </div>
        </div>
      )}

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* PATIENT CARD */}
        <Card className="mb-6 border-0 shadow-lg bg-white/80">
          <CardContent className="p-5 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
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

        {/* VITALS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalCard icon={Droplets}      label="SpO₂"          value={vitals.spo2}       unit="%" color="cyan" />
          <VitalCard icon={Heart}         label="Heart Rate"     value={vitals.bpm}        unit="BPM" color="rose" />
          <VitalCard icon={Gauge}         label="Presence"       value={vitals.presence}   unit="" color="amber" />
          <VitalCard icon={Zap}           label="EEG Alpha"      value={vitals.alpha}      unit="µV" color="indigo" />
          <VitalCard icon={Waves}         label="EEG Beta"       value={vitals.beta}       unit="µV" color="violet" />
          <VitalCard icon={Brain}         label="EEG Gamma"      value={vitals.gamma}      unit="µV" color="purple" />
          <VitalCard icon={Brain}         label="EEG Insight"    value={vitals.insight}    unit="" color="purple" />
          <VitalCard icon={AlertTriangle} label="Sleep Stage"    value={vitals.sleepStage} unit="" color="emerald" />
        </div>

        {/* ACTIONS */}
        <div className="mt-6 flex justify-center gap-4">
          <Button variant="outline">
            <Power className="w-4 h-4 mr-2" /> End Session
          </Button>
          <Button
            className={`bg-gradient-to-r ${currentMode.gradient} text-white`}
            onClick={() => navigate("/history/brain")}
          >
            View History
          </Button>
          <Button className={`bg-gradient-to-r ${currentMode.gradient} text-white`}>
            Download Report
          </Button>
        </div>
      </main>
    </div>
  );
}

// import { useEffect, useState, useRef } from "react";
// import socket from "../services/socket";
// import { useParams, useNavigate } from "react-router-dom";
// import VitalCard from "../components/data-ui/VitalCard"; 
// //alertsss
// import { evaluate } from "../services/alertEngine";
// import AlertToast from "../components/AlertToast";
// import { Card, CardContent } from "../components/ui/card";
// import { Button } from "../components/ui/button";
// import { mockPatient } from "../data/mock";
// import {
//   Activity,
//   Heart,
//   Brain,
//   Wind,
//   ArrowLeft,
//   Droplets,
//   Gauge,
//   Zap,
//   Waves,
//   AlertTriangle,
//   Power,
// } from "lucide-react";




// export default function BrainMonitor() {
//   const [toastAlerts, setToastAlerts] = useState([]);
//   const navigate = useNavigate();
//   const [vitals, setVitals] = useState({
//     spo2: "--", bpm: "--", presence: "NO",
//     alpha: "--", beta: "--", gamma: "--",
//     rms: "--", sleepStage: "--", alert: "--", 
//   });
//   const [connected, setConnected] = useState(socket.connected);
//   const [lastUpdate, setLastUpdate] = useState(new Date());

//   //MAIN LOGIC 
  
//   // socket.on("sensor-update", (data) => {

//   //   const fired = evaluate(data);
//   //   if (fired.length) setToastAlerts(fired);
    
//   //   const a = data.alpha || 0;
//   //   const b = data.beta  || 0;
//   //   const g = data.gamma || 0;

  
//   //   let stage = "--";
//   //   if (a > 0 || b > 0) {
//   //     if (b > a && b > g)           stage = "Awake";
//   //     else if (a > b && a > g)      stage = "Relaxed / Drowsy";
//   //     else if (a < 5 && b < 5)      stage = "Deep Sleep";
//   //     else                          stage = "Light Sleep";
//   //   }
//   // });


//   useEffect(() => {
//     const handleConnect = () => setConnected(true);
//     const handleDisconnect = () => setConnected(false);
  
//     const handleSensorUpdate = (data) => {
//       console.log(" Incoming:", data);
  
//       // Extract safely
//       const a = data.alpha;
//       const b = data.beta;
//       const g = data.gamma;
  
//       let stage = "--";
  
//       if (a > 8 && b > g) stage = "Awake";
//       else if (a > b && a > g) stage = "Relaxed / Drowsy";
//       else if (a < 5 && b < 5) stage = "Deep Sleep";
//       else stage = "Light Sleep";
  
//         const ratio = data.alpha / (data.beta || 1);
//       let eegInsight = "--";
//       if      (ratio > 1.5)  eegInsight = "Deeply Relaxed";
//       else if (ratio > 1.0)  eegInsight = "Calm / Drowsy";
//       else if (ratio < 0.5)  eegInsight = "Highly Alert / Stressed";
//             else eegInsight = "Neutral";
            
//       setVitals({
//         spo2: data.spo2 ?? "--",
//         bpm: data.heart_rate ?? "--",
//         presence: data.presence ? "YES" : "NO",
//         alpha: a ?? "--",
//         beta: b ?? "--",
//         gamma: g ?? "--",
//         rms: data.rms ?? "--",
//         sleepStage: stage,
//         insight: ratio ?? "--",
//         alert:     data.alert            || "--",
//       });
  
//       setLastUpdate(new Date());
//     };
  
//     socket.on("connect", handleConnect);
//     socket.on("disconnect", handleDisconnect);
//     socket.on("sensor-update", handleSensorUpdate);
  
//     return () => {
//       socket.off("connect", handleConnect);
//       socket.off("disconnect", handleDisconnect);
//       socket.off("sensor-update", handleSensorUpdate);
//     };
  
//   }, []);


//    const currentMode = {
//         name: "Brain Mode",
//         icon: Brain,
//         gradient: "from-indigo-500 to-violet-500",
//         shadow: "shadow-indigo-200",
//         border: "hover:border-indigo-300",
//         bg: "bg-indigo-50",
//         text: "text-indigo-600"
//       };
    
//   const IconComponent = currentMode.icon;
  
//   <AlertToast alerts={toastAlerts} />
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-50">
//         <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
//           <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
//             <div className="flex items-center gap-4">
//               <Button variant="ghost" size="sm" onClick={() => navigate("/mode-select")}>
//               <AlertToast alerts={toastAlerts} />
//                 <ArrowLeft className="w-4 h-4 mr-2" /> Back
//               </Button>
//               <div className="flex items-center gap-2">
//                 <div className={`w-8 h-8 bg-gradient-to-br ${currentMode.gradient} rounded-lg flex items-center justify-center`}>
//                   <IconComponent className="w-4 h-4 text-white" />
//                 </div>
//                 <span className="font-semibold">{currentMode.name}</span>
//               </div>
//             </div>
  
//             <span className={`px-3 py-1.5 rounded-full text-sm ${
//               connected ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
//             }`}>
//               {connected ? "🟢 Live" : "🔴 Disconnected"}
//             </span>
//           </div>
//         </header>
  
//         {/* {vitals.alert !== "--" && vitals.alert !== "Heart" && vitals.alert !== "Heart" && (
//           <div className="bg-rose-500 text-white py-3 px-4">
//             <div className="max-w-7xl mx-auto flex items-center gap-3">
//               <AlertTriangle className="w-5 h-5" />
//               <span>{vitals.alert}</span>
//             </div>
//           </div>
//         )} */}
  
//         <main className="max-w-7xl mx-auto px-4 py-6">

//           <Card className="mb-6 border-0 shadow-lg bg-white/80">
//             <CardContent className="p-5 flex justify-between items-center">
//               <div className="flex items-center gap-4">
//                 <div className="w-14 h-14 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-bold">
//                   {mockPatient.fullName.charAt(0)}
//                 </div>
//                 <div>
//                   <h2 className="font-semibold">{mockPatient.fullName}</h2>
//                   <p className="text-sm text-slate-500">
//                     {mockPatient.age} • {mockPatient.gender} • {mockPatient.id}
//                   </p>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <p className="text-xs text-slate-400">Last Updated</p>
//                 <p className="text-sm">{lastUpdate.toLocaleTimeString()}</p>
//               </div>
//             </CardContent>
//           </Card>
  
//           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
//             <VitalCard icon={Droplets}      label="SpO₂"                   value={vitals.spo2}      unit="%"    color="cyan"    />
//             <VitalCard icon={Heart}         label="Heart Rate"              value={vitals.bpm}       unit="BPM"  color="rose"    />
//             <VitalCard icon={Gauge}         label="Presence"                value={vitals.presence}  unit=""     color="amber"   />
//             <VitalCard icon={Zap}           label="EEG Alpha"               value={vitals.alpha}  unit="µV"   color="indigo"  />
//             <VitalCard icon={Waves}         label="EEG Beta"                value={vitals.beta}   unit="µV"   color="violet"  />
//             <VitalCard icon={Brain}     label="EEG Gamma"            value={vitals.gamma} unit="µV" color="purple" />
//             <VitalCard icon={Brain}         label="EEG Insight"               value={vitals.insight}  unit="µV"   color="purple"  />
//             <VitalCard icon={AlertTriangle} label="Alert / Status"          value={vitals.alert}     unit=""     color="emerald" />
//           </div>
  
//           <div className="mt-6 flex justify-center gap-4">
//             <Button variant="outline">
//               <Power className="w-4 h-4 mr-2" /> End Session
//             </Button>
//             <Button className={`bg-gradient-to-r ${currentMode.gradient} text-white`} onClick={() => navigate("/history/brain")}>View History</Button>
//             <Button className={`bg-gradient-to-r ${currentMode.gradient} text-white`}>
//               Download Report
//             </Button>
//           </div>
//         </main>
//       </div>
//     );
  
// }