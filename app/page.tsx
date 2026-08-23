"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([{ role: "ai", text: "Multi AI Agent System ready. 6 agents idle." }])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)
  const [meta, setMeta] = useState<any>(null)
  const [checkpoints, setCheckpoints] = useState<any[]>([])
  const [activeNode, setActiveNode] = useState("")

  useEffect(() => {
    const s = localStorage.getItem("chronicle_memory")
    if (s) { try { setMemory(JSON.parse(s)) } catch {} }
  }, [])

  async function trackResearch() {
    if (!topic.trim()) return
    setLoading(true)
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i = 0
    const it = setInterval(() => { setActiveNode(steps[i]); i = (i+1)%6 }, 350)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Topic: " + topic + " vs Competitor: " + (competitor || "general"), memory }) })
      const data = await res.json()
      clearInterval(it)
      setActiveNode("done")
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
      setChats(c => [...c, {role:"user", text:"Research: " + topic + " vs " + competitor}, {role:"ai", text:data.reply}])
    } catch(e:any){ alert("Failed "+e.message); clearInterval(it); }
    setLoading(false)
  }

  async function send() {
    if (!input.trim()) return
    const userMsg = input
    const nc = [...chats, { role: "user" as const, text: userMsg }]
    setChats(nc)
    setInput("")
    setLoading(true)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, memory }) })
      const data = await res.json()
      setChats([...nc, { role: "ai", text: data.reply || "No reply"}])
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch(e:any){
      setChats([...nc, {role:"ai", text:"ERROR: "+e.message}])
    }
    setLoading(false)
  }

  function cleanCell(t: string) { return t.replaceAll("**","").replaceAll("*","").trim() }

  function renderReAct(text: string) {
    if (!text) return <div className="text-[14px] text-zinc-500">Empty</div>
    const hasReact = text.indexOf("Thought:")!== -1 || text.indexOf("Final Answer:")!== -1
    if (!hasReact) {
      return <div className="text-[14px] leading-7 whitespace-pre-wrap break-words">{cleanCell(text)}</div>
    }
    const parts = text.split("Final Answer:")
    if (parts.length > 1) {
      const before = parts[0]
      const after = parts[1]
      const lines = after.split("\n")
      return (
        <div>
          <div className="mb-3 text-[13px] bg-[#fff7ed] border p-3 rounded-xl whitespace-pre-wrap">{cleanCell(before)}</div>
          <div className="rounded-2xl bg-black text-white p-6">
            <div className="text-[11px] font-bold tracking-widest mb-3">FINAL ANSWER • VERIFIED</div>
            {lines.map((line, li) => {
              if (line.indexOf("|")!== -1) {
                const cells = line.split("|").map(s=>cleanCell(s)).filter(s=>s.length>0)
                if (cells.length < 2) return null
                if (cells[0].indexOf("-") === 0) return null
                return <div key={li} className="grid gap-2 mb-2" style={{gridTemplateColumns:"repeat("+cells.length+",1fr)"}}>{cells.map((c,ci)=><div key={ci} className={ci===0?"bg-zinc-800 px-3 py-2 rounded-xl font-bold":"bg-white text-black px-3 py-2 rounded-xl"}>{c}</div>)}</div>
              }
              if (!line.trim()) return <div key={li} className="h-2" />
              return <div key={li} className="text-[14px] leading-7">{cleanCell(line)}</div>
            })}
          </div>
        </div>
      )
    }
    return <div className="text-[14px] leading-7 whitespace-pre-wrap">{cleanCell(text)}</div>
  }

  const Node = ({ id, title, sub }: any) => (
    <div className={"rounded-[14px] p-3 border-2 flex items-center gap-3 " + (activeNode===id? "bg-white text-black border-white" : "bg-[#1e1e1e] border-[#2c2c2c] text-white")}>
      <div className="flex-1"><div className="text-[11px] font-extrabold">{title}</div><div className="text-[10px] text-zinc-400">{sub}</div></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex">
      <div className="w-[380px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6 shrink-0 border-r border-zinc-900 overflow-y-auto">
        <div className="font-extrabold text-[15px] tracking-[0.2em]">CHRONICLE</div>
        <div className="mt-7 space-y-2.5">
          <Node id="planner" title="PLANNER AGENT" sub="Dynamic task planning" />
          <Node id="recaller" title="RECALLER AGENT" sub="vaultTool()" />
          <Node id="researcher" title="RESEARCHER AGENT x2" sub="Parallel web_search" />
          <Node id="resolver" title="CONFLICT RESOLVER" sub="Evidence verification" />
          <Node id="evaluator" title="EVALUATOR" sub="Self-eval" />
          <Node id="librarian" title="LIBRARIAN" sub="Checkpoint save" />
        </div>
        <div className="mt-6 space-y-3">
          <div className="bg-[#151515] rounded-xl p-3 border border-zinc-800">
            <div className="text-[10px] font-bold mb-2">SHORT TERM {memory?.short?.length||0}/5</div>
            {(memory?.short||[]).slice(-5).map((m:any,i:number)=><div key={i} className="text-[11px] p-2 rounded-lg bg-zinc-800 truncate">{m}</div>)}
          </div>
          <div className="bg-[#151515] rounded-xl p-3 border border-zinc-800">
            <div className="text-[10px] font-bold mb-2">LONG TERM vaultTool()</div>
            {(memory?.long?.facts||[]).slice(-8).map((f:any,i:number)=><div key={i} className="text-[11px] p-2 rounded-lg bg-[#1c1c1c] border border-zinc-800 truncate">{f.toString().slice(0,90)}</div>)}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[900px] mx-auto w-full space-y-6">
          <h1 className="text-[28px] font-extrabold">Research Intelligence</h1>
          <div className="bg-white rounded-[24px] border-2 border-black/10 p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Topic e.g. Ipad" className="bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold border-2 border-zinc-200 outline-none" />
                <input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="VS Competitor" className="bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold border-2 border-zinc-200 outline-none" />
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold">{loading? "RUNNING..." : "Run Research"}</button>
            </div>
          </div>
          <div className="space-y-4">
            {chats.map((c,i)=>(
              <div key={i} className={"rounded-[20px] p-5 border-2 " + (c.role==="user"?"bg-white border-black ml-12":"bg-[#fcfaf7] border-black/10")}>
                <div className="text-[10px] font-bold opacity-60 mb-2">{c.role.toUpperCase()}</div>
                <div>{c.role==="user"? c.text : renderReAct(c.text)}</div>
              </div>
            ))}
            {loading && <div className="text-[12px] font-bold animate-pulse">Agents thinking... {activeNode}</div>}
          </div>
        </div>
        <div className="p-4 sticky bottom-0 bg-[#f8f6f2] border-t">
          <div className="max-w-[700px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault..." className="flex-1 bg-transparent px-6 outline-none text-[15px]" />
            <button onClick={send} disabled={loading} className="bg-black text-white px-7 py-3 rounded-full font-extrabold">{loading?"...":"Send"}</button>
          </div>
        </div>
      </div>
    </div>
  )
}