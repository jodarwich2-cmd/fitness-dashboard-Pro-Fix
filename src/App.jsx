import React from "react";
import { Header, Card, Button, Input, NumberInput, Select } from "./components.jsx";
import { YearCalendar, MonthCalendar } from "./calendar.jsx";
import { uid, useLocalStorageState, todayISO, toCSV, downloadText } from "./utils.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

function cn(...a){ return a.filter(Boolean).join(" "); }
const COLORS = { gym: "#C29B2C", nutrition: "#16a34a", body: "#2563eb" };
const GREEN700 = "#15803d"; // tailwind green-700

// Tag palette
const TAGS = [
  { key: "legs", label: "Legs", color: "#9333ea" },
  { key: "biceps", label: "Biceps", color: "#14b8a6" },
  { key: "triceps", label: "Triceps", color: "#f97316" },
  { key: "chest", label: "Chest", color: "#ef4444" },
  { key: "back", label: "Back", color: "#0ea5e9" },
  { key: "shoulders", label: "Shoulders", color: "#f59e0b" },
  { key: "core", label: "Core", color: "#22c55e" },
];
const TAG_COLOR = Object.fromEntries(TAGS.map(t=>[t.key, t.color]));
const TAG_LABEL = Object.fromEntries(TAGS.map(t=>[t.key, t.label]));

// Plan window for progress bar
const PLAN_START = new Date(2025, 6, 1); // July=6
const PLAN_END = new Date(2026, 9, 8);   // Oct=9

export default function App(){
  const [view, setView] = React.useState("home");
  const [unit, setUnit] = useLocalStorageState("unitPref", "metric");
  const [goals, setGoals] = useLocalStorageState("goals", { calories: 2200, protein: 180, weight: 80 });

  // Data (keys unchanged)
  const [exerciseDB, setExerciseDB] = useLocalStorageState("exDB", [
    { id: uid(), name: "Bench Press", tags: ["chest"] },
    { id: uid(), name: "Squat", tags: ["legs"] },
    { id: uid(), name: "Lat Pulldown", tags: ["back"] }
  ]);
  const [foodDB, setFoodDB] = useLocalStorageState("foodDB", [
    { id: uid(), name: "Chicken breast 100g", calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    { id: uid(), name: "Egg 1x", calories: 78, protein: 6, carbs: 0.6, fat: 5 }
  ]);
  const [gymLog, setGymLog] = useLocalStorageState("gymLog", []);
  const [nutritionLog, setNutritionLog] = useLocalStorageState("nutritionLog", []);
  const [bodyLog, setBodyLog] = useLocalStorageState("bodyLog", []);

  const normalizedExerciseDB = React.useMemo(()=>exerciseDB.map(e=>({ ...e, tags: Array.isArray(e.tags) ? e.tags : [] })), [exerciseDB]);

  const topWeight = React.useMemo(()=>{
    const map = {}; for(const r of gymLog){ map[r.exerciseId] = Math.max(map[r.exerciseId]||0, Number(r.weight)||0); } return map;
  }, [gymLog]);

  const byDate = React.useMemo(()=>{
    const map = {};
    for(const r of gymLog){ const d=r.date; if(!map[d]) map[d]={date:d,gym:[],calories:0,protein:0,body:null}; map[d].gym.push(r); }
    for(const r of nutritionLog){ const d=r.date; if(!map[d]) map[d]={date:d,gym:[],calories:0,protein:0,body:null}; map[d].calories += Number(r.calories)||0; map[d].protein += Number(r.protein)||0; }
    for(const r of bodyLog){ const d=r.date; if(!map[d]) map[d]={date:d,gym:[],calories:0,protein:0,body:null}; map[d].body = r; }
    return map;
  }, [gymLog, nutritionLog, bodyLog]);

  const hasDataDates = React.useMemo(()=> new Set(Object.keys(byDate)), [byDate]);

  // Charts
  const gymVolumeByDate = React.useMemo(()=>{
    const temp={}; for(const r of gymLog){ const k=r.date; const vol=(Number(r.sets)||0)*(Number(r.reps)||0)*(Number(r.weight)||0); temp[k]=(temp[k]||0)+vol; }
    return Object.entries(temp).map(([date,volume])=>({date, volume})).sort((a,b)=>a.date.localeCompare(b.date));
  }, [gymLog]);
  const gymMaxWeightByDate = React.useMemo(()=>{
    const temp={}; for(const r of gymLog){ const k=r.date; temp[k] = Math.max(temp[k]||0, Number(r.weight)||0); }
    return Object.entries(temp).map(([date,maxWeight])=>({date, maxWeight})).sort((a,b)=>a.date.localeCompare(b.date));
  }, [gymLog]);
  const [gymOverviewMetric, setGymOverviewMetric] = React.useState("max");
  const nutriByDate = React.useMemo(()=>{
    const temp={}; for(const r of nutritionLog){ const k=r.date; if(!temp[k]) temp[k]={calories:0,protein:0}; temp[k].calories+=Number(r.calories)||0; temp[k].protein+=Number(r.protein)||0; }
    return Object.entries(temp).map(([date,v])=>({date, ...v})).sort((a,b)=>a.date.localeCompare(b.date));
  }, [nutritionLog]);
  const bodyByDate = React.useMemo(()=>[...bodyLog].sort((a,b)=>a.date.localeCompare(b.date)), [bodyLog]);
  const insights = React.useMemo(()=>{
    const map={};
    for(const r of gymVolumeByDate) map[r.date]={date:r.date,gymVolume:r.volume,calories:0,weight:null};
    for(const r of nutriByDate){ if(!map[r.date]) map[r.date]={date:r.date,gymVolume:0,calories:0,weight:null}; map[r.date].calories=r.calories; }
    for(const r of bodyByDate){ if(!map[r.date]) map[r.date]={date:r.date,gymVolume:0,calories:0,weight:null}; map[r.date].weight=r.weight; }
    return Object.values(map).sort((a,b)=>a.date.localeCompare(b.date));
  }, [gymVolumeByDate, nutriByDate, bodyByDate]);

  const today = todayISO();
  const todayCal = byDate[today]?.calories || 0;
  const todayProt = byDate[today]?.protein || 0;
  const todayVol = (gymVolumeByDate.find(x=>x.date===today)?.volume) || 0;
  const latestWeight = bodyByDate.length ? bodyByDate[bodyByDate.length-1].weight : null;

  // Plan progress
  const plan = React.useMemo(()=>{
    const start = PLAN_START;
    const end = PLAN_END;
    const uniq = new Set();
    for(const r of gymLog){
      const [yy,mm,dd] = (r.date||"").split("-").map(Number);
      if(yy && mm && dd){
        const d = new Date(yy, mm-1, dd);
        if(d >= start && d <= end){ uniq.add(r.date); }
      }
    }
    const weeks = Math.ceil(((end - start) / (24*60*60*1000) + 1)/7);
    const target = weeks * 3;
    const actual = uniq.size;
    const pct = target>0 ? (actual/target)*100 : 0;
    return { target, actual, pct };
  }, [gymLog]);

  const [calView, setCalView] = React.useState({ mode:"year", year:new Date().getFullYear(), month:new Date().getMonth(), selectedDay:null });

  function backupJSON(){
    const payload = { unit, goals, exerciseDB: normalizedExerciseDB, foodDB, gymLog, nutritionLog, bodyLog };
    downloadText(`fitness-backup-${today}.json`, JSON.stringify(payload, null, 2));
  }
  function restoreJSON(e){
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const d=JSON.parse(reader.result); if(d.exerciseDB) setExerciseDB(d.exerciseDB); if(d.foodDB) setFoodDB(d.foodDB); if(d.gymLog) setGymLog(d.gymLog); if(d.nutritionLog) setNutritionLog(d.nutritionLog); if(d.bodyLog) setBodyLog(d.bodyLog); if(d.unit) setUnit(d.unit); if(d.goals) setGoals(d.goals); alert("Backup restored."); } catch { alert("Invalid backup file."); } };
    reader.readAsText(file); e.target.value="";
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <Header current={view} onNavigate={(v)=>{
        // When leaving Gym and coming back, the gym form's date resets (handled inside GymSection mount).
        setView(v);
      }}>
        <Button variant="outline" onClick={backupJSON}>Backup JSON</Button>
        <label className="px-3 py-2 text-sm rounded-xl border cursor-pointer bg-white hover:bg-gray-50">
          Restore JSON
          <input type="file" accept="application/json" onChange={restoreJSON} className="hidden" />
        </label>
      </Header>

      {view==="home" && (<>
        <Card title="Days untill 30">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <div>3 days/week · Jul 1, 2025 → Oct 8, 2026</div>
            <div>{plan.actual} / {plan.target} ({Math.round(plan.pct)}%)</div>
          </div>
          <div className="w-full h-6 rounded-xl bg-gray-200 overflow-hidden border">
            <div className="h-6" style={{ width: Math.min(100, plan.pct) + "%", background: GREEN700 }} />
            {plan.pct>100 && (
              <div className="h-6 -mt-6 opacity-80" style={{ width: "100%", background: "repeating-linear-gradient(45deg, rgba(21,128,61,0.2), rgba(21,128,61,0.2) 8px, rgba(21,128,61,0.35) 8px, rgba(21,128,61,0.35) 16px)" }} />
            )}
          </div>
        </Card>

        <Card title="Calendar">
          <div className="space-y-4">
            {calView.mode==="year" && <YearCalendar year={calView.year} hasDataDates={hasDataDates} onSelectMonth={(m)=>setCalView({...calView, mode:"month", month:m})} />}
            {calView.mode==="month" && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <MonthCalendar year={calView.year} month={calView.month} hasDataDates={hasDataDates} onSelectDay={(d)=>setCalView({...calView, selectedDay:d})} />
                </div>
                <div>
                  <Card title={"Day details" + (calView.selectedDay? " · " + calView.selectedDay : "")}>
                    {calView.selectedDay ? <DayDetails date={calView.selectedDay} dayData={byDate[calView.selectedDay]} exerciseDB={normalizedExerciseDB} foodDB={foodDB} /> : <div className="text-sm text-gray-500">Select a day to see entries.</div>}
                  </Card>
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-6">
          <Card title="Gym Progress" borderColor={COLORS.gym} actions={
            <div className="flex items-center gap-2">
              <Select value={gymOverviewMetric} onChange={setGymOverviewMetric} options={[{ value: "max", label: "Max Weight" },{ value: "volume", label: "Volume" }]} />
              <Button variant="outline" onClick={()=>setView("gym")}>Open</Button>
            </div>
          }>
            <div className="h-64 cursor-pointer" onClick={()=>setView("gym")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gymOverviewMetric==="max" ? gymMaxWeightByDate : gymVolumeByDate}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                  {gymOverviewMetric==="max"
                    ? <Line type="monotone" dataKey="maxWeight" stroke={COLORS.gym} name="Max Weight (any exercise)" />
                    : <Line type="monotone" dataKey="volume" stroke={COLORS.gym} name="Volume" />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Nutrition" borderColor={COLORS.nutrition} actions={<Button variant="outline" onClick={()=>setView("nutrition")}>Open</Button>}>
            <div className="h-64 cursor-pointer" onClick={()=>setView("nutrition")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={nutriByDate}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="calories" stroke={COLORS.nutrition} name="Calories" />
                  <Line type="monotone" dataKey="protein" stroke={"#065f46"} name="Protein" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Body Composition" borderColor={COLORS.body} actions={<Button variant="outline" onClick={()=>setView("body")}>Open</Button>}>
            <div className="h-64 cursor-pointer" onClick={()=>setView("body")}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bodyByDate}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                  <Line type="monotone" dataKey="weight" stroke={COLORS.body} name="Weight" />
                  <Line type="monotone" dataKey="fat" stroke={"#1e3a8a"} name="Fat %" />
                  <Line type="monotone" dataKey="muscle" stroke={"#60a5fa"} name="Muscle %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </>)}

      {view==="gym" && <GymSection key="gym" {...{exerciseDB: normalizedExerciseDB,setExerciseDB,gymLog,setGymLog,topWeight}} onBack={()=>setView('home')} />}
      {view==="nutrition" && <NutritionSection {...{foodDB,setFoodDB,nutritionLog,setNutritionLog}} onBack={()=>setView('home')} />}
      {view==="body" && <BodySection {...{bodyLog,setBodyLog,unit}} onBack={()=>setView('home')} />}
      {view==="settings" && <SettingsSection {...{unit,setUnit,goals,setGoals}} />}
    </div>
  );
}

function SummaryStat({ label, value, goal, color }){
  const pct = goal ? Math.min(100, Math.round((Number(value||0)/goal)*100)) : null;
  return (
    <div className="rounded-2xl p-4 bg-white shadow-sm border">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{Number(value||0).toLocaleString()}</div>
      {goal ? (
        <div className="mt-2">
          <div className="h-2 bg-gray-200 rounded"><div className="h-2 rounded" style={{ width: pct + "%", backgroundColor: color }}></div></div>
          <div className="text-xs text-gray-400 mt-1">Goal: {goal.toLocaleString()} ({pct}%)</div>
        </div>
      ) : null}
    </div>
  );
}

function TagChip({ tag }){
  if(!tag) return null;
  const color = TAG_COLOR[tag] || "#64748b";
  const label = TAG_LABEL[tag] || tag;
  return <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: color, color: "white" }}>{label}</span>;
}

function TagPicker({ current=[], onToggle, onClose }){
  const ref = React.useRef(null);
  React.useEffect(()=>{
    function onDoc(e){
      if(ref.current && !ref.current.contains(e.target)){ onClose && onClose(); }
    }
    document.addEventListener("mousedown", onDoc);
    return ()=>document.removeEventListener("mousedown", onDoc);
  }, [onClose]);
  return (
    <div ref={ref} className="absolute z-50 mt-2 right-0 w-64 rounded-xl border bg-white shadow-lg p-2">
      <div className="text-xs text-gray-500 px-1 mb-2">Pick tags</div>
      <div className="flex flex-wrap gap-2">
        {TAGS.map(t=>{
          const selected = current.includes(t.key);
          return (
            <button key={t.key}
              onClick={()=>onToggle && onToggle(t.key)}
              className={cn("px-2 py-1 rounded-full text-xs border",
                selected ? "" : "text-gray-600 bg-white hover:bg-gray-50")}
              style={ selected ? { background:t.color, color:"white", borderColor:t.color } : {} }>
              {selected ? "✓ " : ""}{t.label}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end mt-3">
        <button onClick={onClose} className="text-xs px-2 py-1 rounded border hover:bg-gray-50">Done</button>
      </div>
    </div>
  );
}

function DayDetails({ date, dayData, exerciseDB, foodDB }){
  if(!dayData) return <div className="text-sm text-gray-500">No data for this day.</div>;
  const exName = (id)=> exerciseDB.find(e=>e.id===id)?.name || "-";
  return (
    <div className="space-y-3 text-sm">
      <div><span className="font-semibold">Calories:</span> {dayData.calories} · <span className="font-semibold">Protein:</span> {dayData.protein} g</div>
      {dayData.body && (<div><span className="font-semibold">Weight:</span> {dayData.body.weight} kg · Fat: {dayData.body.fat}% · Muscle: {dayData.body.muscle}%</div>)}
      <div>
        <div className="font-semibold mb-1">Gym exercises:</div>
        <ul className="list-disc pl-5">{dayData.gym.map(g=>(<li key={g.id}>{exName(g.exerciseId)} — {g.sets}×{g.reps} @ {g.weight}kg {g.notes? " · " + g.notes : ""}</li>))}</ul>
      </div>
    </div>
  );
}

function GymSection({ exerciseDB, setExerciseDB, gymLog, setGymLog, topWeight, onBack }){
  const exById = React.useMemo(()=>Object.fromEntries(exerciseDB.map(e=>[e.id,e])), [exerciseDB]);

  // --- Add workout form state (controlled) ---
  const [dateValue, setDateValue] = React.useState(todayISO()); // resets to today on mount (entering Gym)
  const [exerciseId, setExerciseId] = React.useState(exerciseDB[0]?.id || "");
  const [sets, setSets] = React.useState("");
  const [reps, setReps] = React.useState("");
  const [weight, setWeight] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState("");

  // Collapsible states
  const [collapsedDays, setCollapsedDays] = React.useState({});
  const [collapsedExercises, setCollapsedExercises] = React.useState({});
  const [openTagEditor, setOpenTagEditor] = React.useState(null); // exerciseId for popover

  const isDayCollapsed = (date) => collapsedDays[date] !== false;
  const toggleDay = (date) => setCollapsedDays(prev => ({ ...prev, [date]: !isDayCollapsed(date) }));
  const exKey = (date,eid) => `${date}|${eid}`;
  const isExerciseCollapsed = (date,eid) => collapsedExercises[exKey(date,eid)] !== false;
  const toggleExercise = (date,eid) => setCollapsedExercises(prev => {
    const key = exKey(date,eid);
    return { ...prev, [key]: !(prev[key] !== false) };
  });

  // Exercise choices filtered by tag
  const exerciseChoices = React.useMemo(()=>{
    const list = tagFilter
      ? exerciseDB.filter(e => Array.isArray(e.tags) && e.tags.includes(tagFilter))
      : exerciseDB;
    return list;
  }, [exerciseDB, tagFilter]);

  React.useEffect(()=>{
    if(!exerciseChoices.find(e=>e.id===exerciseId)){
      setExerciseId(exerciseChoices[0]?.id || "");
    }
  }, [tagFilter, exerciseDB]); // eslint-disable-line

  function handleExport(){
    const rows = gymLog.map(r=>({date:r.date, exercise:exById[r.exerciseId]?.name || "-", sets:r.sets, reps:r.reps, weight:r.weight, notes:r.notes||""}));
    const csv = toCSV(rows, ["date","exercise","sets","reps","weight","notes"]);
    downloadText("gym-log.csv", csv);
  }

  function submitWorkout(e){
    e.preventDefault();
    if(!dateValue || !exerciseId) return;
    const rec = { id: uid(), date: dateValue, exerciseId, sets: Number(sets)||0, reps: Number(reps)||0, weight: Number(weight)||0, notes: notes||"" };
    setGymLog(p=>[rec, ...p]);
    // Reset input fields EXCEPT date and selected exercise
    setSets(""); setReps(""); setWeight(""); setNotes("");
  }

  function toggleExerciseTag(exId, tagKey){
    setExerciseDB(prev => prev.map(ex => {
      if(ex.id !== exId) return ex;
      const current = Array.isArray(ex.tags) ? ex.tags : [];
      const exists = current.includes(tagKey);
      return { ...ex, tags: exists ? current.filter(t=>t!==tagKey) : [...current, tagKey] };
    }));
  }

  const groupedByDate = React.useMemo(()=>{
    const map = {}; for(const r of gymLog){ const d=r.date; if(!map[d]) map[d]=[]; map[d].push(r); }
    return Object.entries(map).map(([date, list])=>({ date, list })).sort((a,b)=>b.date.localeCompare(a.date));
  }, [gymLog]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card title="Add workout entry" borderColor="#C29B2C" actions={<Button variant="outline" onClick={onBack}>Back</Button>}>
          <form className="grid grid-cols-2 gap-3" onSubmit={submitWorkout}>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-gray-500">Date</label>
              <Input type="date" name="date" required value={dateValue} onChange={e=>setDateValue(e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-gray-500">Filter by tag</label>
              <select className="rounded-xl border px-3 py-2 text-sm w-full" value={tagFilter} onChange={e=>setTagFilter(e.target.value)}>
                <option value="">All</option>
                {TAGS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-gray-500">Exercise</label>
              <select name="exerciseId" className="rounded-xl border px-3 py-2 text-sm w-full" required value={exerciseId} onChange={e=>setExerciseId(e.target.value)}>
                {exerciseChoices.map(e=>(
                  <option key={e.id} value={e.id}>
                    {e.name}{Array.isArray(e.tags)&&e.tags.length? " · " + e.tags.map(t=>TAG_LABEL[t]||t).join(", ") : ""}
                  </option>
                ))}
              </select>
            </div>
            <div><label className="text-xs text-gray-500">Sets</label><NumberInput name="sets" min="0" value={sets} onChange={e=>setSets(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Reps</label><NumberInput name="reps" min="0" value={reps} onChange={e=>setReps(e.target.value)} /></div>
            <div><label className="text-xs text-gray-500">Weight (kg)</label><NumberInput name="weight" min="0" value={weight} onChange={e=>setWeight(e.target.value)} /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500">Notes</label><Input name="notes" value={notes} onChange={e=>setNotes(e.target.value)} /></div>
            <div className="col-span-2"><Button type="submit">Add</Button></div>
          </form>
        </Card>

        <Card title="Workout by day (collapsible)" borderColor="#C29B2C" actions={<Button variant="outline" onClick={handleExport}>Export CSV</Button>}>
          <div className="space-y-4">
            {groupedByDate.map(g => {
              const byExercise = {};
              for(const r of g.list){
                const key = r.exerciseId;
                if(!byExercise[key]) byExercise[key] = [];
                byExercise[key].push(r);
              }
              const groups = Object.entries(byExercise).map(([eid, items]) => ({ eid, items, ex: exById[eid] })).sort((a,b)=>{
                const an=(a.ex?.name||"").toLowerCase(), bn=(b.ex?.name||"").toLowerCase(); return an.localeCompare(bn);
              });

              const collapsed = isDayCollapsed(g.date);
              const totalExercises = groups.length;
              const totalSets = groups.reduce((sum, grp) => sum + grp.items.reduce((a,b)=>a+(Number(b.sets)||0),0), 0);

              return (
                <div key={g.date} className="rounded-xl border">
                  <div className="flex items-center justify-between px-3 py-2">
                    <div className="font-semibold">{g.date}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{totalExercises} exercises</span>
                      <span>· {totalSets} sets</span>
                      <button
                        onClick={()=>toggleDay(g.date)}
                        className="h-7 w-7 rounded-full border hover:bg-gray-50 text-gray-600"
                        aria-expanded={!collapsed}
                        aria-label={collapsed ? "Expand day" : "Collapse day"}
                      >{collapsed ? "▸" : "▾"}</button>
                    </div>
                  </div>

                  {!collapsed && (
                    <div className="p-3 space-y-3 border-t">
                      {groups.map(grp => {
                        const eCollapsed = isExerciseCollapsed(g.date, grp.eid);
                        const best = Math.max(0, ...grp.items.map(r=>Number(r.weight)||0));
                        const setCount = grp.items.reduce((a,b)=>a+(Number(b.sets)||0),0);
                        const exTags = Array.isArray(grp.ex?.tags) ? grp.ex.tags : [];
                        const hasTags = exTags.length>0;
                        return (
                          <div key={grp.eid} className="rounded-lg border relative">
                            <div className="flex items-center justify-between px-3 py-2 bg-yellow-50">
                              <div className="flex items-center gap-2">
                                <div className="font-medium">{grp.ex?.name || "-"}</div>
                                <div className="flex gap-1">
                                  {hasTags ? exTags.map(t => <TagChip key={t} tag={t} />)
                                    : <button
                                        className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                                        onClick={()=>setOpenTagEditor(grp.eid)}
                                      >assign</button>}
                                </div>
                                {hasTags && (
                                  <button className="text-xs text-gray-500 underline decoration-dotted ml-1"
                                    onClick={()=>setOpenTagEditor(grp.eid)}>
                                    edit
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-600">
                                <span>{setCount} sets</span>
                                <span>· PR {best} kg</span>
                                <button
                                  onClick={()=>toggleExercise(g.date, grp.eid)}
                                  className="h-7 w-7 rounded-full border hover:bg-gray-100"
                                  aria-expanded={!eCollapsed}
                                  aria-label={eCollapsed ? "Expand exercise" : "Collapse exercise"}
                                >{eCollapsed ? "▸" : "▾"}</button>
                              </div>
                            </div>

                            {openTagEditor===grp.eid && (
                              <div className="absolute right-2 top-10">
                                <TagPicker current={exTags} onToggle={(tag)=>toggleExerciseTag(grp.eid, tag)} onClose={()=>setOpenTagEditor(null)} />
                              </div>
                            )}

                            {!eCollapsed && (
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                  <thead><tr className="text-left text-gray-500">
                                    <th className="py-2 pr-2">Sets</th><th className="py-2 pr-2">Reps</th><th className="py-2 pr-2">Weight</th><th className="py-2 pr-2">Notes</th><th className="py-2 pr-2">PR</th><th className="py-2 pr-2">Actions</th>
                                  </tr></thead>
                                  <tbody>
                                    {grp.items.map(r => (
                                      <tr key={r.id} className="border-t">
                                        <td className="py-2 pr-2">{r.sets}</td>
                                        <td className="py-2 pr-2">{r.reps}</td>
                                        <td className="py-2 pr-2">{r.weight}</td>
                                        <td className="py-2 pr-2">{r.notes}</td>
                                        <td className="py-2 pr-2">{(topWeight[r.exerciseId]||0)===r.weight ? <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">PR</span> : ""}</td>
                                        <td className="py-2 pr-2"><Button variant="outline" onClick={()=>setGymLog(p=>p.filter(x=>x.id!==r.id))}>Delete</Button></td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {groups.length===0 && <div className="text-sm text-gray-500">No exercises</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div>
        <Card title="Exercise database" borderColor="#C29B2C">
          <ExerciseDBPanel exerciseDB={exerciseDB} setExerciseDB={setExerciseDB} />
        </Card>
      </div>
    </div>
  );
}

function ExerciseDBPanel({ exerciseDB, setExerciseDB }){
  const [exerciseName, setExerciseName] = React.useState("");
  const [exerciseDBFilter, setExerciseDBFilter] = React.useState("");
  const [openTagEditor, setOpenTagEditor] = React.useState(null);

  const filteredExerciseDB = React.useMemo(()=>{
    const q = exerciseDBFilter.toLowerCase();
    return exerciseDB.filter(ex => (ex.name||"").toLowerCase().includes(q));
  }, [exerciseDB, exerciseDBFilter]);

  function toggleExerciseTag(exId, tagKey){
    setExerciseDB(prev => prev.map(ex => {
      if(ex.id !== exId) return ex;
      const current = Array.isArray(ex.tags) ? ex.tags : [];
      const exists = current.includes(tagKey);
      return { ...ex, tags: exists ? current.filter(t=>t!==tagKey) : [...current, tagKey] };
    }));
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <Input placeholder="Exercise name" value={exerciseName} onChange={e=>setExerciseName(e.target.value)} />
        <Button onClick={()=>{ if(!exerciseName) return; setExerciseDB(p=>[{id:uid(), name:exerciseName, tags:[]}, ...p]); setExerciseName(""); }}>Add</Button>
      </div>
      <div className="mb-2"><Input placeholder="Search exercises..." value={exerciseDBFilter} onChange={e=>setExerciseDBFilter(e.target.value)} /></div>
      <ul className="space-y-2">
        {filteredExerciseDB.map(ex=>(
          <li key={ex.id} className="rounded-xl border px-3 py-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium">{ex.name}</span>
                <div className="flex gap-1">
                  {(Array.isArray(ex.tags) && ex.tags.length>0)
                    ? ex.tags.map(t => <TagChip key={t} tag={t} />)
                    : <button className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                        onClick={()=>setOpenTagEditor(ex.id)}>assign</button>}
                </div>
                {(Array.isArray(ex.tags) && ex.tags.length>0) && (
                  <button className="text-xs text-gray-500 underline decoration-dotted ml-1"
                    onClick={()=>setOpenTagEditor(ex.id)}>
                    edit
                  </button>
                )}
              </div>
              <div></div>
            </div>
            {openTagEditor===ex.id && (
              <div className="absolute right-2 top-10">
                <TagPicker current={Array.isArray(ex.tags)?ex.tags:[]} onToggle={(tag)=>toggleExerciseTag(ex.id, tag)} onClose={()=>setOpenTagEditor(null)} />
              </div>
            )}
          </li>
        ))}
        {filteredExerciseDB.length===0 && <li className="text-sm text-gray-500">No matches</li>}
      </ul>
    </div>
  );
}

function NutritionSection({ foodDB, setFoodDB, nutritionLog, setNutritionLog, onBack }){
  const [food, setFood] = React.useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [foodFilter, setFoodFilter] = React.useState("");

  function handleExport(){
    const rows = nutritionLog.map(r=>({date:r.date, food:(foodDB.find(f=>f.id===r.foodId)?.name||"-"), qty:r.qty, calories:r.calories, protein:r.protein, notes:r.notes||""}));
    const csv = toCSV(rows, ["date","food","qty","calories","protein","notes"]);
    downloadText("nutrition-log.csv", csv);
  }

  const grouped = React.useMemo(()=>{
    const map = {};
    for(const r of nutritionLog){
      const d=r.date;
      if(!map[d]) map[d]={date:d, calories:0, protein:0, list:[]};
      map[d].list.push(r);
      map[d].calories += Number(r.calories)||0;
      map[d].protein += Number(r.protein)||0;
    }
    return Object.values(map).sort((a,b)=>b.date.localeCompare(a.date));
  }, [nutritionLog]);

  const filteredFoodDB = React.useMemo(()=>{
    const q = foodFilter.toLowerCase();
    return foodDB.filter(f => f.name.toLowerCase().includes(q));
  }, [foodDB, foodFilter]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card title="Add intake entry" borderColor="#16a34a" actions={<Button variant="outline" onClick={onBack}>Back</Button>}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const foodId = fd.get("foodId"); const qty = Number(fd.get("qty"))||1;
            const f = foodDB.find(x=>x.id===foodId);
            const rec = { id: uid(), date: fd.get("date"), foodId, qty, calories: Math.round((f?.calories||0)*qty), protein: (f?.protein||0)*qty, notes: fd.get("notes")||"" };
            setNutritionLog(p=>[rec, ...p]); e.currentTarget.reset();
          }}>
            <div className="col-span-2 md:col-span-1"><label className="text-xs text-gray-500">Date</label><Input type="date" name="date" required /></div>
            <div className="col-span-2 md:col-span-1"><label className="text-xs text-gray-500">Food</label><select name="foodId" className="rounded-xl border px-3 py-2 text-sm w-full" required>{foodDB.map(f=>(<option key={f.id} value={f.id}>{f.name}</option>))}</select></div>
            <div><label className="text-xs text-gray-500">Quantity (x)</label><NumberInput name="qty" min="0" step="0.1" /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500">Notes</label><Input name="notes" /></div>
            <div className="col-span-2"><Button type="submit">Add</Button></div>
          </form>
        </Card>

        <Card title="Daily nutrition totals" borderColor="#16a34a" actions={<Button variant="outline" onClick={handleExport}>Export CSV</Button>}>
          <div className="space-y-3">
            {grouped.map(day=>(
              <div key={day.date} className="rounded-xl border p-3">
                <div className="font-semibold mb-2">{day.date} · {day.calories} kcal · {day.protein} g protein</div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead><tr className="text-left text-gray-500"><th className="py-2 pr-2">Food</th><th className="py-2 pr-2">Qty</th><th className="py-2 pr-2">Calories</th><th className="py-2 pr-2">Protein</th><th className="py-2 pr-2">Notes</th><th className="py-2 pr-2">Actions</th></tr></thead>
                    <tbody>{day.list.map(r=>(
                      <tr key={r.id} className="border-t">
                        <td className="py-2 pr-2">{foodDB.find(f=>f.id===r.foodId)?.name||"-"}</td>
                        <td className="py-2 pr-2">{r.qty}</td>
                        <td className="py-2 pr-2">{r.calories}</td>
                        <td className="py-2 pr-2">{r.protein}</td>
                        <td className="py-2 pr-2">{r.notes}</td>
                        <td className="py-2 pr-2"><Button variant="outline" onClick={()=>setNutritionLog(p=>p.filter(x=>x.id!==r.id))}>Delete</Button></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <Card title="Food database" borderColor="#16a34a">
          <FoodDBPanel foodDB={foodDB} setFoodDB={setFoodDB} />
        </Card>
      </div>
    </div>
  );
}

function FoodDBPanel({ foodDB, setFoodDB }){
  const [food, setFood] = React.useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [foodFilter, setFoodFilter] = React.useState("");

  const filteredFoodDB = React.useMemo(()=>{
    const q = foodFilter.toLowerCase();
    return foodDB.filter(f => f.name.toLowerCase().includes(q));
  }, [foodDB, foodFilter]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Input placeholder="Name" value={food.name} onChange={e=>setFood({...food, name: e.target.value})} />
        <NumberInput placeholder="Calories" value={food.calories} onChange={e=>setFood({...food, calories: e.target.value})} />
        <NumberInput placeholder="Protein" value={food.protein} onChange={e=>setFood({...food, protein: e.target.value})} />
        <NumberInput placeholder="Carbs" value={food.carbs} onChange={e=>setFood({...food, carbs: e.target.value})} />
        <NumberInput placeholder="Fat" value={food.fat} onChange={e=>setFood({...food, fat: e.target.value})} />
      </div>
      <div className="flex gap-2 mb-3">
        <Button onClick={()=>{
          if(!food.name) return;
          setFoodDB(p=>[{ id: uid(), name: food.name, calories: Number(food.calories)||0, protein: Number(food.protein)||0, carbs: Number(food.carbs)||0, fat: Number(food.fat)||0 }, ...p]);
          setFood({ name:"", calories:"", protein:"", carbs:"", fat:"" });
        }}>Add</Button>
      </div>
      <div className="mb-2"><Input placeholder="Search foods..." value={foodFilter} onChange={e=>setFoodFilter(e.target.value)} /></div>
      <ul className="space-y-2">
        {filteredFoodDB.map(f=>(
          <li key={f.id} className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span>{f.name} · {f.calories} kcal · {f.protein} g protein</span>
            <Button variant="outline" onClick={()=>setFoodDB(p=>p.filter(x=>x.id!==f.id))}>Remove</Button>
          </li>
        ))}
        {filteredFoodDB.length===0 && <li className="text-sm text-gray-500">No matches</li>}
      </ul>
    </div>
  );
}

function BodySection({ bodyLog, setBodyLog, unit, onBack }){
  const bodyByDate = React.useMemo(()=>[...bodyLog].sort((a,b)=>a.date.localeCompare(b.date)), [bodyLog]);

  function handleExport(){
    const rows = bodyLog.map(r=>({date:r.date, weight:r.weight, height:r.height, fat:r.fat, muscle:r.muscle, waist:r.waist, arms:r.arms, chest:r.chest, notes:r.notes||""}));
    const csv = toCSV(rows, ["date","weight","height","fat","muscle","waist","arms","chest","notes"]);
    downloadText("body-log.csv", csv);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <Card title="Add body metrics" borderColor="#2563eb" actions={<Button variant="outline" onClick={onBack}>Back</Button>}>
          <form className="grid grid-cols-2 gap-3" onSubmit={(e)=>{
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const rec = { id: uid(), date: fd.get("date"), weight: Number(fd.get("weight"))||0, height: Number(fd.get("height"))||0, muscle: Number(fd.get("muscle"))||0, fat: Number(fd.get("fat"))||0, waist: Number(fd.get("waist"))||0, arms: Number(fd.get("arms"))||0, chest: Number(fd.get("chest"))||0, notes: fd.get("notes")||"" };
            setBodyLog(p=>[rec, ...p]); e.currentTarget.reset();
          }}>
            <div className="col-span-2 md:col-span-1"><label className="text-xs text-gray-500">Date</label><Input type="date" name="date" required /></div>
            <div><label className="text-xs text-gray-500">Weight (kg)</label><NumberInput name="weight" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Height (cm)</label><NumberInput name="height" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Muscle (%)</label><NumberInput name="muscle" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Fat (%)</label><NumberInput name="fat" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Waist (cm)</label><NumberInput name="waist" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Arms (cm)</label><NumberInput name="arms" min="0" step="0.1" /></div>
            <div><label className="text-xs text-gray-500">Chest (cm)</label><NumberInput name="chest" min="0" step="0.1" /></div>
            <div className="col-span-2"><label className="text-xs text-gray-500">Notes</label><Input name="notes" /></div>
            <div className="col-span-2"><Button type="submit">Add</Button></div>
          </form>
        </Card>

        <Card title={"Body trends (" + (unit==="imperial"?"lb/in":"kg/cm") + ")"} borderColor="#2563eb" actions={<Button variant="outline" onClick={handleExport}>Export CSV</Button>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyByDate}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" /><YAxis /><Tooltip /><Legend />
                <Line type="monotone" dataKey="weight" stroke="#2563eb" name={"Weight ("+(unit==="imperial"?"lb":"kg")+")"} />
                <Line type="monotone" dataKey="fat" stroke={"#1e3a8a"} name="Fat %" />
                <Line type="monotone" dataKey="muscle" stroke={"#60a5fa"} name="Muscle %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Measurements log" borderColor="#2563eb">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-gray-500"><th className="py-2 pr-2">Date</th><th className="py-2 pr-2">Weight</th><th className="py-2 pr-2">Fat %</th><th className="py-2 pr-2">Muscle %</th><th className="py-2 pr-2">Waist</th><th className="py-2 pr-2">Arms</th><th className="py-2 pr-2">Chest</th><th className="py-2 pr-2">Notes</th><th className="py-2 pr-2">Actions</th></tr></thead>
              <tbody>{bodyLog.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>(
                <tr key={r.id} className="border-t">
                  <td className="py-2 pr-2">{r.date}</td><td className="py-2 pr-2">{r.weight}</td><td className="py-2 pr-2">{r.fat}</td><td className="py-2 pr-2">{r.muscle}</td><td className="py-2 pr-2">{r.waist}</td><td className="py-2 pr-2">{r.arms}</td><td className="py-2 pr-2">{r.chest}</td><td className="py-2 pr-2">{r.notes}</td>
                  <td className="py-2 pr-2"><Button variant="outline" onClick={()=>setBodyLog(p=>p.filter(x=>x.id!==r.id))}>Delete</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card title="Tips" borderColor="#2563eb">
          <ul className="list-disc pl-5 text-sm space-y-1">
            <li>Use the Overview calendar to jump to a day and see its data.</li>
            <li>Green days = at least one entry saved.</li>
            <li>Your data is stored locally in this browser. Use Backup/Restore before switching devices.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function SettingsSection({ unit, setUnit, goals, setGoals }){
  const [g, setG] = React.useState(goals);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Units">
        <div className="flex gap-2">
          <Button variant={unit==="metric"?"default":"outline"} onClick={()=>setUnit("metric")}>Metric (kg, cm)</Button>
          <Button variant={unit==="imperial"?"default":"outline"} onClick={()=>setUnit("imperial")}>Imperial (lb, in)</Button>
        </div>
      </Card>
      <Card title="Goals">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-gray-500">Daily calories</label><NumberInput value={g.calories} onChange={e=>setG({...g, calories: Number(e.target.value)||0})} /></div>
          <div><label className="text-xs text-gray-500">Daily protein (g)</label><NumberInput value={g.protein} onChange={e=>setG({...g, protein: Number(e.target.value)||0})} /></div>
          <div><label className="text-xs text-gray-500">Target weight (kg)</label><NumberInput value={g.weight} onChange={e=>setG({...g, weight: Number(e.target.value)||0})} /></div>
        </div>
        <div className="mt-3"><Button onClick={()=>setGoals(g)}>Save</Button></div>
      </Card>
    </div>
  );
}
