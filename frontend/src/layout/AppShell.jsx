// src/layout/AppShell.jsx
import React, { useMemo, useRef } from "react";
import { useStore } from "../store";
import SetTabs from "../components/SetTabs";
import LecturesView from "../views/LecturesView";
import LearningView from "../views/LearningView";
import EvaluationView from "../views/EvaluationView";
import HistoryView from "../views/HistoryView";

export default function AppShell() {
  const { sets, ui, createSet, setCurrentSet, setTab, exportJSON, importJSON } =
    useStore();
  const fileRef = useRef(null);

  const activeSet = ui.currentSetId ? sets[ui.currentSetId] : null;
  const tabKey = ui.tab;

  // For a tiny fade/slide on tab change
  const Content = useMemo(() => {
    switch (tabKey) {
      case "lectures":
        return <LecturesView />;
      case "learning":
        return <LearningView />;
      case "evaluation":
        return <EvaluationView />;
      case "history":
        return <HistoryView />;
      default:
        return null;
    }
  }, [tabKey]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30">
      {/* HEADER */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-neutral-900/60 border-b border-neutral-800/50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-600 text-transparent bg-clip-text">
              Flashcarding
            </h1>
            <span className="hidden md:inline-block text-neutral-500">·</span>
            {activeSet ? (
              <div className="hidden md:flex items-center gap-2 text-sm text-neutral-300">
                <span className="text-neutral-400">Set:</span>
                <span className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800">
                  {activeSet.title}
                </span>
              </div>
            ) : (
              <div className="hidden md:block text-sm text-neutral-400">
                No set selected
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-medium shadow-sm shadow-indigo-900/30"
              onClick={() => createSet(prompt("Set title?") || "Untitled Set")}
            >
              New Set
            </button>
            <button
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/70"
              onClick={exportJSON}
            >
              Export
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && importJSON(e.target.files[0])
              }
            />
            <button
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/70"
              onClick={() => fileRef.current?.click()}
            >
              Import
            </button>
          </div>
        </div>
      </header>

      {/* BODY GRID */}
      <main className="flex-1 px-4 md:px-6 py-8 grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8">
        {/* SIDEBAR */}
        <aside className="md:col-span-2 lg:col-span-1">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-neutral-300">Sets</div>
              <button
                className="text-xs px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/70"
                onClick={() =>
                  createSet(prompt("Set title?") || "Untitled Set")
                }
              >
                + New
              </button>
            </div>

            {Object.values(sets).length === 0 ? (
              <p className="text-sm text-neutral-500">
                No sets yet. Create one to start.
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.values(sets).map((s) => {
                  const isActive = s.id === ui.currentSetId;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setCurrentSet(s.id)}
                        className={[
                          "w-full text-left p-3 rounded-xl border transition-all duration-150 transform",
                          isActive
                            ? "border-indigo-500/80 bg-neutral-900 shadow-md shadow-indigo-900/20"
                            : "border-neutral-800 bg-neutral-900/40 hover:bg-neutral-900 hover:-translate-y-0.5",
                        ].join(" ")}
                      >
                        <div className="font-medium truncate">{s.title}</div>
                        <div className="text-xs text-neutral-400">
                          {s.lectureIds.length} lecture(s)
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* WORKSPACE */}
        <section className="md:col-span-3 lg:col-span-4">
          {!activeSet ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-neutral-400">
                  Select or create a Set to begin.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tabs + quick stats */}
              <div className="flex items-center justify-between">
                <SetTabs active={ui.tab} onChange={setTab} />
                <div className="hidden md:flex items-center gap-3 text-sm">
                  <div className="px-2 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400">
                    {activeSet.lectureIds.length} lectures
                  </div>
                  {/* Potential spot for total card count across lectures */}
                </div>
              </div>

              {/* Content Card */}
              <div
                key={tabKey} // forces the tiny animation on tab change (no state loss because store persists)
                className="rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-lg shadow-black/20
                           transition-all duration-200 animate-[fadeSlide_.2s_ease-out]"
              >
                {Content}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* FOOTER (optional) */}
      <footer className="py-6">
        <div className="max-w-6xl mx-auto px-6 text-xs text-neutral-500">
          Built by Jamie Wise for focused study.
        </div>
      </footer>

      {/* Tiny keyframes for tab fade/slide */}
      <style>{`
        @keyframes fadeSlide {
          from { opacity: .0; transform: translateY(4px); }
          to   { opacity: 1;  transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
