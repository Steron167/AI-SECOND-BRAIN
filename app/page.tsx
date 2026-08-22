"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([
    { role: "ai", text: "Research Agent is separate from LangGraph Brain. Track a topic to see Graph execute in left lane." }
  ])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [activeNode, setActiveNode] = useState<string>("")

  useEffect(() => {
    const saved = localStorage.getItem("chronicle_memory")
    if (saved) setMemory(JSON.parse(saved))
  }, [])

  async function trackResearch() {
    if (!topic) return alert("Enter Topic")
    setLoading(true)
    setActiveNode("planner")
    setResult("")
    setCheckpoints([])

    // animate graph
    const steps = ["planner","recaller","researcher","conflictResolver","evaluator","librarian"]
    let idx = 0
    const interval = setInterval(()=>{ setActiveNode(steps[idx]); idx=(idx+1)%steps.length }, 500)

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Research Topic: ${topic} | Competitor: ${competitor || "general"}`, memory }),
      })
      const data = await res.json()
      clearInterval(interval)
      setActiveNode("done")
      setResult(data.reply)
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch { clearInterval(interval); setResult("Error") }
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

  const Node = ({ id, label, sub, color }: any) => (
    <div className={`relative p-3 rounded-xl border-2 transition-all ${activeNode===id? "border-white bg-zinc-800 scale-105 shadow-lg shadow-white/20" : "border-zinc-700 bg-zinc-900 opacity-70"}`}>
      <div className={`w-2 h-2 rounded-full absolute -left-1 top-1/2 ${activeNode===id? "bg-green-400 animate-ping" : "bg-zinc-600"}`} />
      <div className="text-[11px] font-bold" style={{color}}>{label}</div>
      <div className="text-[9px] text-gray-400">{sub}</div>
      {activeNode===id && <div className="text-[8px] text-green-300 mt-1">● RUNNING</div>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#faf9f5] text-black flex">
      {/* LEFT - LANGGRAPH BRAIN ONLY - DIFFERENT DESIGN */}
      <div className="w-[400px] bg-[#0a0a0a] text-white p-5 hidden lg:flex flex-col border-r border-zinc-800">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-widest">LANGGRAPH BRAIN</h1>
          <div className="text-[9px] bg-white text-black px-2 py-1 rounded-full">StateGraph v1</div>
        </div>
        <div className="text-[10px] text-zinc-500 mt-1 mb-4">Framework ≠ Search | Separate Orchestration Layer</div>

        {/* GRAPH VISUAL - DIFFERENT THAN SEARCH */}
        <div className="bg-[#111] rounded-2xl p-4 border border-zinc-800 mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold text-cyan-400">EXECUTION GRAPH</span>
            <span className="text-[9px] text-zinc-500">{loading? "EXECUTING..." : "IDLE"}</span>
          </div>

          <div className="space-y-2 relative">
            <div className="absolute left-[3px] top-2 bottom-2 w-[1px] bg-gradient-to-b from-yellow-500 via-blue-500 to-green-500 opacity-30" />
            <Node id="planner" label="🧠 PLANNER" sub="Dynamic Planning + Task Decomposition" color="#facc15" />
            <div className="text-[9px] text-zinc-600 ml-4">↓ conditional routing</div>
            <Node id="recaller" label="🗄️ RECALLER" sub="vaultTool() | Memory Reasoning" color="#60a5fa" />
            <Node id="researcher" label="🌐 RESEARCHER x2" sub="web_search parallel | Fallback + Retry" color="#4ade80" />
            <Node id="conflictResolver" label="⚖️ CONFLICT RESOLVER" sub="Hypothesis Verification | $50k vs $74.5k" color="#fb923c" />
            <Node id="evaluator" label="🔍 EVALUATOR" sub="Self-Eval | Loop Detect | Replan if <0.5" color="#c084fc" />
            <Node id="librarian" label="💾 LIBRARIAN" sub="Checkpoint Save | Long-term Vault" color="#f472b6" />
            <div className={`p-2 rounded-lg text-center text-[10px] font-bold ${activeNode==="done"? "bg-green-900 text-green-300 border border-green-700" : "bg-zinc-900 text-zinc-600"}`}>
              {activeNode==="done"? "✓ GRAPH COMPLETE → Final Answer" : "◌ END"}
            </div>
          </div>
        </div>

        {/* LIVE METRICS */}
        {meta?.metrics && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[8px] text-zinc-500">CONFIDENCE</div>
              <div className="text-green-400 font-bold">{meta.metrics.confidence}</div>
              <div className="text-[7px] text-zinc-500">uncertainty-aware</div>
            </div>
            <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[8px] text-zinc-500">RETRIES</div>
              <div className="text-orange-400 font-bold">{meta.metrics.retries}</div>
              <div className="text-[7px] text-zinc-500">failure recovery</div>
            </div>
            <div className="bg-zinc-900 p-2 rounded-xl border border-zinc-800 text-center">
              <div className="text-[8px] text-zinc-500">CHECKPOINTS</div>
              <div className="font-bold">{checkpoints.length}</div>
              <div className="text-[7px] text-zinc-500">state saved</div>
            </div>
          </div>
        )}

        <div className="bg-zinc-900 rounded-xl p-3 mb-3">
          <div className="text-[10px] text-zinc-400 mb-1">TOOLS WITH FALLBACK</div>
          <div className="text-[9px] font-mono space-y-1">
            <div className="flex justify-between"><span>web_search</span><span className="text-green-400">Tavily → DuckDuckGo</span></div>
            <div className="flex justify-between"><span>vault_search</span><span className="text-blue-400">per-device</span></div>
          </div>
        </div>

        <div className="flex-1 overflow-auto space-y-2">
          <div className="text-[10px] text-zinc-500">CHECKPOINT LOG</div>
          {checkpoints.map((c:any,i:number)=><div key={i} className="text-[8px] font-mono bg-zinc-900 p-2 rounded border-l-2 border-cyan-500">#{i+1} {c.node} → {JSON.stringify(c).slice(0,60)}</div>)}
        </div>
      </div>

      {/* RIGHT - RESEARCH AGENT - COMPLETELY DIFFERENT UI */}
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="p-6">
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white">🔍</div>
              <div>
                <div className="font-bold text-[15px]">Research Agent</div>
                <div className="text-[11px] text-gray-500">Search Layer - Separate from Brain</div>
              </div>
              <div className="ml-auto text-[9px] bg-gray-100 px-2 py-1 rounded-full">Input → Tools → Evidence</div>
            </div>

            <div className="mt-5 space-y-3">
              <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic: e.g. Generative AI" className="w-full bg-[#f6f6f3] border border-transparent focus:border-black rounded-full px-5 py-3 outline-none text-sm" />
              <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor: e.g. OpenAI" className="w-full bg-[#f6f6f3] border border-transparent focus:border-black rounded-full px-5 py-3 outline-none text-sm" />
              <button onClick={trackResearch} disabled={loading} className="w-full bg-black text-white py-3.5 rounded-full font-medium text-sm disabled:opacity-50">
                {loading? "Graph Running (see left)..." : "Run Research → Feed to Graph"}
              </button>
            </div>
          </div>

          {result && (
            <div className="mt-4 bg-white p-5 rounded-[20px] border shadow-sm whitespace-pre-wrap text-[13px] leading-6">
              <div className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest">Final Synthesized Answer (From Graph)</div>
              {result}
            </div>
          )}

          {/* MEMORY - STILL SEPARATE */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border">
              <div className="text-[11px] font-bold">🧠 Short-Term RAM</div>
              <div className="text-[11px] text-gray-500 mt-1">{memory.short?.length? memory.short.slice(-3).map((m:any)=>m.text||m).join(", ") : "Empty"}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border">
              <div className="text-[11px] font-bold">🗄️ Long-Term Vault</div>
              <div className="text-[10px] text-gray-500 mt-1">{memory.long?.facts?.length? `${memory.long.facts.length} facts stored (per-device)` : "Empty on this device"}</div>
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pb-2 space-y-3 overflow-y-auto">
          {chats.map((c,i)=><div key={i} className={`p-4 rounded-2xl text-[13px] ${c.role==="user"? "bg-black text-white ml-12 rounded-br-none" : "bg-white border shadow-sm mr-12 rounded-bl-none"}`}>{c.text}</div>)}
        </div>

        <div className="p-4 border-t bg-[#faf9f5] sticky bottom-0">
          <div className="flex gap-2 bg-white p-2 rounded-full border shadow-sm">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Ask vault: "what did I research?"' className="flex-1 bg-transparent px-4 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-2.5 rounded-full text-sm">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}