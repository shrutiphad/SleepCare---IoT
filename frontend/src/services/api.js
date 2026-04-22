const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

/** Generic fetch wrapper with error handling */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

//  History endpoints 

/** Fetch heart mode history
 * @param {number} hours - 1 | 4 | 8 | 24
 */
export const fetchHeartHistory = (hours = 8) =>
  apiFetch(`/history/heart?hours=${hours}`);

/** Fetch brain / EEG history */
export const fetchBrainHistory = (hours = 8) =>
  apiFetch(`/history/brain?hours=${hours}`);

/** Fetch breathing mode history */
export const fetchBreathingHistory = (hours = 8) =>
  apiFetch(`/history/breathing?hours=${hours}`);

// ── RAG Chat endpoint 

/** Send a question to the RAG assistant
 * @param {string} question
 */
export const askAssistant = (question) =>
  apiFetch("/query", {
    method: "POST",
    body: JSON.stringify({ question }),
  });

// ── Sensor data (ESP32 → backend; exposed here for testing) ──

/** Manually push a sensor reading (for integration testing)
 * @param {Object} data
 */
export const postSensorData = (data) =>
  apiFetch("/sensor-data", {
    method: "POST",
    body: JSON.stringify(data),
  });

// ── DB stats 

/** Fetch DB stats (total docs, per-mode breakdown) */
export const fetchDbStats = () => apiFetch("/db-stats");

export { API_URL };