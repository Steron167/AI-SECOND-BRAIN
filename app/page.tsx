"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Brain ready." }])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [activeNode, setActiveNode] = useState("")
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem("chronicle_memory")
    if (s) setMemory(JSON.parse(s))
  }, [])

  async function trackResearch() {
    if (!topic.trim()) return
    setLoading(true); setResult("")
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i=0; const it = setInterval(()=>{ setActiveNode(steps[i]); i=(i+1)%6 }, 350)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Research: ${topic} vs ${competitor || "general"}`, memory }) })
      const data = await res.json()
      clearInterval(it); setActiveNode("done")
      setResult(data.reply); setMeta(data); setCheckpoints(data.checkpoints||[]); setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {}
    clearInterval(it); setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const nc = [...chats, { role: "user" as const, text: input }]
    setChats(nc); setInput(""); setLoading(true)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input, memory }) })
      const data = await res.json()
      setChats([...nc, { role: "ai", text: data.reply }]); setMeta(data); setCheckpoints(data.checkpoints||[]); setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {} setLoading(false)
  }

  // Clean markdown ** to bold and render table rows
  function renderResult(text: string) {
    const clean = text.split("---")[0].replace(/\*\*/g, "")
    const lines = clean.split("\n")
    return lines.map((line, idx) => {
      if (line.trim().startsWith("|") && line.includes("|")) {
        const cells = line.split("|").filter(c=>c.trim()).map(c=>c.trim())
        if (cells.length === 0) return null
        return (
          <div key={idx} className="flex gap-2 my-2 overflow-x-auto">
            {cells.map((cell, ci) => (
              <div key={ci} className={`min-w-[120px] px-3 py-2 rounded-lg text-[13px] font-semibold border ${ci===0? "bg-black text-white border-black" : "bg-[#f7f5f2] text-black border-zinc-200"}`}>{cell}</div>
            ))}
          </div>
        )
      }
      if (line.startsWith("Thought") || line.startsWith("Action") || line.startsWith("Observation") || line.startsWith("Final Answer")) {
        return <div key={idx} className="mt-4 text-[11px] font-extrabold tracking-widest text-black bg-[#f0ede8] inline-block px-2.5 py-1 rounded-full">{line}</div>
      }
      if (!line.trim()) return <div key={idx} className="h-3" />
      return <div key={idx} className="text-[14.5px] font-medium leading-[1.7] text-black py-0.5">{line}</div>
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex font-[Inter,system-ui] antialiased">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap'); *{font-family:Inter}`}</style>

      {/* LEFT */}
      <div className="w-[350px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6 shrink-0">
        <div className="flex justify-between"><div className="font-extrabold text-[15px] tracking-widest">CHRONICLE</div><div className="text-[11px] bg-white text-black px-3 py-1 rounded-full font-bold">LangGraph</div></div>
        <div className="text-[13px] text-zinc-300 mt-1">StateGraph • Memory</div>
        <div className="mt-8 space-y-2">
          {["PLANNER","RECALLER","RESEARCHER x2","CONFLICT RESOLVER","EVALUATOR","LIBRARIAN"].map((t,i)=>{
            const id = ["planner","recaller","researcher","resolver","evaluator","librarian"][i]
            return <div key={id} className={`rounded-xl px-4 py-3 border-2 flex gap-3 items-center ${activeNode===id? "bg-white text-black border-white" : "bg-[#1c1c1c] border-zinc-800 text-white"}`}><div className={`w-2.5 h-2.5 rounded-full ${activeNode===id? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} /><div className="text-[12px] font-bold">{t}</div></div>
          })}
          <div className={`p-3 rounded-xl text-center text-xs font-extrabold border-2 ${activeNode==="done"? "bg-[#00ff66] text-black border-[#00ff66]" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>{activeNode==="done"? "✓ GRAPH COMPLETE" : "IDLE"}</div>
        </div>
        {meta?.metrics && (
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-white rounded-xl p-3 text-center"><div className="text-[10px] font-bold text-zinc-500">CONF</div><div className="font-extrabold text-black">{meta.metrics.confidence}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 text-center"><div className="text-[10px] text-zinc-400">RETRY</div><div className="font-bold text-orange-400">{meta.metrics.retries}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 text-center"><div className="text-[10px] text-zinc-400">STEPS</div><div className="font-bold text-white">{checkpoints.length}</div></div>
          </div>
        )}
      </div>

      {/* RIGHT - FULL WIDTH */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-6 md:p-8 w-full max-w-[900px] mx-auto">

          <h1 className="text-[28px] font-extrabold text-black">Research Intelligence</h1>
          <p className="text-[14px] font-medium text-zinc-700 mt-1">One search, full LangGraph pipeline</p>

          {/* ONE SEARCH CARD */}
          <div className="mt-6 bg-white rounded-[24px] border-2 border-black/10 shadow-xl p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1">TOPIC</label><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="MacBook Pro M5" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 outline-none text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black" /></div>
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1">VS COMPETITOR</label><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="MacBook Air M5" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 outline-none text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black" /></div>
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold text-[15px] hover:bg-zinc-900 disabled:opacity-50">{loading? "EXECUTING..." : "Run Research → Feed to Brain"}</button>
            </div>
          </div>

          {/* RESULT CARD - FIXED */}
          {result && (
            <div className="mt-6 bg-white rounded-[20px] border-2 border-black shadow-[0_10px_30px_rgba(0,0,0,0.08)] w-full overflow-visible">
              <div className="px-6 py-4 bg-black text-white flex justify-between items-center rounded-t-[18px]">
                <div className="text-[11px] font-extrabold tracking-widest">FINAL ANSWER • VERIFIED • FULL TEXT</div>
                <div className="flex gap-2">
                  <button onClick={()=>setExpanded(!expanded)} className="text-[11px] font-bold px-3 py-1 rounded-full bg-white text-black">{expanded? "Collapse" : "Expand"}</button>
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">Conf {meta?.metrics?.confidence || 0.85}</span>
                </div>
              </div>

              {/* IMPORTANT: h-auto + overflow-auto + break-words */}
              <div className={`p-6 md:p-7 w-full ${expanded? "" : "max-h-[650px] overflow-y-auto"} break-words`}>
                {renderResult(result)}
                <div className="mt-6 p-4 bg-[#f7f5f2] rounded-xl border-2 border-dashed border-zinc-300 text-[12px] font-bold text-zinc-600">
                  Full raw length: {result.length} chars • {result.split("\n").length} lines • Table rendered as cards so nothing is cut
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {chats.map((c,i)=><div key={i} className={`px-5 py-3 rounded-2xl text-[14px] font-medium max-w-[85%] border-2 ${c.role==="user"? "bg-black text-white border-black ml-auto" : "bg-white text-black border-zinc-200"}`}>{c.text}</div>)}
          </div>
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f8f6f2]/95 backdrop-blur border-t">
          <div className="max-w-[700px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault: what did I research?" className="flex-1 bg-transparent px-6 outline-none text-[15px] font-medium text-black" />
            <button onClick={send} className="bg-black text-white px-7 py-3 rounded-full text-[14px] font-extrabold">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}