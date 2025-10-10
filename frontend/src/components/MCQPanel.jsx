export default function MCQPanel({ item, selected, onSelect }) {
  return (
    <div className="space-y-2">
      <div className="p-6 rounded-2xl border border-neutral-800 bg-neutral-900">
        <div className="text-neutral-400 text-xs mb-2">Term</div>
        <div className="text-xl font-semibold">{item.stem}</div>
      </div>
      <div className="grid gap-2">
        {item.options.map((opt, i) => (
          <button
            key={opt.id}
            onClick={() => onSelect(i)}
            className={
              "text-left px-4 py-3 rounded-xl border " +
              (selected === i
                ? "border-indigo-500 bg-neutral-900"
                : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800")
            }
          >
            {String.fromCharCode(65 + i)}. {opt.text}
          </button>
        ))}
      </div>
    </div>
  );
}
