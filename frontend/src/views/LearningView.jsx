import React, { useMemo, useState } from "react";
import { useStore } from "../store";
import ProgressBar from "../components/ProgressBar";
import useKeyboard from "../hooks/useKeyboard";

export default function LearningView() {
  const {
    ui,
    sets,
    cards,
    runs,
    startLearning,
    moveCursor,
    logLearningEvent,
    bumpCardStats,
    editCard,
    deleteCard,
    addCard,
  } = useStore();

  const setObj = sets[ui.currentSetId];
  const run = ui.currentRunId ? runs.learning?.[ui.currentRunId] : null;
  const [showBack, setShowBack] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTerm, setEditTerm] = useState("");
  const [editExp, setEditExp] = useState("");

  const [adding, setAdding] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newExp, setNewExp] = useState("");

  const lectureScope = useMemo(() => setObj.lectureIds, [setObj]);
  const start = () => startLearning(setObj.id, lectureScope);

  const curCard = useMemo(() => {
    if (!run) return null;
    return cards[run.order[run.cursor]];
  }, [run, cards]);

  const onPrev = () => {
    if (!run || run.cursor === 0) return;
    setShowBack(false);
    logLearningEvent(run.id, {
      t: Date.now(),
      type: "prev",
      cardId: run.order[run.cursor],
    });
    moveCursor(run.id, -1);
  };

  const onFlip = () => {
    if (!curCard) return;
    setShowBack((v) => !v);
    logLearningEvent(run.id, {
      t: Date.now(),
      type: "flip",
      cardId: curCard.id,
    });
    bumpCardStats(curCard.id, {
      flips: (curCard.stats.flips || 0) + 1,
      lastSeen: Date.now(),
    });
  };

  const onNext = () => {
    if (!curCard || run.cursor >= run.order.length - 1) return;
    setShowBack(false);
    logLearningEvent(run.id, {
      t: Date.now(),
      type: "next",
      cardId: curCard.id,
    });
    moveCursor(run.id, +1);
  };

  useKeyboard(
    { " ": onFlip, ArrowLeft: onPrev, ArrowRight: onNext },
    { enabled: !editing } // turn off while editing term/explanation
  );

  // Handle editing
  const startEditing = () => {
    if (!curCard) return;
    setEditTerm(curCard.term);
    setEditExp(curCard.explanation);
    setEditing(true);
  };
  const saveEdit = () => {
    editCard(curCard.id, editTerm, editExp);
    setEditing(false);
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
      </div>
    );
  }

  if (!curCard) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 mt-12">
        <p className="text-neutral-300 text-lg">
          🎉 You’ve reviewed all flashcards!
        </p>
        <button
          onClick={() => startLearning(setObj.id, lectureScope)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
        >
          Review Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-400">
          Card {run.cursor + 1} / {run.order.length}
        </div>
        <div className="w-48">
          <ProgressBar value={(run.cursor + 1) / run.order.length} />
        </div>
      </div>

      {/* Flashcard box */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900 relative">
        {!editing ? (
          <>
            {!showBack ? (
              <>
                <div className="text-neutral-400 text-xs mb-2">Term</div>
                <div className="text-2xl font-semibold">{curCard.term}</div>
              </>
            ) : (
              <>
                <div className="text-neutral-400 text-xs mb-2">Explanation</div>
                <div className="whitespace-pre-wrap leading-relaxed text-neutral-200">
                  {curCard.explanation}
                </div>
              </>
            )}

            {/* Edit/Delete buttons (top-right corner) */}
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                className="px-2 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                onClick={startEditing}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 text-xs rounded-lg bg-neutral-800 hover:bg-neutral-700 text-red-400"
                onClick={() => {
                  if (confirm(`Delete flashcard "${curCard.term}"?`)) {
                    deleteCard(curCard.id);
                    onNext(); // move to next card after deletion
                  }
                }}
              >
                Delete
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <input
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
                value={editTerm}
                onChange={(e) => setEditTerm(e.target.value)}
              />
              <textarea
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
                rows={4}
                value={editExp}
                onChange={(e) => setEditExp(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                  onClick={saveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation */}
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

        <button
          className="ml-auto px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm"
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Cancel" : "+ Add Flashcard"}
        </button>
      </div>
      {/* Add flashcard form */}
      {adding && (
        <div className="mt-4 p-4 border border-neutral-800 rounded-xl bg-neutral-900 space-y-2">
          <input
            className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
            placeholder="New term"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
          />
          <textarea
            className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
            placeholder="New explanation"
            rows={3}
            value={newExp}
            onChange={(e) => setNewExp(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <button
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
              onClick={() => {
                setAdding(false);
                setNewTerm("");
                setNewExp("");
              }}
            >
              Cancel
            </button>
            <button
              disabled={!newTerm.trim() || !newExp.trim()}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
              onClick={() => {
                // Add new card to the same lecture as the current one
                const lectureId = curCard?.lectureId || setObj.lectureIds[0];
                addCard(lectureId, newTerm, newExp);
                setAdding(false);
                setNewTerm("");
                setNewExp("");
                alert("Flashcard added successfully!");
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
