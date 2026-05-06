# Placeholder backend (no backend is actually used for this project)
# Supervisor expects this to exist. Keeping a minimal FastAPI app alive.
from fastapi import FastAPI
app = FastAPI()

@app.get("/api/ping")
def ping():
    return {"ok": True}
