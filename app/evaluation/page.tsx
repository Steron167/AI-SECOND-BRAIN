"use client"
import { useState } from "react"
export default function EvalPage(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(false)
  async function run(){
    setLoading(true)
    const res = await fetch("/api/evaluate", {method:"POST"})
    const j = await res.json()
    setData(j)
    setLoading(false)
  }
  return (
    <div className="p-8 bg-[#f8f6f2] min-h-screen">
      <h1 className="text-2xl font-extrabold">Evaluation - Task 6</h1>
      <p className="text-sm text-zinc-600 mt-1">Accuracy, Reliability, Robustness, Evidence, Efficiency - Automated + Human</p>
      <button onClick={run} className="mt-4 bg-black text-white px-6 py-3 rounded-full font-bold">{loading?"Running 6 scenarios x3 runs...":"Run Full Evaluation Suite"}</button>
      {data && (
        <div className="mt-6 grid gap-4">
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(data.metrics).map(([k,v]:any)=>(
              <div key={k} className="bg-white border-2 border-black rounded-xl p-4">
                <div className="text-[10px] font-bold tracking-widest text-zinc-500">{k.toUpperCase()}</div>
                <div className="text-[20px] font-extrabold mt-1">{typeof v==="object"? JSON.stringify(v): v.toString().slice(0,30)}</div>
              </div>
            ))}
          </div>
          <div className="bg-black text-white rounded-2xl p-5">
            <div className="text-[11px] font-extrabold tracking-widest mb-3">SCENARIOS TESTED - {data.detailed.length}</div>
            {data.detailed.map((d:any,i:number)=>(
              <div key={i} className="flex gap-2 text-[13px] py-2 border-b border-zinc-800">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.scenario==="normal"?"bg-[#00ff66] text-black": d.scenario==="tool_failure"?"bg-orange-500 text-white":"bg-zinc-800 text-white"}`}>{d.scenario.toUpperCase()}</span>
                <span className="flex-1">{d.query}</span>
                <span className="text-zinc-400">{d.latency.toFixed(2)}s</span>
                <span className={d.recovered?"text-[#00ff66]":"text-red-400"}>{d.recovered?"RECOVERED":"FAILED"}</span>
              </div>
            ))}
          </div>
          <div className="bg-white border rounded-xl p-4 text-[12px]">
            <div className="font-bold mb-2">Human Evaluation Template</div>
            <pre className="bg-zinc-100 p-3 rounded-lg overflow-auto">{JSON.stringify(data.human_eval_template,null,2)}</pre>
          </div>
        </div>
      )}
    </div>
  )
}