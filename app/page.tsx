"use client"
import { useState } from "react"

type Metrics = { confidence: number, retries: number, steps: number }

function parseRes(text: string){
  const get = (k:string) => {
    const re = new RegExp(`${k}\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(Action|Observation|Final Answer)\\b|$)`, "i")
    return text.match(re)?.[1]?.trim() || ""
  }
  const thought = get("Thought")
  const action = get("Action")
  const observation = text.match(/Observation\s*[:\-]?\s*([\s\S]*?)(?=Final Answer|$)/i)?.[1]?.trim() || ""
  const finalPart = text.split(/Final Answer/i)[1] || text
  const lines = finalPart.split("\n").filter(l=>l.includes("|"))
  const table = lines.filter(l=>!l.match(/^\s*\|?\s*-+/)).map(l=>l.split("|").map(s=>s.trim()).filter(Boolean)).filter(r=>r.length>=2)
  const summary = finalPart.split("\n").filter(l=>!l.includes("|")).join(" ").slice(0,800)
  return { thought, action, observation, table, summary, raw: finalPart }
}

export default function Home(){
  const [topic,setTopic]=useState("")
  const [competitor,setCompetitor]=useState("")
  const [reply,setReply]=useState("")
  const [loading,setLoading]=useState(false)
  const [metrics,setMetrics]=useState<Metrics>({ confidence:0.85, retries:1, steps:6 })
  const [shortMem,setShortMem]=useState<string[]>(["Topic: Chat gpt vs Competitor: Claude - plain comparison"])
  const [longMem,setLongMem]=useState<string[]>(["#1 Topic: Chat gpt vs Competitor: Claude - plain comparison"])
  const [chat,setChat]=useState("")
  const [chats,setChats]=useState<{q:string,a:string}[]>([])

  async function runResearch(){
    if(!topic.trim() ||!competitor.trim()){ alert("Enter Topic and VS Competitor"); return }
    setLoading(true)
    const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Topic: ${topic} vs Competitor: ${competitor} - plain comparison`,memory:{short:shortMem, long:{facts:longMem}}})})
    const data = await res.json()
    setReply(data.reply||"")
    setMetrics({ confidence: data.metrics?.confidence || 0.85, retries: data.metrics?.retries || 1, steps: data.checkpoints?.length || 6 })
    setShortMem(prev=>[`Topic: ${topic} vs Competitor: ${competitor} - plain comparison`,...prev].slice(0,5))
    setLongMem(prev=>[`#${prev.length+1} Topic: ${topic} vs Competitor: ${competitor} - plain comparison`,...prev].slice(0,10))
    setLoading(false)
  }

  async function sendVault(){
    const q = chat.trim(); if(!q) return
    if(q.toLowerCase().length<=4){
      setChats(c=>[...c,{q,a:"Hey! I'm Chronicle - your second brain. Ready to research. Enter Topic and Competitor above or ask me anything!"}]); setChat(""); return
    }
    setChat(""); setChats(c=>[...c,{q,a:"..."}])
    const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,memory:{short:shortMem,long:{facts:longMem}}})})
    const d = await res.json()
    setChats(c=>{ const nc=[...c]; nc[nc.length-1].a=d.reply.slice(0,600); return nc })
  }

  const p = reply? parseRes(reply) : null

  return (
    <div className="min-h-screen bg-[#fcfaf7] flex text-black">
      {/* LEFT SIDEBAR - EXACT AS SCREENSHOT */}
      <div className="w-[300px] bg-[#0e0e0e] text-white p-4 flex flex-col gap-3 shrink-0">
        <div className="px-2 py-2">
          <div className="font-extrabold text-[13px] tracking-[0.2em]">CHRONICLE</div>
          <div className="text-[8px] text-[#00ff66] font-bold tracking-widest mt-1">MULTI AI AGENT SYSTEM</div>
        </div>

        <div className="space-y-2 mt-2">
          {[
            { name:"PLANNER AGENT", desc:"Dynamic task planning" },
            { name:"RECALLER AGENT", desc:"vaultTool + long-term memory" },
            { name:"RESEARCHER AGENT x2", desc:"Parallel web_search + fallback" },
            { name:"CONFLICT RESOLVER AGENT", desc:"Evidence verification" },
            { name:"EVALUATOR AGENT", desc:"Self-eval + replan logic" },
            { name:"LIBRARIAN AGENT", desc:"Checkpoint save + persist" },
          ].map(a=>(
            <div key={a.name} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] px-3 py-2.5">
              <div className="text-[9px] font-extrabold tracking-widest">{a.name}</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">{a.desc}</div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <div className="text-[8px] tracking-widest text-zinc-500 font-bold">AGENT METRICS</div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="bg-white text-black rounded-[10px] p-2 text-center"><div className="text-[7px]">CONFIDENCE</div><div className="font-extrabold text-[12px] mt-1">{metrics.confidence.toFixed(2)}</div></div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] p-2 text-center"><div className="text-[7px] text-zinc-500">RETRIES</div><div className="font-bold text-[12px] mt-1">{metrics.retries}</div></div>
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] p-2 text-center"><div className="text-[7px] text-zinc-500">STEPS</div><div className="font-bold text-[12px] mt-1">{metrics.steps}</div></div>
          </div>
        </div>

        <div className="mt-2 flex-1 overflow-auto">
          <div className="flex justify-between items-center"><div className="text-[8px] tracking-widest text-zinc-500 font-bold">MEMORY GRAPH</div><button onClick={()=>{setShortMem([]); setLongMem([])}} className="text-[7px] bg-[#1a1a1a] border px-2 py-1 rounded-full">CLEAR</button></div>
          <div className="mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] p-2">
            <div className="flex justify-between"><div className="text-[7px] bg-[#2a2a2a] px-2 py-0.5 rounded-full">● SHORT TERM</div><div className="text-[7px] bg-white text-black px-1.5 rounded-full">{shortMem.length}</div></div>
            <div className="mt-2 space-y-1">{shortMem.map((s,i)=><div key={i} className="text-[9px] text-zinc-400 bg-[#0e0e0e] p-1.5 rounded">{s}</div>)}</div>
          </div>
          <div className="mt-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-[10px] p-2">
            <div className="flex justify-between"><div className="text-[7px] bg-[#2a2a2a] px-2 py-0.5 rounded-full">● LONG TERM</div><div className="text-[7px] bg-[#1e90ff] text-white px-1.5 rounded-full">vaultTool</div></div>
            <div className="mt-2 space-y-1">{longMem.map((s,i)=><div key={i} className="text-[9px] text-zinc-400 bg-[#0e0e0e] p-1.5 rounded">{s}</div>)}</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-[#1a1a1a]">
          <a href="/evaluation" className="flex-1 bg-white text-black text-[9px] font-bold py-2 rounded-full text-center">EVALUATION</a>
          <a href="/tracing" className="flex-1 bg-[#1a1a1a] border text-[9px] font-bold py-2 rounded-full text-center">TRACING</a>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 p-8 overflow-auto">
        <div className="max-w-[780px] mx-auto">
          <h1 className="text-[20px] font-extrabold">Research Intelligence</h1>

          <div className="mt-5 bg-white border-2 border-black/10 rounded-[16px] p-4 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-[8px] font-bold tracking-widest text-zinc-500">TOPIC</div><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Chat gpt" className="mt-1 w-full border border-black/20 rounded-full px-4 py-2.5 text-[13px] outline-none" /></div>
              <div><div className="text-[8px] font-bold tracking-widest text-zinc-500">VS COMPETITOR</div><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Claude" className="mt-1 w-full border border-black/20 rounded-full px-4 py-2.5 text-[13px] outline-none" /></div>
            </div>
            <button onClick={runResearch} disabled={loading} className="mt-4 w-full bg-black text-white rounded-full py-3 text-[12px] font-bold tracking-wide disabled:opacity-60">{loading?"RUNNING LANGGRAPH...":"Run Research"}</button>
          </div>

          <div className="mt-6 bg-white border-2 border-black rounded-[14px] overflow-hidden">
            <div className="bg-black text-white text-[8px] font-bold tracking-[0.2em] px-4 py-3">FINAL ANSWER</div>
            <div className="p-4 space-y-3">
              {!p && <div className="text-[12px] text-zinc-500 py-10 text-center">Enter Topic + Competitor above and Run Research</div>}
              {p && (
                <>
                  <div className="bg-[#fef6e8] border border-[#f5e1b5] rounded-[10px] p-4">
                    <div className="text-[8px] font-bold tracking-widest text-[#b86b2f]">THOUGHT</div>
                    <div className="mt-2 text-[11px] leading-5 text-zinc-700">{p.thought || "Need to produce plain comparison table..."}</div>
                  </div>
                  <div className="bg-[#eef5ff] border border-[#c2d9ff] rounded-[10px] p-4">
                    <div className="text-[8px] font-bold tracking-widest text-[#2f5eb8]">ACTION</div>
                    <div className="mt-2 text-[11px] leading-5 text-zinc-700 bg-white border rounded p-2 font-mono">{p.action || "I would use web search to gather recent articles..."}</div>
                  </div>
                  {p.observation && (
                    <div className="bg-[#e9f7ec] border border-[#b5e1c0] rounded-[10px] p-4">
                      <div className="text-[8px] font-bold tracking-widest text-[#2f7a3d]">OBSERVATION</div>
                      <div className="mt-2 text-[11px] leading-5 text-zinc-700">{p.observation}</div>
                    </div>
                  )}
                  {p.table.length>0 && (
                    <div className="mt-2 border-2 border-black rounded-[10px] overflow-hidden">
                      <div className="grid gap-px bg-black">
                        {p.table.map((r,i)=>(
                          <div key={i} className={`grid ${r.length===2?"grid-cols-2":"grid-cols-3"} gap-px`}>
                            {r.map((c,j)=><div key={j} className={`${i===0?"bg-black text-white font-bold":"bg-white"} text-[11px] p-3`}>{c}</div>)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.summary && <div className="bg-[#f8f6f2] border rounded-[10px] p-3 text-[11px] leading-5">{p.summary}</div>}
                </>
              )}
            </div>
          </div>

          <div className="mt-4 max-w-[780px] mx-auto">
            <div className="flex gap-2">
              <input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendVault()} placeholder="Ask vault..." className="flex-1 border-2 border-black rounded-full px-5 py-3 text-[13px] outline-none bg-white" />
              <button onClick={sendVault} className="bg-black text-white px-6 rounded-full text-[12px] font-bold">Send</button>
            </div>
            <div className="mt-3 space-y-2">
              {chats.map((c,i)=>(
                <div key={i} className="bg-white border rounded-xl p-3 text-[12px]"><b>You:</b> {c.q}<br/><b>AI:</b> {c.a}</div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}