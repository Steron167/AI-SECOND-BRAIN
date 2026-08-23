"use client"
import { useState } from "react"

function ParseResearch(text: string){
  const thought = text.match(/Thought[:\-]?\s*([\s\S]*?)(?=Action|$)/i)?.[1]?.trim() || ""
  const action = text.match(/Action[:\-]?\s*([\s\S]*?)(?=Observation|$)/i)?.[1]?.trim() || ""
  const observation = text.match(/Observation[:\-]?\s*([\s\S]*?)(?=Final Answer|$)/i)?.[1]?.trim() || ""
  const finalRaw = text.split(/Final Answer[:\-]?/i)[1] || text

  // parse table rows with |
  const lines = finalRaw.split("\n").filter(l=>l.includes("|"))
  const rows = lines.filter(l=>!l.includes("---")).map(l=> l.split("|").map(c=>c.trim()).filter(Boolean))

  return { thought, action, observation, rows }
}

export default function Home(){
  const [topic,setTopic]=useState("")
  const [competitor,setCompetitor]=useState("")
  const [reply,setReply]=useState("")
  const [loading,setLoading]=useState(false)
  const [chat,setChat]=useState("")
  const [messages,setMessages]=useState<{role:string, text:string}[]>([])

  async function doResearch(){
    if(!topic) return
    setLoading(true); setReply("")
    const res = await fetch("/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: `Topic: ${topic} vs Competitor: ${competitor}`, memory:{short:[], long:{facts:[]}} })
    })
    const data = await res.json()
    setReply(data.reply); setLoading(false)
  }

  async function sendChat(){
    if(!chat) return
    setMessages(m=>[...m,{role:"user", text:chat}])
    const r = await fetch("/api/chat",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ message: chat, memory:{short:[], long:{facts:[]}} })
    })
    const d = await r.json()
    setMessages(m=>[...m,{role:"ai", text:d.reply}])
    setChat("")
  }

  const p = reply? ParseResearch(reply) : null

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-black">
      {/* Header */}
      <div className="border-b-2 border-black bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="font-extrabold text-xl tracking-tight">CHRONICLE AI • SECOND BRAIN</div>
          <div className="flex gap-3 text-xs font-bold">
            <a href="/evaluation" className="bg-black text-white px-4 py-2 rounded-full">EVALUATION</a>
            <a href="/tracing" className="bg-white border-2 border-black px-4 py-2 rounded-full">TRACING</a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Research Input */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[24px] border-2 border-black p-6">
            <h2 className="font-extrabold text-sm tracking-widest">RESEARCH MODE</h2>
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic: e.g. Mahatma Gandhi" className="mt-4 w-full border-2 border-black rounded-full px-4 py-3 text-sm font-medium outline-none" />
            <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor: e.g. Narendra Modi" className="mt-3 w-full border-2 border-black rounded-full px-4 py-3 text-sm font-medium outline-none" />
            <button onClick={doResearch} disabled={loading} className="mt-4 w-full bg-black text-white rounded-full py-3 font-extrabold text-sm disabled:opacity-50">
              {loading?"RESEARCHING...":"Run Research"}
            </button>
          </div>

          <div className="bg-[#0b0b0b] rounded-[24px] p-6 text-white">
            <h3 className="font-bold text-sm">Chat</h3>
            <div className="mt-4 space-y-3 max-h-[300px] overflow-auto">
              {messages.map((m,i)=>(
                <div key={i} className={`text-[13px] p-3 rounded-2xl ${m.role==="user"?"bg-white text-black ml-8":"bg-zinc-800 text-white mr-8"}`}>{m.text.slice(0,300)}</div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <input value={chat} onChange={e=>setChat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="hi" className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2.5 text-sm outline-none" />
              <button onClick={sendChat} className="bg-white text-black px-5 rounded-full font-bold text-sm">Send</button>
            </div>
          </div>
        </div>

        {/* Right Research Output */}
        <div className="lg:col-span-2">
          {!p &&!loading && <div className="bg-white border-2 border-dashed border-black/20 rounded-[24px] p-12 text-center text-zinc-500 font-medium">Enter Topic & Competitor and click Run Research<br/>You will get Thought / Action / Observation / Final Answer table</div>}
          {loading && <div className="bg-white border-2 border-black rounded-[24px] p-12 text-center font-bold animate-pulse">Orchestrating 6 agents... Planner → Recaller → Researcher A/B → Resolver → Evaluator → Librarian</div>}

          {p && (
            <div className="space-y-4">
              {p.thought && (
                <div className="bg-[#fff8c5] border-2 border-black rounded-[20px] p-5">
                  <div className="text-[11px] font-extrabold tracking-widest">THOUGHT</div>
                  <div className="mt-2 text-[13px] leading-6 font-medium">{p.thought}</div>
                </div>
              )}
              {p.action && (
                <div className="bg-[#d9e8ff] border-2 border-black rounded-[20px] p-5">
                  <div className="text-[11px] font-extrabold tracking-widest">ACTION</div>
                  <div className="mt-2 text-[13px] leading-6 font-medium whitespace-pre-wrap">{p.action}</div>
                </div>
              )}
              {p.observation && (
                <div className="bg-[#d1ffe0] border-2 border-black rounded-[20px] p-5">
                  <div className="text-[11px] font-extrabold tracking-widest">OBSERVATION</div>
                  <div className="mt-2 text-[13px] leading-6 font-medium">{p.observation}</div>
                </div>
              )}
              <div className="bg-white border-2 border-black rounded-[20px] p-5 overflow-auto">
                <div className="text-[11px] font-extrabold tracking-widest">FINAL ANSWER</div>
                <div className="mt-4">
                  <div className="grid gap-2">
                    {p.rows.map((r,i)=>(
                      <div key={i} className={`grid grid-cols-3 gap-3 text-[12px] p-3 rounded-xl ${i===0?"bg-black text-white font-extrabold":"bg-[#f8f6f2] border border-black/10"}`}>
                        <div>{r[0]}</div><div>{r[1]}</div><div>{r[2]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}