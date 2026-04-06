import React from "react";
import { Card, CardContent } from "../ui/card";

const colorMap = {
  cyan: "bg-cyan-50 text-cyan-500",
  rose: "bg-rose-50 text-rose-500",
  amber: "bg-amber-50 text-amber-500",
  emerald: "bg-emerald-50 text-emerald-500",
  red: "bg-red-50 text-red-500",
  indigo: "bg-indigo-50 text-indigo-500",
  violet: "bg-violet-50 text-violet-500",
  purple: "bg-purple-50 text-purple-500",
  sky: "bg-sky-50 text-sky-500",
};

export default function VitalCard({ icon: Icon, label, value, unit, color }) {
  return (
    <Card className="border-0 shadow-lg shadow-slate-200/50 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-5">
        
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>

        <p className="text-sm text-slate-500 mt-3">{label}</p>

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-800">
            {value ?? "--"}
          </span>
          <span className="text-sm text-slate-400">{unit}</span>
        </div>

      </CardContent>
    </Card>
  );
}