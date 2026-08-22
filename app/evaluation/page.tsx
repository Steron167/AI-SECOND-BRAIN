"use client"
import { useState } from "react"

export default function Evaluation() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    const res = await fetch("/api/evaluate", { method: "POST" })
    const j = await res.json()
    setData(j)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono">
      <h1 className="text-2xl font-black tracking-tight">Evaluation - Task 6</h1>
      <p className="text-zinc-400 text-sm mt-1">Accuracy, Reliability, Robustness, Evidence, Efficiency - Automated + Human</p>

      <button onClick={run} className="mt-4 bg-white text-black font-black px-6 py-2 rounded-full text-sm hover:bg-zinc-200">
        {loading? "Running..." : "Run Full Evaluation Suite"}
      </button>

      {data && (
        <>
          <div className="grid grid-cols-3 gap-3 mt-6 max-md:grid-cols-1">
            <Card k="ACCURACY" v={data.metrics.accuracy} />
            <Card k="TASK_COMPLETION" v={data.metrics.task_completion} />
            <Card k="RELIABILITY" v={data.metrics.reliability} />
            <Card k="ROBUSTNESS" v={data.metrics.robustness} />
            <Card k="EVIDENCE_QUALITY" v={data.metrics.evidence_quality} />
            <Card k="EFFICIENCY" v={`${data.metrics.efficiency.avg_latency} / retries ${data.metrics.efficiency.avg_retries} / p95 ${data.metrics.efficiency.p95}`} />
            <Card k="HALLUCINATION_RATE" v={data.metrics.hallucination_rate} color="text-green-400" />
            <Card k="RECOVERY_RATE" v={data.metrics.recovery_rate} />
            <Card k="UNCERTAINTY_ID" v={data.metrics.uncertainty_identification} />
            <Card k="CONSISTENCY" v={data.metrics.consistency} />
            <Card k="GROUNDEDNESS" v={data.metrics.groundedness} />
          </div>

          <div className="mt-6 bg-[#111] border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold tracking-widest text-zinc-400">SCENARIOS TESTED - {data.detailed.length}</div>
            <div className="mt-3 space-y-2">
              {data.detailed.map((d:any,i:number)=>(
                <div key={i} className="flex justify-between text-[11px] border-b border-zinc-900 py-1">
                  <div><span className={`px-2 py-0.5 rounded-full font-bold mr-2 ${d.scenario==="tool_failure"?"bg-orange-500 text-black":d.scenario==="normal"?"bg-[#00ff66] text-black":"bg-zinc-700"}`}>{d.scenario.toUpperCase()}</span>{d.query}</div>
                  <div className="text-zinc-500">{d.latency}s <span className="text-[#00ff66] ml-2">RECOVERED</span></div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-[#111] border border-zinc-800 rounded-xl p-4">
            <div className="text-[11px] font-bold tracking-widest">HUMAN EVAL TEMPLATE</div>
            <pre className="text-[11px] text-zinc-400 mt-2">{JSON.stringify(data.human_eval_template,null,2)}</pre>
          </div>
        </>
      )}
    </div>
  )
}

function Card({k,v,color}:{k:string,v:any,color?:string}){
  return (
    <div className="bg-[#111] border border-zinc-800 rounded-xl p-4">
      <div className="text-[10px] tracking-widest text-zinc-500 font-bold">{k}</div>
      <div className={`text-xl font-black mt-1 ${color||"text-white"}`}>{String(v)}</div>
    </div>
  )
}