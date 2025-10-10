import React, { useMemo, useState } from "react";
import { useStore } from "../store";
import UploadModal from "../components/UploadModal";

export default function LecturesView() {
  const { ui, sets, lectures, addLecture } = useStore();
  const setObj = sets[ui.currentSetId];
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500"
          onClick={() =>
            addLecture(
              ui.currentSetId,
              prompt("Lecture title?") || "Untitled Lecture"
            )
          }
        >
          Add Lecture
        </button>
        <button
          className="px-3 py-2 rounded-xl bg-neutral-800 disabled:opacity-50"
          disabled={!selectedLectureId}
          onClick={() => setShowUpload(true)}
        >
          Upload Material
        </button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {setObj.lectureIds.map((lid) => (
          <div
            key={lid}
            className={`p-3 rounded-xl border ${
              selectedLectureId === lid
                ? "border-indigo-500"
                : "border-neutral-800"
            } bg-neutral-900`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{lectures[lid].title}</div>
                <div className="text-xs text-neutral-400">
                  {lectures[lid].cardIds.length} card(s)
                </div>
              </div>
              <button
                className="px-2 py-1 rounded-lg bg-neutral-800"
                onClick={() => setSelectedLectureId(lid)}
              >
                Select
              </button>
            </div>
          </div>
        ))}
        {setObj.lectureIds.length === 0 && (
          <p className="text-neutral-400">No lectures yet. Add one.</p>
        )}
      </div>

      {showUpload && (
        <UploadModal
          lectureId={selectedLectureId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
