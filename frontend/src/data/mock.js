// SleepCare Mock Data

export const mockPatient = {
  id: "PAT-2025-001",
  fullName: "Mariyah Shaikh",
  email: "mariyah@email.com",
  dob: "1990-05-15",
  age: 21,
  mobile: "+1 (555) 123-4567",
  gender: "Female",
  height: 165,
  weight: 62,
  bmi: 22.8,
  bloodGroup: "O+",
  conditions: ["Sleep Apnea", "Mild Hypertension"],
  caretaker: {
    name: "Aryan Shinde",
    relationship: "Spouse",
    phone: "+1 (555) 987-6543"
  }
};

export const mockCaretaker = {
  id: "CTK-2025-001",
  fullName: "Aryan Shinde",
  email: "aryan@email.com",
  mobile: "+1 (555) 987-6543",
  gender: "Male",
  dob: "1988-08-22",
  relationship: "Spouse",
  isPrimary: true,
  availability: "24/7",
  linkedPatientId: "PAT-2025-001"
};



export const mockMonitoringModes = [
  {
    id: "normal",
    name: "Normal Mode",
    description: "Basic vital signs monitoring for general health tracking",
    icon: "Activity",
    color: "emerald",
    sensors: ["SpO₂", "Heart Rate", "Pressure"]

  },
  {
    id: "heart",
    name: "Heart Mode",
    description: "Enhanced cardiac monitoring with ECG integration",
    icon: "Heart",
    color: "rose",
    sensors: ["SpO₂", "Heart Rate", "ECG BPM", "Pressure"]

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
