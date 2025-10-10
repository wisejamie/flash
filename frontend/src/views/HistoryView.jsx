import React from "react";
import { useStore } from "../store";

export default function HistoryView() {
  const { runs } = useStore();
  const evalRuns = Object.values(runs.evaluation || {}).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  const learnRuns = Object.values(runs.learning || {}).sort(
    (a, b) => b.createdAt - a.createdAt
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm text-neutral-400 mb-2">Learning Runs</div>
        <div className="space-y-2">
          {learnRuns.length === 0 && (
            <div className="text-neutral-400">No learning runs yet.</div>
          )}
          {learnRuns.map((r) => (
            <div
              key={r.id}
              className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900"
            >
              <div className="font-semibold">
                {new Date(r.createdAt).toLocaleString()}
              </div>
              <div className="text-sm text-neutral-400">
                Cards shown: {r.order.length}
              </div>
              <div className="text-sm text-neutral-500">
                Scope:{" "}
                {r.lectureScope === "all"
                  ? "All"
                  : r.lectureScope.length + " lecture(s)"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm text-neutral-400 mb-2">Evaluation Runs</div>
        <div className="space-y-2">
          {evalRuns.length === 0 && (
            <div className="text-neutral-400">No evaluation runs yet.</div>
          )}
          {evalRuns.map((r) => {
            const correct = r.responses.filter((x) => x.correct).length;
            return (
              <div
                key={r.id}
                className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900"
              >
                <div className="font-semibold">
                  {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="text-sm text-neutral-400">
                  Score: {correct}/{r.items.length}
                </div>
                <div className="text-sm text-neutral-500">
                  Scope:{" "}
                  {r.lectureScope === "all"
                    ? "All"
                    : r.lectureScope.length + " lecture(s)"}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
