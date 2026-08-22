import { NextResponse } from "next/server";
import { tracer } from "@/lib/tracing";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const traceId = searchParams.get("traceId") || "last";
  if (traceId === "last") {
    const all = tracer.getAllTraces();
    if (!all.length) {
      return NextResponse.json({ traceId: "none", spans: [], diagnosis: { rootCause: "no trace yet", fix: "run query first", improvement: {}, failed: [], slow: [], totalSpans: 0 } });
    }
    const last = all[all.length - 1];
    return NextResponse.json({ traceId: last.id, spans: last.spans, diagnosis: tracer.diagnose(last.id) });
  }
  return NextResponse.json({ traceId, spans: tracer.getTrace(traceId), diagnosis: tracer.diagnose(traceId) });
}

export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json(tracer.diagnose(body.traceId));
}