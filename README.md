# Flash — AI Flashcard Generator

Flash is an AI-powered study tool that converts lecture text or PDFs into **structured flashcards** and **concise one-paragraph summaries** using a custom GPT prompting pipeline.

### ▶️ Live Demo

https://flash-ij2tis5aw-wisejamies-projects.vercel.app/

The frontend is deployed on **Vercel**, connecting to a **FastAPI** backend that handles GPT-powered parsing and generation.

**Note**: The backend is hosted on Render’s free tier, so it may take 30–60 seconds to wake up on the first request.

---

## Why this project exists

Flash started from a simple problem: studying from lecture slides was taking too long.  
While preparing for a Historical Psychology exam, I found myself spending hours manually turning dense slides into flashcards. Even using ChatGPT was not enough because there was no interface to organize cards, edit them, or actually learn and test myself effectively.

So I built the tool I needed.

Flash automates the tedious parts of studying: extracting concepts, generating clean term-definition pairs, summarizing the lecture, and organizing everything into a learnable format. What began as a small personal utility quickly grew into a full-stack app with GPT-powered extraction, card management, learning and evaluation modes, and import and export support.

The goal is simple: help students convert messy lecture materials into high-quality study content quickly, accurately, and without friction.

---

## What the tool does

### 1. Upload or Paste Lecture Material

- Upload **PDFs**
- Paste raw **text**
- The backend extracts text, removes noise, and prepares it for GPT processing.

---

### 2. One-Paragraph Lecture Summary

Flash generates a concise, high-level summary that captures:

- what the lecture is about
- the major themes
- the structure and focus of the material

This summary also informs and improves flashcard generation.

---

### 3. Intelligent Flashcard Generation

Flash uses a multi-step GPT pipeline:

1. **Concept Enumeration**  
   GPT scans the lecture to list only exam-worthy “concept handles.”

2. **Concept Expansion**  
   Each concept is expanded into a **1–2 sentence definition**.

3. **Filtering**  
   Removes:

   - admin/logistical content
   - vague or duplicate concepts
   - ultra-short or low-quality definitions

4. **Deduplication**  
   High-quality, normalized term–definition pairs remain.

The result: **clean, consistent, high-precision flashcards**.

---

### 4. Organized Study Workflow

- Group material into **Sets** → **Lectures** → **Flashcards**
- Each lecture stores:
  - Generated summary
  - Generated flashcards

You can also:

- **Edit** flashcards
- **Delete** flashcards
- **Create new cards manually**

---

### 5. Learning Mode

A focused flip-card interface with:

- keyboard controls (space / ← / →)
- shuffle mode
- card-view statistics (views, flips, streak)
- “learn again” after finishing
- supports selecting specific subsets of lectures

---

### 6. Evaluation Mode

Multiple-choice quizzes built directly from your flashcards:

- randomized distractors
- per-lecture score breakdown
- shuffle mode
- ability to review performance after finishing

---

### 7. Import & Export

- Export entire study library as a `.json` file
- Import later to restore progress
- Supports sharing card sets with classmates
- Preserves all cards, summaries, stats, and lecture structure

---

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Frontend | React, Vite, TailwindCSS, Zustand           |
| Backend  | FastAPI (Python), Uvicorn                   |
| AI       | OpenAI GPT models (`gpt-4.1-nano` / mini)   |
| Parsing  | PDF → text extraction utilities             |
| Storage  | Client-side Zustand store (JSON exportable) |

---
