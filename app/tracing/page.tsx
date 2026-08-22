"use client"
import { useState, useEffect } from "react"

export default function Tracing(){
  const [data,setData]=useState<any>(null)
  const [injectFail,setInjectFail]=useState(false)

  const load=async()=>{
    const res=await fetch(`/api/trace?traceId=last`)
    setData(await res.json())
  }
  useEffect(()=>{ load(); const i=setInterval(load,2000); return()=>clearInterval(i)},[])

  return (
    <div className="min-h-screen bg-black text-white p-6 font-mono text-xs">
      <h1 className="text-xl font-black">Task 7 - Advanced Tracing & Observability</h1>
      <p className="text-zinc-500 text-[11px] mt-1">OpenTelemetry-style tracing: agents, prompts, decisions, tool calls, latency, tokens, errors</p>

      <div className="flex gap-2 mt-4">
        <button onClick={load} className="bg-white text-black px-4 py-1 rounded-full font-bold text-xs">Refresh Trace</button>
        <button onClick={()=>setInjectFail(!injectFail)} className={`px-4 py-1 rounded-full font-bold text-xs ${injectFail?"bg-red-500 text-white":"bg-zinc-800"}`}>
          {injectFail?"FAILURE INJECTED (429)":"Inject Controlled Failure"}
        </button>
        {injectFail && <span className="text-red-400 text-[10px] mt-1">Add [SIMULATE 429] in main page query to trigger</span>}
      </div>

      {!data || data.error? <div className="mt-10 text-zinc-600">No trace yet - Run a query on main page first</div> : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Box k="TRACE ID" v={data.traceId.slice(0,8)} />
            <Box k="TOTAL SPANS" v={data.spans.length} />
            <Box k="FAILED" v={data.diagnosis.failed.length} color={data.diagnosis.failed.length?"text-red-400":"text-green-400"} />
          </div>

          <div className="mt-4 bg-[#111] border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] font-bold tracking-widest text-zinc-400">ROOT CAUSE ANALYSIS (Auto-Diagnosis)</div>
            <div className="mt-2 text-[11px]"><span className="text-zinc-500">ROOT CAUSE:</span> <span className="text-red-300">{data.diagnosis.rootCause}</span></div>
            <div className="mt-1 text-[11px]"><span className="text-zinc-500">AUTO FIX APPLIED:</span> <span className="text-green-300">{data.diagnosis.fix}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(data.diagnosis.improvement).map(([k,v]:any)=><div key={k} className="bg-black border border-zinc-900 p-2 rounded"><div className="text-[9px] text-zinc-500">{k.toUpperCase()}</div><div className="text-white font-bold">{String(v)}</div></div>)}
            </div>
          </div>

          <div className="mt-4 bg-[#111] border border-zinc-800 rounded-xl p-4 overflow-auto">
            <div className="text-[10px] font-bold tracking-widest text-zinc-400 mb-3">END-TO-END TRACE TIMELINE</div>
            <table className="w-full text-[10px]">
              <thead className="text-zinc-600"><tr><th className="text-left">AGENT</th><th>OPERATION</th><th>TOOL</th><th>LATENCY</th><th>TOKENS</th><th>STATUS</th><th>DECISION</th></tr></thead>
              <tbody>
                {data.spans.map((s:any)=><tr key={s.id} className="border-t border-zinc-900"><td>{s.agent}</td><td>{s.operation}</td><td>{s.tool||"-"}</td><td className={s.latency>2000?"text-orange-400":""}>{s.latency||0}ms</td><td>{s.tokens_in}+{s.tokens_out||0}</td><td className={s.status==="failed"?"text-red-400":"text-green-400"}>{s.status}</td><td className="max-w-[200px] truncate">{s.decision||s.error||""}</td></tr>)}
              </tbody>
            </table>
          </div>

          <div className="mt-4 bg-[#111] border border-zinc-800 rounded-xl p-4">
            <div className="text-[10px] font-bold tracking-widest text-zinc-400">PROMPTS & OBSERVATIONS (Full)</div>
            {data.spans.map((s:any)=><div key={s.id+"p"} className="mt-2 border-t border-zinc-900 pt-2"><div className="text-zinc-500">{s.agent} - prompt:</div><div className="text-zinc-300 whitespace-pre-wrap">{s.prompt?.slice(0,300)||"-"}</div></div>)}
          </div>
        </>
      )}
    </div>
  )
}
function Box({k,v,color}:{k:string,v:any,color?:string}){ return <div className="bg-[#111] border border-zinc-800 rounded-xl p-3"><div className="text-[9px] text-zinc-500">{k}</div><div className={`font-black mt-1 ${color||"text-white"}`}>{v}</div></div> }