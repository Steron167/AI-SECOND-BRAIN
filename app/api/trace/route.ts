import { NextRequest, NextResponse } from "next/server";
import { tracer } from "@/lib/tracing";

export async function GET(req: NextRequest){
  const id = req.nextUrl.searchParams.get("id");
  if(id){
    return NextResponse.json({ trace: tracer.getTrace(id) });
  }
  return NextResponse.json({ traces: tracer.getAll() });
}