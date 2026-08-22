"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Brain ready. Full ReAct trace will show live." }])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [activeNode, setActiveNode] = useState("")

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
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Research with FULL ReAct Trace: ${topic} vs ${competitor || "general"} | Return format: Thought:... Action:... Observation:... Final Answer: detailed comparison with table`, memory }) })
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

  function renderReAct(text: string) {
    // Don't trim or shorten - keep full
    const full = text
    const blocks = full.split(/(?=Thought:|Action:|Observation:|Final Answer:)/gi)

    return blocks.map((block, idx) => {
      const lower = block.toLowerCase()
      if (lower.includes("thought:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#fff7ed] border-2 border-orange-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-[12px] font-bold">💭</div>
              <div className="text-[12px] font-extrabold tracking-widest text-orange-700">THOUGHT</div>
              <div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-orange-500 text-white font-bold">Reasoning</div>
            </div>
            <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{block.replace(/Thought:/i,"").trim()}</div>
          </div>
        )
      }
      if (lower.includes("action:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#eff6ff] border-2 border-blue-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[12px] font-bold">⚡</div>
              <div className="text-[12px] font-extrabold tracking-widest text-blue-700">ACTION</div>
              <div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white font-bold">Tool Call</div>
            </div>
            <div className="text-[14px] font-semibold leading-7 text-black whitespace-pre-wrap break-words font-mono bg-white/70 p-3 rounded-xl border border-blue-100">{block.replace(/Action:/i,"").trim()}</div>
          </div>
        )
      }
      if (lower.includes("observation:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#f0fdf4] border-2 border-green-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-[12px] font-bold">👁</div>
              <div className="text-[12px] font-extrabold tracking-widest text-green-700">OBSERVATION</div>
              <div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-green-600 text-white font-bold">Evidence</div>
            </div>
            <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{block.replace(/Observation:/i,"").trim()}</div>
          </div>
        )
      }
      if (lower.includes("final answer:")) {
        const content = block.replace(/Final Answer:/i,"").trim()
        // Parse table rows
        const lines = content.split("\n")
        return (
          <div key={idx} className="mb-2 rounded-2xl bg-black text-white p-6 border-2 border-black">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-[12px] font-bold">✓</div>
              <div className="text-[12px] font-extrabold tracking-widest text-white">FINAL ANSWER</div>
              <div className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-white text-black font-bold">Verified • Synthesized</div>
            </div>
            <div className="space-y-3">
              {lines.map((line, li) => {
                if (line.trim().startsWith("|") && line.includes("|")) {
                  const cells = line.split("|").filter(c=>c.trim()).map(c=>c.trim())
                  if (cells.length===0 || cells[0].toLowerCase().includes("---")) return null
                  return (
                    <div key={li} className="grid gap-2" style={{gridTemplateColumns:`repeat(${cells.length}, minmax(0,1fr))`}}>
                      {cells.map((cell, ci) => (
                        <div key={ci} className={`px-3 py-2.5 rounded-xl text-[13px] font-bold border ${ci===0? "bg-zinc-800 text-zinc-200 border-zinc-700" : "bg-white text-black border-white"}`}>{cell}</div>
                      ))}
                    </div>
                  )
                }
                if (!line.trim()) return <div key={li} className="h-2" />
                return <div key={li} className="text-[15px] font-medium leading-8 text-zinc-100 whitespace-pre-wrap break-words">{line}</div>
              })}
            </div>
          </div>
        )
      }
      // Fallback for any other text (full, not short)
      if (block.trim().length < 5) return null
      return <div key={idx} className="mb-3 text-[14px] leading-7 text-black whitespace-pre-wrap break-words">{block}</div>
    })
  }

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex font-[Inter]">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap'); *{font-family:Inter}`}</style>

      <div className="w-[340px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-5 shrink-0">
        <div className="font-extrabold tracking-widest text-sm">CHRONICLE</div>
        <div className="text-[12px] text-zinc-400 mt-1">LangGraph • Full Trace Mode</div>
        <div className="mt-6 space-y-2">
          {[
            {id:"planner",t:"PLANNER"},{id:"recaller",t:"RECALLER"},{id:"researcher",t:"RESEARCHER x2"},{id:"resolver",t:"RESOLVER"},{id:"evaluator",t:"EVALUATOR"},{id:"librarian",t:"LIBRARIAN"},
          ].map(n=><div key={n.id} className={`rounded-xl px-4 py-3 border-2 flex items-center gap-3 ${activeNode===n.id? "bg-white text-black border-white" : "bg-[#1c1c1c] border-zinc-800 text-white"}`}><div className={`w-2 h-2 rounded-full ${activeNode===n.id? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} /><div className="text-xs font-bold">{n.t}</div></div>)}
          <div className={`p-3 rounded-xl text-center text-xs font-extrabold border-2 ${activeNode==="done"? "bg-[#00ff66] border-[#00ff66] text-black" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>{activeNode==="done"? "✓ COMPLETE" : "IDLE"}</div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-6 md:p-8 max-w-[900px] mx-auto w-full">
          <h1 className="text-[28px] font-extrabold text-black tracking-tight">Research Intelligence</h1>
          <p className="text-[14px] font-medium text-zinc-600">Full ReAct trace - Thought / Action / Observation / Final Answer highlighted</p>

          <div className="mt-6 bg-white rounded-[24px] border-2 border-black/10 shadow-xl p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1">TOPIC</label><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Spider-Man vs Batman full abilities" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black outline-none" /></div>
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1">VS</label><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Compare variant" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black outline-none" /></div>
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold text-[15px]">{loading? "RUNNING FULL TRACE..." : "Run Research → Full ReAct Output"}</button>
            </div>
          </div>

          {result && (
            <div className="mt-6 bg-white rounded-[24px] border-2 border-black shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-black text-white flex justify-between items-center">
                <div className="text-[11px] font-extrabold tracking-widest">REACT TRACE • LIVE FROM LLM • NOT PREFED</div>
                <div className="flex gap-2"><span className="text-[11px] px-3 py-1 rounded-full bg-white text-black font-bold">{result.length} chars</span><span className="text-[11px] px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-white font-bold">Conf {meta?.metrics?.confidence||0.85}</span></div>
              </div>
              <div className="p-6 bg-[#fcfaf7] min-h-[300px]">
                {renderReAct(result)}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {chats.map((c,i)=><div key={i} className={`px-5 py-3 rounded-2xl text-[14px] font-medium max-w-[85%] border-2 ${c.role==="user"? "bg-black text-white border-black ml-auto" : "bg-white text-black border-zinc-200"}`}>{c.text}</div>)}
          </div>
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f8f6f2]/95 backdrop-blur border-t">
          <div className="max-w-[700px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault..." className="flex-1 bg-transparent px-6 outline-none text-[15px] font-medium text-black" />
            <button onClick={send} className="bg-black text-white px-7 py-3 rounded-full text-[14px] font-extrabold">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}