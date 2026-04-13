export function roll(arr, key, w = 8) {
  return arr.map((d, i) => {
    const sl = arr.slice(Math.max(0, i - w), i + 1).map(x => x[key]).filter(n => n != null);
    return { ...d, [`${key}_s`]: sl.length ? +(sl.reduce((a,b)=>a+b,0)/sl.length).toFixed(1) : null };
  });
}

export function Counter({ val, color }) { /* same as in artifact */ }
export function SCard({ label, val, unit, color, i, numeric=true }) { /* same */ }
export function CCard({ title, sub, children }) { /* same */ }
export const Tip = ({ active, payload, label }) => { /* same */ };