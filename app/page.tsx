"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "LangGraph Brain is active. Track a topic." }])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [activeNode, setActiveNode] = useState("")

  useEffect(() => {
    const saved = localStorage.getItem("chronicle_memory")
    if (saved) setMemory(JSON.parse(saved))
  }, [])

  async function trackResearch() {
    if (!topic) return
    setLoading(true); setResult("")
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i=0; const it = setInterval(()=>{ setActiveNode(steps[i]); i=(i+1)%6 }, 400)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Research Topic: ${topic} | Competitor: ${competitor || "general"}`, memory }) })
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

  const Node = ({ id, title, sub }: any) => (
    <div className={`rounded-xl p-3 border-2 flex items-center gap-3 ${activeNode===id? "bg-white text-black border-white shadow-xl" : "bg-[#1a1a1a] border-[#2a2a2a] text-zinc-300"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${activeNode===id? "bg-black text-white" : "bg-zinc-700 text-white"}`}>●</div>
      <div><div className="text-[11px] font-bold tracking-wide">{title}</div><div className="text-[10px] opacity-60">{sub}</div></div>
      {activeNode===id && <div className="ml-auto text-[10px] text-green-500 font-bold">RUNNING</div>}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex text-black">
      {/* LEFT - SOLID DARK */}
      <div className="w-[380px] hidden lg:flex flex-col bg-[#0f0f0f] text-white p-5 border-r border-zinc-800">
        <div className="flex justify-between items-center">
          <h1 className="font-black tracking-widest text-sm">CHRONICLE</h1>
          <span className="text-[10px] bg-white text-black px-2.5 py-1 rounded-full font-bold">LangGraph</span>
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 mb-4">Agent Framework • Memory</div>

        <div className="text-[10px] text-zinc-500 tracking-widest mb-2 font-bold">LANGGRAPH EXECUTION</div>
        <div className="space-y-2.5">
          <Node id="planner" title="PLANNER" sub="Dynamic planning" />
          <Node id="recaller" title="RECALLER" sub="vaultTool()" />
          <Node id="researcher" title="RESEARCHER x2" sub="parallel + fallback" />
          <Node id="resolver" title="CONFLICT RESOLVER" sub="evidence verify" />
          <Node id="evaluator" title="EVALUATOR" sub="self-eval + replan" />
          <Node id="librarian" title="LIBRARIAN" sub="checkpoint save" />
          <div className={`p-2.5 rounded-xl text-center text-xs font-bold border ${activeNode==="done"? "bg-green-500 text-black border-green-500" : "bg-zinc-900 text-zinc-500 border-zinc-800"}`}>{activeNode==="done"? "✓ COMPLETE" : "IDLE"}</div>
        </div>

        {meta?.metrics && (
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-[#1e1e1e] border border-zinc-800 rounded-xl p-2.5 text-center"><div className="text-[8px] text-zinc-500">CONFIDENCE</div><div className="text-green-400 font-bold">{meta.metrics.confidence}</div></div>
            <div className="bg-[#1e1e1e] border border-zinc-800 rounded-xl p-2.5 text-center"><div className="text-[8px] text-zinc-500">RETRIES</div><div className="text-orange-400 font-bold">{meta.metrics.retries}</div></div>
            <div className="bg-[#1e1e1e] border border-zinc-800 rounded-xl p-2.5 text-center"><div className="text-[8px] text-zinc-500">STEPS</div><div className="font-bold">{checkpoints.length}</div></div>
          </div>
        )}
        <div className="mt-auto text-[10px] text-zinc-600">Why LangGraph {" > "} CrewAI? Stateful, checkpointing, parallel.</div>
      </div>

      {/* RIGHT - SOLID LIGHT */}
      <div className="flex-1 flex flex-col max-w-[800px] mx-auto w-full">
        <div className="p-6">
          <div className="mb-2">
            <h2 className="text-2xl font-bold tracking-tight">Research Agent</h2>
            <p className="text-sm text-zinc-500">Search Layer - Separate from Brain</p>
          </div>

          <div className="bg-white rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] border border-zinc-100 mt-5">
            <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic — e.g. Macbook" className="w-full bg-[#f2f0eb] rounded-full px-5 py-3.5 outline-none text-sm border border-transparent focus:border-black focus:bg-white transition" />
            <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor — e.g. Hp victus" className="w-full bg-[#f2f0eb] rounded-full px-5 py-3.5 outline-none text-sm mt-3 border border-transparent focus:border-black focus:bg-white transition" />
            <button onClick={trackResearch} disabled={loading} className="w-full bg-black text-white py-3.5 rounded-full font-semibold text-sm mt-4 hover:bg-zinc-800 transition disabled:opacity-50">
              {loading? "Running LangGraph →" : "Run Research → Feed to Graph"}
            </button>
          </div>

          {result && (
            <div className="mt-5">
              <div className="flex gap-2 mb-3">
                {result.includes("FALLBACK") && <span className="text-xs bg-orange-100 text-orange-700 px-3 py-1 rounded-full border border-orange-200 font-medium">⚠ Fallback Recovered</span>}
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200 font-medium">✓ Verified</span>
              </div>
              <div className="bg-white rounded-[20px] border border-zinc-200 p-6 shadow-sm">
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 mb-3">FINAL ANSWER</div>
                <div className="whitespace-pre-wrap text-[14px] leading-6 text-zinc-800">{result.split("---")[0]}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-white rounded-2xl border p-4"><div className="text-xs font-bold">🧠 Short-Term</div><div className="text-xs text-zinc-500 mt-1">{memory.short?.length? memory.short.slice(-2).join(" • ") : "No chats"}</div></div>
            <div className="bg-white rounded-2xl border p-4"><div className="text-xs font-bold">🗄️ Vault</div><div className="text-xs text-zinc-500 mt-1">{memory.long?.facts?.length||0} facts stored</div></div>
          </div>
        </div>

        <div className="flex-1 px-6 space-y-3">
          {chats.map((c,i)=><div key={i} className={`p-4 rounded-2xl text-sm max-w-[85%] ${c.role==="user"? "bg-black text-white ml-auto" : "bg-white border shadow-sm mr-auto"}`}>{c.text}</div>)}
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f5f3ef]">
          <div className="bg-white border border-zinc-300 rounded-full p-1.5 flex gap-2 shadow-lg">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault: what did I research?" className="flex-1 bg-transparent px-5 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}