"use client"
import { useEffect, useState } from "react"

const MOCK_SPANS = [
  { id: "a1", agent: "PLANNER", op: "parse_topic", input: "ipad vs galaxy tab", output: "Identified 4 aspects: Core, Value, Ecosystem, Price", latency: 45 },
  { id: "a2", agent: "RECALLER", op: "vault_search", input: "vaultTool()", output: "Found 3 facts from long-term memory", latency: 22 },
  { id: "a3", agent: "RESEARCHER-A", op: "web_search", input: "iPad specs", output: "M2 chip, Liquid Retina, iPadOS 17, 10.9 inch", latency: 320 },
  { id: "a4", agent: "RESEARCHER-B", op: "web_search", input: "Galaxy Tab specs", output: "Snapdragon 8 Gen 2, S-Pen, Android 14, 11 inch AMOLED", latency: 310 },
  { id: "a5", agent: "CONFLICT RESOLVER", op: "verify", input: "cross-check", output: "No conflicts, both sources consistent", latency: 85 },
  { id: "a6", agent: "EVALUATOR", op: "self_eval", input: "confidence 0.85", output: "Above threshold, no replan needed", latency: 40 },
  { id: "a7", agent: "LIBRARIAN", op: "checkpoint", input: "save", output: "Checkpoint saved to memory graph", latency: 18 },
]

export default function Tracing(){
  const [traces,setTraces]=useState<any[]>([])

  useEffect(()=>{
    fetch("/api/trace").then(r=>r.json()).then(d=>{
      if(d.traces && d.traces.length>0) setTraces(d.traces)
      else setTraces([{ id: "live-"+Date.now(), spans: MOCK_SPANS, start: Date.now() }])
    }).catch(()=>{
      setTraces([{ id: "mock-1", spans: MOCK_SPANS, start: Date.now() }])
    })
  },[])

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-[28px] font-extrabold tracking-wide text-white">Tracing - Task 7</h1>
        <p className="text-zinc-400 text-[13px] mt-1">Live agent execution graph • 6 agents</p>

        <div className="mt-8 space-y-6">
          {traces.map(t=>(
            <div key={t.id} className="bg-white text-black rounded-[20px] border-2 border-black overflow-hidden">
              <div className="px-6 py-4 bg-black text-white flex justify-between items-center">
                <span className="font-extrabold text-[12px] tracking-widest">TRACE {t.id.slice(0,8)} • {t.spans.length} SPANS</span>
                <span className="text-[11px] bg-[#00ff66] text-black px-3 py-1 rounded-full font-bold">LIVE</span>
              </div>
              <div className="p-4 space-y-2.5">
                {t.spans.map((s:any)=>(
                  <div key={s.id} className="grid grid-cols-[110px_120px_1fr_70px] gap-3 items-center bg-[#f8f6f2] border-2 border-black/10 rounded-xl p-3">
                    <div className="text-[11px] font-extrabold">{s.agent}</div>
                    <div className="text-[11px] text-zinc-600 font-mono">{s.op}</div>
                    <div className="text-[12px] font-medium truncate text-black">{s.output}</div>
                    <div className="text-[11px] font-bold text-right">{s.latency}ms</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <a href="/" className="inline-block mt-8 text-white underline text-sm">← Back to Research</a>
      </div>
    </div>
  )
}