const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function generateFlashcards({ text, file }) {
  const formData = new FormData();
  if (text) formData.append("text", text);
  if (file) formData.append("file", file);

  const res = await fetch(`${API_BASE}/generate-flashcards-with-summary`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Flashcard generation failed: ${error}`);
  }

  return await res.json(); // expected { flashcards: [...] }
}
