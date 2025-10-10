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
  } = useStore();
  const setObj = sets[ui.currentSetId];
  const run = ui.currentRunId ? runs.learning?.[ui.currentRunId] : null;
  const [showBack, setShowBack] = useState(false);

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
  useKeyboard({
    " ": onFlip,
    ArrowLeft: onPrev,
    ArrowRight: onNext,
  });

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

  if (!curCard) return <p className="text-neutral-300">Done! No more cards.</p>;

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

      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        {!showBack ? (
          <>
            <div className="text-neutral-400 text-xs mb-2">Term</div>
            <div className="text-2xl font-semibold">{curCard.term}</div>
          </>
        ) : (
          <>
            <div className="text-neutral-400 text-xs mb-2">Explanation</div>
            <div className="whitespace-pre-wrap leading-relaxed">
              {curCard.explanation}
            </div>
          </>
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
