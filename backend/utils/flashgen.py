import json
import re
from typing import Dict, List, Set, Any
from openai_client import client

# ---------- Helpers ----------
def _norm_key(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())

_ADMIN_TERMS = {"lecture","textbook","conference","slides","canvas","zoom","office hours","syllabus","assignment","deadline","grading"}

def _looks_admin(term: str, exp: str) -> bool:
    t = (term or "").lower()
    e = (exp or "").lower()
    return any(b in t for b in _ADMIN_TERMS) or any(b in e for b in _ADMIN_TERMS)

def _dedupe(cards: List[Dict[str,str]]) -> List[Dict[str,str]]:
    by: Dict[str, Dict[str,str]] = {}
    for c in cards:
        k = _norm_key(c.get("term",""))
        if not k: continue
        prev = by.get(k)
        if not prev or len(c.get("explanation","")) > len(prev.get("explanation","")):
            by[k] = {"term": c["term"].strip(), "explanation": c["explanation"].strip()}
    return list(by.values())

# ---------- Prompts ----------
# ---------- Summary prompts ----------
SUMMARY_SYSTEM = """
You write a concise, exam-oriented overview of a lecture.
Rules:
- 1 paragraph (4–7 sentences). No bullet points.
- Cover the major topics/themes and how they relate; do NOT explain every detail.
- Emphasize scope and structure of what the lecture covers (what & why), not logistics/admin.
- Output JSON only: {"summary": "one paragraph"}
"""

SUMMARY_USER = """
Write the one-paragraph overview for the lecture below.

Lecture text (may be truncated):
\"\"\"{text}\"\"\"

Return only JSON per the schema.
"""

def _summarize(text: str, model: str = "gpt-4.1-nano") -> str:
    text = (text or "").strip()
    if not text:
        return ""
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SUMMARY_SYSTEM.strip()},
            {"role": "user", "content": SUMMARY_USER.format(text=text[:12000])},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )
    raw = resp.choices[0].message.content
    try:
        data = raw if isinstance(raw, dict) else json.loads(raw)
        s = (data.get("summary") or "").strip()
        return s
    except Exception:
        return ""


ENUM_SYSTEM = """
You list ONLY exam-worthy concept handles (content words) from a lecture.
Rules:
- Output JSON: {"concepts":["Term A","Term B",...]}
- Include ONLY content concepts (theories, mechanisms, distinctions, named figures+significance handles, laws, canonical examples).
- EXCLUDE logistics/admin/platforms (lecture, TA, slides, Canvas, Zoom, syllabus, deadlines), URLs/ISBNs, meta talk.
- Prefer specific handles over vague phrases.
- If unsure, omit.
"""

ENUM_USER = """
List up to {limit} NEW concepts not in the exclude list.

Exclude list (already covered): {exclude_list}

Lecture text (snippet, may be truncated):
\"\"\"{text}\"\"\"

Return JSON only, exactly in this format:
{{"concepts": ["Concept A", "Concept B", ...]}}
"""

EXPAND_SYSTEM = """
You expand concept handles into concise flashcards.
Rules:
- For each concept, produce {"term":"...","explanation":"..."}.
- Explanations are 1–2 sentences, precise, exam-focused, stand-alone. Should not include the term itself.
- EXCLUDE admin/logistics/platforms and meta talk.
- Output JSON ONLY: {"flashcards":[{"term":"...","explanation":"..."}]}
"""

EXPAND_USER = """
Concept handles to expand (up to {limit}):
{concepts}

Use the lecture text below ONLY as grounding context (do not quote long passages):

\"\"\"{text}\"\"\"

Return only JSON per the schema.
"""

# ---------- LLM calls ----------
def _enumerate_concepts(
    text: str,
    exclude: Set[str],
    limit: int = 25,
    model: str = "gpt-4.1-nano",
    summary: str = ""
) -> List[str]:
    exclude_list = sorted(list(exclude))
    # Guidance-aware user payload
    user_payload = ENUM_USER.format(
        limit=limit,
        exclude_list=exclude_list,
        text=text[:12000],
    )
    if summary:
        user_payload += f'\n\nGuidance (one-paragraph overview of the lecture):\n"""{summary}"""'

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role":"system","content": ENUM_SYSTEM.strip()},
            {"role":"user",  "content": user_payload},
        ],
        temperature=0.2,
        response_format={"type":"json_object"},
    )
    raw = resp.choices[0].message.content
    try:
        data = raw if isinstance(raw, dict) else json.loads(raw)
        concepts = [(c or "").strip() for c in data.get("concepts", []) if c and isinstance(c, str)]
        clean = []
        for c in concepts:
            if _norm_key(c) and c.lower() not in _ADMIN_TERMS:
                clean.append(c)
        return clean
    except Exception:
        return []

def _expand_concepts(
    text: str,
    concepts: List[str],
    model: str = "gpt-4.1-nano",
    summary: str = ""
) -> List[Dict[str,str]]:
    if not concepts: return []
    payload = EXPAND_USER.format(
        limit=len(concepts),
        concepts="\n".join(f"- {c}" for c in concepts),
        text=text[:12000],
    )
    if summary:
        payload += f'\n\nGuidance (one-paragraph overview of the lecture):\n"""{summary}"""'

    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role":"system","content": EXPAND_SYSTEM.strip()},
            {"role":"user",  "content": payload},
        ],
        temperature=0.2,
        response_format={"type":"json_object"},
    )
    raw = resp.choices[0].message.content
    out: List[Dict[str,str]] = []
    try:
        data = raw if isinstance(raw, dict) else json.loads(raw)
        for c in data.get("flashcards", []):
            term = (c.get("term") or "").strip()
            exp  = (c.get("explanation") or "").strip()
            if not term or not exp: continue
            if _looks_admin(term, exp): continue
            if len(exp.split()) < 6: continue
            out.append({"term": term, "explanation": exp})
    except Exception:
        return []
    return out

def generate_flashcards_and_summary(
    text: str,
    iterations: int = 3,
    enumerate_batch: int = 25,
    expand_batch: int = 20,
    model: str = "gpt-4.1-nano",
) -> Dict[str, Any]:
    """
    Generates a one-paragraph summary first, then uses it as guidance to produce flashcards.
    Returns: {"summary": str, "flashcards": [ ...pairs... ]}
    """
    print(text[:100])
    text = (text or "").strip()
    print("Generating summary...")
    summary = _summarize(text, model=model)
    print("Summary done. Generating flashcards...")

    covered: Set[str] = set()
    cards: List[Dict[str,str]] = []

    for _round in range(iterations):
        print(f"Round {_round+1}...")
        candidates = _enumerate_concepts(text, exclude=covered, limit=enumerate_batch, model=model, summary=summary)
        new_candidates = [c for c in candidates if _norm_key(c) not in {_norm_key(x) for x in covered}]
        if not new_candidates:
            break

        batch = new_candidates[:expand_batch]
        expanded = _expand_concepts(text, batch, model=model, summary=summary)
        cards.extend(expanded)
        for t in batch:
            covered.add(t)
    print("Flashcards done.")

    return {"summary": summary, "flashcards": _dedupe(cards)}

# ---------- Orchestrator (iterative, no sectioning) ----------
def generate_flashcards_iterative(
    text: str,
    iterations: int = 3,
    enumerate_batch: int = 25,
    expand_batch: int = 20,
    model: str = "gpt-4.1-nano",
) -> List[Dict[str, str]]:
    """
    Coverage-driven loop over the WHOLE text (no manual sectioning):
    1) Enumerate up to N concepts not yet covered.
    2) Expand a batch into term/explanation pairs.
    3) Repeat for a few iterations or until no new concepts found.
    """
    text = (text or "").strip()
    covered: Set[str] = set()
    cards: List[Dict[str,str]] = []

    for _round in range(iterations):
        candidates = _enumerate_concepts(text, exclude=covered, limit=enumerate_batch, model=model)
        # Stop if nothing new is found
        new_candidates = [c for c in candidates if _norm_key(c) not in {_norm_key(x) for x in covered}]
        if not new_candidates:
            break

        # Expand in batches to keep prompts small
        batch = new_candidates[:expand_batch]
        expanded = _expand_concepts(text, batch, model=model)
        cards.extend(expanded)

        # Mark covered (use normalized)
        for t in batch:
            covered.add(t)

    # Final dedupe
    return _dedupe(cards)

def generate_flashcards_iterative_debug(
    text: str,
    iterations: int = 3,
    enumerate_batch: int = 25,
    expand_batch: int = 20,
    model: str = "gpt-4.1-nano",
) -> Dict[str, Any]:
    report: Dict[str, Any] = {"rounds": [], "final": {}}
    text = (text or "").strip()

    # NEW: summary first
    summary = _summarize(text, model=model)
    report["summary"] = summary

    covered: Set[str] = set()
    cards: List[Dict[str,str]] = []

    for r in range(iterations):
        round_info: Dict[str, Any] = {"round": r+1}
        candidates = _enumerate_concepts(text, exclude=covered, limit=enumerate_batch, model=model, summary=summary)
        round_info["enumerated"] = candidates

        new_candidates = [c for c in candidates if _norm_key(c) not in {_norm_key(x) for x in covered}]
        round_info["new_candidates"] = new_candidates

        if not new_candidates:
            report["rounds"].append(round_info)
            break

        batch = new_candidates[:expand_batch]
        round_info["expanded_batch"] = batch

        expanded = _expand_concepts(text, batch, model=model, summary=summary)
        round_info["expanded_count"] = len(expanded)
        round_info["expanded_sample"] = expanded[:8]

        cards.extend(expanded)
        for t in batch:
            covered.add(t)

        report["rounds"].append(round_info)

    final_cards = _dedupe(cards)
    report["final"]["count"] = len(final_cards)
    report["final"]["flashcards"] = final_cards
    return report
