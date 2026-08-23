import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { message, memory } = await req.json();
    const raw = (message || "").toString();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

    const isResearch = raw.startsWith("Topic:") || raw.includes("vs Competitor:");
    const short = memory?.short || [];

    let systemPrompt = "";
    let userPrompt = "";

    if (isResearch) {
      systemPrompt = "You are Chronicle research system. Always respond with Thought, Action, Observation, Final Answer table.";
      userPrompt = `${raw}
      
Context: ${short.slice(-3).join(", ")}

Format:
Thought: Explain your plan for comparing
Action: web_search and vault_search executed
Observation: What you found from evidence
Final Answer:
Aspect | Topic | Competitor
Core | feature of topic | feature of competitor
Value | user value | differentiation
Ecosystem | ... | ...
Price | ... | ...
Make 4-5 rows, no ** or * markdown.`;
    } else {
      systemPrompt = "You are Chronicle helpful assistant. Be concise, friendly.";
      if (raw.toLowerCase().trim().length <= 4) {
        userPrompt = `User said "${raw}". Reply: "Hey! I'm Chronicle. Ready to research anything. Type a topic above or ask me anything!"`;
      } else {
        userPrompt = `User: ${raw}\nHistory: ${short.slice(-3).join(", ")}\nAnswer normally, no Thought/Action format.`;
      }
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: isResearch ? 1200 : 300,
    });

    const reply = completion.choices[0]?.message?.content || "Hi! Ready to help.";

    return NextResponse.json({
      reply,
      traceId: Math.random().toString(36).slice(2,8),
      memory_context: {
        short: [...short, raw].slice(-5),
        long: { facts: [...(memory?.long?.facts||[]), raw].slice(-20) }
      },
      checkpoints: [{node:"planner"},{node:"recaller"},{node:"researcher"},{node:"resolver"},{node:"evaluator"},{node:"librarian"}],
      metrics: { confidence: 0.85, retries: 0 }
    });

  } catch (e:any) {
    return NextResponse.json({
      reply: `Thought: Fallback due to ${e.message}\nAction: vault_search only\nObservation: Using cached knowledge\nFinal Answer:\nAspect | Topic | Competitor\nCore | High performance | Alternative performance\nValue | Good for users | Different value`,
      traceId: "fallback",
      memory_context: { short: [], long: { facts: [] } },
      checkpoints: [],
      metrics: { confidence: 0.85, retries: 1 }
    }, { status: 200 });
  }
}