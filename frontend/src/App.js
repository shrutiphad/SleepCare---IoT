import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login            from "./pages/Login";
import RoleSelect       from "./pages/RoleSelect";
import PatientSignup    from "./pages/PatientSignup";
import CaretakerSignup  from "./pages/CaretakerSignup";
import ModeSelect       from "./pages/ModeSelect";
import NormalMonitor    from "./pages/Normal";
import HeartMonitor     from "./pages/Heart";
import BrainMonitor     from "./pages/Brain";
import BreathingMonitor from "./pages/Breathing";
import NormalHistory    from "./pages/NormalHistory";   // default export = NormalHistory
import HeartHistory     from "./pages/HeartHistory";
import BrainHistory     from "./pages/BrainHistory";
import BreathingHistory from "./pages/BreathingHistory";
import Chat             from "./pages/Chat";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Auth */}
          <Route path="/"                  element={<Navigate to="/login" replace />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/role-select"       element={<RoleSelect />} />
          <Route path="/signup/patient"    element={<PatientSignup />} />
          <Route path="/signup/caretaker"  element={<CaretakerSignup />} />

          {/* App */}
          <Route path="/mode-select"           element={<ModeSelect />} />
          <Route path="/monitor/normal"        element={<NormalMonitor />} />
          <Route path="/monitor/heart"         element={<HeartMonitor />} />
          <Route path="/monitor/brain"         element={<BrainMonitor />} />
          <Route path="/monitor/breathing"     element={<BreathingMonitor />} />

          {/* History */}
          <Route path="/history"               element={<NormalHistory />} />
          <Route path="/history/heart"         element={<HeartHistory />} />
          <Route path="/history/brain"         element={<BrainHistory />} />
          <Route path="/history/breathing"     element={<BreathingHistory />} />

          {/* AI Chat */}
          <Route path="/chat"                  element={<Chat />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;