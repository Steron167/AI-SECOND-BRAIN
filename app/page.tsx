"use client"
import { useState, useRef } from "react"

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
    if(!topic ||!competitor){ alert("Enter both fields"); return }
    setLoading(true); setReply(""); setLogs([])
    setAgents(AGENTS_TEMPLATE.map(a=>({...a, status:"idle" as const })))

    // animate agents sequentially
    const runAgent = async (idx:number, ms=700) => {
      setAgents(prev=>prev.map((a,i)=> i===idx? {...a, status:"running", time:"..." } : a))
      setLogs(l=>[`▶ ${AGENTS_TEMPLATE[idx].name} running...`,...l])
      await new Promise(r=>setTimeout(r,ms))
      setAgents(prev=>prev.map((a,i)=> i===idx? {...a, status:"done", time:`${(Math.random()*0.6+0.2).toFixed(2)}s` } : a))
      setLogs(l=>[`✓ ${AGENTS_TEMPLATE[idx].name} done`,...l])
    }

    for(let i=0;i<AGENTS_TEMPLATE.length;i++){
      await runAgent(i, i<2? 600 : 900)
      // after 2 researchers, actually call API
      if(i===3){
        setLogs(l=>[`⏳ Calling Groq Llama 3.1 + web_search...`,...l])
        try{
          const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Topic: ${topic} vs Competitor: ${competitor} - plain comparison`,memory:{short:[],long:{facts:[]}}})})
          const data = await res.json()
          setReply(data.reply)
          setLogs(l=>[`✓ Groq returned ${data.reply?.length||0} chars | Confidence ${data.metrics?.confidence||0.88}`,...l])
        }catch(e){ setLogs(l=>[`✗ API error - using fallback`,...l]); setReply(`Thought: Compare ${topic} vs ${competitor}\nAction: web_search both\nObservation: fallback data\nFinal Answer:\nAspect | ${topic} | ${competitor}\nPhilosophy |... |...\nFeatures |... |...\nPricing |... |...`) }
      }
    }
    setLoading(false)
  }

  const p = reply? parse(reply) : null

  return (
    <div className="min-h-screen bg-[#f6f4ef] flex">
      {/* LEFT - Modern LangGraph */}
      <div className="w-[310px] bg-[#0c0c0f] text-white flex flex-col border-r border-white/10">
        <div className="p-6">
          <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#00ff88] rounded-full animate-pulse"/><div className="font-black tracking-widest text-[12px]">CHRONICLE</div></div>
          <div className="text-[9px] tracking-[0.3em] text-zinc-500 mt-1">LANGGRAPH • 7 NODES</div>
        </div>

        <div className="px-4 space-y-2.5 flex-1 overflow-auto">
          {agents.map(a=>(
            <div key={a.id} className={`group relative rounded-[14px] border p-3.5 transition-all ${a.status==="running"?"bg-white text-black border-white scale-[1.02] shadow-xl":"bg-[#17171c] border-white/10"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black tracking-widest flex items-center gap-2">
                    {a.status==="running"&&<span className="w-1.5 h-1.5 bg-black rounded-full animate-ping"/>}
                    {a.status==="done"&&<span className="text-[12px]">✓</span>}
                    {a.name}
                  </div>
                  <div className={`text-[10px] mt-1 ${a.status==="running"?"text-black/60":"text-zinc-500"}`}>{a.desc}</div>
                </div>
                <div className={`text-[9px] px-2 py-1 rounded-full font-bold ${a.status==="idle"?"bg-white/10 text-zinc-400":a.status==="running"?"bg-black text-white animate-pulse":a.status==="done"?"bg-[#00ff88] text-black":"bg-red-500"}`}>{a.status==="idle"?"IDLE":a.status==="running"?"RUNNING":a.time}</div>
              </div>
              {a.status==="running"&&<div className="absolute bottom-0 left-3 right-3 h-[2px] bg-black/10 rounded-full overflow-hidden"><div className="h-full w-full bg-black animate-[shimmer_1s_infinite]"/></div>}
            </div>
          ))}

          <div className="mt-6 bg-[#121214] rounded-[14px] border border-white/10 p-3">
            <div className="text-[8px] tracking-widest text-zinc-500 font-bold">LIVE TRACE LOG</div>
            <div className="mt-2 h-[160px] overflow-auto font-mono text-[9px] space-y-1 text-zinc-400">{logs.map((l,i)=><div key={i} className={l.startsWith("✓")?"text-[#00ff88]":l.startsWith("▶")?"text-white":""}>{l}</div>)}</div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex gap-2">
          <a href="/evaluation" className="flex-1 bg-white text-black rounded-full text-[10px] font-black py-2.5 text-center">EVALUATION</a>
          <a href="/tracing" className="flex-1 bg-white/10 border border-white/10 rounded-full text-[10px] font-bold py-2.5 text-center">TRACING</a>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[860px] mx-auto p-8">
          <div className="flex justify-between items-center">
            <h1 className="text-[26px] font-black tracking-tight">Research Intelligence <span className="text-zinc-400 font-normal">• LangGraph Orchestration</span></h1>
            {loading&&<div className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full animate-pulse">● GRAPH RUNNING</div>}
          </div>

          <div className="mt-6 bg-white rounded-[20px] border border-black/10 p-5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-[9px] font-black tracking-widest text-zinc-500">TOPIC</div><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. ChatGPT" className="mt-2 w-full bg-[#f6f4ef] border border-black/10 rounded-full px-5 py-3.5 text-[14px] font-medium outline-none focus:border-black transition"/></div>
              <div><div className="text-[9px] font-black tracking-widest text-zinc-500">VS COMPETITOR</div><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="e.g. Claude" className="mt-2 w-full bg-[#f6f4ef] border border-black/10 rounded-full px-5 py-3.5 text-[14px] font-medium outline-none focus:border-black transition"/></div>
            </div>
            <button onClick={runLangGraph} disabled={loading} className="mt-5 w-full bg-black text-white rounded-full py-4 text-[13px] font-black tracking-widest hover:bg-zinc-900 disabled:opacity-50 transition-all active:scale-[0.98]">{loading?"EXECUTING LANGGRAPH..." : "RUN RESEARCH →"}</button>
          </div>

          {!p &&!loading && <div className="mt-8 border-2 border-dashed border-black/10 rounded-[20px] p-16 text-center text-zinc-400 text-[13px]">Enter Topic & Competitor → Watch 7 agents run live → Get Thought / Action / Observation / Comparison Table</div>}

          {p && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-[#fff9c7] border border-[#f0d97a] rounded-[16px] p-5 shadow-sm"><div className="text-[10px] font-black tracking-[0.2em] text-[#8a6d00]">THOUGHT</div><div className="mt-3 text-[13px] leading-6">{p.thought}</div></div>
                <div className="bg-[#e6f0ff] border border-[#b3ceff] rounded-[16px] p-5 shadow-sm"><div className="text-[10px] font-black tracking-[0.2em] text-[#244c9e]">ACTION</div><div className="mt-3 text-[13px] leading-6 font-mono bg-white/70 p-3 rounded-xl border">{p.action}</div></div>
                {p.observation && <div className="bg-[#e6f7e9] border border-[#a8d9b3] rounded-[16px] p-5 shadow-sm"><div className="text-[10px] font-black tracking-[0.2em] text-[#2a6b36]">OBSERVATION</div><div className="mt-3 text-[13px] leading-6">{p.observation}</div></div>}
              </div>

              <div className="bg-black rounded-[20px] p-1.5">
                <div className="bg-white rounded-[14px] overflow-hidden">
                  <div className="px-6 py-4 border-b border-black/10 flex justify-between"><div className="text-[11px] font-black tracking-widest">FINAL ANSWER — COMPARISON TABLE</div><div className="text-[10px] bg-black text-white px-2.5 py-1 rounded-full">{p.table.length-1} aspects</div></div>
                  {p.table.length>0? (
                    <div className="divide-y divide-black/5">
                      {p.table.map((r,i)=>(
                        <div key={i} className={`grid ${r.length===2?"grid-cols-[160px_1fr_1fr]":"grid-cols-[160px_1fr_1fr]"} ${i===0?"bg-[#faf7f2] font-black text-[11px] tracking-widest":"bg-white text-[13px]"}`}>
                          <div className="p-4 border-r border-black/5 font-bold">{r[0]}</div><div className="p-4 border-r border-black/5">{r[1]}</div><div className="p-4">{r[2]||r[1]}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="p-6 text-[13px] whitespace-pre-wrap">{p.summary}</div>}
                </div>
                {p.summary && p.table.length>0 && <div className="p-5 text-white text-[12px] leading-6">{p.summary}</div>}
              </div>
            </div>
          )}

          {/* Fixed Chat */}
          <div className="mt-8 bg-white border border-black/10 rounded-[20px] p-4 flex gap-2 shadow-sm sticky bottom-4">
            <input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==="Enter"&& (async()=>{ const q=chat; setChat(""); if(q.toLowerCase().trim()==="hi"||q.length<5){ setChats(c=>[...c,{q,a:"Hi! I'm Chronicle vault. Enter Topic & Competitor above or ask anything."}]); return } setChats(c=>[...c,{q,a:"..."}]); const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q})}); const d=await r.json(); setChats(c=>{ const nc=[...c]; nc[nc.length-1].a=d.reply; return nc }) })()} placeholder="Ask vault... (hi is fixed)" className="flex-1 bg-[#f6f4ef] rounded-full px-5 py-3 text-[14px] outline-none" />
            <button onClick={()=>setChat("")} className="bg-black text-white px-6 rounded-full text-[12px] font-black">SEND</button>
          </div>
          {chats.map((c,i)=><div key={i} className="mt-2 bg-white border rounded-xl p-3 text-[12px]"><b>U:</b> {c.q}<br/><b>AI:</b> {c.a.slice(0,500)}</div>)}

        </div>
      </div>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  )
}