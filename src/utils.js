import React from "react";

export function uid(){ return Math.random().toString(36).slice(2,10); }

// Local-time based ISO date (YYYY-MM-DD) to avoid UTC day shift
export function todayISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

export function useLocalStorageState(key, initial){
  const [state, setState] = React.useState(()=>{
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  React.useEffect(()=>{ try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

export function kgToLb(kg){ return kg*2.20462; }
export function cmToIn(cm){ return cm/2.54; }

export function fmtNumber(n){ return Number(n||0).toLocaleString(); }
export function cn(...a){ return a.filter(Boolean).join(" "); }

export function downloadText(filename, text){
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows, headers){
  const esc = (v) => {
    const s = (v ?? "").toString();
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const head = headers.map(esc).join(',');
  const body = rows.map(r => headers.map(h=>esc(r[h])).join(',')).join('\n');
  return head + '\n' + body;
}
