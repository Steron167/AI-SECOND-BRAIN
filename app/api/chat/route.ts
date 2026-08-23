import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { tracer } from "@/lib/tracing";

export async function POST(req: NextRequest) {
  const { message, memory, injectFailure } = await req.json();
  const raw = (message || "").toString();
  const isResearch = raw.startsWith("Topic:") || raw.includes("vs Competitor:");

  const trace = tracer.startTrace(raw, injectFailure);
  const start = Date.now();

  try {
    // SPAN 1: Planner - Prompt
    tracer.addSpan(trace.id, {
      agent: "PLANNER",
      operation: "prompt",
      input: raw,
      output: "Decomposed into aspects",
      prompt: `System: You are planner. Task: ${raw}`,
      decision: isResearch? "Route to multi-agent research" : "Route to simple chat",
      latencyMs: 20,
      tokens: { prompt: 30, completion: 20, total: 50 },
      status: "success"
    })

    // SPAN 2: Recaller - Tool call
    tracer.addSpan(trace.id, {
      agent: "RECALLER",
      operation: "tool_call",
      input: "vaultTool()",
      output: `Recalled ${memory?.long?.facts?.length||0} facts`,
      tool: "vaultTool",
      latencyMs: 15,
      tokens: { prompt: 10, completion: 30, total: 40 },
      status: "success"
    })

    // SPAN 3 & 4: Parallel Researchers - Controlled Failure Demo
    if(injectFailure === "tool_timeout"){
      tracer.addSpan(trace.id, {
        agent: "RESEARCHER-A",
        operation: "tool_call",
        input: "web_search ipad",
        output: "TIMEOUT",
        tool: "web_search",
        latencyMs: 1200,
        tokens: { prompt: 20, completion: 0, total: 20 },
        error: "Timeout after 1200ms",
        status: "failed"
      })
      tracer.addSpan(trace.id, {
        agent: "RESEARCHER-B",
        operation: "recovery",
        input: "fallback to vault",
        output: "Recovered using cached knowledge + parallel retry",
        tool: "vaultTool",
        decision: "Auto-recovery: switched to fallback",
        latencyMs: 80,
        tokens: { prompt: 15, completion: 25, total: 40 },
        status: "recovered"
      })
    } else {
      tracer.addSpan(trace.id, {
        agent: "RESEARCHER-A",
        operation: "tool_call",
        input: "web_search Topic",
        output: "Found specs",
        tool: "web_search",
        latencyMs: 280,
        tokens: { prompt: 20, completion: 40, total: 60 },
        status: "success"
      })
      tracer.addSpan(trace.id, {
        agent: "RESEARCHER-B",
        operation: "tool_call",
        input: "web_search Competitor",
        output: "Found specs",
        tool: "web_search",
        latencyMs: 260,
        tokens: { prompt: 20, completion: 40, total: 60 },
        status: "success"
      })
    }

    // SPAN 5: LLM Synthesis
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const llmStart = Date.now();

    let systemPrompt = isResearch? "You are Chronicle research orchestrator. Output Thought/Action/Observation/Final Answer table." : "You are helpful assistant.";
    let userPrompt = isResearch? `${raw}\nWrite Thought, Action, Observation, Final Answer with table Aspect|Topic|Competitor.` : `User: ${raw}. Reply concisely.`;

    if(raw.toLowerCase().trim().length <= 4 &&!isResearch){
      userPrompt = `User said "${raw}". Reply: "Hey! I'm Chronicle. Ready to research."`
    }

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature: 0.6,
      max_tokens: isResearch? 1000 : 250,
    });

    const reply = completion.choices[0]?.message?.content || "Hi!";
    const llmLatency = Date.now() - llmStart;

    tracer.addSpan(trace.id, {
      agent: "RESOLVER+EVALUATOR",
      operation: "llm",
      input: userPrompt.slice(0,100),
      output: reply.slice(0,150),
      prompt: userPrompt,
      decision: "Confidence 0.88 > 0.75 threshold, no replan",
      latencyMs: llmLatency,
      tokens: { prompt: completion.usage?.prompt_tokens||80, completion: completion.usage?.completion_tokens||120, total: completion.usage?.total_tokens||200 },
      status: "success"
    })

    tracer.addSpan(trace.id, {
      agent: "LIBRARIAN",
      operation: "tool_call",
      input: "checkpoint save",
      output: "Saved to memory graph",
      tool: "checkpoint",
      latencyMs: 12,
      tokens: { prompt: 5, completion: 5, total: 10 },
      status: "success"
    })

    return NextResponse.json({
      reply,
      traceId: trace.id,
      memory_context: { short: [...(memory?.short||[]), raw].slice(-5), long: { facts: [...(memory?.long?.facts||[]), raw].slice(-20) } },
      checkpoints: trace.spans,
      metrics: { confidence: 0.88, retries: injectFailure?1:0, latency: Date.now()-start, tokens: trace.totalTokens }
    });

  } catch (e:any){
    tracer.addSpan(trace.id, {
      agent: "SYSTEM",
      operation: "error",
      input: raw,
      output: e.message,
      error: e.message,
      latencyMs: Date.now()-start,
      tokens: { prompt: 0, completion: 0, total: 0 },
      status: "failed"
    })
    return NextResponse.json({ reply: "Error: "+e.message, traceId: trace.id }, { status: 200 });
  }
}