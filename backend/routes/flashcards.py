import json
from models import FlashcardList
from fastapi import APIRouter, UploadFile, Form
from openai_client import client
from utils.text_extract import extract_text_from_pdf, truncate_text

router = APIRouter()

@router.post("/generate-flashcards")
async def generate_flashcards(text: str = Form(None), file: UploadFile = None):
    """
    Accepts either raw text or a PDF file and returns GPT-generated
    term–explanation pairs in JSON format.
    """
    if not text and not file:
        return {"error": "Provide either 'text' or 'file'."}

    if file:
        text = extract_text_from_pdf(file.file)

    text = truncate_text(text)

    system_prompt = """
    You are an expert educational assistant. Your job is to read lecture text and extract key
    concept–definition pairs suitable for flashcards.

    Always respond with *valid JSON* matching this exact schema:
    {
      "flashcards": [
        {"term": "string", "explanation": "string"},
        ...
      ]
    }

    Do not include any other text, markdown, or commentary.
    """

    prompt = f"""
    Extract important concept–definition pairs from the text below.
    Return a JSON array with objects like:
    [{{"term": "Operant Conditioning", "explanation": "Learning shaped by consequences."}}]

    Text:
    {text}
    """

    response = client.chat.completions.create(
        model="gpt-4.1-nano",
        messages=[{"role": "system", "content": system_prompt},{"role": "user", "content": prompt}],
        temperature=0.3,
        response_format={"type": "json_object"},
    )

    raw = json.loads(response.choices[0].message.content)

    try:
        # Sometimes GPT already returns a dict, sometimes a string
        parsed = raw if isinstance(raw, dict) else json.loads(raw)
        flashcards = FlashcardList(**parsed)
        return flashcards
    except Exception as e:
        # fallback: wrap in consistent structure if partial
        return {"error": f"Invalid response format: {e}", "raw": raw}