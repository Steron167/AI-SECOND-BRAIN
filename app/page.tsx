"use client"
import { useState, useEffect } from "react"

type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([
    { role: "ai", text: "Hi! I'm Research + Chronicle (4-in-1). I use ReAct, 2 Tools, Multi-Agents, and per-device Memory. Track a topic above." }
  ])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [lastMeta, setLastMeta] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem("chronicle_memory")
    if (saved) setMemory(JSON.parse(saved))
  }, [])

  async function trackResearch() {
    if (!topic) return alert("Enter Topic")
    setLoading(true)
    setResult("🤔 ReAct: Thought -> Action (web_search + vault_search) -> Observation...")

    const fullMessage = `Research Topic: ${topic} | Competitor: ${competitor || "general market"}. Do full research analysis.`

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage, memory }),
      })
      const data = await res.json()
      setResult(data.reply)
      setLastMeta(data)
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {
      setResult("Error - check GROQ_API_KEY in Vercel")
    }
    setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const newChats = [...chats, { role: "user" as const, text: input }]
    setChats(newChats)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory }),
      })
      const data = await res.json()
      setChats([...newChats, { role: "ai", text: data.reply }])
      setMemory(data.memory_context)
      setLastMeta(data)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {}
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-black flex">
      {/* LEFT - VAULT = Context & Memory */}
      <div className="w-[340px] bg-black text-white p-5 hidden md:flex flex-col">
        <h1 className="text-xl font-bold">◉ CHRONICLE</h1>
        <p className="text-[11px] text-gray-400 mb-1">4 Mandatory in 1 System</p>
        <div className="flex flex-wrap gap-1 mb-6">
          <span className="text-[9px] bg-zinc-800 px-2 py-1 rounded">ReAct Reasoning</span>
          <span className="text-[9px] bg-zinc-800 px-2 py-1 rounded">2 Tools</span>
          <span className="text-[9px] bg-zinc-800 px-2 py-1 rounded">Multi-Agent</span>
          <span className="text-[9px] bg-zinc-800 px-2 py-1 rounded">Memory Mgmt</span>
        </div>

        <div className="mb-4">
          <div className="text-xs text-yellow-400 mb-2">🧠 SHORT-TERM (RAM) - Last 5</div>
          <div className="bg-zinc-900 p-3 rounded text-[11px] space-y-1 max-h-28 overflow-auto">
            {memory.short?.length? memory.short.map((m:any,i:number)=><div key={i}>• {m.text||m}</div>) : <div className="text-gray-500">Empty</div>}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-green-400 mb-2">🗄️ LONG-TERM (Vault) - Per Device</div>
          <div className="bg-zinc-900 p-3 rounded text-[11px] space-y-1 max-h-60 overflow-auto">
            {memory.long?.facts?.length? memory.long.facts.map((f:string,i:number)=><div key={i}>• {f}</div>) : <div className="text-gray-500">No research yet on this device</div>}
          </div>
        </div>

        {lastMeta && (
          <div className="mb-4 bg-zinc-900 p-3 rounded text-[10px]">
            <div className="text-gray-400">Last Run:</div>
            <div>Agents: {lastMeta.agents_used?.join(", ")}</div>
            <div>Tools: {lastMeta.tools_used?.join(", ")}</div>
            <div>ReAct: {lastMeta.react_trace? "Yes" : "No"}</div>
          </div>
        )}

        <div className="mt-auto text-[10px] text-gray-500">Per-device isolated<br/>Phone ≠ Laptop<br/>localStorage based</div>
      </div>

      {/* RIGHT - Research Agent */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="p-6 md:p-8">
          <div className="text-center mb-6">
            <div className="text-lg font-medium">🔍 Research Agent</div>
            <div className="text-sm text-gray-500">Track any topic + competitor</div>
            <div className="text-[11px] text-gray-400 mt-1">Agentic ReAct + Tool Calling + Multi-Agent + Memory</div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-[20px] shadow-sm border space-y-3">
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic: e.g. Generative AI" className="w-full border rounded-xl px-5 py-3 outline-none focus:border-black text-sm" />
            <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor: e.g. OpenAI" className="w-full border rounded-xl px-5 py-3 outline-none focus:border-black text-sm" />
            <button onClick={trackResearch} disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50">
              {loading? "Running ReAct Loop..." : "Track Research"}
            </button>
          </div>

          {result && (
            <div className="mt-5 bg-white p-5 rounded-[20px] border shadow-sm whitespace-pre-wrap text-[13px] leading-6">
              {result}
            </div>
          )}
        </div>

        <div className="flex-1 px-6 md:px-8 pb-2 space-y-3 overflow-y-auto">
          {chats.map((c,i)=>(
            <div key={i} className={`p-4 rounded-2xl text-[13px] whitespace-pre-wrap ${c.role==="user"? "bg-black text-white ml-12" : "bg-white border shadow-sm mr-12"}`}>{c.text}</div>
          ))}
        </div>

        <div className="p-4 border-t bg-white sticky bottom-0">
          <div className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Ask "what did I research before?" to test memory' className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-3 rounded-full text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}