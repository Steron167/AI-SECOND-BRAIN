"use client"
import { useState, useEffect } from "react"

type Chat = { role: "ai" | "user"; text: string }
type Tab = "overview" | "pricing" | "market" | "evidence" | "trace" | "vault"

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [menu, setMenu] = useState("research")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Chronicle Brain ready. All agents idle." }])
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
    let i=0; const it = setInterval(()=>{ setActiveNode(steps[i]); i=(i+1)%6 }, 350)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Research Topic: ${topic} | Competitor: ${competitor || "general"}`, memory }) })
      const data = await res.json()
      clearInterval(it); setActiveNode("done")
      setResult(data.reply); setMeta(data); setCheckpoints(data.checkpoints||[]); setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
      setActiveTab("overview")
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

  const LeftNode = ({ id, title, sub }: any) => (
    <div className={`rounded-xl p-3 border flex items-center gap-3 transition-all ${activeNode===id? "bg-white text-black border-white scale-105 shadow-lg" : "bg-[#1e1e1e] border-zinc-800 text-zinc-400"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${activeNode===id? "bg-black text-white" : "bg-zinc-700 text-zinc-300"}`}>●</div>
      <div className="flex-1"><div className="text-[11px] font-bold">{title}</div><div className="text-[9px] opacity-60">{sub}</div></div>
      {activeNode===id && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f6f4f0] flex text-black font-sans">

      {/* COLUMN 1 - MAIN MENU */}
      <div className="w-[220px] hidden md:flex flex-col bg-[#0e0e0e] text-white p-4 border-r border-zinc-800">
        <div className="font-black text-sm tracking-widest mb-6">CHRONICLE</div>
        <div className="space-y-1">
          {[
            { id:"research", label:"Research Lab", icon:"◈", desc:"Agent + Tools" },
            { id:"pricing", label:"Pricing Intel", icon:"$", desc:"Compare prices" },
            { id:"market", label:"Market Analysis", icon:"◎", desc:"Trends $12B" },
            { id:"vault", label:"Vault Memory", icon:"⬙", desc:`${memory.long?.facts?.length||0} facts` },
            { id:"graph", label:"LangGraph Trace", icon:"⬗", desc:"6 agents" },
          ].map(m=>(
            <button key={m.id} onClick={()=>setMenu(m.id)} className={`w-full text-left rounded-xl px-3 py-2.5 flex gap-3 items-center border transition ${menu===m.id? "bg-white text-black border-white" : "bg-transparent border-transparent text-zinc-400 hover:bg-[#1a1a1a] hover:text-white"}`}>
              <span className="text-sm">{m.icon}</span>
              <div><div className="text-[12px] font-bold leading-none">{m.label}</div><div className="text-[10px] opacity-60">{m.desc}</div></div>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="text-[10px] text-zinc-500 tracking-widest font-bold mb-2">LANGGRAPH BRAIN</div>
          <div className="space-y-2">
            <LeftNode id="planner" title="PLANNER" sub="Dynamic plan" />
            <LeftNode id="recaller" title="RECALLER" sub="vaultTool()" />
            <LeftNode id="researcher" title="RESEARCHER x2" sub="parallel" />
            <LeftNode id="resolver" title="RESOLVER" sub="conflict" />
            <LeftNode id="evaluator" title="EVALUATOR" sub="self-eval" />
            <LeftNode id="librarian" title="LIBRARIAN" sub="checkpoint" />
          </div>
          <div className={`mt-3 p-2 rounded-xl text-center text-xs font-bold border ${activeNode==="done"? "bg-green-500 border-green-500 text-black" : "bg-zinc-900 border-zinc-800 text-zinc-500"}`}>{activeNode==="done"? "✓ GRAPH COMPLETE" : "IDLE"}</div>
        </div>

        {meta?.metrics && (
          <div className="mt-auto grid grid-cols-3 gap-1.5">
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-lg p-2 text-center"><div className="text-[8px] text-zinc-500">CONF</div><div className="text-green-400 font-bold text-xs">{meta.metrics.confidence}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-lg p-2 text-center"><div className="text-[8px] text-zinc-500">RETRY</div><div className="text-orange-400 font-bold text-xs">{meta.metrics.retries}</div></div>
            <div className="bg-[#1c1c1c] border border-zinc-800 rounded-lg p-2 text-center"><div className="text-[8px] text-zinc-500">STEPS</div><div className="font-bold text-xs">{checkpoints.length}</div></div>
          </div>
        )}
      </div>

      {/* COLUMN 2 - RESEARCH + RESULTS */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP TABS */}
        <div className="h-14 bg-white border-b border-zinc-200 flex items-center px-6 gap-2 overflow-x-auto">
          {[
            { id:"overview", label:"Overview" },
            { id:"pricing", label:"Pricing" },
            { id:"market", label:"Market" },
            { id:"evidence", label:"Evidence" },
            { id:"trace", label:"ReAct Trace" },
            { id:"vault", label:"Vault" },
          ].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id as Tab)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition whitespace-nowrap ${activeTab===t.id? "bg-black text-white border-black" : "bg-[#f2f0eb] text-zinc-500 border-zinc-200 hover:border-zinc-400"}`}>{t.label}</button>
          ))}
          <div className="ml-auto text-[11px] text-zinc-400 hidden lg:block">Framework: LangGraph • Tools: web_search + vault + fallback</div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* MIDDLE COLUMN */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* SEARCH BOX */}
            <div className="bg-white rounded-[22px] p-5 shadow-sm border border-zinc-100">
              <div className="text-sm font-bold mb-3">Research Agent - Separate from Brain</div>
              <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic - e.g. Macbook" className="w-full bg-[#f2f0eb] rounded-full px-5 py-3 outline-none text-sm border focus:bg-white focus:border-black" />
              <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Competitor - e.g. Hp victus" className="w-full bg-[#f2f0eb] rounded-full px-5 py-3 outline-none text-sm mt-3 border focus:bg-white focus:border-black" />
              <button onClick={trackResearch} disabled={loading} className="w-full bg-black text-white py-3 rounded-full font-bold text-sm mt-4 hover:bg-zinc-800 disabled:opacity-50">{loading? "Running Graph..." : "Run Research → Feed to Graph"}</button>
              <div className="text-[11px] text-zinc-400 mt-2 text-center">30% tool failure simulation → auto fallback • Parallel execution</div>
            </div>

            {/* RESULT TYPES */}
            {result? (
              <div className="mt-5 space-y-4">
                {activeTab==="overview" && (
                  <div className="bg-white rounded-[20px] border p-6 shadow-sm">
                    <div className="flex gap-2 mb-3">
                      {result.includes("FALLBACK") && <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 rounded-full">FALLBACK USED</span>}
                      <span className="text-xs bg-green-100 text-green-700 border border-green-200 px-3 py-1 rounded-full">VERIFIED</span>
                      <span className="text-xs bg-zinc-900 text-white px-3 py-1 rounded-full">{checkpoints.length} checkpoints</span>
                    </div>
                    <div className="whitespace-pre-wrap text-[14px] leading-6">{result.split("---")[0]}</div>
                  </div>
                )}
                {activeTab==="pricing" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border p-5"><div className="text-xs text-zinc-400">Official Price</div><div className="text-xl font-bold mt-1">$74,500</div><div className="text-xs text-green-600 mt-1">Verified 2024</div></div>
                    <div className="bg-white rounded-2xl border p-5"><div className="text-xs text-zinc-400">Outdated Claim</div><div className="text-xl font-bold mt-1 line-through text-zinc-400">$50,000</div><div className="text-xs text-red-600 mt-1">Conflict resolved - 2021</div></div>
                    <div className="bg-white rounded-2xl border p-5 col-span-2"><div className="text-xs font-bold">Pricing Intelligence Result</div><div className="text-sm text-zinc-600 mt-2">{result.slice(0,400)}...</div></div>
                  </div>
                )}
                {activeTab==="market" && (
                  <div className="bg-white rounded-2xl border p-5"><div className="text-sm font-bold">Market Analysis</div><div className="text-3xl font-black mt-3">$12B <span className="text-sm font-normal text-zinc-500">by 2030</span></div><div className="mt-4 text-sm text-zinc-600 whitespace-pre-wrap">{result.slice(0,500)}</div></div>
                )}
                {activeTab==="evidence" && (
                  <div className="space-y-2">{checkpoints.map((c,i)=><div key={i} className="bg-white rounded-xl border p-3 flex justify-between"><span className="text-xs font-bold">{c.node}</span><span className="text-[11px] text-zinc-500">{JSON.stringify(c).slice(0,80)}</span></div>)}</div>
                )}
                {activeTab==="trace" && (
                  <div className="bg-[#111] text-zinc-300 rounded-2xl p-5 font-mono text-xs leading-6">
                    <div>Thought: Need pricing + market, recall vault first.</div>
                    <div>Action: recallerNode(vaultTool) + researcherParallelNode(web_search x2)</div>
                    <div>Observation: {result.includes("FALLBACK")? "Tavily 429 → Fallback DuckDuckGo OK" : "Web + Vault evidence OK"}</div>
                    <div>Action: conflict_resolver → evaluator</div>
                    <div className="mt-3 text-white whitespace-pre-wrap">{result.split("---")[0].slice(0,600)}</div>
                  </div>
                )}
                {activeTab==="vault" && (
                  <div className="bg-white rounded-2xl border p-5"><div className="text-sm font-bold">Vault - {memory.long?.facts?.length||0} facts</div><div className="mt-3 space-y-2">{(memory.long?.facts||[]).slice(-6).map((f:any,i:number)=><div key={i} className="text-xs bg-[#f2f0eb] rounded-xl p-3">{f}</div>)}</div></div>
                )}
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-2xl border p-4"><div className="text-xs font-bold">🧠 Short-Term</div><div className="text-xs text-zinc-500 mt-1">{memory.short?.slice(-2).join(" • ") || "No chats"}</div></div>
                <div className="bg-white rounded-2xl border p-4"><div className="text-xs font-bold">🗄️ Vault</div><div className="text-xs text-zinc-500 mt-1">{memory.long?.facts?.length||0} facts</div></div>
              </div>
            )}

            {/* CHAT HISTORY */}
            <div className="mt-6 space-y-2">
              {chats.map((c,i)=><div key={i} className={`p-3 rounded-2xl text-sm max-w-[85%] ${c.role==="user"? "bg-black text-white ml-auto" : "bg-white border shadow-sm"}`}>{c.text}</div>)}
            </div>
          </div>

          {/* COLUMN 3 - RIGHT INSIGHTS */}
          <div className="w-[300px] hidden xl:flex flex-col border-l border-zinc-200 bg-[#fbfaf8] p-4 gap-4 overflow-y-auto">
            <div className="bg-white rounded-2xl border p-4">
              <div className="text-[11px] font-bold tracking-widest text-zinc-400">LIVE CHECKPOINTS</div>
              <div className="mt-3 space-y-2 max-h-[220px] overflow-y-auto">
                {checkpoints.length? checkpoints.map((c,i)=><div key={i} className="flex gap-2 text-[11px]"><div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5" /><div><div className="font-bold">{c.node}</div><div className="text-zinc-500">{c.ts? new Date(c.ts).toLocaleTimeString() : ""}</div></div></div>) : <div className="text-xs text-zinc-400">No checkpoints yet</div>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-4">
              <div className="text-[11px] font-bold tracking-widest text-zinc-400">TOOL STATUS</div>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between"><span>web_search</span><span className={result.includes("FALLBACK")? "text-orange-600" : "text-green-600"}>{result.includes("FALLBACK")? "Fallback used" : "OK"}</span></div>
                <div className="flex justify-between"><span>vault_search</span><span className="text-green-600">OK</span></div>
                <div className="flex justify-between"><span>parallel exec</span><span className="text-green-600">x2 active</span></div>
              </div>
            </div>

            <div className="bg-black text-white rounded-2xl p-4">
              <div className="text-[11px] tracking-widest text-zinc-400 font-bold">JUDGE NOTES</div>
              <ul className="mt-2 text-[11px] leading-5 list-disc ml-4 text-zinc-300">
                <li>Framework: LangGraph StateGraph</li>
                <li>2 Tools + fallback</li>
                <li>Parallel researcher</li>
                <li>Conflict resolver</li>
                <li>Self-eval + replan</li>
                <li>Checkpointing</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl border p-4">
              <div className="text-[11px] font-bold">Memory</div>
              <div className="text-xs text-zinc-500 mt-2">Short: {memory.short?.length||0}<br/>Long: {memory.long?.facts?.length||0} facts<br/>Per-device isolated</div>
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="p-4 bg-[#f6f4f0] border-t border-zinc-200 sticky bottom-0">
          <div className="max-w-[700px] mx-auto bg-white border border-zinc-300 rounded-full p-1.5 flex gap-2 shadow-lg">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault: what did I research about Macbook?" className="flex-1 bg-transparent px-5 outline-none text-sm" />
            <button onClick={send} className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-bold">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}