import React, { useMemo, useState } from "react";
import { useStore } from "../store";

export default function SummaryPanel({ run }) {
  const { lectures } = useStore();
  const [showCorrect, setShowCorrect] = useState(false);

  // Fast lookup
  const itemsById = useMemo(() => {
    const m = new Map();
    run.items.forEach((it) => m.set(it.id, it));
    return m;
  }, [run.items]);

  // Build rows: response + metadata
  const rows = useMemo(() => {
    return run.responses.map((r) => {
      const it = itemsById.get(r.itemId);
      const lec = lectures[it.lectureId];
      const chosen = it.options[r.chosenIndex];
      const correct = it.options[it.answerIndex];
      return {
        id: it.id,
        term: it.stem,
        lectureTitle: lec?.title || "Untitled lecture",
        chosenText: chosen?.text ?? "",
        correctText: correct?.text ?? "",
        isCorrect: r.correct,
      };
    });
  }, [run.responses, itemsById, lectures]);

  // Totals
  const totals = {
    correct: rows.filter((x) => x.isCorrect).length,
    total: run.items.length,
  };

  // Per-lecture aggregation
  const byLecture = useMemo(() => {
    const map = new Map();
    run.items.forEach((it) => {
      const lec = lectures[it.lectureId];
      if (!lec) return;
      if (!map.has(lec.id))
        map.set(lec.id, { title: lec.title, total: 0, correct: 0 });
      map.get(lec.id).total += 1;
    });
    run.responses.forEach((r) => {
      const it = itemsById.get(r.itemId);
      const lec = lectures[it.lectureId];
      if (!lec) return;
      const agg = map.get(lec.id);
      if (r.correct) agg.correct += 1;
    });
    return [...map.values()];
  }, [run.items, run.responses, itemsById, lectures]);

  const wrong = rows.filter((x) => !x.isCorrect);
  const right = rows.filter((x) => x.isCorrect);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary header */}
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="text-lg font-semibold mb-1">Summary</div>
        <div className="text-neutral-300">
          Score: {totals.correct}/{totals.total} (
          {Math.round((totals.correct / Math.max(1, totals.total)) * 100)}%)
        </div>
      </div>

      {/* By-lecture breakdown */}
      <div>
        <div className="text-sm text-neutral-400 mb-2">By lecture</div>
        <div className="space-y-2">
          {byLecture.map((v) => (
            <div
              key={v.title}
              className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-between"
            >
              <div className="truncate">{v.title}</div>
              <div className="text-neutral-300">
                {v.correct} / {v.total}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incorrect answers */}
      <div className="space-y-2">
        <div className="text-sm text-neutral-400">
          Incorrect answers ({wrong.length})
        </div>
        {wrong.length === 0 ? (
          <div className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-300">
            None — nice work!
          </div>
        ) : (
          <div className="space-y-2">
            {wrong.map((row) => (
              <ResultRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>

      {/* Correct answers (toggle) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-400">
            Correct answers ({right.length})
          </div>
          <button
            className="text-xs px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
            onClick={() => setShowCorrect((v) => !v)}
          >
            {showCorrect ? "Hide" : "Show"}
          </button>
        </div>
        {showCorrect && (
          <div className="space-y-2">
            {right.map((row) => (
              <ResultRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResultRow({ row }) {
  return (
    <div
      className={`p-4 rounded-xl border ${
        row.isCorrect ? "border-green-700/40" : "border-red-700/40"
      } bg-neutral-900`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="font-medium truncate">{row.term}</div>
        <span
          className={`text-xs px-2 py-1 rounded ${
            row.isCorrect
              ? "bg-green-900/50 text-green-300"
              : "bg-red-900/50 text-red-300"
          }`}
        >
          {row.isCorrect ? "Correct" : "Incorrect"}
        </span>
      </div>
      <div className="text-xs text-neutral-400 mt-1 truncate">
        {row.lectureTitle}
      </div>

      {!row.isCorrect ? (
        <div className="mt-3 grid gap-2">
          <div className="text-sm">
            <span className="text-neutral-400">Your answer:</span>{" "}
            <span className="text-neutral-200">{row.chosenText}</span>
          </div>
          <div className="text-sm">
            <span className="text-neutral-400">Correct answer:</span>{" "}
            <span className="text-neutral-200">{row.correctText}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm">
          <span className="text-neutral-400">Answer:</span>{" "}
          <span className="text-neutral-200">{row.correctText}</span>
        </div>
      )}
    </div>
  );
}
