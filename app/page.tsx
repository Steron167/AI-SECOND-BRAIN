"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Multi AI Agent System ready." }])
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
    setLoading(true)
    setResult("")
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i=0
    const it = setInterval(()=>{ setActiveNode(steps[i]); i=(i+1)%6 }, 350)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Topic: ${topic} vs Competitor: ${competitor || "general"} - plain comparison`, memory }) })
      const data = await res.json()
      clearInterval(it)
      setActiveNode("done")
      setResult(data.reply)
      setMeta(data)
      setCheckpoints(data.checkpoints||[])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {}
    clearInterval(it)
    setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const nc = [...chats, { role: "user" as const, text: input }]
    setChats(nc)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input, memory }) })
      const data = await res.json()
      setChats([...nc, { role: "ai", text: data.reply }])
      setMeta(data)
      setCheckpoints(data.checkpoints||[])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch {}
    setLoading(false)
  }

  function cleanCell(t: string) {
    return t.replace(/\*\*/g,"").replace(/\*/g,"").replace(/__/g,"").trim()
  }

  function renderReAct(text: string) {
    const blocks = text.split(/(?=Thought:|Action:|Observation:|Final Answer:)/gi)
    return blocks.map((block, idx) => {
      const l = block.toLowerCase()
      if (l.includes("thought:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#fff7ed] border-2 border-orange-200 p-5">
            <div className="text-[12px] font-extrabold tracking-widest text-orange-700 mb-2">THOUGHT</div>
            <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block.replace(/Thought:/i,""))}</div>
          </div>
        )
      }
      if (l.includes("action:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#eff6ff] border-2 border-blue-200 p-5">
            <div className="text-[12px] font-extrabold tracking-widest text-blue-700 mb-2">ACTION</div>
            <div className="text-[14px] font-mono font-semibold leading-7 text-black bg-white p-3 rounded-xl border border-blue-100 whitespace-pre-wrap break-words">{cleanCell(block.replace(/Action:/i,""))}</div>
          </div>
        )
      }
      if (l.includes("observation:")) {
        return (
          <div key={idx} className="mb-5 rounded-2xl bg-[#f0fdf4] border-2 border-green-200 p-5">
            <div className="text-[12px] font-extrabold tracking-widest text-green-700 mb-2">OBSERVATION</div>
            <div className="text-[14px] font-medium leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block.replace(/Observation:/i,""))}</div>
          </div>
        )
      }
      if (l.includes("final answer:")) {
        const content = block.replace(/Final Answer:/i,"").trim()
        const lines = content.split("\n")
        return (
          <div key={idx} className="rounded-2xl bg-black text-white p-6 border-2 border-black">
            <div className="text-[12px] font-extrabold tracking-widest mb-4">FINAL ANSWER</div>
            <div className="space-y-2">
              {lines.map((line, li) => {
                if (line.includes("|")) {
                  const raw = line.split("|").map((s: string)=>s.trim()).filter((s: string)=>s.length>0)
                  if (raw.length < 2) return null
                  const isSep = raw.every((c: string) => /^[-:\s]+$/.test(c))
                  if (isSep) return null
                  const cells = raw.map((c: string)=>cleanCell(c))
                  return (
                    <div key={li} className="grid gap-2" style={{gridTemplateColumns:`repeat(${cells.length}, minmax(0,1fr))`}}>
                      {cells.map((cell: string, ci: number) => (
                        <div key={ci} className={`px-3 py-2.5 rounded-xl text-[13px] border leading-5 break-words ${ci===0? "bg-zinc-800 text-white border-zinc-700 font-extrabold" : "bg-white text-black border-white font-medium"}`}>
                          {cell}
                        </div>
                      ))}
                    </div>
                  )
                }
                if (!line.trim()) return <div key={li} className="h-2" />
                return <div key={li} className="text-[15px] font-medium leading-8 text-zinc-100 whitespace-pre-wrap break-words">{cleanCell(line)}</div>
              })}
            </div>
          </div>
        )
      }
      if (block.trim().length < 5) return null
      return <div key={idx} className="mb-3 text-[14px] leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(block)}</div>
    })
  }

  const Node = ({ id, title, sub }: any) => (
    <div className={`rounded-[14px] p-3 border-2 flex items-center gap-3 ${activeNode===id? "bg-white text-black border-white" : "bg-[#1e1e1e] border-[#2c2c2c] text-white"}`}>
      <div className="flex-1">
        <div className="text-[11px] font-extrabold tracking-wide">{title}</div>
        <div className="text-[10px] mt-0.5 text-zinc-400">{sub}</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex">
      <div className="w-[380px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6 shrink-0 border-r border-zinc-900">
        <div className="font-extrabold text-[15px] tracking-[0.2em]">CHRONICLE</div>
        <div className="text-[11px] font-bold tracking-widest text-[#00ff66] mt-1">MULTI AI AGENT SYSTEM</div>
        <div className="mt-7 space-y-2.5">
          <Node id="planner" title="PLANNER AGENT" sub="Dynamic task planning" />
          <Node id="recaller" title="RECALLER AGENT" sub="vaultTool()" />
          <Node id="researcher" title="RESEARCHER AGENT x2" sub="Parallel web_search" />
          <Node id="resolver" title="CONFLICT RESOLVER" sub="Verification" />
          <Node id="evaluator" title="EVALUATOR" sub="Self-eval" />
          <Node id="librarian" title="LIBRARIAN" sub="Checkpoint save" />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="p-6 md:p-8 max-w-[900px] mx-auto w-full">
          <h1 className="text-[28px] font-extrabold text-black">Research Intelligence</h1>
          <div className="mt-6 bg-white rounded-[24px] border-2 border-black/10 shadow-xl p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">TOPIC</label>
                  <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">VS COMPETITOR</label>
                  <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 outline-none" />
                </div>
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold text-[15px]">{loading? "MULTI AGENTS RUNNING..." : "Run Research"}</button>
            </div>
          </div>
          {result && (
            <div className="mt-6 bg-white rounded-[24px] border-2 border-black shadow-xl overflow-hidden">
              <div className="px-6 py-4 bg-black text-white text-[11px] font-extrabold tracking-widest">FINAL ANSWER</div>
              <div className="p-6 bg-[#fcfaf7]">{renderReAct(result)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}