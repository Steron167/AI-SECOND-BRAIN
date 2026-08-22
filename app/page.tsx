"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Brain ready. Search once, Graph does rest." }])
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
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Research: ${topic} vs ${competitor || "general market"}`, memory }) })
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
    <div className={`rounded-xl px-3 py-2.5 border flex items-center gap-2.5 ${activeNode===id? "bg-white text-black border-white shadow-lg" : "bg-[#1a1a1a] border-zinc-800 text-zinc-400"}`}>
      <div className={`w-2 h-2 rounded-full ${activeNode===id? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
      <div><div className="text-[11px] font-bold leading-none">{title}</div><div className="text-[9px] opacity-60 mt-0.5">{sub}</div></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f5f3ef] flex">

      {/* LEFT - LANGGRAPH */}
      <div className="w-[340px] hidden lg:flex flex-col bg-[#0f0f0f] text-white p-5">
        <div className="flex justify-between"><div className="font-black tracking-widest text-sm">CHRONICLE</div><div className="text-[10px] bg-white text-black px-2.5 py-1 rounded-full font-bold">LangGraph</div></div>
        <div className="text-[11px] text-zinc-500 mt-1 mb-6">StateGraph • 6 Agents • Memory</div>

        <div className="space-y-2">
          <div className="text-[10px] tracking-widest text-zinc-500 font-bold mb-2">EXECUTION GRAPH</div>
          <Node id="planner" title="PLANNER" sub="dynamic planning" />
          <Node id="recaller" title="RECALLER" sub="vaultTool()" />
          <Node id="researcher" title="RESEARCHER x2" sub="parallel + fallback" />
          <Node id="resolver" title="CONFLICT RESOLVER" sub="verify $74.5k" />
          <Node id="evaluator" title="EVALUATOR" sub="self-eval + replan" />
          <Node id="librarian" title="LIBRARIAN" sub="checkpoint save" />
          <div className={`mt-2 p-2.5 rounded-xl text-center text-xs font-bold border ${activeNode==="done"? "bg-green-500 text-black border-green-500" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>{activeNode==="done"? "✓ COMPLETE" : "IDLE"}</div>
        </div>

        {meta?.metrics && (
          <div className="grid grid-cols-3 gap-2 mt-6">
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 text-center"><div className="text-[9px] text-zinc-500">CONFIDENCE</div><div className="text-green-400 font-bold">{meta.metrics.confidence}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 text-center"><div className="text-[9px] text-zinc-500">RETRIES</div><div className="text-orange-400 font-bold">{meta.metrics.retries}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-xl p-3 text-center"><div className="text-[9px] text-zinc-500">STEPS</div><div className="font-bold">{checkpoints.length}</div></div>
          </div>
        )}
        <div className="mt-auto text-[10px] text-zinc-600 pt-6">Why LangGraph {" > "} CrewAI? Stateful, checkpointing, parallel, lightweight.</div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col max-w-[820px] mx-auto w-full">

        <div className="p-6 md:p-8">
          {/* SINGLE PRESENTABLE SEARCH CARD */}
          <div>
            <h1 className="text-[26px] font-bold tracking-tight">Research</h1>
            <p className="text-sm text-zinc-500 -mt-1">One search, full LangGraph pipeline</p>
          </div>

          <div className="mt-6 bg-white rounded-[28px] border border-zinc-100 shadow-[0_12px_40px_rgba(0,0,0,0.06)] p-2">
            <div className="bg-[#f7f5f2] rounded-[20px] p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center text-sm">⌕</div>
                <div><div className="text-sm font-bold leading-none">Search Intelligence</div><div className="text-[11px] text-zinc-500">Topic + competitor → parallel tools + fallback</div></div>
                <div className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-white border font-bold">2 Tools</div>
              </div>

              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">Topic</span>
                  <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Macbook M4" className="w-full bg-white rounded-full pl-[56px] pr-5 py-3.5 outline-none text-sm border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black transition" />
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">vs</span>
                  <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Hp Victus" className="w-full bg-white rounded-full pl-[42px] pr-5 py-3.5 outline-none text-sm border border-zinc-200 focus:border-black focus:ring-1 focus:ring-black transition" />
                </div>
              </div>

              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-3.5 rounded-full font-bold text-sm hover:bg-zinc-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {loading? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {loading? "Running LangGraph..." : "Run Research → Feed to Brain"}
              </button>

              <div className="flex gap-2 mt-3 justify-center">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white border">30% failure sim</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white border">Fallback auto</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white border">Parallel x2</span>
              </div>
            </div>
          </div>

          {/* RESULT - SINGLE CARD */}
          {result && (
            <div className="mt-6 bg-white rounded-[22px] border border-zinc-200 shadow-sm overflow-hidden">
              <div className="px-6 py-3 bg-[#fbfaf8] border-b flex justify-between items-center">
                <div className="text-[11px] font-bold tracking-widest text-zinc-400">SYNTHESIZED ANSWER</div>
                <div className="flex gap-2">
                  {result.includes("FALLBACK") && <span className="text-[10px] px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">Fallback Recovered</span>}
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-black text-white">Confidence {meta?.metrics?.confidence}</span>
                </div>
              </div>
              <div className="p-6 whitespace-pre-wrap text-[14px] leading-7 text-zinc-800">{result.split("---")[0]}</div>
            </div>
          )}

          {/* MEMORY STRIP */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border px-4 py-3 flex justify-between items-center"><div><div className="text-[11px] font-bold">Short-Term</div><div className="text-[11px] text-zinc-500 truncate max-w-[180px]">{memory.short?.slice(-1)[0] || "—"}</div></div><div className="text-lg">🧠</div></div>
            <div className="bg-white rounded-2xl border px-4 py-3 flex justify-between items-center"><div><div className="text-[11px] font-bold">Vault Long-Term</div><div className="text-[11px] text-zinc-500">{memory.long?.facts?.length||0} facts</div></div><div className="text-lg">🗄️</div></div>
          </div>
        </div>

        <div className="flex-1 px-6 md:px-8 space-y-3 pb-4">
          {chats.map((c,i)=><div key={i} className={`p-4 rounded-2xl text-sm max-w-[85%] ${c.role==="user"? "bg-black text-white ml-auto rounded-br-lg" : "bg-white border shadow-sm mr-auto rounded-bl-lg"}`}>{c.text}</div>)}
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f5f3ef]/90 backdrop-blur">
          <div className="max-w-[700px] mx-auto bg-white border border-zinc-300 rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault: what did I research?" className="flex-1 bg-transparent px-5 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}