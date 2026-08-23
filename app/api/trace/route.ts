import { NextRequest, NextResponse } from "next/server";
import { tracer } from "@/lib/tracing";

export async function GET(req: NextRequest){
  const id = req.nextUrl.searchParams.get("id");
  const diagnose = req.nextUrl.searchParams.get("diagnose");
  if(diagnose){
    return NextResponse.json({ diagnosis: tracer.diagnose(diagnose) });
  }
  if(id){
    return NextResponse.json({ trace: tracer.get(id), diagnosis: tracer.diagnose(id) });
  }
  return NextResponse.json({ traces: tracer.getAll() });
}