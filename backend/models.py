from pydantic import BaseModel
from typing import List

class Flashcard(BaseModel):
    term: str
    explanation: str

class FlashcardList(BaseModel):
    flashcards: List[Flashcard]
