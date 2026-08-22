from collections import deque
import json, os
FILE="memory.json"
class Memory:
    def __init__(self):
        self.short_term = deque(maxlen=5)
        self.long_term = self.load()
    def load(self):
        if os.path.exists(FILE):
            return json.load(open(FILE))
        return {"facts":[]}
    def save(self):
        json.dump(self.long_term, open(FILE,"w"), indent=2)
    def add(self, msg):
        self.short_term.append(msg)
        if len(msg) > 15: # only save important
            self.long_term["facts"].append(msg)
            self.long_term["facts"] = self.long_term["facts"][-20:]
            self.save()
    def get_context(self):
        return {"short": list(self.short_term), "long": self.long_term}
mem = Memory()