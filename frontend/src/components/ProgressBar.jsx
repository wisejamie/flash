export default function ProgressBar({ value = 0 }) {
  return (
    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-indigo-500"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}
