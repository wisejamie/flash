import React from "react";

export default function StudyCard({ showBack, term, explanation }) {
  return (
    <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
      {!showBack ? (
        <>
          <div className="text-neutral-400 text-xs mb-2">Term</div>
          <div className="text-2xl font-semibold">{term}</div>
        </>
      ) : (
        <>
          <div className="text-neutral-400 text-xs mb-2">Explanation</div>
          <div className="whitespace-pre-wrap leading-relaxed">
            {explanation}
          </div>
        </>
      )}
    </div>
  );
}
