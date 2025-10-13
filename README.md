# Flash — AI-Powered Flashcard Generator

**Flash** is an interactive flashcard learning app that automatically generates study cards and summaries from lecture notes or PDFs using GPT.  
Built with **React + Tailwind + Zustand** on the frontend and **FastAPI + OpenAI** on the backend, it combines intelligent content extraction with an engaging learning and testing experience.

---

## Features

### Smart Content Extraction

- Upload **PDFs** or paste lecture **text**.
- GPT automatically generates:
  - **Flashcards** (term–definition pairs)
  - **One-paragraph lecture summary**
- Ignores admin/logistical content (e.g. “assignment”, “syllabus”, etc.)

### Organized Learning

- Group flashcards into **Sets** and **Lectures**
- **Edit**, **delete**, or **add** cards manually
- Learn with an adaptive flip-card interface

### Evaluation Mode

- Multiple-choice quizzes generated from your flashcards
- Track correctness and performance by lecture
- Option to **shuffle** question order

### Learning Mode

- Review flashcards one by one with keyboard controls:
  - **Space** — flip card
  - **← / →** — previous / next
- Shuffle mode for varied review sessions
- Tracks viewing, flipping, and performance stats

### Import & Export

- Export all sets, lectures, and flashcards as a `.json` file
- Re-import at any time to restore progress or share collections
- Preserves learning history, performance, and summaries

---

## Tech Stack

| Layer          | Tech                               |
| -------------- | ---------------------------------- |
| Frontend       | React, Zustand, TailwindCSS, Vite  |
| Backend        | FastAPI (Python 3.9+), Uvicorn     |
| AI Integration | OpenAI GPT models (`gpt-4.1-nano`) |
| File Parsing   | PDF text extraction utilities      |
| Storage        | In-memory Zustand store            |

---
