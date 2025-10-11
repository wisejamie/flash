import { create } from "zustand";
import { generateFlashcards } from "./lib/api";

/***** Utilities *****/
let _ctr = 0;
const newId = () => `${Date.now().toString(36)}_${(_ctr++).toString(36)}`;
const now = () => Date.now();
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const normalizeTerm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/***** Store *****/
export const useStore = create()((set, get) => ({
  sets: /** @type {Record<string, FlashcardSet>} */ ({}),
  lectures: /** @type {Record<string, Lecture>} */ ({}),
  cards: /** @type {Record<string, Card>} */ ({}),
  jobs: /** @type {Record<string, ProcessingJob>} */ ({}),
  runs: {
    learning: /** @type {Record<string, LearningRun>} */ ({}),
    evaluation: /** @type {Record<string, EvaluationRun>} */ ({}),
  },
  ui: { currentSetId: null, tab: "lectures" },

  createSet: (title) =>
    set((s) => {
      const id = newId();
      return {
        sets: {
          ...s.sets,
          [id]: { id, title, createdAt: now(), lectureIds: [] },
        },
        ui: { ...s.ui, currentSetId: id },
      };
    }),

  addLecture: (setId, title) =>
    set((s) => {
      const id = newId();
      return {
        lectures: {
          ...s.lectures,
          [id]: { id, setId, title, sources: [], cardIds: [] },
        },
        sets: {
          ...s.sets,
          [setId]: {
            ...s.sets[setId],
            lectureIds: [...s.sets[setId].lectureIds, id],
          },
        },
      };
    }),

  enqueueJob: (lectureId) =>
    set((s) => {
      const jobId = newId();
      return {
        jobs: {
          ...s.jobs,
          [jobId]: { id: jobId, lectureId, stage: "queued", progress: 0 },
        },
      };
    }),

  ingestText: async (lectureId, name, text, file = null) => {
    const s = get();
    const jobId =
      Object.values(s.jobs).find(
        (j) => j.lectureId === lectureId && j.stage === "queued"
      )?.id || newId();

    // Stage 1: mark job extracting
    set((st) => ({
      jobs: {
        ...st.jobs,
        [jobId]: { id: jobId, lectureId, stage: "extracting", progress: 0.2 },
      },
    }));

    // Stage 2: chunk and register text source
    const sourceId = newId();
    const chunks = text ? chunkText(text) : [];
    set((st) => {
      const L = st.lectures[lectureId];
      return {
        lectures: {
          ...st.lectures,
          [lectureId]: {
            ...L,
            sources: [
              ...L.sources,
              {
                id: sourceId,
                kind: file ? "file" : "text",
                name,
                text,
                chunks,
              },
            ],
          },
        },
        jobs: {
          ...st.jobs,
          [jobId]: { ...st.jobs[jobId], stage: "generating", progress: 0.5 },
        },
      };
    });

    // Stage 3: generate flashcards via backend
    try {
      const result = await generateFlashcards({ text, file });
      const generated = result.flashcards || [];

      set((st) => {
        const L = st.lectures[lectureId];
        const existingByKey = new Map();
        L.cardIds.forEach((cid) =>
          existingByKey.set(normalizeTerm(st.cards[cid].term), st.cards[cid])
        );
        const newCards = {};
        const newCardIds = [];
        const updatedCards = { ...st.cards };

        for (const row of generated) {
          const key = normalizeTerm(row.term);
          const prev = existingByKey.get(key);
          if (prev) {
            if (row.explanation.length > prev.explanation.length) {
              updatedCards[prev.id] = { ...prev, explanation: row.explanation };
            }
          } else {
            const id = newId();
            newCards[id] = {
              id,
              lectureId,
              term: row.term.trim(),
              explanation: row.explanation.trim(),
              stats: { views: 0, flips: 0 },
            };
            newCardIds.push(id);
          }
        }

        return {
          cards: { ...updatedCards, ...newCards },
          lectures: {
            ...st.lectures,
            [lectureId]: { ...L, cardIds: [...L.cardIds, ...newCardIds] },
          },
          jobs: {
            ...st.jobs,
            [jobId]: { ...st.jobs[jobId], stage: "finalizing", progress: 0.9 },
          },
        };
      });
    } catch (err) {
      console.error("Flashcard generation error:", err);
      set((st) => ({
        jobs: {
          ...st.jobs,
          [jobId]: { ...st.jobs[jobId], stage: "error", progress: 1 },
        },
      }));
      return;
    }

    // Stage 4: finalize
    set((st) => ({
      jobs: {
        ...st.jobs,
        [jobId]: { ...st.jobs[jobId], stage: "done", progress: 1 },
      },
    }));
  },

  startLearning: (setId, lectureScope) =>
    set((st) => {
      const runId = newId();
      const lectureIds =
        lectureScope === "all" ? st.sets[setId].lectureIds : lectureScope;
      const cardIds = lectureIds.flatMap(
        (lid) => st.lectures[lid]?.cardIds || []
      );
      return {
        runs: {
          ...st.runs,
          learning: {
            ...st.runs.learning,
            [runId]: {
              id: runId,
              setId,
              lectureScope,
              createdAt: now(),
              order: cardIds,
              cursor: 0,
              events: [],
            },
          },
        },
        ui: { ...st.ui, tab: "learning", currentRunId: runId },
      };
    }),

  logLearningEvent: (runId, event) =>
    set((st) => {
      const run = st.runs.learning[runId];
      if (!run) return {};
      return {
        runs: {
          ...st.runs,
          learning: {
            ...st.runs.learning,
            [runId]: { ...run, events: [...run.events, event] },
          },
        },
      };
    }),
  bumpCardStats: (cardId, change) =>
    set((st) => {
      const c = st.cards[cardId];
      return {
        cards: {
          ...st.cards,
          [cardId]: { ...c, stats: { ...c.stats, ...change } },
        },
      };
    }),
  moveCursor: (runId, delta) =>
    set((st) => {
      const r = st.runs.learning[runId];
      const cursor = Math.max(
        0,
        Math.min(r.order.length - 1, r.cursor + delta)
      );
      return {
        runs: {
          ...st.runs,
          learning: { ...st.runs.learning, [runId]: { ...r, cursor } },
        },
      };
    }),

  startEvaluation: (setId, lectureScope, nOptions = 4) =>
    set((st) => {
      const runId = newId();
      const lectureIds =
        lectureScope === "all" ? st.sets[setId].lectureIds : lectureScope;
      const cardIds = lectureIds.flatMap(
        (lid) => st.lectures[lid]?.cardIds || []
      );
      const items = makeEvaluationItems(cardIds, st.cards, nOptions);
      return {
        runs: {
          ...st.runs,
          evaluation: {
            ...st.runs.evaluation,
            [runId]: {
              id: runId,
              setId,
              lectureScope,
              createdAt: now(),
              items,
              responses: [],
            },
          },
        },
        ui: { ...st.ui, tab: "evaluation", currentRunId: runId },
      };
    }),
  answerMCQ: (runId, itemId, chosenIndex) =>
    set((st) => {
      const run = st.runs.evaluation[runId];
      const item = run.items.find((i) => i.id === itemId);
      const correct = chosenIndex === item.answerIndex;
      const responses = [
        ...run.responses,
        { itemId, chosenIndex, correct, t: now() },
      ];
      const card = st.cards[item.cardId];
      const nextStreak =
        (card.stats.streak || 0) + (correct ? 1 : -(card.stats.streak || 0));
      return {
        runs: {
          ...st.runs,
          evaluation: { ...st.runs.evaluation, [runId]: { ...run, responses } },
        },
        cards: {
          ...st.cards,
          [card.id]: {
            ...card,
            stats: { ...card.stats, streak: Math.max(0, nextStreak) },
          },
        },
      };
    }),
  finishEvaluation: (runId) =>
    set((st) => {
      const run = st.runs.evaluation[runId];
      return {
        runs: {
          ...st.runs,
          evaluation: {
            ...st.runs.evaluation,
            [runId]: { ...run, completedAt: now() },
          },
        },
      };
    }),

  /** --- MANAGEMENT ACTIONS --- **/

  deleteSet: (setId) =>
    set((st) => {
      const { [setId]: _, ...restSets } = st.sets;
      // Also remove all lectures/cards belonging to this set
      const lecturesToRemove = Object.values(st.lectures).filter(
        (l) => l.setId === setId
      );
      const lectureIds = lecturesToRemove.map((l) => l.id);
      const cardsToRemove = Object.values(st.cards).filter((c) =>
        lectureIds.includes(c.lectureId)
      );
      const cardIds = cardsToRemove.map((c) => c.id);
      const newLectures = Object.fromEntries(
        Object.entries(st.lectures).filter(([id]) => !lectureIds.includes(id))
      );
      const newCards = Object.fromEntries(
        Object.entries(st.cards).filter(([id]) => !cardIds.includes(id))
      );
      return {
        sets: restSets,
        lectures: newLectures,
        cards: newCards,
        ui: {
          ...st.ui,
          currentSetId:
            st.ui.currentSetId === setId ? null : st.ui.currentSetId,
        },
      };
    }),

  deleteLecture: (lectureId) =>
    set((st) => {
      const { [lectureId]: removed, ...restLectures } = st.lectures;
      const cardsToRemove = Object.values(st.cards).filter(
        (c) => c.lectureId === lectureId
      );
      const cardIds = cardsToRemove.map((c) => c.id);
      const newCards = Object.fromEntries(
        Object.entries(st.cards).filter(([id]) => !cardIds.includes(id))
      );
      const setId = removed?.setId;
      const updatedSet = setId
        ? {
            ...st.sets[setId],
            lectureIds: st.sets[setId].lectureIds.filter(
              (id) => id !== lectureId
            ),
          }
        : null;
      return {
        lectures: restLectures,
        cards: newCards,
        sets: setId ? { ...st.sets, [setId]: updatedSet } : st.sets,
      };
    }),

  addCard: (lectureId, term, explanation) =>
    set((s) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newCard = {
        id,
        lectureId,
        term: term.trim(),
        explanation: explanation.trim(),
        stats: { views: 0, flips: 0 },
      };
      return {
        cards: { ...s.cards, [id]: newCard },
        lectures: {
          ...s.lectures,
          [lectureId]: {
            ...s.lectures[lectureId],
            cardIds: [...(s.lectures[lectureId].cardIds || []), id],
          },
        },
      };
    }),

  deleteCard: (cardId) =>
    set((st) => {
      const { [cardId]: removed, ...restCards } = st.cards;
      const lectureId = removed?.lectureId;
      const updatedLecture = lectureId
        ? {
            ...st.lectures[lectureId],
            cardIds: st.lectures[lectureId].cardIds.filter(
              (id) => id !== cardId
            ),
          }
        : null;
      return {
        cards: restCards,
        lectures: lectureId
          ? { ...st.lectures, [lectureId]: updatedLecture }
          : st.lectures,
      };
    }),

  editCard: (cardId, newTerm, newExplanation) =>
    set((st) => {
      const card = st.cards[cardId];
      if (!card) return {};
      return {
        cards: {
          ...st.cards,
          [cardId]: {
            ...card,
            term: newTerm.trim(),
            explanation: newExplanation.trim(),
          },
        },
      };
    }),

  setTab: (tab) => set((s) => ({ ui: { ...s.ui, tab } })),
  setCurrentSet: (id) => set((s) => ({ ui: { ...s.ui, currentSetId: id } })),

  exportJSON: () => {
    const s = get();
    const data = {
      version: 1,
      sets: s.sets,
      lectures: s.lectures,
      cards: s.cards,
      jobs: {},
      runs: s.runs,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashcarding_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },
  importJSON: async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    set((st) => ({
      sets: { ...st.sets, ...(data.sets || {}) },
      lectures: { ...st.lectures, ...(data.lectures || {}) },
      cards: { ...st.cards, ...(data.cards || {}) },
      runs: data.runs ? data.runs : st.runs,
    }));
  },
}));

// --- ingestion helpers ---
function chunkText(text) {
  const paras = text.split(/\n\s*\n/);
  const chunks = [];
  let acc = [];
  let total = 0;
  for (const p of paras) {
    const len = p.length;
    if (total + len > 2000 && acc.length) {
      chunks.push({
        id: newId(),
        lectureId: "",
        order: chunks.length,
        text: acc.join("\n\n"),
      });
      acc = [];
      total = 0;
    }
    acc.push(p);
    total += len;
  }
  if (acc.length)
    chunks.push({
      id: newId(),
      lectureId: "",
      order: chunks.length,
      text: acc.join("\n\n"),
    });
  return chunks;
}

async function generateCardsLocally(text) {
  // Heuristics: "Term — Definition", "Term: Definition", or markdown table
  const rows = [];
  const lines = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Table
  const isTable = lines.some(
    (l) =>
      /\|/.test(l) &&
      /(term|concept)/i.test(l) &&
      /(definition|explanation)/i.test(l)
  );
  if (isTable) {
    const clean = lines.filter((l) => !/^\|?\s*-/.test(l));
    clean.forEach((l) => {
      const cells = l
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean);
      if (cells.length >= 2 && !/term/i.test(cells[0]))
        rows.push({ term: cells[0], explanation: cells[1] });
    });
  }

  // Colon/dash bullets
  lines.forEach((l) => {
    const m = l.match(/^(.*?)\s*[–—:-]\s*(.+)$/); // em-dash, en-dash, colon, hyphen
    if (m && m[1] && m[2]) {
      const term = m[1].replace(/^[-*•]\s*/, "").trim();
      const exp = m[2].trim();
      if (term && exp && term.length < 120)
        rows.push({ term, explanation: exp });
    }
  });

  // Heading + first sentence fallback
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      /^#+\s|^[A-Z][A-Za-z0-9\s]{1,40}$/.test(lines[i]) &&
      /\w+/.test(lines[i + 1])
    ) {
      const term = lines[i].replace(/^#+\s*/, "").trim();
      const exp = lines[i + 1];
      rows.push({ term, explanation: exp });
    }
  }

  // Dedup by normalized term, keep longest explanation
  const byKey = new Map();
  for (const r of rows) {
    const k = normalizeTerm(r.term);
    const prev = byKey.get(k);
    if (!prev || (r.explanation?.length || 0) > (prev.explanation?.length || 0))
      byKey.set(k, r);
  }
  return Array.from(byKey.values()).slice(0, 500);
}

// --- evaluation helper ---
function makeEvaluationItems(cardIds, cardsById, nOptions) {
  const cards = cardIds.map((id) => cardsById[id]).filter(Boolean);
  const pool = cards;
  return cards.map((c) => {
    const distractors = [];
    const poolShuffled = shuffle(pool.filter((x) => x.id !== c.id));
    for (const k of poolShuffled) {
      if (distractors.length >= nOptions - 1) break;
      distractors.push({
        id: newId(),
        text: k.explanation,
        source: "cross",
        fromCardId: k.id,
      });
    }
    const options = shuffle([
      { id: newId(), text: c.explanation, source: "card", fromCardId: c.id },
      ...distractors,
    ]).slice(0, nOptions);
    const answerIndex = options.findIndex((o) => o.fromCardId === c.id);
    return {
      id: newId(),
      cardId: c.id,
      stem: c.term,
      options,
      answerIndex,
      lectureId: c.lectureId,
    };
  });
}
