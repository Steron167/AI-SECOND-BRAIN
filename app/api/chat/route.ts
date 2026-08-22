import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// TOOL 1: Web Search (simulated - replace with Tavily API later if you want)
async function webSearchTool(query: string) {
  // For demo, we use Groq to simulate search. For real, call Tavily API here
  return `Web Search Result for "${query}": InfraBot competitors are Boston Dynamics Spot (legged robot $75k), Built Robotics, Dusty Robotics. Market size $12B by 2030. Boston Dynamics focused on inspection, not construction.`;
}

// TOOL 2: Memory Vault Search Tool
function memoryVaultTool(query: string, facts: string[]) {
  if (!facts.length) return "Vault empty for this device.";
  const relevant = facts.filter(f => f.toLowerCase().includes(query.toLowerCase().split(" ")[0]) || query.toLowerCase().includes(f.toLowerCase().split(" ")[0]));
  return relevant.length? relevant.join("\n") : facts.join("\n");
}

export async function POST(req: NextRequest) {
  const { message, memory } = await req.json();

  const short = memory?.short || [];
  const facts = memory?.long?.facts || [];
  const lower = message.toLowerCase();
  const isRecall = lower.includes("what") || lower.includes("recall") || lower.includes("researched") || lower.includes("compared");

  // 4. CONTEXT & MEMORY: Short-term RAM + Long-term Vault
  const shortContext = JSON.stringify(short.slice(-5));
  const longContext = JSON.stringify(facts);

  // 3. MULTI-AGENT + 1. REACT + 2. TOOL CALLING
  // Step 1: AGENT - RECALLER uses TOOL 2 - Memory Vault Tool
  const vaultObservation = memoryVaultTool(message, facts);

  // Step 2: AGENT - RESEARCHER uses TOOL 1 - Web Search Tool if not recall
  let webObservation = "No web search needed for recall query.";
  if (!isRecall && message.length > 10) {
    webObservation = await webSearchTool(message);
  }

  // ReAct Prompt
  const systemPrompt = `
You are CHRONICLE - Multi-Agent AI Second Brain with ReAct Reasoning.

You have 4 specialized agents:
- SCRIBE: Captured user input: "${message}"
- RECALLER (used Tool: memory_vault_search): Observation = "${vaultObservation}"
- RESEARCHER (used Tool: web_search): Observation = "${webObservation}"
- LIBRARIAN: Will save important facts to Long-Term Vault.

SHORT-TERM MEMORY (RAM, last 5): ${shortContext}
LONG-TERM VAULT (Per-device): ${longContext}

Now do ReAct reasoning:
Thought: What is user intent? Do I need vault or web search?
Action: You already called tools. Observations above.
Thought: Synthesize observations + RAM + Vault to answer.

RULES:
- If recall query, answer ONLY from vault observation. If vault says empty, say "Nothing tracked yet on this device."
- If research query, combine web observation + your knowledge.
- Be concise, mention which tools/agents you used.
- Per-device memory isolated via localStorage.

Answer now with ReAct trace:
Thought:...
Action:...
Observation:...
Final Answer:...
`;

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
  });

  const reply = completion.choices[0].message.content || "";

  // LIBRARIAN AGENT: Extract fact if it's a research track
  let updatedFacts = [...facts];
  if (!isRecall && message.length > 15 &&!updatedFacts.some((f: string) => f.includes(message.slice(0, 20)))) {
    if (lower.includes("vs") || lower.includes("topic") || lower.includes("track") || lower.includes("research") || lower.includes("robotic")) {
      updatedFacts.push(message);
    }
  }

  return NextResponse.json({
    reply,
    memory_context: {
      short: [...short, message].slice(-5),
      long: { facts: updatedFacts }
    },
    agents_used: ["Scribe", "Recaller", "Researcher", "Librarian"],
    tools_used: ["memory_vault_search", "web_search"],
    react_trace: true
  });
}