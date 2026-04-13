const ALERT_COOLDOWN = 30000; 
const lastAlerts = {};

export function evaluate(data) {
  const alerts = [];
  const now = Date.now();

  const fire = (id, message, severity) => {
    if (!lastAlerts[id] || now - lastAlerts[id] > ALERT_COOLDOWN) {
      lastAlerts[id] = now;
      alerts.push({ id, message, severity });
    }
  };

  // SpO₂ alerts
  if (data.spo2 > 0 && data.spo2 < 90)
    fire("spo2_critical", `Critical: SpO₂ at ${data.spo2}% — immediate attention needed`, "critical");
  else if (data.spo2 > 0 && data.spo2 < 94)
    fire("spo2_low", `SpO₂ dropped to ${data.spo2}%`, "warning");

  // Heart rate alerts
  if (data.heart_rate > 0 && data.heart_rate < 50)
    fire("brady", `Bradycardia detected — HR ${data.heart_rate} BPM`, "critical");
  if (data.heart_rate > 110)
    fire("tachy", `Tachycardia detected — HR ${data.heart_rate} BPM`, "critical");

  // Presence alert
  if (!data.presence)
    fire("presence", "Patient has left the bed", "warning");

  // EEG alert (Brain Mode)
  if (data.rms > 400)
    fire("eeg_abnormal", `Abnormal EEG amplitude detected — RMS ${Math.round(data.rms)}`, "warning");

  // ECG classifier alert (Heart Mode)
  if (data.alert && data.alert.includes("ALERT"))
    fire("ecg_alert", data.alert, "critical");

  // Breathing alert
  if (data.breathing_status && data.breathing_status.toLowerCase().includes("apnea"))
    fire("apnea", "Possible apnea event detected — breathing irregular", "critical");

  return alerts;
}