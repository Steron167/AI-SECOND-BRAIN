import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// Simple in-memory store (Vercel keeps it for a while)
let globalMemory = {
  short: [] as string[],
  long: { facts: [] as string[] }
};

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const lower = message.toLowerCase();

  // Add to short-term
  globalMemory.short.push(message);
  if(globalMemory.short.length > 5) globalMemory.short.shift();

  // Save to long-term if it's an idea/fact
  const isIdea = lower.includes("robotic") || lower.includes("infrastructure") || lower.includes("my startup") || lower.includes("idea is") || lower.length > 15;
  if(isIdea &&!lower.startsWith("whats my") &&!lower.startsWith("what is my")) {
    if(!globalMemory.long.facts.includes(message)){
      globalMemory.long.facts.push(message);
    }
  }

  // Check if user is asking to recall
  const isRecall = lower.includes("whats my") || lower.includes("what is my") || lower.includes("my startup idea");

  let systemPrompt = `You are Chronicle, a memory assistant with 3 agents: Scribe, Librarian, Recaller.
  SHORT-TERM: ${JSON.stringify(globalMemory.short)}
  LONG-TERM VAULT: ${JSON.stringify(globalMemory.long.facts)}

  Rules:
    - If user shares a startup idea, acknowledge and save it.
    - If user asks "whats my startup idea?" you MUST answer from LONG-TERM VAULT exactly. Don't say you don't have it if vault has data.
  `;

  if(isRecall){
    systemPrompt += ` User is asking to recall. Answer from LONG-TERM VAULT: ${globalMemory.long.facts.join(", ") || "Vault empty"}. If vault has "robotic use in insfrastructure buildiing", explain it as InfraBot concept.`;
  }

  const chatCompletion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ],
  });

  const reply = chatCompletion.choices[0].message.content;

  return NextResponse.json({
    reply,
    memory_context: globalMemory
  });
}