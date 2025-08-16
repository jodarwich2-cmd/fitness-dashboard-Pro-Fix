import React from "react";
import { cn } from "./utils.js";

export function Header({ current, onNavigate, children }){
  const tabs = [
    { id: "home", label: "Overview" },
    { id: "gym", label: "Gym" },
    { id: "nutrition", label: "Nutrition" },
    { id: "body", label: "Body Comp" },
    { id: "settings", label: "Settings" },
  ];
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-semibold">Fitness Tracker Pro</h1>
        <div className="flex items-center gap-2">{children}</div>
      </div>
      <div className="mt-4 flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={()=>onNavigate(t.id)}
            className={cn("px-3 py-2 rounded-xl border text-sm",
              current===t.id ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50")}>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Card({ title, children, actions, borderColor }){
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-4 md:p-6" style={borderColor?{borderColor, borderWidth:1}:{}}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      {children}
    </div>
  );
}

export function Button({ children, onClick, variant="default", type="button" }){
  const cls = variant==="outline" ? "border bg-white hover:bg-gray-50"
    : variant==="ghost" ? "hover:bg-gray-100 border-transparent"
    : "bg-black text-white hover:bg-gray-800 border-black";
  return <button type={type} onClick={onClick} className={`rounded-xl px-3 py-2 text-sm transition border ${cls}`}>{children}</button>;
}

export function Input(props){ return <input {...props} className={`rounded-xl border px-3 py-2 text-sm w-full ${props.className||""}`} />; }
export function NumberInput(props){ return <input type="number" step="any" {...props} className={`rounded-xl border px-3 py-2 text-sm w-full ${props.className||""}`} />; }
export function Select({ options, value, onChange, className }){
  return <select value={value} onChange={e=>onChange(e.target.value)} className={`rounded-xl border px-3 py-2 text-sm ${className||""}`}>{options.map(o=>(<option key={o.value} value={o.value}>{o.label}</option>))}</select>;
}
