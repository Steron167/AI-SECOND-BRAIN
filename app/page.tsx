"use client"
import { useState } from "react"

type Parsed = { thought:string, action:string, observation:string, finalText:string, table:string[][] }

function parse(text: string): Parsed {
  const get = (name: string) => {
    const m = text.match(new RegExp(`${name}\\s*[:\\-]?\\s*([\\s\\S]*?)(?=(Action|Observation|Final Answer|\\bTHOUGHT|\\bACTION|\\bOBSERVATION|\\bFINAL ANSWER)\\b|$)`, "i"))
    return m?.[1]?.trim() || ""
  }
  let thought = get("Thought")
  let action = get("Action")
  let observation = get("Observation")
  let finalText = text.split(/Final Answer/i)[1]?.trim() || ""

  // clean leading | | mess
  const clean = (s:string)=> s.replace(/^\s*\|\s*/gm,"").replace(/\|\s*$/gm,"").trim()
  thought = clean(thought); action = clean(action); observation = clean(observation)

  // extract table rows
  const lines = finalText.split("\n").filter(l=>l.trim().includes("|") || l.includes(" "))
  let table: string[][] = []
  // proper pipe table
  const pipeLines = finalText.split("\n").filter(l=>l.includes("|"))
  if(pipeLines.length>=2){
    table = pipeLines.filter(l=>!l.match(/^\s*\|?\s*-+.*-+\s*\|?\s*$/)).map(l=>l.split("|").map(c=>c.trim()).filter(Boolean))
  }
  return { thought, action, observation, finalText, table }
}

export default function Home(){
  const [topic,setTopic]=useState("Motorola")
  const [competitor,setCompetitor]=useState("Samsung")
  const [reply,setReply]=useState("")
  const [loading,setLoading]=useState(false)
  const [chatInput,setChatInput]=useState("")
  const [chats,setChats]=useState<{u:string,a:string}[]>([])

  async function runResearch(){
    if(!topic) return
    setLoading(true); setReply("")
    const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:`Topic: ${topic} vs Competitor: ${competitor}`,memory:{short:[],long:{facts:[]}}})})
    const data = await res.json()
    setReply(data.reply || ""); setLoading(false)
  }

  async function sendChat(){
    const q = chatInput.trim(); if(!q) return
    setChatInput("")
    setChats(c=>[...c,{u:q,a:"..."}])
    const res = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:q,memory:{short:[],long:{facts:[]}}})})
    const data = await res.json()
    setChats(c=>{ const nc=[...c]; nc[nc.length-1].a = data.reply; return nc })
  }

  const p = reply? parse(reply) : null

  return (
    <div className="min-h-screen bg-[#fbf8f2] text-black selection:bg-black selection:text-white">
      <header className="border-b-2 border-black bg-[#fbf8f2] sticky top-0 z-20">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-extrabold text-[18px] tracking-tight">CHRONICLE AI • SECOND BRAIN</div>
          <div className="flex gap-2">
            <a href="/evaluation" className="bg-black text-white text-[12px] font-bold px-5 py-2.5 rounded-full">EVALUATION</a>
            <a href="/tracing" className="bg-white border-2 border-black text-[12px] font-bold px-5 py-2.5 rounded-full">TRACING</a>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* LEFT */}
        <div className="space-y-5 h-fit sticky top-[88px]">
          <div className="bg-white border-2 border-black rounded-[20px] p-5">
            <div className="text-[12px] font-extrabold tracking-[0.15em]">RESEARCH MODE</div>
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Motorola" className="mt-4 w-full border-2 border-black rounded-full px-4 py-3 text-[14px] font-medium outline-none bg-white" />
            <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Samsung" className="mt-3 w-full border-2 border-black rounded-full px-4 py-3 text-[14px] font-medium outline-none bg-white" />
            <button onClick={runResearch} disabled={loading} className="mt-4 w-full bg-black text-white rounded-full py-3.5 font-bold text-[14px] hover:bg-zinc-900 disabled:opacity-60">{loading?"Running LangGraph...":"Run Research"}</button>
            {loading && <div className="mt-3 text-[11px] text-zinc-500 text-center animate-pulse">Planner → Recaller → Researcher×2 → Resolver → Evaluator → Librarian</div>}
          </div>

          <div className="bg-black rounded-[20px] p-5">
            <div className="text-white text-[13px] font-bold">Chat</div>
            <div className="mt-4 space-y-2 max-h-[280px] overflow-auto pr-1">
              {chats.length===0 && <div className="text-zinc-500 text-[12px]">Say hi - fixed now</div>}
              {chats.map((c,i)=>(
                <div key={i} className="space-y-2">
                  <div className="bg-zinc-800 text-white text-[12px] px-3 py-2 rounded-2xl rounded-bl-sm ml-2">{c.u}</div>
                  <div className="bg-white text-black text-[12px] px-3 py-2 rounded-2xl rounded-br-sm mr-2">{c.a}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="hi" className="flex-1 bg-[#1a1a1a] border border-zinc-700 text-white rounded-full px-4 py-2.5 text-[13px] outline-none" />
              <button onClick={sendChat} className="bg-white text-black px-5 rounded-full font-bold text-[13px]">Send</button>
            </div>
          </div>
        </div>

        {/* RIGHT - LangGraph Output */}
        <div className="space-y-4">
          {!p &&!loading && <div className="bg-white border-2 border-dashed border-black/20 rounded-[20px] p-16 text-center text-[14px] text-zinc-500">Run research to see LangGraph Thought → Action → Observation → Final Answer</div>}

          {p && (
            <>
              <div className="bg-[#fff7b0] border-2 border-black rounded-[16px] p-5">
                <div className="text-[11px] font-extrabold tracking-widest">THOUGHT</div>
                <div className="mt-2 text-[13px] leading-[22px]">{p.thought || "Comparing core aspects..."}</div>
              </div>
              <div className="bg-[#dbe9ff] border-2 border-black rounded-[16px] p-5">
                <div className="text-[11px] font-extrabold tracking-widest">ACTION</div>
                <div className="mt-2 text-[13px] leading-[22px] whitespace-pre-wrap">{p.action || "Gather sales, feature, pricing, and review data"}</div>
              </div>
              <div className="bg-[#d1f4d9] border-2 border-black rounded-[16px] p-5">
                <div className="text-[11px] font-extrabold tracking-widest">OBSERVATION</div>
                <div className="mt-2 text-[13px] leading-[22px]">{p.observation}</div>
              </div>

              <div className="bg-white border-2 border-black rounded-[20px] p-5">
                <div className="text-[11px] font-extrabold tracking-widest">FINAL ANSWER</div>

                {/* If table exists - show table like original perfect design */}
                {p.table.length>0? (
                  <div className="mt-4 space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-extrabold px-3 py-2 bg-black text-white rounded-xl">
                      <div>{p.table[0]?.[0]||"Aspect"}</div><div>{p.table[0]?.[1]||"Topic"}</div><div>{p.table[0]?.[2]||"Competitor"}</div>
                    </div>
                    {p.table.slice(1).map((r,i)=>(
                      <div key={i} className="grid grid-cols-3 gap-2 text-[12px] px-3 py-3 bg-[#fbf8f2] border border-black/10 rounded-xl">
                        <div className="font-bold">{r[0]}</div><div>{r[1]}</div><div>{r[2]}</div>
                      </div>
                    ))}
                    {/* Also show summary in black box */}
                    <div className="mt-3 bg-black text-white text-[12px] leading-5 p-4 rounded-xl">
                      {p.finalText.split("\n").filter(l=>!l.includes("|")).join(" ").slice(0,600)}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 bg-black text-white text-[12px] leading-[22px] p-5 rounded-[14px] whitespace-pre-wrap">{p.finalText}</div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}