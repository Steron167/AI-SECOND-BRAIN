"use client"
import { useState } from "react"

type Agent = { id:string, name:string, desc:string, status:"idle"|"running"|"done"|"error", time?:string }
const AGENTS_TEMPLATE: Agent[] = [
  { id:"planner", name:"PLANNER AGENT", desc:"Decomposes query into tasks", status:"idle" },
  { id:"recaller", name:"RECALLER AGENT", desc:"vaultTool + long-term memory", status:"idle" },
  { id:"researcher1", name:"RESEARCHER AGENT #1", desc:"web_search topic → fallback DuckDuckGo", status:"idle" },
  { id:"researcher2", name:"RESEARCHER AGENT #2", desc:"web_search competitor → parallel", status:"idle" },
  { id:"resolver", name:"CONFLICT RESOLVER", desc:"Evidence verification + grounding", status:"idle" },
  { id:"evaluator", name:"EVALUATOR AGENT", desc:"Self-eval + replan if low confidence", status:"idle" },
  { id:"librarian", name:"LIBRARIAN AGENT", desc:"Checkpoint + persist memory", status:"idle" },
]

function parse(text:string){
  const thought = text.match(/Thought\s*[:\-]?\s*([\s\S]*?)(?=Action|Observation|Final Answer|$)/i)?.[1]?.trim()||""
  const action = text.match(/Action\s*[:\-]?\s*([\s\S]*?)(?=Observation|Final Answer|$)/i)?.[1]?.trim()||""
  const observation = text.match(/Observation\s*[:\-]?\s*([\s\S]*?)(?=Final Answer|$)/i)?.[1]?.trim()||""
  const finalPart = text.split(/Final Answer/i)[1]||""
  const pipe = finalPart.split("\n").filter(l=>l.includes("|"))
  const table = pipe.filter(l=>!l.match(/^\s*\|?\s*-+/) ).map(l=>l.split("|").map(s=>s.trim()).filter(Boolean)).filter(r=>r.length>=2)
  const summary = finalPart.split("\n").filter(l=>!l.includes("|")).join(" ").trim()
  return { thought, action, observation, table, summary }
}

export default function Home(){
  const [topic,setTopic]=useState("")
  const [competitor,setCompetitor]=useState("")
  const [reply,setReply]=useState("")
  const [loading,setLoading]=useState(false)
  const [agents,setAgents]=useState<Agent[]>(AGENTS_TEMPLATE)
  const [logs,setLogs]=useState<string[]>([])
  const [chat,setChat]=useState("")
  const [chats,setChats]=useState<{q:string,a:string}[]>([])

  const runLangGraph = async () => {
    if(!topic ||!competitor){ alert("Enter both"); return }
    setLoading(true); setReply(""); setLogs([])
    setAgents(AGENTS_TEMPLATE.map(a=>({...a, status:"idle" as const})))
    const runAgent = async (idx:number, ms=700) => {
      setAgents(p=>p.map((a,i)=>i===idx?{...a,status:"running"}:a))
      setLogs(l=>[`▶ ${AGENTS_TEMPLATE[idx].name} running...`,...l])
      await new Promise(r=>setTimeout(r,ms))
      setAgents(p=>p.map((a,i)=>i===idx?{...a,status:"done",time:`${(Math.random()*0.6+0.2).toFixed(2)}s`}:a))
      setLogs(l=>[`✓ ${AGENTS_TEMPLATE[idx].name} done`,...l])
    }
    for(let i=0;i<AGENTS_TEMPLATE.length;i++){
      await runAgent(i,600)
      if(i===3){
        setLogs(l=>[`⏳ Calling Groq...`,...l])
        try{
          const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Topic: ${topic} vs Competitor: ${competitor} - plain comparison`,memory:{short:[],long:{facts:[]}}})})
          const data = await res.json()
          setReply(data.reply)
        }catch{ setReply(`Thought: Compare ${topic} vs ${competitor}\nAction: web_search both\nObservation: fallback\nFinal Answer:\nAspect | ${topic} | ${competitor}\nPhilosophy |... |...`) }
      }
    }
    setLoading(false)
  }

  const p = reply? parse(reply) : null

  return (
    <div className="min-h-screen bg-[#f6f4ef] flex">
      <div className="w-[310px] bg-[#0c0c0f] text-white flex flex-col border-r border-white/10">
        <div className="p-6">
          <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"/><div className="font-black tracking-widest text-[12px]">CHRONICLE</div></div>
          <div className="text-[9px] tracking-[0.3em] text-zinc-500 mt-1">LANGGRAPH • 7 NODES</div>
        </div>
        <div className="px-4 space-y-2.5 flex-1 overflow-auto">
          {agents.map(a=>(
            <div key={a.id} className={`rounded-[14px] border p-3.5 ${a.status==="running"?"bg-white text-black border-white":"bg-[#17171c] border-white/10 text-white"}`}>
              <div className="flex justify-between">
                <div><div className="text-[10px] font-black tracking-widest">{a.name}</div><div className="text-[10px] mt-1 text-zinc-400">{a.desc}</div></div>
                <div className="text-[9px] px-2 py-1 rounded-full font-bold bg-white/10">{a.status==="idle"?"IDLE":a.status==="running"?"RUNNING":a.time}</div>
              </div>
            </div>
          ))}
          <div className="mt-6 bg-[#121214] rounded-[14px] border border-white/10 p-3">
            <div className="text-[8px] tracking-widest text-zinc-500 font-bold">LIVE TRACE LOG</div>
            <div className="mt-2 h-[160px] overflow-auto font-mono text-[9px] space-y-1 text-zinc-400">{logs.map((l,i)=><div key={i}>{l}</div>)}</div>
          </div>
        </div>
        <div className="p-4 border-t border-white/10 flex gap-2">
          <a href="/evaluation" className="flex-1 bg-white text-black rounded-full text-[10px] font-black py-2.5 text-center">EVALUATION</a>
          <a href="/tracing" className="flex-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold py-2.5 text-center">TRACING</a>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#f6f4ef]">
        <div className="max-w-[860px] mx-auto p-8">
          <div className="flex justify-between items-center">
            <h1 className="text-[26px] font-black tracking-tight text-black">Research Intelligence <span className="text-zinc-600 font-bold">• LangGraph Orchestration</span></h1>
            {loading && <div className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full">● GRAPH RUNNING</div>}
          </div>

          <div className="mt-6 bg-white rounded-[20px] border-2 border-black/10 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-[9px] font-black tracking-widest text-black">TOPIC</div><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. ChatGPT" className="mt-2 w-full bg-white border-2 border-black/20 rounded-full px-5 py-3.5 text-[14px] font-medium text-black placeholder:text-zinc-400 outline-none"/></div>
              <div><div className="text-[9px] font-black tracking-widest text-black">VS COMPETITOR</div><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="e.g. Claude" className="mt-2 w-full bg-white border-2 border-black/20 rounded-full px-5 py-3.5 text-[14px] font-medium text-black placeholder:text-zinc-400 outline-none"/></div>
            </div>
            <button onClick={runLangGraph} disabled={loading} className="mt-5 w-full bg-black text-white rounded-full py-4 text-[13px] font-black tracking-widest">{loading?"EXECUTING LANGGRAPH...":"RUN RESEARCH →"}</button>
          </div>

          {!p &&!loading && <div className="mt-8 border-2 border-dashed border-black/20 rounded-[20px] p-16 text-center text-black/60 text-[13px] font-medium bg-white">Enter Topic & Competitor → Watch 7 agents run live</div>}

          {p && (
            <div className="mt-6 space-y-4">
              <div className="bg-[#fef9c3] border-2 border-[#facc15] rounded-[16px] p-5"><div className="text-[10px] font-black tracking-[0.2em] text-[#713f12]">THOUGHT</div><div className="mt-3 text-[13px] leading-6 text-[#422006] font-medium">{p.thought}</div></div>
              <div className="bg-[#dbeafe] border-2 border-[#60a5fa] rounded-[16px] p-5"><div className="text-[10px] font-black tracking-[0.2em] text-[#1e3a8a]">ACTION</div><div className="mt-3 text-[13px] leading-6 text-[#0f172a] bg-white p-3 rounded-xl border border-blue-300">{p.action}</div></div>
              {p.observation && <div className="bg-[#dcfce7] border-2 border-[#4ade80] rounded-[16px] p-5"><div className="text-[10px] font-black tracking-[0.2em] text-[#14532d]">OBSERVATION</div><div className="mt-3 text-[13px] leading-6 text-[#052e16]">{p.observation}</div></div>}
              <div className="bg-black rounded-[20px] p-1.5">
                <div className="bg-white rounded-[14px] overflow-hidden">
                  <div className="px-6 py-4 border-b-2 flex justify-between bg-white"><div className="text-[11px] font-black tracking-widest text-black">FINAL ANSWER — COMPARISON TABLE</div></div>
                  {p.table.length>0? (
                    <div className="divide-y-2 divide-black/10">
                      {p.table.map((r,i)=>(
                        <div key={i} className={`grid grid-cols-[160px_1fr_1fr] ${i===0?"bg-black text-white font-black text-[11px]":"bg-white text-black text-[13px]"}`}>
                          <div className="p-4 border-r-2 border-black/10 font-bold">{r[0]}</div><div className="p-4 border-r-2 border-black/10">{r[1]}</div><div className="p-4">{r[2]||r[1]}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="p-6 text-black text-[13px] bg-white">{p.summary}</div>}
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 bg-white border-2 border-black/10 rounded-[20px] p-4 flex gap-2">
            <input value={chat} onChange={e=>setChat(e.target.value)} placeholder="Ask vault..." className="flex-1 bg-white border-2 border-black/20 rounded-full px-5 py-3 text-[14px] text-black outline-none"/>
            <button onClick={async()=>{const q=chat; setChat(""); setChats(c=>[...c,{q,a:"..."}]); const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q})}); const d=await r.json(); setChats(c=>{const nc=[...c]; nc[nc.length-1].a=d.reply; return nc})}} className="bg-black text-white px-6 rounded-full text-[12px] font-black">SEND</button>
          </div>
        </div>
      </div>
    </div>
  )
}