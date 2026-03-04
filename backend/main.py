from fastapi import FastAPI
from .routers import agent, dashboard
from .database import Base, engine

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Calendio API", version="0.1.0")

# Routers
app.include_router(agent.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {"message": "Calendio API is running."}
