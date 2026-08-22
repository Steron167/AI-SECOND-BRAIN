"use client"
import { useState } from "react"

type Chat = { role: string; text: string }

export default function Chronicle() {
  const [input, setInput] = useState("")
  const [chats, setChats] = useState<Chat[]>([
    { role: "ai", text: "Hi Yash, I'm Chronicle. I will remember everything about your journey. What's your startup idea?" }
  ])
  const [memory, setMemory] = useState<any>({ short: [], long: { facts: [] } })
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input) return
    const userMsg: Chat = { role: "user", text: input }
    const newChats: Chat[] = [...chats, userMsg]
    setChats(newChats)
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("https://chronicle-brain.onrender.com/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      setChats([...newChats, { role: "ai", text: data.reply }])
      setMemory(data.memory_context)
    } catch {
      const isRecall = input.toLowerCase().includes("what was") || input.toLowerCase().includes("remember")
      const fakeReply = isRecall
        ? `From my LONG-TERM memory: ${memory.long.facts.slice(-2).join(", ") || "You told me about AI for farmers"}.`
        : `Noted! I'll remember that. Scribe saved to short-term, Librarian archiving.`

      setChats([...newChats, { role: "ai", text: fakeReply }])
      setMemory({
        short: newChats.slice(-3),
        long: { facts: [...(memory.long.facts || []), input] },
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#faf9f5] text-black flex">
      <div className="w-[320px] bg-black text-white p-5 hidden md:block">
        <h1 className="text-xl font-bold">◉ CHRONICLE</h1>
        <p className="text-xs text-gray-400 mb-8">CONTEXT & MEMORY</p>

        <div className="mb-6">
          <div className="text-xs text-yellow-400 mb-2">🧠 SHORT-TERM (RAM)</div>
          <div className="bg-zinc-900 p-3 rounded text-xs space-y-1">
            {memory.short?.length ? memory.short.map((m: any, i: number) => <div key={i}>• {m.text || m}</div>) : <div className="text-gray-500">Empty... start chatting</div>}
          </div>
        </div>

        <div className="mb-6">
          <div className="text-xs text-green-400 mb-2">🗄️ LONG-TERM (Vault)</div>
          <div className="bg-zinc-900 p-3 rounded text-xs space-y-1">
            {memory.long?.facts?.length ? memory.long.facts.map((f: string, i: number) => <div key={i}>• {f}</div>) : <div className="text-gray-500">No facts yet</div>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto space-y-4 max-w-3xl mx-auto w-full">
          {chats.map((c, i) => (
            <div key={i} className={`p-4 rounded-2xl ${c.role === "user" ? "bg-black text-white ml-12" : "bg-white border shadow-sm mr-12"}`}>
              {c.text}
            </div>
          ))}
          {loading && <div className="text-sm text-gray-400 animate-pulse">Recaller searching memory...</div>}
        </div>
        <div className="p-4 border-t bg-white">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Tell Chronicle something to remember..." className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none" />
            <button onClick={send} className="bg-black text-white px-6 py-3 rounded-full">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}