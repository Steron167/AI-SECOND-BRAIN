"use client"
import { useState } from "react"
export default function Eval(){
  const [data,setData]=useState<any>(null)
  const [loading,setLoading]=useState(false)
  async function run(){
    setLoading(true)
    const r = await fetch("/api/evaluate",{method:"POST"})
    const j = await r.json()
    setData(j); setLoading(false)
  }
  return (
    <div className="min-h-screen bg-[#f8f6f2] p-8">
      <h1 className="text-2xl font-extrabold mb-2">Evaluation</h1>
      <button onClick={run} className="bg-black text-white px-6 py-3 rounded-full font-bold">{loading?"Running...":"Run Evaluation"}</button>
      {data && <div className="mt-6 max-w-3xl space-y-3">
        <div className="bg-white border-2 border-black rounded-xl p-4 font-bold">Passed {data.summary.passed}/{data.summary.total} - Avg {data.summary.avgConfidence.toFixed(2)}</div>
        {data.results.map((r:any,i:number)=><div key={i} className="bg-white border p-4 rounded-xl flex justify-between"><span>{r.test}</span><span className={r.status==="PASS"?"text-green-600 font-bold":"text-red-600"}>{r.status} {r.confidence.toFixed(2)}</span></div>)}
      </div>}
    </div>
  )
}