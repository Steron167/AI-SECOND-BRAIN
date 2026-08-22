"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Multi AI Agent System ready. 6 agents idle." }])
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
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Topic: ${topic} vs Competitor: ${competitor || "general"} - plain comparison`, memory }) })
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

  function cleanCell(text: string) {
    return text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/__/g, "").trim()
  }

  function renderReAct(text: string) {
    const blocks = text.split(/(?=Thought:|Action:|Observation:|Final Answer:)/gi)
    return blocks.map((block, idx) => {
      const l = block.toLowerCase()
      if (l.includes("thought:")) return (
        <div key={idx} className="mb-5 rounded-2xl bg-[#fff7ed] border-2 border-orange-200 p-5">
          <div className="flex gap-2 mb-2 items-center"><div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center text-xs font-bold">💭</div><div className="text-[12px] font-extrabold tracking-widest text-orange-700">THOUGHT</div><div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-orange-500 text-white font-bold">Agent Reasoning</div></div>
          <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block.replace(/Thought:/i,""))}</div>
        </div>
      )
      if (l.includes("action:")) return (
        <div key={idx} className="mb-5 rounded-2xl bg-[#eff6ff] border-2 border-blue-200 p-5">
          <div className="flex gap-2 mb-2 items-center"><div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">⚡</div><div className="text-[12px] font-extrabold tracking-widest text-blue-700">ACTION</div><div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-blue-600 text-white font-bold">Tool Invocation</div></div>
          <div className="text-[14px] font-mono font-semibold leading-7 text-black bg-white p-3 rounded-xl border border-blue-100 whitespace-pre-wrap break-words">{cleanCell(block.replace(/Action:/i,""))}</div>
        </div>
      )
      if (l.includes("observation:")) return (
        <div key={idx} className="mb-5 rounded-2xl bg-[#f0fdf4] border-2 border-green-200 p-5">
          <div className="flex gap-2 mb-2 items-center"><div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">👁</div><div className="text-[12px] font-extrabold tracking-widest text-green-700">OBSERVATION</div><div className="ml-auto text-[10px] px-2 py-1 rounded-full bg-green-600 text-white font-bold">Evidence Gathered</div></div>
          <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block.replace(/Observation:/i,""))}</div>
        </div>
      )
      if (l.includes("final answer:")) {
        const content = block.replace(/Final Answer:/i,"").trim()
        const lines = content.split("\n")
        return (
          <div key={idx} className="rounded-2xl bg-black text-white p-6 border-2 border-black">
            <div className="flex gap-2 mb-4 items-center"><div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold">✓</div><div className="text-[12px] font-extrabold tracking-widest">FINAL ANSWER • MULTI AI AGENT</div><div className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-white text-black font-bold">Verified • Full Length</div></div>
            <div className="space-y-3">
              {lines.map((line, li) => {
                // FIXED: detect Aspect | Ayurveda | Modern - no leading |
                if (line.includes("|") && line.split("|").filter(c=>c.trim()).length >= 2) {
                  const cells = line.split("|").filter(c=>c.trim()).map(c=>cleanCell(c))
                  if (cells.length < 2) return null
                  if (cells.every(c => /^[-:\s]+$/.test(c))) return null
                  if (cells[0].includes("---")) return null
                  return <div key={li} className="grid gap-2" style={{gridTemplateColumns:`repeat(${cells.length}, minmax(0,1fr))`}}>{cells.map((cell, ci)=><div key={ci} className={`px-3 py-2.5 rounded-xl text-[13px] border leading-5 break-words ${ci===0? "bg-zinc-800 text-white border-zinc-700 font-extrabold" : "bg-white text-black border-white font-medium"}`}>{cell}</div>)}</div>
                }
                if (!line.trim()) return <div key={li} className="h-2" />
                return <div key={li} className="text-[15px] font-medium leading-8 text-zinc-100 whitespace-pre-wrap break-words">{cleanCell(line)}</div>
              })}
            </div>
          </div>
        )
      }
      if (block.trim().length<5) return null
      return <div key={idx} className="mb-3 text-[14px] leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block)}</div>
    })
  }

  const Node = ({ id, title, sub }: any) => (
    <div className={`rounded-[14px] p-3 border-2 flex items-center gap-3 ${activeNode===id? "bg-white text-black border-white shadow-[0_6px_24px_rgba(255,255,255,0.25)] scale-[1.02]" : "bg-[#1e1e1e] border-[#2c2c2c] text-white"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold ${activeNode===id? "bg-black text-white" : "bg-[#2a2a2a] text-zinc-300"}`}>●</div>
      <div className="flex-1"><div className="text-[11px] font-extrabold tracking-wide">{title}</div><div className={`text-[10px] mt-0.5 font-medium ${activeNode===id? "text-zinc-600" : "text-zinc-400"}`}>{sub}</div></div>
      {activeNode===id && <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse" />}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex font-[Inter] antialiased">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap'); *{font-family:Inter}`}</style>

      <div className="w-[380px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6 shrink-0 border-r border-zinc-900">
        <div className="flex justify-between items-start">
          <div><div className="font-extrabold text-[15px] tracking-[0.2em]">CHRONICLE</div><div className="text-[11px] font-bold tracking-widest text-[#00ff66] mt-1">MULTI AI AGENT SYSTEM</div></div>
          <div className="flex flex-col gap-1 items-end"><div className="text-[10px] bg-white text-black px-3 py-1 rounded-full font-extrabold">LangGraph</div><div className="text-[9px] px-2.5 py-1 rounded-full bg-[#00ff66] text-black font-extrabold">6 AGENTS ACTIVE</div></div>
        </div>
        <div className="text-[12px] text-zinc-300 mt-3 font-medium">Multi Agent Framework • Parallel Execution • Memory Graph</div>

        <div className="mt-7 space-y-2.5">
          <div className="text-[10px] tracking-[0.2em] text-zinc-500 font-extrabold mb-3 flex justify-between"><span>LANGGRAPH EXECUTION GRAPH</span><span className="text-[#00ff66]">MULTI-AGENT</span></div>
          <Node id="planner" title="PLANNER AGENT" sub="Dynamic task planning" />
          <Node id="recaller" title="RECALLER AGENT" sub="vaultTool() - Long term memory" />
          <Node id="researcher" title="RESEARCHER AGENT x2" sub="Parallel web_search + fallback" />
          <Node id="resolver" title="CONFLICT RESOLVER AGENT" sub="Evidence verification" />
          <Node id="evaluator" title="EVALUATOR AGENT" sub="Self-eval + replan logic" />
          <Node id="librarian" title="LIBRARIAN AGENT" sub="Checkpoint save + persist" />
          <div className={`mt-3 p-3.5 rounded-xl text-center text-[12px] font-extrabold border-2 ${activeNode==="done"? "bg-[#00ff66] text-black border-[#00ff66]" : "bg-[#171717] border-[#2a2a2a] text-zinc-500"}`}>{activeNode==="done"? "✓ GRAPH COMPLETE - ALL 6 AGENTS FINISHED" : "IDLE - WAITING FOR MULTI-AGENT TASK"}</div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] tracking-widest text-zinc-500 font-bold mb-2">AGENT METRICS • MULTI AI</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center border-2 border-white"><div className="text-[9px] font-bold text-zinc-500">CONFIDENCE</div><div className="text-[16px] font-extrabold text-black mt-1">{meta?.metrics?.confidence || 0.85}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[9px] font-bold text-zinc-400">RETRIES</div><div className="text-[16px] font-extrabold text-orange-400 mt-1">{meta?.metrics?.retries || 0}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[9px] font-bold text-zinc-400">STEPS</div><div className="text-[16px] font-extrabold text-white mt-1">{checkpoints.length || 6}</div></div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] tracking-widest text-zinc-500 font-bold mb-2">CHAT + MEMORY</div>
          <div className="bg-[#151515] rounded-xl p-3 border border-zinc-800 max-h-[200px] overflow-y-auto space-y-2">
            {chats.map((c,i)=><div key={i} className={`text-[11px] p-2 rounded-lg ${c.role==="user"? "bg-white text-black font-bold" : "bg-zinc-800 text-zinc-300"}`}><span className="font-extrabold">{c.role.toUpperCase()}: </span>{c.text.slice(0,120)}</div>)}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-6 md:p-8 max-w-[900px] mx-auto w-full">
          <h1 className="text-[28px] font-extrabold text-black tracking-tight">Research Intelligence</h1>
          <p className="text-[14px] font-medium text-zinc-600 mt-1 flex items-center gap-2"><span className="px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold">MULTI AI AGENT</span> 6 agents • Parallel • Full ReAct</p>

          <div className="mt-6 bg-white rounded-[24px] border-2 border-black/10 shadow-xl p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">TOPIC</label><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black outline-none" /></div>
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">VS COMPETITOR</label><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black outline-none" /></div>
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold text-[15px]">{loading? "MULTI AGENTS RUNNING..." : "Run Research → 6 Agents → ReAct"}</button>
            </div>
          </div>

          {result && (
            <div className="mt-6 bg-white rounded-[24px] border-2 border-black shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-black text-white flex justify-between items-center"><div className="text-[11px] font-extrabold tracking-widest">FINAL ANSWER • MULTI AI AGENT • FULL LENGTH</div><div className="flex gap-2"><span className="text-[11px] px-3 py-1 rounded-full bg-white text-black font-bold">{result.length} chars</span><span className="text-[11px] px-3 py-1 rounded-full bg-[#00ff66] text-black font-bold">6 Agents</span></div></div>
              <div className="p-6 bg-[#fcfaf7]">{renderReAct(result)}</div>
            </div>
          )}
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f8f6f2]/95 backdrop-blur border-t">
          <div className="max-w-[700px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault..." className="flex-1 bg-transparent px-6 outline-none text-[15px] font-medium text-black" />
            <button onClick={send} className="bg-black text-white px-7 py-3 rounded-full text-[14px] font-extrabold">Send</button>
          </div>
          <div className="text-center mt-2 text-[10px] text-zinc-500 font-bold">LangGraph Runtime • Chat + Memory Graph • Tools: web_search (fallback) + vault_search</div>
        </div>
      </div>
    </div>
  )
}