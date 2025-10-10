import React from "react";

export default function SetTabs({ active, onChange }) {
  const tabs = ["lectures", "learning", "evaluation", "history"];
  return (
    <div className="flex gap-2">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1.5 rounded-xl border capitalize ${
            active === t
              ? "border-indigo-500 bg-neutral-900"
              : "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
