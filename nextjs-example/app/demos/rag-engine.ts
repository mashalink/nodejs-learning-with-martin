// Shared RAG utilities — pure functions, no dependencies
// Used by both the vectorization and RAG demo pages

export type Document = {
  id: number;
  topic: "Food" | "Tech" | "Sports";
  text: string;
};

export const DOCUMENTS: Document[] = [
  { id: 0, topic: "Food", text: "I love pizza and tacos. Pizza is my favorite food. We ate tacos for dinner last night." },
  { id: 1, topic: "Food", text: "Rice and chicken are great for dinner. I cooked rice with vegetables and chicken today." },
  { id: 2, topic: "Tech", text: "The new laptop is amazing. I bought a laptop with a fast computer and great software." },
  { id: 3, topic: "Tech", text: "My phone got a software update. The computer app on my phone is now faster and better." },
  { id: 4, topic: "Sports", text: "The soccer game was incredible. Our team scored three goals in the soccer match today." },
  { id: 5, topic: "Sports", text: "Basketball is so fun to watch. The basketball team won the game with a great play." },
];

export const TOPIC_COLORS: Record<string, string> = {
  Food: "#f97316",
  Tech: "#38bdf8",
  Sports: "#34d399",
};

const STOP_WORDS = new Set([
  "i", "is", "my", "the", "a", "for", "and", "to", "was", "are",
  "we", "with", "in", "on", "it", "got", "of", "so", "now", "an",
  "at", "be", "has", "had", "its", "no", "not", "but", "or", "if",
  "then", "than",
]);

/** Step 1: Tokenize — lowercase, remove punctuation, remove stop words */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/** Build vocabulary from a set of documents */
export function buildVocab(docs: Document[]): string[] {
  return [...new Set(docs.flatMap((d) => tokenize(d.text)))].sort();
}

/** Step 2: Vectorize — count each vocab word in the text */
export function vectorize(text: string, vocab: string[]): number[] {
  const tokens = tokenize(text);
  return vocab.map((word) => tokens.filter((t) => t === word).length);
}

/** Step 3: Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

export type ScoredDocument = Document & { score: number; vector: number[] };

/** Step 4: Retrieve top-K most similar documents */
export function retrieve(
  query: string,
  index: { doc: Document; vector: number[] }[],
  vocab: string[],
  topK = 2
): ScoredDocument[] {
  const qVec = vectorize(query, vocab);
  return index
    .map(({ doc, vector }) => ({
      ...doc,
      vector,
      score: cosineSimilarity(qVec, vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/** Step 5: Build an augmented prompt with retrieved context */
export function buildPrompt(question: string, docs: Document[]): string {
  const context = docs.map((d) => d.text).join("\n");
  return `Answer based ONLY on the context below.\n\nContext:\n${context}\n\nQuestion: ${question}\nAnswer:`;
}
