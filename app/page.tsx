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
            <div key={n.id} className={`rounded-[14px] px-4 py-3 border-2 flex items-center gap-3 ${activeNode===n.id? "bg-white text-black border-white shadow-[0_4px_20px_rgba(255,255,255,0.2)]" : "bg-[#1c1c1c] border-[#2c2c2c] text-white"}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${activeNode===n.id? "bg-[#00c950] animate-pulse" : "bg-[#52525b]"}`} />
              <div className="flex-1">
                <div className="text-[12px] font-extrabold tracking-wide leading-none">{n.t}</div>
                <div className={`text-[11px] mt-1 font-medium ${activeNode===n.id? "text-zinc-700" : "text-zinc-400"}`}>{n.d}</div>
              </div>
              {activeNode===n.id && <div className="text-[10px] font-bold text-[#00a63d]">RUNNING</div>}
            </div>
          ))}
          <div className={`mt-3 p-3 rounded-xl text-center text-[12px] font-extrabold border-2 tracking-wide ${activeNode==="done"? "bg-[#00c950] text-black border-[#00c950]" : "bg-[#171717] border-[#2a2a2a] text-zinc-400"}`}>{activeNode==="done"? "✓ GRAPH COMPLETE" : "IDLE - WAITING FOR TASK"}</div>
        </div>

        {meta?.metrics && (
          <div className="grid grid-cols-3 gap-2 mt-8">
            <div className="bg-white rounded-xl p-3 text-center border-2 border-white"><div className="text-[10px] font-bold text-zinc-500 tracking-wide">CONFIDENCE</div><div className="text-[15px] font-extrabold text-black mt-1">{meta.metrics.confidence}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[10px] font-bold text-zinc-400 tracking-wide">RETRIES</div><div className="text-[15px] font-extrabold text-orange-400 mt-1">{meta.metrics.retries}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[10px] font-bold text-zinc-400 tracking-wide">STEPS</div><div className="text-[15px] font-extrabold text-white mt-1">{checkpoints.length}</div></div>
          </div>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col max-w-[860px] mx-auto w-full">
        <div className="p-7 md:p-8">

          <div>
            <h1 className="text-[28px] font-extrabold tracking-tight text-black leading-none">Research Intelligence</h1>
            <p className="text-[15px] font-medium text-zinc-700 mt-2">One search input, full LangGraph pipeline with fallback recovery</p>
          </div>

          {/* SEARCH CARD - HIGH READABILITY */}
          <div className="mt-7 bg-white rounded-[24px] border-2 border-black/10 shadow-[0_16px_40px_rgba(0,0,0,0.08)] p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-[16px]">⌕</div>
                <div>
                  <div className="text-[15px] font-extrabold text-black leading-none tracking-tight">Search & Compare</div>
                  <div className="text-[13px] font-medium text-zinc-600 mt-1">Runs parallel tools, handles failure, resolves conflicts</div>
                </div>
              </div>

              <div className="grid md:grid-cols-[1.4fr_1fr] gap-3">
                <div className="relative group">
                  <label className="absolute left-5 top-3 text-[11px] font-bold tracking-wide text-zinc-500 uppercase">Topic</label>
                  <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Macbook M4 Pro" className="w-full bg-white rounded-2xl pt-7 pb-3.5 px-5 outline-none text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black placeholder:text-zinc-400 placeholder:font-medium" />
                </div>
                <div className="relative">
                  <label className="absolute left-5 top-3 text-[11px] font-bold tracking-wide text-zinc-500 uppercase">VS Competitor</label>
                  <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="Hp Victus 16" className="w-full bg-white rounded-2xl pt-7 pb-3.5 px-5 outline-none text-[15px] font-semibold text-black border-2 border-zinc-200 focus:border-black placeholder:text-zinc-400 placeholder:font-medium" />
                </div>
              </div>

              <button onClick={trackResearch} disabled={loading} className="w-full mt-5 bg-black text-white py-4 rounded-full font-extrabold text-[15px] tracking-wide hover:bg-zinc-900 disabled:opacity-50 flex items-center justify-center gap-2.5 shadow-lg">
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading? "EXECUTING LANGGRAPH..." : "Run Research → Feed to Brain"}
              </button>

              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border-2 border-zinc-200 text-zinc-700">30% Failure Sim</span>
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border-2 border-zinc-200 text-zinc-700">Fallback → DuckDuckGo</span>
                <span className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border-2 border-zinc-200 text-zinc-700">Parallel x2</span>
              </div>
            </div>
          </div>

          {/* RESULT */}
          {result && (
            <div className="mt-6 bg-white rounded-[20px] border-2 border-black/10 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-black text-white flex justify-between items-center">
                <div className="text-[11px] font-extrabold tracking-[0.15em]">FINAL ANSWER • VERIFIED</div>
                <div className="flex gap-2">
                  {result.includes("FALLBACK") && <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-orange-500 text-black">FALLBACK RECOVERED</span>}
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white text-black">Conf {meta?.metrics?.confidence}</span>
                </div>
              </div>
              <div className="p-7 whitespace-pre-wrap text-[15px] font-medium leading-[1.8] text-black">{result.split("---")[0]}</div>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl border-2 border-zinc-200 px-5 py-4"><div className="text-[12px] font-extrabold text-black">🧠 Short-Term Memory</div><div className="text-[13px] font-medium text-zinc-700 mt-1.5 line-clamp-2">{memory.short?.slice(-1)[0] || "No chats yet - ask something"}</div></div>
            <div className="bg-white rounded-2xl border-2 border-zinc-200 px-5 py-4"><div className="text-[12px] font-extrabold text-black">🗄️ Long-Term Vault</div><div className="text-[13px] font-bold text-black mt-1.5">{memory.long?.facts?.length||0} facts stored • per-device isolated</div></div>
          </div>
        </div>

        <div className="flex-1 px-7 md:px-8 space-y-3">
          {chats.map((c,i)=><div key={i} className={`px-5 py-4 rounded-[18px] text-[14px] font-medium leading-6 max-w-[85%] shadow-sm border-2 ${c.role==="user"? "bg-black text-white border-black ml-auto" : "bg-white text-black border-zinc-200 mr-auto"}`}>{c.text}</div>)}
        </div>

        <div className="p-4 sticky bottom-0 bg-[#f8f6f2]/95 backdrop-blur-xl border-t border-zinc-200">
          <div className="max-w-[720px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault: what did I research?" className="flex-1 bg-transparent px-6 outline-none text-[15px] font-medium text-black placeholder:text-zinc-500" />
            <button onClick={send} className="bg-black text-white px-7 py-3 rounded-full text-[14px] font-extrabold tracking-wide hover:bg-zinc-800">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}