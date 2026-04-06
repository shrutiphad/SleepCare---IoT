import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import PatientSignup from "./pages/PatientSignup";
import CaretakerSignup from "./pages/CaretakerSignup";
import ModeSelect from "./pages/ModeSelect";
import NormalMonitor  from "./pages/Normal";
import HeartMonitor   from "./pages/Heart";
import BrainMonitor   from "./pages/Brain";
import BreathingMonitor from "./pages/Breathing";
import History from "./pages/History";
import Chat from "./pages/Chat";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/signup/patient" element={<PatientSignup />} />
          <Route path="/signup/caretaker" element={<CaretakerSignup />} />
          <Route path="/mode-select"        element={<ModeSelect />} />
          <Route path="/monitor/normal"     element={<NormalMonitor />} />
          <Route path="/monitor/heart"      element={<HeartMonitor />} />
          <Route path="/monitor/brain"      element={<BrainMonitor />} />
          <Route path="/monitor/breathing"  element={<BreathingMonitor />} />
          <Route path="/history"            element={<History />} />
          <Route path="/chat"               element={<Chat />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
