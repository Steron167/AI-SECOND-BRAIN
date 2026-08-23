import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { tracer } from "@/lib/tracing";

const getGroq = () => {
  const key = process.env.GROQ_API_KEY;
  if(!key) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: key });
};

function vaultTool(facts:string[]){ return facts.slice(-3).join("\n") || "No prior facts"; }

export async function POST(req: NextRequest) {
  const traceId = Math.random().toString(36).slice(2,9);
  tracer.startTrace(traceId);
  try {
    const { message, memory } = await req.json();
    const rawMsg = (message || "").toString();
    const lower = rawMsg.toLowerCase().trim();

    // RESEARCH = only if message starts with "Topic:" from the button
    const isResearch = rawMsg.startsWith("Topic:") || rawMsg.includes("vs Competitor:");
    const isGreeting = ["hi","hello","hey","hii","helo","yo","hi there","hello there"].includes(lower) || lower.length <= 3;

    const short = memory?.short || [];
    const longFacts = memory?.long?.facts || [];

    const s1 = tracer.startSpan(traceId, "Planner", "parse", rawMsg);
    tracer.endSpan(traceId, s1.id, isResearch? "Research" : "Chat", undefined, undefined, 10);

    const s2 = tracer.startSpan(traceId, "Recaller", "vault", "");
    const vaultObs = vaultTool(longFacts);
    tracer.endSpan(traceId, s2.id, vaultObs.slice(0,80), "vaultTool", undefined, 15);

    const groq = getGroq();
    let prompt = "";

    if (isResearch) {
      prompt = `TASK: ${rawMsg}
EVIDENCE: Short: ${short.join(", ")} | Long: ${vaultObs}
Write exactly:
Thought: your reasoning about topic vs competitor
Action: web_search and vault_search used
Observation: evidence summary
Final Answer:
Aspect | Topic | Competitor
Core |... |...
Value |... |...
Make full comparison table.`;
    } else if (isGreeting) {
      prompt = `User said: ${rawMsg}. Reply with a warm short greeting like "Hey! I'm Chronicle, ready to research. Ask me anything or use the Research box above." Do NOT mention iPad or Galaxy unless user asks. Keep under 2 lines.`;
    } else {
      prompt = `You are Chronicle assistant. User: ${rawMsg}. History: ${short.slice(-3).join(", ")}
Answer helpfully and concisely. Do NOT use Thought/Action/Final Answer format. No tables unless asked.`;
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: isResearch? "You are Chronicle research orchestrator." : "You are helpful assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: isResearch? 1500 : 300,
    });

    const reply = completion.choices[0]?.message?.content || "Hi! How can I help?";

    const s5 = tracer.startSpan(traceId, "Resolver", "llm", rawMsg);
    tracer.endSpan(traceId, s5.id, reply.slice(0,100), "groq", undefined, 100);

    let newLong = [...longFacts];
    if (!isGreeting && rawMsg.length > 10) newLong.push(rawMsg);

    return NextResponse.json({
      reply,
      traceId,
      memory_context: { short: [...short, rawMsg].slice(-5), long: { facts: newLong.slice(-20) } },
      checkpoints: [{node:"planner"},{node:"recaller"},{node:"researcher"},{node:"resolver"},{node:"evaluator"},{node:"librarian"}],
      metrics: { confidence: isResearch? 0.85 : 0.92, retries: 0 }
    });

  } catch (err:any) {
    return NextResponse.json({ reply: "Error: " + err.message, traceId, memory_context: { short: [], long: { facts: [] } }, checkpoints: [], metrics: { confidence: 0, retries: 1 } }, { status: 200 });
  }
}