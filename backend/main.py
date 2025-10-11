from fastapi import FastAPI
from routes.flashcards import router as flashcards_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Flashcard Generator API")

# Allow requests from your frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flashcards_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "Flashcard backend running"}
