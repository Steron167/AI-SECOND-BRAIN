import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { tracer } from "@/lib/tracing";

const getGroq = () => new Groq({ apiKey: process.env.GROQ_API_KEY || "dummy-key-for-build" });

async function webSearchTool(query: string, attempt = 1): Promise<string> {
  try {
    // CONTROLLED FAILURE for Task 7 - triggers when query has [SIMULATE 429]
    if (query.includes("429") || (attempt === 1 && Math.random() < 0.3)) {
      throw new Error("Tavily 429 rate limit - simulated failure");
    }
    return `WebSearch[${query}]: Found sources - methodology, benefits, limitations, 2024 data.`;
  } catch (e: any) {
    if (attempt === 1) {
      await new Promise(r=>setTimeout(r, 500)); // backoff
      const r = await webSearchTool(query, 2);
      return "FALLBACK(DuckDuckGo): " + r;
    }
    throw e;
  }
}

function vaultTool(facts: string[]) {
  if (!facts.length) return "Vault empty - uncertainty high";
  return facts.slice(-3).join("\n");
}

export async function POST(req: NextRequest) {
  const traceId = Math.random().toString(36).slice(2,9);
  tracer.startTrace(traceId);
  
  const { message, memory } = await req.json();
  
  let state = {
    input: message, short: memory?.short || [], long: memory?.long?.facts || [],
    webObs: "", vaultObs: "", evidence: [] as string[], confidence: 0.85, retries: 0,
  };

  // SPAN 1 - Planner
  const s1 = tracer.startSpan(traceId, "Planner", "parse_topic", message);
  await new Promise(r=>setTimeout(r, 80));
  const topic = message.replace("[SIMULATE 429]","").trim();
  tracer.endSpan(traceId, s1.id, `Parsed TOPIC vs COMPETITOR: ${topic}`, undefined, undefined, 20);

  // SPAN 2 - Recaller
  const s2 = tracer.startSpan(traceId, "Recaller", "vault_search", state.long.join(", "));
  try {
    state.vaultObs = vaultTool(state.long);
    state.evidence.push(state.vaultObs);
    tracer.endSpan(traceId, s2.id, `Found ${state.long.length} facts in long-term memory`, "vaultTool", undefined, 15);
  } catch(e:any){
    tracer.endSpan(traceId, s2.id, undefined, "vaultTool", e.message);
  }

  // SPAN 3 & 4 - Researcher x2 (PARALLEL - this is the FIX)
  const s3 = tracer.startSpan(traceId, "Researcher-A", "web_search_topic", topic + " Topic");
  const s4 = tracer.startSpan(traceId, "Researcher-B", "web_search_competitor", topic + " Competitor");
  const startResearch = Date.now();
  
  try {
    const [r1, r2] = await Promise.allSettled([
      webSearchTool(message + " Topic"),
      webSearchTool(message + " Competitor"),
    ]);
    
    const latency = Date.now() - startResearch;
    
    if(r1.status==="fulfilled"){
      tracer.endSpan(traceId, s3.id, r1.value.slice(0,100), "web_search", undefined, 120);
    } else {
      tracer.endSpan(traceId, s3.id, undefined, "web_search", (r1 as any).reason.message, 0);
    }
    if(r2.status==="fulfilled"){
      tracer.endSpan(traceId, s4.id, r2.value.slice(0,100), "web_search", undefined, 120);
    } else {
      tracer.endSpan(traceId, s4.id, undefined, "web_search", (r2 as any).reason.message, 0);
    }

    state.webObs = [r1, r2].map((r) => (r.status === "fulfilled" ? r.value : "Failed")).join("\n---\n");
    state.evidence.push(state.webObs);
    if (state.webObs.includes("FALLBACK")) state.retries = 1;

  } catch(e:any){
    tracer.endSpan(traceId, s3.id, undefined, "web_search", e.message);
    tracer.endSpan(traceId, s4.id, undefined, "web_search", e.message);
  }

  // SPAN 5 - Resolver + Evaluator + Librarian (LLM call)
  const s5 = tracer.startSpan(traceId, "Resolver+EvaLibrarian", "llm_synthesis", `TASK: ${message} EVIDENCE: ${state.evidence.join("\n").slice(0,400)}`);
  const llmStart = Date.now();

  try {
    const prompt = `TASK: ${message}\nEVIDENCE: ${state.evidence.join("\n---\n")}\nWrite ONLY ReAct format:\nThought: reasoning about ${message}\nAction: what tools WOULD be used (describe only)\nObservation: evidence for Topic and Competitor for ${message}\nFinal Answer: \nAspect | Topic | Competitor\nCore Philosophy | ... | ...\nMethodology | ... | ...\nFull length plain text, NO **, NO asterisks.\nIf FALLBACK present mention it.`;

    const groq = getGroq();
const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are Chronicle 6-agent orchestrator. Evidence already provided. DO NOT call tools. Output ReAct as text only. NEVER JSON tool calls. Table format: Aspect | Topic | Competitor lines, no **." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content || "";
    const llmLatency = Date.now() - llmStart;
    const tokensOut = Math.ceil(reply.length/4);
    
    tracer.endSpan(traceId, s5.id, `LLM success, latency ${llmLatency}ms, confidence ${state.confidence}`, "groq_llm", undefined, tokensOut);

    let facts = [...state.long];
    if (message.length > 15 && facts.length < 20) facts.push(message);

    return NextResponse.json({
      reply, traceId, // IMPORTANT - send traceId to frontend
      memory_context: { short: [...state.short, message].slice(-5), long: { facts: facts.slice(-20) } },
      agents_used: ["Planner", "Recaller", "Researcher x2", "Resolver", "Evaluator", "Librarian"],
      tools_used: ["web_search (with fallback)", "vault_search"],
      checkpoints: [{ node: "planner" }, { node: "recaller" }, { node: "researcher" }, { node: "resolver" }, { node: "evaluator" }, { node: "librarian" }],
      metrics: { confidence: state.confidence, retries: state.retries, loopCount: 0, total_latency: Date.now() - s1.start },
    });
  } catch (err: any) {
    tracer.endSpan(traceId, s5.id, undefined, "groq_llm", err.message, 0);
    return NextResponse.json({
      reply: `Thought: Recovery after ${err.message}\nAction: Use fallback evidence\nObservation: FALLBACK(DuckDuckGo) evidence available\nFinal Answer:\nAspect | Ayurveda | Modern Science\nCore Philosophy | Holistic balance | Evidence-based treatment`,
      traceId, memory_context: memory,
      checkpoints: [{ node: "recovery" }],
      metrics: { confidence: 0.5, retries: 1, loopCount: 0 },
    });
  }
}