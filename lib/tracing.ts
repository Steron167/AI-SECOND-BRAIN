type Span = { id: string, agent: string, op: string, input: string, output: string, tool?: string, latency: number, ts: number }
type Trace = { id: string, spans: Span[], start: number }

const traces = new Map<string, Trace>();

export const tracer = {
  startTrace(id: string) {
    traces.set(id, { id, spans: [], start: Date.now() });
  },
  startSpan(traceId: string, agent: string, op: string, input: string) {
    const span: any = { id: Math.random().toString(36).slice(2,6), agent, op, input, output: "...", latency: 0, ts: Date.now() };
    const t = traces.get(traceId);
    if (t) t.spans.push(span);
    return span;
  },
  endSpan(traceId: string, spanId: string, output: string, tool?: string, _a?: any, latency?: number) {
    const t = traces.get(traceId);
    if (!t) return;
    const s = t.spans.find(s=>s.id===spanId);
    if (s) { s.output = output; s.tool = tool; s.latency = latency||0; }
  },
  getTrace(id: string){ return traces.get(id); },
  getAll(){ return Array.from(traces.values()).slice(-20).reverse(); }
};