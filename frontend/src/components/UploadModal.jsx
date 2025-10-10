import React, { useMemo, useState } from "react";
import { useStore } from "../store";

export default function UploadModal({ lectureId, onClose }) {
  const { ingestText, enqueueJob, jobs, lectures } = useStore();
  const [title, setTitle] = useState(lectures[lectureId]?.title || "");
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);

  const job = useMemo(
    () =>
      Object.values(jobs).find(
        (j) => j.lectureId === lectureId && j.stage !== "done"
      ),
    [jobs, lectureId]
  );

  const onProcess = async () => {
    if (!lectureId || !text.trim()) return;
    setWorking(true);
    enqueueJob(lectureId);
    await ingestText(lectureId, title || "Pasted Text", text);
    setWorking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload material</h3>
          <button
            className="px-2 py-1 rounded-lg bg-neutral-800"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <input
          className="w-full px-3 py-2 rounded-xl bg-neutral-800"
          placeholder="Lecture title for this material (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <textarea
          className="w-full h-56 px-3 py-2 rounded-xl bg-neutral-800"
          placeholder="Paste text here (PDF support coming later)"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <button
            disabled={!text || working}
            onClick={onProcess}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            Generate flashcards
          </button>

          {job && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <div className="w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500"
                  style={{ width: `${Math.floor((job.progress || 0) * 100)}%` }}
                />
              </div>
              <span>{job.stage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
