from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.flashcards import router as flashcards_router

app = FastAPI(title="Flashcard Generator API")

ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8000",
    "https://flash-omega-two.vercel.app",
]
VERCEL_REGEX = r"https://.*\.vercel\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=VERCEL_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flashcards_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "ok", "message": "Flashcard backend running"}
