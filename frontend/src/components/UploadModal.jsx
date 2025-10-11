import React, { useMemo, useState } from "react";
import { useStore } from "../store";

export default function UploadModal({ lectureId, onClose }) {
  const { ingestText, enqueueJob, jobs, lectures } = useStore();
  const [title, setTitle] = useState(lectures[lectureId]?.title || "");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState(false);

  const job = useMemo(
    () =>
      Object.values(jobs).find(
        (j) => j.lectureId === lectureId && j.stage !== "done"
      ),
    [jobs, lectureId]
  );

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f || null);
  };

  const onProcess = async () => {
    if (!lectureId || (!text.trim() && !file)) return;
    setWorking(true);
    enqueueJob(lectureId);
    try {
      await ingestText(
        lectureId,
        title || (file ? file.name : "Pasted Text"),
        text,
        file
      );
      onClose();
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Something went wrong generating flashcards.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload material</h3>
          <button
            className="px-2 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700"
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
          className="w-full h-48 px-3 py-2 rounded-xl bg-neutral-800"
          placeholder="Paste text here or upload a PDF below"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            className="text-sm text-neutral-300"
          />
          {file && (
            <span className="text-xs text-neutral-400">
              Selected: {file.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <button
            disabled={(!text && !file) || working}
            onClick={onProcess}
            className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
          >
            {working ? "Generating..." : "Generate flashcards"}
          </button>

          {job && (
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <div className="w-40 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
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
