from fastapi import APIRouter, UploadFile, Form
from models import FlashcardList, Flashcard
from utils.text_extract import extract_text_from_pdf, truncate_text
from utils.flashgen import (
    generate_flashcards_and_summary,
    generate_flashcards_iterative,
    generate_flashcards_iterative_debug,
)

router = APIRouter()

@router.post("/generate-flashcards")
async def generate_flashcards(text: str = Form(None), file: UploadFile = None):
    if not text and not file:
        return {"error": "Provide either 'text' or 'file'."}
    if file:
        text = extract_text_from_pdf(file.file)
    text = truncate_text(text or "")
    cards = generate_flashcards_iterative(text, iterations=3, enumerate_batch=25, expand_batch=20, model="gpt-4.1-nano")
    return FlashcardList(flashcards=[Flashcard(**c) for c in cards])

@router.post("/generate-flashcards-debug")
async def generate_flashcards_debug(text: str = Form(None), file: UploadFile = None):
    if not text and not file:
        return {"error": "Provide either 'text' or 'file'."}
    if file:
        text = extract_text_from_pdf(file.file)
    text = truncate_text(text or "")
    return generate_flashcards_iterative_debug(text, iterations=3, enumerate_batch=25, expand_batch=20, model="gpt-4.1-nano")

# routes/flashcards.py

@router.post("/generate-flashcards-with-summary")
async def generate_flashcards_with_summary(text: str = Form(None), file: UploadFile = None):
    print("1")
    if not text and not file:
        return {"error": "Provide either 'text' or 'file'."}
    if file:
        text = extract_text_from_pdf(file.file)

    text = truncate_text(text)

    out = generate_flashcards_and_summary(
        text=text,
        iterations=3,
        enumerate_batch=25,
        expand_batch=20,
        model="gpt-4.1-nano",
    )
    print("2")
    # out = {"summary": "...", "flashcards": [...]}
    return out

