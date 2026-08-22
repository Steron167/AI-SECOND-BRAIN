"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([
    { role: "ai", text: "👋 Chronicle is ready. Built on LangGraph. Ask me anything from your vault." }
  ])
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
    setLoading(true)
    setResult("")
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i=0
    const it = setInterval(()=>{ setActiveNode(steps[i]); i=(i+1)%steps.length }, 400)
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Research Topic: ${topic} | Competitor: ${competitor || "general"}`, memory }),
      })
      const data = await res.json()
      clearInterval(it); setActiveNode("done")
      setResult(data.reply); setMeta(data); setCheckpoints(data.checkpoints||[])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {}
    clearInterval(it); setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const nc = [...chats, { role: "user" as const, text: input }]
    setChats(nc); setInput(""); setLoading(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, memory }),
      })
      const data = await res.json()
      setChats([...nc, { role: "ai", text: data.reply }])
      setMeta(data); setCheckpoints(data.checkpoints||[])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {} setLoading(false)
  }

  const Node = ({ id, icon, title, desc, activeColor }: any) => (
    <div className={`group relative rounded-[16px] p-3.5 border transition-all duration-500 ${activeNode===id? "bg-white text-black border-white shadow-[0_8px_30px_rgba(255,255,255,0.2)] scale-[1.02]" : "bg-white/[0.04] border-white/10 backdrop-blur hover:bg-white/[0.07] hover:border-white/20"}`}>
      <div className="flex gap-3 items-center">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[16px] transition-all ${activeNode===id? "bg-black text-white" : "bg-white/10"}`}>{icon}</div>
        <div className="flex-1">
          <div className={`text-[11px] font-semibold tracking-widest ${activeNode===id? "text-black" : "text-white"}`}>{title}</div>
          <div className={`text-[10px] leading-3 ${activeNode===id? "text-black/60" : "text-white/40"}`}>{desc}</div>
        </div>
        {activeNode===id && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#fcfaf7] text-zinc-900 flex font-[Inter,system-ui]">
      {/* LEFT - PREMIUM LANGGRAPH PANEL */}
      <div className="w-[420px] hidden lg:flex flex-col bg-[#0a0a0b] text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_0%_0%,rgba(120,119,198,0.15),transparent)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_100%_100%,rgba(255,119,198,0.1),transparent)] pointer-events-none" />

        <div className="relative z-10 p-7 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center font-bold text-[13px]">C</div>
              <div className="font-bold tracking-tight">CHRONICLE</div>
            </div>
            <div className="text-[10px] px-2.5 py-1 rounded-full bg-white/10 border border-white/10">LangGraph</div>
          </div>
          <div className="text-[11px] text-white/40 mb-6">Agent Framework • Memory System</div>

          <div className="space-y-2.5 mb-6">
            <div className="text-[10px] tracking-[0.2em] text-white/30 mb-2">LANGGRAPH EXECUTION</div>
            <Node id="planner" icon="◈" title="PLANNER" desc="Dynamic planning, task decomposition" activeColor="" />
            <div className="h-3 w-[1px] bg-white/10 ml-7" />
            <Node id="recaller" icon="◍" title="RECALLER" desc="vaultTool • per-device memory" activeColor="" />
            <div className="h-3 w-[1px] bg-white/10 ml-7" />
            <Node id="researcher" icon="◎" title="RESEARCHER" desc="Parallel web_search + fallback" activeColor="" />
            <Node id="resolver" icon="⬙" title="RESOLVER" desc="Conflict & evidence resolution" activeColor="" />
            <Node id="evaluator" icon="⬗" title="EVALUATOR" desc="Self-eval, loop detection, replan" activeColor="" />
            <div className="h-3 w-[1px] bg-white/10 ml-7" />
            <Node id="librarian" icon="⬖" title="LIBRARIAN" desc="Checkpoint & vault save" activeColor="" />
          </div>

          {meta?.metrics && (
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { k: "Confidence", v: meta.metrics.confidence, s: "uncertainty" },
                { k: "Retries", v: meta.metrics.retries, s: "recovery" },
                { k: "Steps", v: checkpoints.length, s: "checkpoints" },
              ].map((m,i)=>(
                <div key={i} className="rounded-2xl bg-white/[0.06] border border-white/10 p-3 backdrop-blur">
                  <div className="text-[8px] tracking-widest text-white/30">{m.k.toUpperCase()}</div>
                  <div className="text-[18px] font-medium mt-1">{m.v}</div>
                  <div className="text-[9px] text-white/30">{m.s}</div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 mb-4">
            <div className="text-[10px] text-white/50 mb-2 tracking-widest">MEMORY</div>
            <div className="space-y-3">
              <div><div className="text-[10px] text-white/30">Short-term</div><div className="text-[11px] text-white/70 truncate">{memory.short?.length? memory.short.slice(-2).join(" • ") : "—"}</div></div>
              <div><div className="text-[10px] text-white/30">Long-term Vault</div><div className="text-[11px] text-white/70">{memory.long?.facts?.length||0} facts • per-device isolated</div></div>
            </div>
          </div>

          <div className="mt-auto text-[9px] text-white/20 leading-relaxed">
            Why LangGraph over CrewAI/AutoGen? Stateful graph, checkpointing, conditional routing, parallel nodes, autonomous replanning.
          </div>
        </div>
      </div>

      {/* RIGHT - RESEARCH AGENT - LIGHT, MODERN */}
      <div className="flex-1 flex flex-col max-w-[760px] mx-auto w-full">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="text-[22px] font-semibold tracking-tight">Research Agent</div>
              <div className="text-[13px] text-zinc-500">Separate from LangGraph Brain • Tool-based reasoning</div>
            </div>
            <div className="hidden md:flex gap-2">
              <span className="text-[10px] px-3 py-1.5 rounded-full bg-zinc-900 text-white">ReAct</span>
              <span className="text-[10px] px-3 py-1.5 rounded-full bg-white border">2 Tools + Fallback</span>
              <span className="text-[10px] px-3 py-1.5 rounded-full bg-white border">Multi-Agent</span>
            </div>
          </div>

          <div className="rounded-[28px] bg-white border border-zinc-100 shadow-[0_8px_40px_rgba(0,0,0,0.04)] p-6">
            <div className="grid grid-cols-1 gap-3">
              <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Research topic — e.g. Ayurveda" className="w-full bg-[#f7f5f2] border border-transparent focus:bg-white focus:border-zinc-900 rounded-full px-6 py-3.5 outline-none text-[14px] transition-all" />
              <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Compare with — e.g. Modern Medicines" className="w-full bg-[#f7f5f2] border border-transparent focus:bg-white focus:border-zinc-900 rounded-full px-6 py-3.5 outline-none text-[14px] transition-all" />
              <button onClick={trackResearch} disabled={loading} className="w-full mt-1 bg-zinc-900 hover:bg-black text-white py-3.5 rounded-full font-medium text-[14px] transition-all active:scale-[0.98] disabled:opacity-50">
                {loading? "Running LangGraph →" : "Track Research"}
              </button>
              <div className="text-[11px] text-zinc-400 text-center">Adversarial test: 30% tool failure → auto fallback proves recovery</div>
            </div>
          </div>

          {result && (
            <div className="mt-6 rounded-[24px] bg-white border border-zinc-100 shadow-sm p-6">
              <div className="text-[10px] tracking-[0.2em] text-zinc-400 mb-3">REACT TRACE + SYNTHESIS</div>
              <div className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-zinc-800">{result}</div>
            </div>
          )}
        </div>

        <div className="flex-1 px-8 pb-4 space-y-3 overflow-y-auto">
          {chats.map((c,i)=>(
            <div key={i} className={`max-w-[85%] p-4 rounded-[20px] text-[13.5px] leading-6 ${c.role==="user"? "bg-zinc-900 text-white ml-auto rounded-br-[8px]" : "bg-white border border-zinc-100 shadow-sm mr-auto rounded-bl-[8px]"}`}>
              {c.text}
            </div>
          ))}
        </div>

        <div className="p-5 sticky bottom-0">
          <div className="bg-white border border-zinc-200 rounded-full p-2 flex gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder='Ask: "what did I research?"' className="flex-1 bg-transparent px-5 outline-none text-[14px]" />
            <button onClick={send} className="bg-zinc-900 text-white px-7 py-2.5 rounded-full text-[13px] font-medium hover:bg-black transition">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}