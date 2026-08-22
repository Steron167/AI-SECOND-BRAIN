"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([
    { role: "ai", text: "Hi! I'm Research + Chronicle with LangGraph StateGraph. 5 Mandatory ready. Track a topic - I'll show full adversarial graph execution." }
  ])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])

  useEffect(() => {
    const saved = localStorage.getItem("chronicle_memory")
    if (saved) setMemory(JSON.parse(saved))
  }, [])

  async function trackResearch() {
    if (!topic) return alert("Enter Topic")
    setLoading(true)
    setResult("🧠 LANGGRAPH: Planner -> Conditional Routing -> Parallel Execution...")
    setCheckpoints([])
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Research Topic: ${topic} | Competitor: ${competitor || "general"}. Do full analysis with tool fallback test.`, memory }),
      })
      const data = await res.json()
      setResult(data.reply)
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch { setResult("Error - check GROQ_API_KEY") }
    setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const newChats = [...chats, { role: "user" as const, text: input }]
    setChats(newChats); setInput(""); setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory }),
      })
      const data = await res.json()
      setChats([...newChats, { role: "ai", text: data.reply }])
      setMeta(data); setCheckpoints(data.checkpoints||[])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {} setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-black flex">
      {/* LEFT - Vault + Graph */}
      <div className="w-[380px] bg-black text-white p-5 hidden lg:flex flex-col overflow-y-auto">
        <h1 className="text-xl font-bold">◉ CHRONICLE</h1>
        <p className="text-[11px] text-gray-400">LangGraph StateGraph Framework</p>
        <div className="flex flex-wrap gap-1 my-3">
          <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded border-green-500">Framework: LangGraph</span>
          <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded">ReAct</span>
          <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded">2 Tools + Fallback</span>
          <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded">Multi-Agent (6)</span>
          <span className="text-[8px] bg-zinc-800 px-2 py-1 rounded">Memory Mgmt</span>
        </div>

        {/* FRAMEWORK GRAPH */}
        <div className="bg-zinc-900 rounded-xl p-3 mb-4 border border-zinc-800">
          <div className="text-[11px] text-yellow-400 font-bold mb-2">🕸️ STATE GRAPH EXECUTION</div>
          <div className="text-[9px] font-mono space-y-1">
            <div className="text-gray-300">START → <span className="text-yellow-300">plannerNode()</span> [Dynamic Planning]</div>
            <div className="ml-3 text-gray-400">↓ Conditional Routing</div>
            <div className="text-blue-300">├─ recallerNode() [vaultTool]</div>
            <div className="text-green-300">├─ researcherParallelNode() [web_search x2 parallel]</div>
            <div className="text-orange-300">├─ conflictResolverNode() [Evidence Conflict]</div>
            <div className="text-purple-300">├─ evaluatorNode() [Self-Eval + Loop Detection]</div>
            <div className="text-gray-400 ml-3">↓ if confidence &lt;0.5 → REPLAN → loop</div>
            <div className="text-pink-300">└─ librarianNode() [Checkpoint Save]</div>
          </div>
        </div>

        {meta?.metrics && (
          <div className="bg-zinc-900 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-center">
            <div><div className="text-[9px] text-gray-400">CONFIDENCE</div><div className="text-sm font-bold text-green-400">{meta.metrics.confidence}</div></div>
            <div><div className="text-[9px] text-gray-400">RETRIES</div><div className="text-sm font-bold text-orange-400">{meta.metrics.retries}</div><div className="text-[8px] text-gray-500">Fallback OK</div></div>
            <div><div className="text-[9px] text-gray-400">CHECKPOINTS</div><div className="text-sm font-bold">{checkpoints.length}</div></div>
          </div>
        )}

        {checkpoints.length>0 && (
          <div className="bg-zinc-900 rounded-xl p-3 mb-4">
            <div className="text-[11px] text-cyan-400 mb-2">📍 CHECKPOINTING TRACE</div>
            <div className="space-y-1 max-h-32 overflow-auto text-[9px] font-mono">
              {checkpoints.map((c:any,i:number)=><div key={i} className="text-gray-300">#{i+1} {c.node} @ {new Date(c.ts).toLocaleTimeString()} {c.plan? `→ [${c.plan.join(",")}]` : ""}</div>)}
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="text-[11px] text-yellow-400 mb-1">🧠 SHORT-TERM (RAM)</div>
          <div className="bg-zinc-900 p-2 rounded text-[10px] max-h-20 overflow-auto">{memory.short?.length? memory.short.map((m:any,i:number)=><div key={i}>• {m.text||m}</div>) : <span className="text-gray-500">Empty</span>}</div>
        </div>

        <div className="mb-3">
          <div className="text-[11px] text-green-400 mb-1">🗄️ LONG-TERM (Vault) Per-Device</div>
          <div className="bg-zinc-900 p-2 rounded text-[10px] max-h-32 overflow-auto">{memory.long?.facts?.length? memory.long.facts.map((f:string,i:number)=><div key={i}>• {f}</div>) : <span className="text-gray-500">No data on this device</span>}</div>
        </div>

        <div className="mt-auto text-[9px] text-gray-500 leading-3">
          <b>Why LangGraph?</b><br/>CrewAI=sequential fixed. AutoGen=chat-only. LangGraph= stateful graph, checkpointing, conditional routing, parallel, loop detection. Perfect for Chronicle brain. Supports adversarial test: tool fail → fallback, conflict → resolver, low conf → replan.
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="p-6">
          <div className="text-center mb-4">
            <div className="text-lg font-medium">🔍 Research Agent + LangGraph</div>
            <div className="text-[11px] text-gray-500">Dynamic Planning | Parallel Execution | Failure Recovery | Conflict Resolution</div>
          </div>

          <div className="bg-white p-5 rounded-[20px] shadow-sm border space-y-3">
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic: e.g. Robotic Infrastructure" className="w-full border rounded-xl px-5 py-3 outline-none focus:border-black text-sm" />
            <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor: e.g. Boston Dynamics" className="w-full border rounded-xl px-5 py-3 outline-none focus:border-black text-sm" />
            <button onClick={trackResearch} disabled={loading} className="w-full bg-black text-white py-3 rounded-xl font-medium text-sm disabled:opacity-50">
              {loading? "Executing StateGraph..." : "Track Research (Adversarial Test)"}
            </button>
            <div className="text-[10px] text-gray-400 text-center">Simulates 30% tool failure → auto fallback to prove recovery</div>
          </div>

          {meta && (
            <div className="mt-4 bg-black text-white p-3 rounded-xl text-[10px] grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
              <div>Agents: {meta.agents_used?.join(", ")}</div>
              <div>Tools: {meta.tools_used?.join(", ")}</div>
              <div>Framework: {meta.framework}</div>
              <div>Trace: ReAct + Self-Eval</div>
            </div>
          )}

          {result && <div className="mt-4 bg-white p-5 rounded-[20px] border shadow-sm whitespace-pre-wrap text-[13px] leading-6">{result}</div>}
        </div>

        <div className="flex-1 px-6 pb-2 space-y-3 overflow-y-auto">
          {chats.map((c,i)=><div key={i} className={`p-4 rounded-2xl text-[13px] whitespace-pre-wrap ${c.role==="user"? "bg-black text-white ml-12" : "bg-white border shadow-sm mr-12"}`}>{c.text}</div>)}
        </div>

        <div className="p-4 border-t bg-white sticky bottom-0">
          <div className="flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Test: "what did I research?" or "compare pricing"' className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-3 rounded-full text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}