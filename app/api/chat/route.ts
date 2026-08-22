import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

let memory = {
  short: [] as any[],
  long: { facts: [] as string[] }
}

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  const past = memory.long.facts.slice(-5).join("\n") || "No facts yet"
  const short = memory.short.slice(-3).map((m:any)=> m.text).join("\n") || "No recent"

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      {
        role: "system",
        content: `You are CHRONICLE Second Brain.
LONG-TERM VAULT:
${past}
SHORT-TERM RAM:
${short}
Rule: If user asks about startup idea, answer from LONG-TERM. Be concise, like co-founder.`
      },
      { role: "user", content: message }
    ]
  })

  const reply = completion.choices[0].message.content

  memory.short.push({ text: message })
  if (memory.short.length > 3) memory.short.shift()
  memory.long.facts.push(message)

  return NextResponse.json({
    reply,
    memory_context: memory
  })
}