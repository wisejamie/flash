import React, { useState } from "react";
import { useStore } from "../store";

export default function FlashcardEditorCard({ card }) {
  const { editCard, deleteCard } = useStore();
  const [editing, setEditing] = useState(false);
  const [term, setTerm] = useState(card.term);
  const [exp, setExp] = useState(card.explanation);

  const onSave = () => {
    editCard(card.id, term, exp);
    setEditing(false);
  };

  return (
    <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-700 transition-colors">
      {!editing ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-neutral-400 mb-1">Term</div>
              <div className="font-semibold">{card.term}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-400 mb-1">Explanation</div>
              <div className="text-neutral-200 whitespace-pre-wrap">
                {card.explanation}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg text-red-400 bg-neutral-800 hover:bg-neutral-700"
              onClick={() => {
                if (confirm(`Delete "${card.term}"?`)) deleteCard(card.id);
              }}
            >
              Delete
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-neutral-400 mb-1">Term</div>
              <input
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs text-neutral-400 mb-1">Explanation</div>
              <textarea
                className="w-full bg-neutral-800 rounded-lg px-3 py-2 text-sm"
                rows={4}
                value={exp}
                onChange={(e) => setExp(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              className="px-3 py-1.5 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700"
              onClick={() => {
                setTerm(card.term);
                setExp(card.explanation);
                setEditing(false);
              }}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={onSave}
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
}
