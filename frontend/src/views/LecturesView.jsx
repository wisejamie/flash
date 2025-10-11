import React, { useMemo, useState } from "react";
import { useStore } from "../store";
import UploadModal from "../components/UploadModal";
import FlashcardEditorCard from "../components/FlashcardEditorCard";
import AddFlashcardInline from "../components/AddFlashcardInline";

export default function LecturesView() {
  const { ui, sets, cards, lectures, addLecture, deleteLecture } = useStore();
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
        {setObj.lectureIds.map((lid) => {
          const L = lectures[lid];
          return (
            <div
              key={lid}
              className={`p-4 rounded-xl border transition-colors ${
                selectedLectureId === lid
                  ? "border-indigo-500 bg-neutral-800/60"
                  : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"
              } flex flex-col justify-between`}
            >
              {/* Lecture info */}
              <div className="flex-1">
                <div className="font-semibold text-neutral-100 truncate">
                  {L.title || "Untitled Lecture"}
                </div>
                <div className="text-xs text-neutral-400 mt-1">
                  {L.cardIds.length} card{L.cardIds.length !== 1 && "s"}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 mt-3">
                <button
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    selectedLectureId === lid
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
                  }`}
                  onClick={() => setSelectedLectureId(lid)}
                >
                  {selectedLectureId === lid ? "Selected" : "Select"}
                </button>

                <button
                  className="px-3 py-1.5 text-sm rounded-lg font-medium text-red-400 bg-neutral-800 hover:text-red-300 hover:bg-neutral-700 transition-colors"
                  onClick={() => {
                    if (confirm(`Delete lecture "${L.title}"?`)) {
                      deleteLecture(lid);
                      if (selectedLectureId === lid) setSelectedLectureId(null);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
        {setObj.lectureIds.length === 0 && (
          <p className="text-neutral-400">No lectures yet. Add one.</p>
        )}
      </div>

      {selectedLectureId && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-neutral-400">
              Editing lecture:{" "}
              <span className="text-neutral-200 font-medium">
                {lectures[selectedLectureId]?.title || "Untitled Lecture"}
              </span>
            </div>
          </div>
          <AddFlashcardInline lectureId={selectedLectureId} />

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {lectures[selectedLectureId]?.cardIds?.length ? (
              lectures[selectedLectureId].cardIds.map((cid) => (
                <FlashcardEditorCard key={cid} card={cards[cid]} />
              ))
            ) : (
              <div className="col-span-full text-neutral-400 text-sm">
                No flashcards yet. Click “Add flashcard” to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {showUpload && (
        <UploadModal
          lectureId={selectedLectureId}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  );
}
