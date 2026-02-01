// SleepCare Mock Data

export const mockPatient = {
  id: "PAT-2025-001",
  fullName: "Sarah Johnson",
  email: "sarah.johnson@email.com",
  dob: "1990-05-15",
  age: 35,
  mobile: "+1 (555) 123-4567",
  gender: "Female",
  height: 165,
  weight: 62,
  bmi: 22.8,
  bloodGroup: "O+",
  conditions: ["Sleep Apnea", "Mild Hypertension"],
  caretaker: {
    name: "Michael Johnson",
    relationship: "Spouse",
    phone: "+1 (555) 987-6543"
  }
};

export const mockCaretaker = {
  id: "CTK-2025-001",
  fullName: "Michael Johnson",
  email: "michael.johnson@email.com",
  mobile: "+1 (555) 987-6543",
  gender: "Male",
  dob: "1988-08-22",
  relationship: "Spouse",
  isPrimary: true,
  availability: "24/7",
  linkedPatientId: "PAT-2025-001"
};

export const mockVitalSigns = {
  normal: {
    spo2: 97,
    bpm: 72,
    pressure: 415,
    breathing: 16
  },
  heart: {
    spo2: 98,
    bpm: 74,
    ecgBpm: 76,
    pressure: 420,
    breathing: 15
  },
  brain: {
    spo2: 97,
    bpm: 68,
    pressure: 410,
    breathing: 14,
    eegAlpha: 12.4,
    eegBeta: 6.2,
    eegGamma: 2.8,
    alphaBetaRatio: 2.0
  },
  breathing: {
    spo2: 96,
    bpm: 70,
    pressure: 405,
    breathing: 18
  }
};

export const mockMonitoringModes = [
  {
    id: "normal",
    name: "Normal Mode",
    description: "Basic vital signs monitoring for general health tracking",
    icon: "Activity",
    color: "emerald",
<<<<<<< HEAD
    sensors: ["SpO₂", "Heart Rate", "Pressure", "Breathing"]
=======
    sensors: ["SpO₂", "Heart Rate", "Pressure"]
>>>>>>> db308ff (monitor display updates)
  },
  {
    id: "heart",
    name: "Heart Mode",
    description: "Enhanced cardiac monitoring with ECG integration",
    icon: "Heart",
    color: "rose",
<<<<<<< HEAD
    sensors: ["SpO₂", "Heart Rate", "ECG BPM", "Pressure", "Breathing"]
=======
    sensors: ["SpO₂", "Heart Rate", "ECG BPM", "Pressure"]
>>>>>>> db308ff (monitor display updates)
  },
  {
    id: "brain",
    name: "Brain Mode",
    description: "EEG-based neurological activity monitoring",
    icon: "Brain",
    color: "violet",
    sensors: ["SpO₂", "Heart Rate", "EEG Alpha", "EEG Beta", "EEG Gamma", "Alpha/Beta Ratio"]
  },
  {
    id: "breathing",
    name: "Breathing Mode",
    description: "High-sensitivity respiratory monitoring",
    icon: "Wind",
    color: "sky",
    sensors: ["SpO₂", "Heart Rate", "Pressure", "Breathing (Enhanced)"]
  }
];

export const mockEcgData = Array.from({ length: 100 }, (_, i) => ({
  time: i,
  value: Math.sin(i * 0.3) * 30 + Math.random() * 10 + (i % 20 === 0 ? 60 : 0)
}));

export const mockEegData = {
  alpha: Array.from({ length: 50 }, (_, i) => ({
    time: i,
    value: Math.sin(i * 0.2) * 15 + Math.random() * 5 + 10
  })),
  beta: Array.from({ length: 50 }, (_, i) => ({
    time: i,
    value: Math.sin(i * 0.4) * 8 + Math.random() * 3 + 5
  })),
  gamma: Array.from({ length: 50 }, (_, i) => ({
    time: i,
    value: Math.sin(i * 0.6) * 4 + Math.random() * 2 + 2
  }))
};

export const generateLiveData = (baseValue, variance = 5) => {
  return baseValue + (Math.random() - 0.5) * variance;
};

export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const healthConditions = [
  "Sleep Apnea",
  "Insomnia",
  "Hypertension",
  "Diabetes",
  "Heart Disease",
  "Asthma",
  "COPD",
  "Epilepsy",
  "None"
];

export const relationships = [
  "Spouse",
  "Parent",
  "Child",
  "Sibling",
  "Guardian",
  "Nurse",
  "Other"
];
