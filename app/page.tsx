"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Chronicle Brain ready. Search and I will execute LangGraph." }])
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

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex font-[Inter,system-ui,sans-serif] antialiased">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800&display=swap'); *{font-family:Inter,system-ui,sans-serif}`}</style>

      {/* LEFT - HIGH CONTRAST */}
      <div className="w-[350px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6">
        <div className="flex justify-between items-center">
          <div className="font-extrabold text-[15px] tracking-[0.15em]">CHRONICLE</div>
          <div className="text-[11px] bg-white text-black px-3 py-1 rounded-full font-bold tracking-wide">LangGraph</div>
        </div>
        <div className="text-[13px] text-zinc-300 mt-1.5 font-medium">Agent Framework • Memory Graph</div>

        <div className="mt-8 space-y-2.5">
          <div className="text-[11px] tracking-[0.2em] text-zinc-400 font-bold mb-3">EXECUTION GRAPH</div>
          {[
            { id:"planner", t:"PLANNER", d:"Dynamic planning" },
            { id:"recaller", t:"RECALLER", d:"vaultTool()" },
            { id:"researcher", t:"RESEARCHER x2", d:"parallel + fallback" },
            { id:"resolver", t:"CONFLICT RESOLVER", d:"verify pricing" },
            { id:"evaluator", t:"EVALUATOR", d:"self-eval + replan" },
            { id:"librarian", t:"LIBRARIAN", d:"checkpoint save" },
          ].map(n=>(
            <div key={n.id} className={`rounded-[14px] px-4 py-3 border-2 flex items-center gap-3 ${active