import React from "react";

function getMonthMatrix(year, month){
  const first = new Date(year, month, 1);
  const startDay = first.getDay(); // 0-6
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const matrix = [];
  let week = new Array(startDay).fill(null);
  for(let d=1; d<=daysInMonth; d++){
    week.push(new Date(year, month, d));
    if(week.length===7){ matrix.push(week); week=[]; }
  }
  if(week.length){ while(week.length<7) week.push(null); matrix.push(week); }
  return matrix;
}

export function YearCalendar({ year, hasDataDates, onSelectMonth }){
  const months = Array.from({length:12}, (_,i)=>i);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {months.map(m=>(
        <div key={m} className="rounded-xl border p-3 bg-white hover:shadow cursor-pointer" onClick={()=>onSelectMonth(m)}>
          <div className="text-sm font-semibold mb-2">{new Date(year,m,1).toLocaleString('en-US',{month:'long', year:'numeric'})}</div>
          <MiniMonth year={year} month={m} hasDataDates={hasDataDates}/>
        </div>
      ))}
    </div>
  );
}

function MiniMonth({ year, month, hasDataDates }){
  const matrix = getMonthMatrix(year, month);
  return (
    <table className="w-full text-xs">
      <thead><tr className="text-gray-400">{["S","M","T","W","T","F","S"].map(d=><th key={d} className="py-1">{d}</th>)}</tr></thead>
      <tbody>
        {matrix.map((w,i)=>(
          <tr key={i} className="text-center">
            {w.map((date,j)=>{
              const key = date ? date.toISOString().slice(0,10) : "";
              const has = date && hasDataDates.has(key);
              return <td key={j} className={`py-1 ${has?"bg-green-100 text-green-700 font-semibold rounded":""}`}>{date? date.getDate(): ""}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MonthCalendar({ year, month, hasDataDates, onSelectDay }){
  const matrix = getMonthMatrix(year, month);
  return (
    <div className="rounded-xl border p-3 bg-white">
      <div className="grid grid-cols-7 text-center text-gray-500 text-sm mb-2">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d}>{d}</div>)}</div>
      {matrix.map((w,i)=>(
        <div key={i} className="grid grid-cols-7 gap-1 mb-1">
          {w.map((date,j)=>{
            const key = date ? date.toISOString().slice(0,10) : "";
            const has = date && hasDataDates.has(key);
            return (
              <button key={j} disabled={!date} onClick={()=>date && onSelectDay(key)}
                className={`h-16 rounded border text-sm ${date?"bg-white hover:bg-gray-50":"bg-gray-100"} ${has?"border-green-500 ring-1 ring-green-200":""}`}>
                <div className="text-right pr-1 text-gray-500">{date? date.getDate(): ""}</div>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
