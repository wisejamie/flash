import React, { useMemo, useRef, useState } from "react";
import { create } from "zustand";

/******************************
 * Flashcarding — minimal SPA
 * Single-file React + Zustand
 * No backend, in-session only
 ******************************/

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

/***** Types (JSDoc) *****/
/** @typedef {{id:string,title:string,createdAt:number,lectureIds:string[]}} FlashcardSet */
/** @typedef {{id:string,setId:string,title:string,sources:SourceDoc[],purpose?:string,cardIds:string[]}} Lecture */
/** @typedef {{id:string,kind:'pdf'|'text'|'markdown',name:string,bytes?:ArrayBuffer,text?:string,chunks?:TextChunk[]}} SourceDoc */
/** @typedef {{id:string,lectureId:string,order:number,text:string}} TextChunk */
/** @typedef {{id:string,lectureId:string,term:string,explanation:string,provenance?:any[],tags?:string[],stats:CardStats}} Card */
/** @typedef {{views:number,flips:number,lastSeen?:number,ef?:number,streak?:number}} CardStats */
/** @typedef {{id:string,lectureId:string,stage:string,progress:number,error?:string}} ProcessingJob */
/** @typedef {{id:string,setId:string,lectureScope:'all'|string[],createdAt:number,order:string[],cursor:number,events:any[]}} LearningRun */
/** @typedef {{id:string,setId:string,lectureScope:'all'|string[],createdAt:number,items:MCQItem[],responses:MCQResponse[],completedAt?:number}} EvaluationRun */
/** @typedef {{id:string,cardId:string,stem:string,options:MCQOption[],answerIndex:number,lectureId:string}} MCQItem */
/** @typedef {{id:string,text:string,source?:'card'|'gpt'|'cross',fromCardId?:string}} MCQOption */
/** @typedef {{itemId:string,chosenIndex:number,correct:boolean,t:number}} MCQResponse */

/***** Store *****/
const useStore = create()((set, get) => ({
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

  ingestText: async (lectureId, name, text) => {
    const s = get();
    const jobId =
      Object.values(s.jobs).find(
        (j) => j.lectureId === lectureId && j.stage === "queued"
      )?.id || newId();
    set((st) => ({
      jobs: {
        ...st.jobs,
        [jobId]: { id: jobId, lectureId, stage: "extracting", progress: 0.2 },
      },
    }));
    // Extract & chunk (simple heuristic)
    const sourceId = newId();
    const chunks = chunkText(text);
    set((st) => {
      const L = st.lectures[lectureId];
      return {
        lectures: {
          ...st.lectures,
          [lectureId]: {
            ...L,
            sources: [
              ...L.sources,
              { id: sourceId, kind: "text", name, text, chunks },
            ],
          },
        },
        jobs: {
          ...st.jobs,
          [jobId]: { ...st.jobs[jobId], stage: "generating", progress: 0.5 },
        },
      };
    });

    // Generate cards (mock LLM: parse term: definition lines & bullet patterns)
    const generated = await generateCardsLocally(
      chunks.map((c) => c.text).join("\n\n")
    );
    // Upsert
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
          // update explanation immutably if longer
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

/***** Local generation (mock LLM) *****/
function chunkText(text) {
  const paras = text.split(/\n\s*\n/);
  const chunks = [];
  let acc = [];
  let total = 0;
  paras.forEach((p) => {
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
  });
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
  // Heuristics: lines like "Term — Definition" or "Term: Definition" or markdown tables
  const rows = [];
  const lines = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  // Markdown table detection
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
      if (cells.length >= 2 && !/term/i.test(cells[0])) {
        rows.push({ term: cells[0], explanation: cells[1] });
      }
    });
  }
  // Bullet/colon patterns
  lines.forEach((l) => {
    const m = l.match(/^(.*?)\s*[–—:-]\s*(.+)$/); // em-dash, colon, hyphen
    if (m && m[1] && m[2]) {
      const term = m[1].replace(/^[-*•]\s*/, "").trim();
      const exp = m[2].trim();
      if (term && exp && term.length < 120)
        rows.push({ term, explanation: exp });
    }
  });
  // Fallback: headings + following sentence (very naive)
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
  // De-dup by normalized term; keep longest explanation
  const byKey = new Map();
  rows.forEach((r) => {
    const k = normalizeTerm(r.term);
    const prev = byKey.get(k);
    if (!prev || (r.explanation?.length || 0) > (prev.explanation?.length || 0))
      byKey.set(k, r);
  });
  return Array.from(byKey.values()).slice(0, 500);
}

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

/***** UI Components *****/
export default function App() {
  const { sets, ui, createSet, setCurrentSet, setTab, exportJSON, importJSON } =
    useStore();
  const fileRef = useRef(null);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 backdrop-blur bg-neutral-950/70 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold">Flashcarding</h1>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700"
              onClick={() => exportJSON()}
            >
              Export
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && importJSON(e.target.files[0])
              }
            />
            <button
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700"
              onClick={() => fileRef.current?.click()}
            >
              Import
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-5 gap-6">
        <aside className="md:col-span-2 lg:col-span-1 space-y-3">
          <button
            className="w-full py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-medium"
            onClick={() => createSet(prompt("Set title?") || "Untitled Set")}
          >
            New Set
          </button>
          <div className="space-y-1">
            {Object.values(sets).length === 0 && (
              <p className="text-sm text-neutral-400">
                No sets yet. Create one to start.
              </p>
            )}
            {Object.values(sets).map((s) => (
              <div
                key={s.id}
                className={`p-3 rounded-xl border ${
                  s.id === ui.currentSetId
                    ? "border-indigo-500 bg-neutral-900"
                    : "border-neutral-800 bg-neutral-900/50"
                }`}
              >
                <button
                  className="text-left w-full"
                  onClick={() => setCurrentSet(s.id)}
                >
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-xs text-neutral-400">
                    {s.lectureIds.length} lecture(s)
                  </div>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <section className="md:col-span-3 lg:col-span-4">
          {ui.currentSetId ? <SetView /> : <EmptyState />}
        </section>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <p className="text-neutral-300">
          Create a set to begin building flashcards.
        </p>
      </div>
    </div>
  );
}

function SetView() {
  const { ui, sets, setTab } = useStore();
  const setObj = sets[ui.currentSetId];
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{setObj.title}</h2>
        <div className="flex gap-2">
          <TabButton
            label="Lectures"
            active={ui.tab === "lectures"}
            onClick={() => setTab("lectures")}
          />
          <TabButton
            label="Learning"
            active={ui.tab === "learning"}
            onClick={() => setTab("learning")}
          />
          <TabButton
            label="Evaluation"
            active={ui.tab === "evaluation"}
            onClick={() => setTab("evaluation")}
          />
          <TabButton
            label="History"
            active={ui.tab === "history"}
            onClick={() => setTab("history")}
          />
        </div>
      </div>
      {ui.tab === "lectures" && <LecturesTab />}
      {ui.tab === "learning" && <LearningTab />}
      {ui.tab === "evaluation" && <EvaluationTab />}
      {ui.tab === "history" && <HistoryTab />}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-xl border ${
        active
          ? "border-indigo-500 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800"
      }`}
    >
      {label}
    </button>
  );
}

function LecturesTab() {
  const { ui, sets, lectures, addLecture } = useStore();
  const setObj = sets[ui.currentSetId];
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
          onClick={() =>
            addLecture(
              ui.currentSetId,
              prompt("Lecture title?") || "Untitled Lecture"
            )
          }
        >
          Add Lecture
        </button>
        <button
          disabled={!selectedLectureId}
          className="px-3 py-2 rounded-xl bg-neutral-800 disabled:opacity-50"
          onClick={() => setShowUpload(true)}
        >
          Upload Material
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {setObj.lectureIds.map((lid) => (
          <div
            key={lid}
            className={`p-3 rounded-xl border ${
              selectedLectureId === lid
                ? "border-indigo-500"
                : "border-neutral-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{lectures[lid].title}</div>
                <div className="text-xs text-neutral-400">
                  {lectures[lid].cardIds.length} card(s)
                </div>
              </div>
              <button
                className="px-2 py-1 rounded-lg bg-neutral-800"
                onClick={() => setSelectedLectureId(lid)}
              >
                Select
              </button>
            </div>
          </div>
        ))}
        {setObj.lectureIds.length === 0 && (
          <p className="text-neutral-400">No lectures yet. Add one.</p>
        )}
      </div>

      {showUpload && (
        <UploadModal
          lectureId={selectedLectureId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}

function UploadModal({ lectureId, onClose }) {
  const { ingestText, enqueueJob, jobs } = useStore();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);

  const job = useMemo(
    () =>
      Object.values(jobs).find(
        (j) => j.lectureId === lectureId && j.stage !== "done"
      ),
    [jobs, lectureId]
  );

  const onProcess = async () => {
    if (!lectureId) return;
    setWorking(true);
    enqueueJob(lectureId);
    await ingestText(lectureId, title || "Pasted Text", text);
    setWorking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload material</h3>
          <button
            className="px-2 py-1 rounded-lg bg-neutral-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <input
          className="w-full px-3 py-2 rounded-xl bg-neutral-800"
          placeholder="Lecture title for this material (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full h-56 px-3 py-2 rounded-xl bg-neutral-800"
          placeholder="Paste text here (PDF support can be added later)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-3">
          <button
            disabled={!text || working}
            onClick={onProcess}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            Generate flashcards
          </button>
          {job && <ProgressInline job={job} />}
        </div>
      </div>
    </div>
  );
}

function ProgressInline({ job }) {
  return (
    <div className="flex items-center gap-2 text-sm text-neutral-300">
      <div className="w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500"
          style={{ width: `${Math.floor((job.progress || 0) * 100)}%` }}
        />
      </div>
      <span>{job.stage}</span>
    </div>
  );
}

function LearningTab() {
  const {
    ui,
    sets,
    lectures,
    cards,
    startLearning,
    runs,
    moveCursor,
    logLearningEvent,
    bumpCardStats,
  } = useStore();
  const setObj = sets[ui.currentSetId];
  const [showBack, setShowBack] = useState(false);
  const run = ui.currentRunId ? runs.learning?.[ui.currentRunId] : null;

  const lectureScope = useMemo(() => setObj.lectureIds, [setObj]);

  const start = () => startLearning(setObj.id, lectureScope);

  const curCard = useMemo(() => {
    if (!run) return null;
    const id = run.order[run.cursor];
    return cards[id];
  }, [run, cards]);

  const onFlip = () => {
    if (!curCard) return;
    setShowBack((v) => !v); // toggle front/back
    logLearningEvent(run.id, { t: now(), type: "flip", cardId: curCard.id });
    bumpCardStats(curCard.id, {
      flips: (curCard.stats.flips || 0) + 1,
      lastSeen: now(),
    });
  };

  const onNext = () => {
    if (!curCard) return;
    // don't go out of bounds
    if (run.cursor >= run.order.length - 1) return;
    setShowBack(false);
    logLearningEvent(run.id, { t: now(), type: "next", cardId: curCard.id });
    moveCursor(run.id, +1);
  };

  const onPrev = () => {
    if (!run || run.cursor === 0) return;
    setShowBack(false);
    const currentId = run.order[run.cursor];
    logLearningEvent(run.id, { t: now(), type: "prev", cardId: currentId });
    moveCursor(run.id, -1);
  };

  if (!run) {
    return (
      <div className="space-y-3">
        <button
          disabled={setObj.lectureIds.length === 0}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          onClick={start}
        >
          Start Learning (All Lectures)
        </button>
        {setObj.lectureIds.length === 0 && (
          <p className="text-neutral-400">
            Add a lecture and generate cards to begin.
          </p>
        )}
      </div>
    );
  }

  if (!curCard) return <p className="text-neutral-300">Done! No more cards.</p>;

  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-400">
        Card {run.cursor + 1} / {run.order.length}
      </div>
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        {!showBack ? (
          <div>
            <div className="text-neutral-400 text-xs mb-2">Term</div>
            <div className="text-2xl font-semibold">{curCard.term}</div>
          </div>
        ) : (
          <div>
            <div className="text-neutral-400 text-xs mb-2">Explanation</div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {curCard.explanation}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-neutral-800 disabled:opacity-50"
          disabled={run.cursor === 0}
          onClick={onPrev}
        >
          Previous
        </button>

        <button
          className="px-3 py-2 rounded-xl bg-neutral-800"
          onClick={onFlip}
        >
          Flip
        </button>

        <button
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          disabled={run.cursor >= run.order.length - 1}
          onClick={onNext}
        >
          {run.cursor >= run.order.length - 1 ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

function EvaluationTab() {
  const { ui, sets, runs, startEvaluation, answerMCQ, finishEvaluation } =
    useStore();
  const setObj = sets[ui.currentSetId];
  const run = ui.currentRunId ? runs.evaluation?.[ui.currentRunId] : null;
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState(null); // number | null

  const start = () => startEvaluation(setObj.id, "all", 4);

  if (!run) {
    return (
      <div className="space-y-3">
        <button
          disabled={setObj.lectureIds.length === 0}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          onClick={start}
        >
          Start Evaluation (All Lectures)
        </button>
      </div>
    );
  }

  const item = run.items[cursor];
  const onChoose = (idx) => setSelected(idx);
  const onSubmit = () => {
    if (selected == null) return;
    answerMCQ(run.id, item.id, selected);
    const next = cursor + 1;
    setSelected(null); // reset selection for next question
    if (next >= run.items.length) {
      setCursor(next); // move past last
      finishEvaluation(run.id);
    } else {
      setCursor(next);
    }
  };

  const completed = cursor >= run.items.length || !!run.completedAt;
  if (completed) return <EvalSummary run={run} />;

  return (
    <div className="space-y-4">
      <div className="text-sm text-neutral-400">
        Question {cursor + 1} / {run.items.length}
      </div>
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="text-neutral-400 text-xs mb-2">Term</div>
        <div className="text-xl font-semibold">{item.stem}</div>
      </div>
      <div className="grid gap-2">
        {item.options.map((opt, i) => (
          <button
            key={opt.id}
            className={
              "text-left px-4 py-3 rounded-xl border border-neutral-800 " +
              (selected === i
                ? "bg-neutral-800"
                : "bg-neutral-900 hover:bg-neutral-800")
            }
            onClick={() => onChoose(i)}
          >
            {String.fromCharCode(65 + i)}. {opt.text}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          disabled={selected == null}
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}

function EvalSummary({ run }) {
  const { lectures } = useStore();
  const byLecture = new Map();
  run.items.forEach((it) => {
    const lec = lectures[it.lectureId];
    if (!lec) return;
    if (!byLecture.has(lec.id))
      byLecture.set(lec.id, { title: lec.title, total: 0, correct: 0 });
    const agg = byLecture.get(lec.id);
    agg.total += 1;
  });
  run.responses.forEach((r) => {
    const it = run.items.find((i) => i.id === r.itemId);
    const agg = byLecture.get(it.lectureId);
    if (r.correct) agg.correct += 1;
  });
  const totals = {
    correct: run.responses.filter((r) => r.correct).length,
    total: run.items.length,
  };
  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="text-lg font-semibold">Summary</div>
        <div className="text-neutral-300">
          Score: {totals.correct} / {totals.total} (
          {Math.round((totals.correct / Math.max(1, totals.total)) * 100)}%)
        </div>
      </div>
      <div className="space-y-2">
        {[...byLecture.values()].map((v) => (
          <div
            key={v.title}
            className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-between"
          >
            <div>{v.title}</div>
            <div className="text-neutral-300">
              {v.correct} / {v.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoryTab() {
  const { runs } = useStore();
  const evalRuns = Object.values(runs.evaluation || {});
  const learnRuns = Object.values(runs.learning || {});
  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-neutral-400 mb-2">Learning Runs</div>
        <div className="space-y-2">
          {learnRuns.length === 0 && (
            <div className="text-neutral-400">No learning runs yet.</div>
          )}
          {learnRuns.map((r) => (
            <div
              key={r.id}
              className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900"
            >
              <div className="font-semibold">
                {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="text-sm text-neutral-400">
                Cards shown: {r.order.length}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm text-neutral-400 mb-2">Evaluation Runs</div>
        <div className="space-y-2">
          {evalRuns.length === 0 && (
            <div className="text-neutral-400">No evaluation runs yet.</div>
          )}
          {evalRuns.map((r) => {
            const correct = r.responses.filter((x) => x.correct).length;
            return (
              <div
                key={r.id}
                className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900"
              >
                <div className="font-semibold">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-neutral-400">
                  Score: {correct}/{r.items.length}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
