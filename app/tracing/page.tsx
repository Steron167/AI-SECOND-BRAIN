"use client"
import { useEffect, useState } from "react"
export default function Tracing(){
  const [traces,setTraces]=useState<any[]>([])
  useEffect(()=>{ fetch("/api/trace").then(r=>r.json()).then(d=>setTraces(d.traces||[])) },[])
  return (
    <div className="min-h-screen bg-[#f8f6f2] p-8">
      <h1 className="text-2xl font-extrabold mb-6">Tracing - Task 7</h1>
      <div className="space-y-4 max-w-4xl">
        {traces.length===0 && <div className="bg-white p-6 rounded-xl border-2">No traces yet. Run a Research first.</div>}
        {traces.map(t=>(
          <div key={t.id} className="bg-white rounded-xl border-2 border-black p-4">
            <div className="font-bold text-sm">Trace {t.id} - {t.spans.length} spans</div>
            <div className="mt-3 space-y-2">
              {t.spans.map((s:any)=><div key={s.id} className="flex gap-3 text-xs border p-2 rounded-lg bg-[#fcfaf7]"><span className="font-bold w-24">{s.agent}</span><span className="w-20">{s.op}</span><span className="flex-1 truncate">{s.output}</span><span className="text-zinc-500">{s.latency}ms</span></div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}