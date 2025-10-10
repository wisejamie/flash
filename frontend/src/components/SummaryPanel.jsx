import { useStore } from "../store";

export default function SummaryPanel({ run }) {
  const { lectures } = useStore();
  const byLecture = new Map();
  run.items.forEach((it) => {
    const lec = lectures[it.lectureId];
    if (!lec) return;
    if (!byLecture.has(lec.id))
      byLecture.set(lec.id, { title: lec.title, total: 0, correct: 0 });
    byLecture.get(lec.id).total += 1;
  });
  run.responses.forEach((r) => {
    const it = run.items.find((i) => i.id === r.itemId);
    const agg = byLecture.get(it.lectureId);
    if (r.correct) agg.correct += 1;
  });
  const totals = {
    correct: run.responses.filter((x) => x.correct).length,
    total: run.items.length,
  };
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="text-lg font-semibold">Summary</div>
        <div className="text-neutral-300">
          Score: {totals.correct}/{totals.total} (
          {Math.round((totals.correct / Math.max(1, totals.total)) * 100)}%)
        </div>
      </div>
      <div className="space-y-2">
        {[...byLecture.values()].map((v) => (
          <div
            key={v.title}
            className="px-4 py-3 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-between"
          >
            <div>{v.title}</div>
            <div className="text-neutral-300">
              {v.correct} / {v.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
