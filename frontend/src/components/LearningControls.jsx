import React from "react";

export default function LearningControls({
  disablePrev,
  isLast,
  onPrev,
  onFlip,
  onNext,
}) {
  return (
    <div className="flex gap-2">
      <button
        className="px-3 py-2 rounded-xl bg-neutral-800 disabled:opacity-50"
        disabled={disablePrev}
        onClick={onPrev}
      >
        Previous
      </button>
      <button className="px-3 py-2 rounded-xl bg-neutral-800" onClick={onFlip}>
        Flip
      </button>
      <button
        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
        disabled={isLast}
        onClick={onNext}
      >
        {isLast ? "Done" : "Next"}
      </button>
    </div>
  );
}
