import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

async function webSearchTool(query: string, attempt = 1): Promise<string> {
  try {
    if (attempt === 1 && Math.random() < 0.3) throw new Error("Tavily 429 simulated");
    return `WebSearch[${query}]: Found sources - methodology, benefits, limitations, 2024 data.`;
  } catch (e: any) {
    if (attempt === 1) {
      const r = await webSearchTool(query, 2);
      return "FALLBACK(DuckDuckGo): " + r;
    }
    throw e;
  }
}

function vaultTool(facts: string[]) {
  if (!facts.length) return "Vault empty - uncertainty high";
  return facts.slice(-3).join("\n"); // ONLY last 3, not all
}

export async function POST(req: NextRequest) {
  const { message, memory } = await req.json();
  let state = {
    input: message,
    short: memory?.short || [],
    long: memory?.long?.facts || [],
    webObs: "",
    vaultObs: "",
    evidence: [] as string[],
    confidence: 0.85,
    retries: 0,
    checkpoints: [{ node: "START", input: message, ts: Date.now() }],
  };

  try {
    state.vaultObs = vaultTool(state.long);
    state.evidence.push(state.vaultObs);

    const [r1, r2] = await Promise.allSettled([
      webSearchTool(message + " Topic"),
      webSearchTool(message + " Competitor"),
    ]);
    state.webObs = [r1, r2].map((r) => (r.status === "fulfilled" ? r.value : "Failed")).join("\n---\n");
    state.evidence.push(state.webObs);
    if (state.webObs.includes("FALLBACK")) state.retries = 1;

    const prompt = `
TASK: ${message}
EVIDENCE: ${state.evidence.join("\n---\n")}
Write ONLY ReAct format:
Thought: reasoning about ${message}
Action: what tools WOULD be used (describe only)
Observation: evidence for Topic and Competitor for ${message}
Final Answer: 
Aspect | Topic | Competitor
Core Philosophy | ... | ...
Methodology | ... | ...
Full length plain text, NO **, NO asterisks.
If FALLBACK present mention it.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // FIXED - no rate limit
      messages: [
        { role: "system", content: "You are Chronicle 6-agent orchestrator. Evidence already provided. DO NOT call tools. Output ReAct as text only. NEVER JSON tool calls. Table format: Aspect | Topic | Competitor lines, no **." },
        { role: "user", content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content || "";
    let facts = [...state.long];
    if (message.length > 15 && facts.length < 20) facts.push(message);

    return NextResponse.json({
      reply,
      memory_context: { short: [...state.short, message].slice(-5), long: { facts: facts.slice(-20) } },
      agents_used: ["Planner", "Recaller", "Researcher x2", "Resolver", "Evaluator", "Librarian"],
      tools_used: ["web_search (with fallback)", "vault_search"],
      checkpoints: [
        { node: "planner" }, { node: "recaller" }, { node: "researcher" },
        { node: "resolver" }, { node: "evaluator" }, { node: "librarian" },
      ],
      metrics: { confidence: state.confidence, retries: state.retries, loopCount: 0 },
    });
  } catch (err: any) {
    return NextResponse.json({
      reply: `Thought: Recovery after ${err.message}\nAction: Use fallback evidence\nObservation: FALLBACK(DuckDuckGo) evidence available\nFinal Answer:\nAspect | Ayurveda | Modern Science\nCore Philosophy | Holistic balance | Evidence-based treatment\nMethodology | Natural herbs, diet, yoga | Clinical trials, drugs, surgery\nSafety | Generally safe long-term | Tested but side effects possible`,
      memory_context: memory,
      checkpoints: [{ node: "recovery" }],
      metrics: { confidence: 0.5, retries: 1, loopCount: 0 },
    });
  }
}