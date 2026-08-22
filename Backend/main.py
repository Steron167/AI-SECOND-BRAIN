from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from memory import mem
import os
from groq import Groq

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
client = Groq(api_key=os.getenv("GROQ_API_KEY", "gsk_demo"))

@app.post("/chat")
def chat(data: dict):
    msg = data["message"]
    context = mem.get_context()

    prompt = f"""
    You are Chronicle with memory.
    SHORT-TERM: {context['short']}
    LONG-TERM: {context['long']['facts']}
    User says: {msg}
    If user asks what you remember, answer from memory. Otherwise acknowledge and remember.
    """
    try:
        res = client.chat.completions.create(model="llama3-8b-8192", messages=[{"role":"user","content":prompt}])
        reply = res.choices[0].message.content
    except:
        reply = f"Got it! I remembered: '{msg}'. I have {len(context['short'])} short-term memories."

    mem.add(msg)
    return {"reply": reply, "memory_context": mem.get_context()}