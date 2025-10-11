import React, { useState } from "react";
import { useStore } from "../store";

export default function AddFlashcardInline({ lectureId }) {
  const { addCard } = useStore();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [exp, setExp] = useState("");

  const reset = () => {
    setTerm("");
    setExp("");
  };

  const save = () => {
    if (!term.trim() || !exp.trim()) return;
    addCard(lectureId, term, exp);
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200"
        onClick={() => setOpen(true)}
      >
        + Add flashcard
      </button>
    );
  }

  return (
    <div className="w-full p-4 border border-neutral-800 rounded-xl bg-neutral-900 space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-neutral-400 mb-1">Term</div>
          <input
            className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Enter term"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>
        <div>
          <div className="text-xs text-neutral-400 mb-1">Explanation</div>
          <textarea
            className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Enter explanation"
            rows={4}
            value={exp}
            onChange={(e) => setExp(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700"
          onClick={() => {
            reset();
            setOpen(false);
          }}
        >
          Cancel
        </button>
        <button
          disabled={!term.trim() || !exp.trim()}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
          onClick={save}
        >
          Save
        </button>
      </div>
    </div>
  );
}
