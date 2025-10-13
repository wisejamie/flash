import React, { useState } from "react";
import { useStore } from "../store";
import MCQPanel from "../components/MCQPanel";
import SummaryPanel from "../components/SummaryPanel";
import useKeyboard from "../hooks/useKeyboard";
import ScopeSelect from "../components/ScopeSelect";

export default function EvaluationView() {
  const { ui, sets, runs, startEvaluation, answerMCQ, finishEvaluation } =
    useStore();
  const setObj = sets[ui.currentSetId];
  const run = ui.currentRunId ? runs.evaluation?.[ui.currentRunId] : null;
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState(null);
  const [scope, setScope] = useState("all"); // "all" | string[]
  const [shuffle, setShuffle] = useState(true);

  const start = () =>
    startEvaluation(setObj.id, scope === "all" ? "all" : scope, 4, {
      shuffleItems: !!shuffle,
    });

  const total = run?.items?.length ?? 0;
  const completed = !!run?.completedAt || (run && cursor >= total);
  const canAnswer = !!run && !completed && cursor < total;
  const item = canAnswer ? run.items[cursor] : null;

  const onSubmit = () => {
    if (!canAnswer || selected == null) return;
    answerMCQ(run.id, item.id, selected);
    const next = cursor + 1;
    setSelected(null);
    if (next >= total) {
      setCursor(next);
      finishEvaluation(run.id);
    } else {
      setCursor(next);
    }
  };

  useKeyboard({
    1: () => canAnswer && setSelected(0),
    2: () => canAnswer && setSelected(1),
    3: () => canAnswer && setSelected(2),
    4: () => canAnswer && setSelected(3),
    Enter: () => canAnswer && onSubmit(),
  });

  if (!run) {
    return (
      <div className="space-y-4">
        <ScopeSelect
          setObj={setObj}
          value={scope}
          onChange={setScope}
          className="max-w-2xl"
        />
        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            className="accent-indigo-600"
            checked={shuffle}
            onChange={(e) => setShuffle(e.target.checked)}
          />
          Shuffle questions
        </label>
        <button
          disabled={
            setObj.lectureIds.length === 0 ||
            (Array.isArray(scope) && scope.length === 0)
          }
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          onClick={start}
        >
          {scope === "all"
            ? "Start Evaluation (All Lectures)"
            : `Start Evaluation (${
                Array.isArray(scope) ? scope.length : 0
              } selected)`}
        </button>
      </div>
    );
  }

  if (completed) return <SummaryPanel run={run} />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-400">
          Question {cursor + 1} / {run.items.length}
        </div>
      </div>

      <MCQPanel item={item} selected={selected} onSelect={setSelected} />

      <div className="flex gap-2">
        <button
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          disabled={selected == null}
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
