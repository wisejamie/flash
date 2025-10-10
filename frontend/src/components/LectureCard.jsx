import React from "react";

export default function LectureCard({ lecture, selected, onSelect }) {
  return (
    <div
      className={`p-3 rounded-xl border ${
        selected ? "border-indigo-500" : "border-neutral-800"
      } bg-neutral-900`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{lecture.title}</div>
          <div className="text-xs text-neutral-400">
            {lecture.cardIds.length} card(s)
          </div>
        </div>
        <button
          className="px-2 py-1 rounded-lg bg-neutral-800"
          onClick={() => onSelect(lecture.id)}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>
    </div>
  );
}
