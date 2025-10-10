import React from "react";
import { useStore } from "../store";

/**
 * value: 'all' | string[] (lectureIds)
 * onChange: (newValue) => void
 */
export default function ScopeSelect({ value = "all", onChange }) {
  const { ui, sets, lectures } = useStore();
  const setObj = sets[ui.currentSetId];
  const all = value === "all";

  const toggleAll = () => onChange(all ? [] : "all");

  const toggleOne = (lid) => {
    if (all) {
      onChange([lid]);
      return;
    }
    const set = new Set(value);
    if (set.has(lid)) set.delete(lid);
    else set.add(lid);
    const arr = Array.from(set);
    onChange(arr.length === 0 ? "all" : arr);
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        className={`px-2 py-1 rounded-lg border ${
          all
            ? "border-indigo-500 bg-neutral-900"
            : "border-neutral-800 bg-neutral-900/50"
        }`}
        onClick={toggleAll}
      >
        All lectures
      </button>

      {setObj.lectureIds.map((lid) => (
        <button
          key={lid}
          className={`px-2 py-1 rounded-lg border ${
            !all && value.includes(lid)
              ? "border-indigo-500 bg-neutral-900"
              : "border-neutral-800 bg-neutral-900/50"
          }`}
          onClick={() => toggleOne(lid)}
          title={lectures[lid]?.title}
        >
          {lectures[lid]?.title || lid}
        </button>
      ))}
    </div>
  );
}
