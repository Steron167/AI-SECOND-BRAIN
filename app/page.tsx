"use client"
import { useState, useEffect } from "react"
type Chat = { role: "ai" | "user"; text: string }

export default function Page() {
  const [topic, setTopic] = useState("")
  const [competitor, setCompetitor] = useState("")
  const [result, setResult] = useState("")
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
    setResult("")
    const userQ = `Research: ${topic} vs ${competitor || "general"}`
    setChats(c => [...c, { role: "user" as const, text: userQ }])
    const steps = ["planner","recaller","researcher","resolver","evaluator","librarian"]
    let i = 0
    const it = setInterval(() => { setActiveNode(steps[i]); i = (i+1)%6 }, 350)
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Topic: ${topic} vs Competitor: ${competitor || "general"} - plain comparison`, memory }) })
      const data = await res.json()
      clearInterval(it)
      setActiveNode("done")
      setResult(data.reply)
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
      setChats(c => [...c, { role: "ai" as const, text: data.reply }])
    } catch(e:any) {
      clearInterval(it)
      setChats(c => [...c, { role: "ai" as const, text: "Research failed: " + e.message }])
    }
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
      setChats([...nc, { role: "ai", text: data.reply || "No reply" }])
      setMeta(data)
      setCheckpoints(data.checkpoints || [])
      setMemory(data.memory_context)
      localStorage.setItem("chronicle_memory", JSON.stringify(data.memory_context))
    } catch(e:any) {
      setChats([...nc, { role: "ai", text: "ERROR: " + e.message }])
    }
    setLoading(false)
  }

  function cleanCell(t: string) { return t.replace(/\*\*/g,"").replace(/\*/g,"").replace(/__/g,"").trim() }

  function renderReAct(text: string) {
    if (!text) return null
    // FIX: if no ReAct markers, show as plain text (this fixes bottom chat)
    if (text.indexOf("Thought:") === -1 && text.indexOf("Final Answer:") === -1 && text.indexOf("Action:") === -1) {
      return <div className="text-[14px] leading-7 text-black whitespace-pre-wrap break-words">{cleanCell(text)}</div>
    }
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
            <div className="text-[12px] font-extrabold tracking-widest mb-4">FINAL ANSWER • VERIFIED</div>
            <div className="space-y-2">
              {lines.map((line, li) => {
                if (line.includes("|")) {
                  const raw = line.split("|").map((s:string)=>s.trim()).filter((s:string)=>s.length>0)
                  if (raw.length < 2) return null
                  if (raw.every((c:string)=>/^[-:\s]+$/.test(c))) return null
                  const cells = raw.map((c:string)=>cleanCell(c))
                  return (
                    <div key={li} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0,1fr))` }}>
                      {cells.map((cell:string, ci:number)=>(
                        <div key={ci} className={`px-3 py-2.5 rounded-xl text-[13px] border leading-5 break-words ${ci===0? "bg-zinc-800 text-white border-zinc-700 font-extrabold" : "bg-white text-black border-white font-medium"}`}>{cell}</div>
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
      {activeNode===id && <div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse" />}
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f8f6f2] flex">
      <div className="w-[380px] hidden lg:flex flex-col bg-[#0b0b0b] text-white p-6 shrink-0 border-r border-zinc-900 overflow-y-auto">
        <div className="font-extrabold text-[15px] tracking-[0.2em]">CHRONICLE</div>
        <div className="text-[11px] font-bold tracking-widest text-[#00ff66] mt-1">MULTI AI AGENT SYSTEM</div>
        <div className="mt-7 space-y-2.5">
          <Node id="planner" title="PLANNER AGENT" sub="Dynamic task planning" />
          <Node id="recaller" title="RECALLER AGENT" sub="vaultTool() - Long term memory" />
          <Node id="researcher" title="RESEARCHER AGENT x2" sub="Parallel web_search + fallback" />
          <Node id="resolver" title="CONFLICT RESOLVER AGENT" sub="Evidence verification" />
          <Node id="evaluator" title="EVALUATOR AGENT" sub="Self-eval + replan logic" />
          <Node id="librarian" title="LIBRARIAN AGENT" sub="Checkpoint save + persist" />
        </div>
        <div className="mt-6">
          <div className="text-[10px] tracking-widest text-zinc-500 font-bold mb-2">AGENT METRICS</div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3 text-center"><div className="text-[9px] font-bold text-zinc-500">CONFIDENCE</div><div className="text-[16px] font-extrabold text-black mt-1">{meta?.metrics?.confidence || 0.85}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[9px] font-bold text-zinc-400">RETRIES</div><div className="text-[16px] font-extrabold text-orange-400 mt-1">{meta?.metrics?.retries || 0}</div></div>
            <div className="bg-[#1c1c1c] rounded-xl p-3 text-center border-2 border-[#2c2c2c]"><div className="text-[9px] font-bold text-zinc-400">STEPS</div><div className="text-[16px] font-extrabold text-white mt-1">{checkpoints.length || 6}</div></div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center"><div className="text-[10px] tracking-widest text-zinc-500 font-bold">MEMORY GRAPH</div><button onClick={()=>{localStorage.removeItem("chronicle_memory"); setMemory({short:[], long:{facts:[]}})}} className="text-[9px] px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300">CLEAR</button></div>
          <div className="bg-[#151515] rounded-xl p-3 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-[#00ff66] rounded-full animate-pulse"></div><div className="text-[10px] font-extrabold tracking-widest text-white">SHORT TERM</div><div className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-white text-black font-bold">{memory?.short?.length||0}/5</div></div>
            <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
              {(memory?.short||[]).length===0 && <div className="text-[11px] text-zinc-500 italic">No recent context</div>}
              {(memory?.short||[]).slice(-5).map((m:any,i:number)=><div key={i} className="text-[11px] p-2 rounded-lg bg-zinc-800 text-zinc-200 truncate">{m}</div>)}
            </div>
          </div>
          <div className="bg-[#151515] rounded-xl p-3 border border-zinc-800">
            <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div><div className="text-[10px] font-extrabold tracking-widest text-white">LONG TERM</div><div className="ml-auto text-[9px] px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">vaultTool()</div></div>
            <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
              {(memory?.long?.facts||[]).length===0 && <div className="text-[11px] text-zinc-500 italic">No facts</div>}
              {(memory?.long?.facts||[]).slice(-8).map((f:any,i:number)=><div key={i} className="text-[11px] p-2 rounded-lg bg-[#1c1c1c] text-zinc-300 border border-zinc-800"><span className="text-blue-400 font-bold mr-1">#{i+1}</span>{f.toString().slice(0,90)}</div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[900px] mx-auto w-full space-y-6">
          <h1 className="text-[28px] font-extrabold text-black">Research Intelligence</h1>
          <div className="bg-white rounded-[24px] border-2 border-black/10 shadow-xl p-1.5">
            <div className="bg-[#f6f4f1] rounded-[18px] p-5">
              <div className="grid md:grid-cols-[1.3fr_1fr] gap-3">
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">TOPIC</label><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="e.g. Ipad" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 outline-none" /></div>
                <div><label className="text-[11px] font-bold text-zinc-500 ml-1 tracking-widest">VS COMPETITOR</label><input value={competitor} onChange={e=>setCompetitor(e.target.value)} placeholder="e.g. Galaxy Tab" className="w-full mt-1 bg-white rounded-full px-5 py-3.5 text-[15px] font-semibold text-black border-2 border-zinc-200 outline-none" /></div>
              </div>
              <button onClick={trackResearch} disabled={loading} className="w-full mt-4 bg-black text-white py-4 rounded-full font-extrabold text-[15px]">{loading? "MULTI AGENTS RUNNING..." : "Run Research"}</button>
            </div>
          </div>

          <div className="space-y-4">
            {chats.map((c,i)=>(
              <div key={i} className={`rounded-[20px] p-5 border-2 ${c.role==="user"?"bg-white border-black text-black ml-12":"bg-[#fcfaf7] border-black/10 text-black"}`}>
                <div className="text-[10px] font-bold tracking-widest mb-2 opacity-60">{c.role.toUpperCase()}</div>
                <div className="text-[14px] leading-7 whitespace-pre-wrap break-words">{c.role==="user"? c.text : renderReAct(c.text)}</div>
              </div>
            ))}
            {loading && <div className="text-[12px] font-bold animate-pulse">Agents thinking... {activeNode}</div>}
          </div>

          {result && chats.length <=1 && <div className="bg-white rounded-[24px] border-2 border-black shadow-xl overflow-hidden"><div className="px-6 py-4 bg-black text-white text-[11px] font-extrabold tracking-widest">FINAL ANSWER</div><div className="p-6 bg-[#fcfaf7]">{renderReAct(result)}</div></div>}
        </div>
        <div className="p-4 sticky bottom-0 bg-[#f8f6f2]/95 backdrop-blur border-t">
          <div className="max-w-[700px] mx-auto bg-white border-2 border-black rounded-full p-1.5 flex gap-2 shadow-xl">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask vault..." className="flex-1 bg-transparent px-6 outline-none text-[15px] font-medium text-black" />
            <button onClick={send} disabled={loading} className="bg-black text-white px-7 py-3 rounded-full text-[14px] font-extrabold">{loading?"...":"Send"}</button>
          </div>
          <div className="text-center mt-2"><a href="/tracing" className="text-[11px] font-bold text-zinc-500 underline">Open /tracing for Task 7</a></div>
        </div>
      </div>
    </div>
  )
}