import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import RoleSelect from "./pages/RoleSelect";
import PatientSignup from "./pages/PatientSignup";
import CaretakerSignup from "./pages/CaretakerSignup";
import ModeSelect from "./pages/ModeSelect";
import LiveMonitor from "./pages/LiveMonitor";

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
          <Route path="/mode-select" element={<ModeSelect />} />
          <Route path="/monitor/:mode" element={<LiveMonitor />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
