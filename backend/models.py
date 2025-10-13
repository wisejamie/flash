from pydantic import BaseModel, Field
from typing import List

class Flashcard(BaseModel):
    term: str
    explanation: str

class FlashcardList(BaseModel):
    flashcards: List[Flashcard]

class FlashgenResult(BaseModel):
    summary: str = Field(..., min_length=20)  # a paragraph
    flashcards: List[Flashcard]