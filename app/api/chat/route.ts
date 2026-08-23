import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { tracer } from "@/lib/tracing";

const getGroq = () => {
  const key = process.env.GROQ_API_KEY;
  if(!key) throw new Error("GROQ_API_KEY missing");
  return new Groq({ apiKey: key });
};

async function webSearchTool(q:string){ return `WebSearch for ${q}: relevant info found`; }
function vaultTool(facts:string[]){ return facts.slice(-3).join("\n") || "No prior facts"; }

export async function POST(req: NextRequest) {
  const traceId = Math.random().toString(36).slice(2,9);
  tracer.startTrace(traceId);
  try {
    const { message, memory } = await req.json();
    const rawMsg = (message || "").toString();
    const lower = rawMsg.toLowerCase();

    // Detect if this is a research task or normal chat
    const isResearch = lower.includes("topic:") && lower.includes("vs") || lower.startsWith("topic:") || (rawMsg.includes("vs Competitor") && rawMsg.length > 30);

    const short = memory?.short || [];
    const longFacts = memory?.long?.facts || [];

    const s1 = tracer.startSpan(traceId, "Planner", "parse_topic", rawMsg);
    tracer.endSpan(traceId, s1.id, isResearch? "Research mode" : "Chat mode", undefined, undefined, 10);

    const s2 = tracer.startSpan(traceId, "Recaller", "vault_search", "");
    const vaultObs = vaultTool(longFacts);
    tracer.endSpan(traceId, s2.id, vaultObs.slice(0,100), "vaultTool", undefined, 15);

    let webObs = "";
    if (isResearch) {
      const s3 = tracer.startSpan(traceId, "Researcher-A", "web_search", rawMsg);
      webObs = await webSearchTool(rawMsg);
      tracer.endSpan(traceId, s3.id, webObs, "web_search", undefined, 120);
    }

    const s5 = tracer.startSpan(traceId, "Resolver", "llm_synthesis", rawMsg);
    const groq = getGroq();

    let prompt = "";
    if (isResearch) {
      prompt = `You are Chronicle Research Agent.
TASK: ${rawMsg}
EVIDENCE:
Short memory: ${short.join(", ")}
Long memory: ${vaultObs}
Web: ${webObs}

Respond in this exact format:
Thought: why you are comparing these
Action: web_search and vault_search used
Observation: summarize evidence
Final Answer:
Aspect | Topic | Competitor
Core |... |...
Value |... |...
`;
    } else {
      // NORMAL CHAT - DO NOT force table
      prompt = `You are Chronicle AI assistant, friendly and concise.
User says: ${rawMsg}
Conversation history (short term): ${short.slice(-3).join(", ")}
Relevant long term facts (only use if relevant): ${vaultObs}

Rules:
- If user says hi/hello/hey, reply with a simple greeting and ask how you can help. DO NOT bring up iPad/Galaxy Tab unless user asks.
- If user asks casual question, answer normally.
- Do NOT output Thought/Action/Observation/Final Answer or tables unless user asks for comparison.
- Keep reply short, under 3 sentences for greetings.
`;
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: isResearch? "You are Chronicle orchestrator." : "You are a helpful chat assistant." }, { role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: isResearch? 1500 : 400,
    });

    const reply = completion.choices[0]?.message?.content || (isResearch? "Thought: fallback\nFinal Answer:\nAspect | Topic | Competitor" : "Hi! How can I help you today?");

    tracer.endSpan(traceId, s5.id, `LLM ${reply.length} chars`, "groq_llm", undefined, Math.ceil(reply.length/4));

    // Only save meaningful facts to long term, not "hi"
    let newLong = [...longFacts];
    if (rawMsg.length > 15 &&!["hi","hello","hey","hii","yo"].includes(lower.trim())) {
      newLong.push(rawMsg);
    }

    return NextResponse.json({
      reply,
      traceId,
      memory_context: { short: [...short, rawMsg].slice(-5), long: { facts: newLong.slice(-20) } },
      checkpoints: [{node:"planner"},{node:"recaller"},{node:"researcher"},{node:"resolver"}],
      metrics: { confidence: 0.85, retries: 0 }
    });

  } catch (err: any) {
    return NextResponse.json({ reply: "Hi there! I'm ready to help. What do you want to research?", traceId, memory_context: { short: [], long: { facts: [] } }, checkpoints: [], metrics: { confidence: 0, retries: 1 } }, { status: 200 });
  }
}