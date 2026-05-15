"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import {
  tokenize,
  cosineSimilarity,
} from "../rag-engine";

type Doc = {
  id: number;
  name: string;
  text: string;
  tokens: string[];
  vector: number[];
};

const SAMPLE_FILES = [
  "pizza-night.txt",
  "cooking-rice.txt",
  "new-laptop.txt",
  "phone-update.txt",
  "soccer-game.txt",
  "basketball-win.txt",
  "healthy-eating.txt",
  "ai-programming.txt",
  "ai-agents.txt",
  "ai-training.txt",
  "tennis-match.txt",
];

const STOP_WORDS = new Set([
  "i", "is", "my", "the", "a", "for", "and", "to", "was", "are",
  "we", "with", "in", "on", "it", "got", "of", "so", "now", "an",
  "at", "be", "has", "had", "its", "no", "not", "but", "or", "if",
  "then", "than",
]);

export default function RAGDemo() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [newDocName, setNewDocName] = useState("");
  const [newDocText, setNewDocText] = useState("");
  const [query, setQuery] = useState("");
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processingDoc, setProcessingDoc] = useState<{
    name: string;
    text: string;
    step: "tokenize" | "vectorize" | "store" | "done";
    tokens?: string[];
    vector?: number[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vocabulary is rebuilt from all indexed docs
  const vocab = useMemo(() => {
    const allTokens = docs.flatMap((d) => d.tokens);
    return [...new Set(allTokens)].sort();
  }, [docs]);

  // Re-vectorize all docs when vocab changes (new doc added)
  const indexedDocs = useMemo(() => {
    return docs.map((d) => ({
      ...d,
      vector: vocab.map((word) => d.tokens.filter((t) => t === word).length),
    }));
  }, [docs, vocab]);

  // Query results
  const queryResult = useMemo(() => {
    if (!query.trim() || indexedDocs.length === 0) return null;
    const qTokens = tokenize(query);
    const qVec = vocab.map(
      (word) => qTokens.filter((t) => t === word).length
    );
    const scored = indexedDocs
      .map((d) => ({ ...d, score: cosineSimilarity(qVec, d.vector) }))
      .sort((a, b) => b.score - a.score);
    const top2 = scored.slice(0, 2);
    const context = top2.map((d) => d.text).join("\n");
    const prompt = `Answer based ONLY on the context below.\n\nContext:\n${context}\n\nQuestion: ${query}\nAnswer:`;
    return { qTokens, qVec, scored, top2, prompt };
  }, [query, indexedDocs, vocab]);

  async function loadSamples() {
    const fetched = await Promise.all(
      SAMPLE_FILES.map(async (name) => {
        const res = await fetch(`/sample-docs/${name}`);
        const text = await res.text();
        return { name, text };
      })
    );
    const newDocs: Doc[] = fetched.map((s, i) => {
      const tokens = tokenize(s.text);
      return { id: i, name: s.name, text: s.text, tokens, vector: [] };
    });
    const allTokens = newDocs.flatMap((d) => d.tokens);
    const v = [...new Set(allTokens)].sort();
    newDocs.forEach((d) => {
      d.vector = v.map((word) => d.tokens.filter((t) => t === word).length);
    });
    setDocs(newDocs);
    setActiveStep(2);
  }

  // Process a single { name, text } through the animated pipeline
  async function processAndIndex(name: string, text: string) {
    const tokens = tokenize(text);
    setProcessingDoc({ name, text, step: "tokenize", tokens });
    await delay(1200);

    const newVocab = [
      ...new Set([...vocab, ...tokens]),
    ].sort();
    const vector = newVocab.map(
      (word) => tokens.filter((t) => t === word).length
    );
    setProcessingDoc({ name, text, step: "vectorize", tokens, vector });
    await delay(1200);

    setProcessingDoc({ name, text, step: "store", tokens, vector });
    await delay(800);

    const newDoc: Doc = {
      id: docs.length,
      name,
      text,
      tokens,
      vector,
    };
    setDocs((prev) => [...prev, newDoc]);
    setProcessingDoc({ name, text, step: "done", tokens, vector });

    await delay(600);
    setProcessingDoc(null);
  }

  async function addDocument() {
    if (!newDocText.trim()) return;
    const name = newDocName.trim() || `document-${docs.length}.txt`;
    await processAndIndex(name, newDocText);
    setNewDocName("");
    setNewDocText("");
  }

  // Read text files from a FileList (from input or drop)
  const handleFiles = useCallback(async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.name.endsWith(".txt")) continue;
      const text = await file.text();
      if (text.trim()) {
        await processAndIndex(file.name, text.trim());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocab, docs]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setDragging(false), []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-mono">
      <h1 className="text-2xl font-bold mb-1">Live RAG Pipeline</h1>
      <p className="text-sm text-gray-500 mb-6">
        Upload documents, watch them get processed, then query them.
      </p>

      {/* Pipeline visual */}
      <div className="flex gap-1 items-center justify-center flex-wrap mb-8">
        {[
          { n: 1, label: "Upload" },
          { n: 2, label: "Tokenize" },
          { n: 3, label: "Vectorize" },
          { n: 4, label: "Store" },
          { n: 5, label: "Query" },
          { n: 6, label: "Retrieve" },
          { n: 7, label: "Augment" },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-700 text-xs">&rarr;</span>}
            <button
              onClick={() => {
                if (n <= 4) setActiveStep(activeStep === n ? null : n);
              }}
              className={`border rounded px-2.5 py-1.5 text-[0.7rem] text-center transition ${
                activeStep === n
                  ? "border-sky-500 bg-sky-500/10 text-sky-400"
                  : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-600"
              }`}
            >
              <span className="text-sky-500 text-[0.55rem] block">{n}</span>
              {label}
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* LEFT: Upload & Process */}
        <div className="space-y-5">
          {/* Upload section */}
          <Panel title="Upload Documents" step={1}>
            <div className="space-y-3">
              {/* Drag-and-drop / file picker zone */}
              <div
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition ${
                  dragging
                    ? "border-sky-400 bg-sky-500/10"
                    : "border-gray-700 hover:border-gray-500"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
                <div className="text-2xl mb-1 text-gray-500">
                  {dragging ? "\u2193" : "\u21EA"}
                </div>
                <p className="text-xs text-gray-400">
                  Drag &amp; drop <code>.txt</code> files here, or click to browse
                </p>
                <p className="text-[0.65rem] text-gray-600 mt-1">
                  Each file will be processed through the RAG pipeline live
                </p>
              </div>

              {/* Manual text entry */}
              <details className="group">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                  Or type/paste text manually
                </summary>
                <div className="mt-2 space-y-2">
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Filename (e.g. my-notes.txt)"
                    className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                  />
                  <textarea
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    placeholder="Paste or type document content..."
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs focus:outline-none focus:border-sky-500 resize-y"
                  />
                  <button
                    onClick={addDocument}
                    disabled={!newDocText.trim() || !!processingDoc}
                    className="bg-sky-500 text-black font-bold px-4 py-1.5 rounded text-xs hover:bg-sky-400 disabled:opacity-30"
                  >
                    Process &amp; Index
                  </button>
                </div>
              </details>

              {/* Load samples */}
              {docs.length === 0 && (
                <button
                  onClick={loadSamples}
                  className="w-full border border-gray-700 text-gray-400 px-4 py-2 rounded text-xs hover:border-gray-500 hover:text-gray-300 transition"
                >
                  Load {SAMPLE_FILES.length} Sample Documents from /sample-docs/
                </button>
              )}
            </div>
          </Panel>

          {/* Live processing animation */}
          {processingDoc && (
            <Panel title="Processing..." step={2}>
              <div className="space-y-3 text-xs">
                {/* Tokenize step */}
                <StepIndicator
                  label="Tokenize"
                  active={processingDoc.step === "tokenize"}
                  done={["vectorize", "store", "done"].includes(processingDoc.step)}
                />
                {processingDoc.tokens && processingDoc.step !== "done" && (
                  <div className="bg-gray-950 rounded p-2 text-[0.7rem]">
                    <span className="text-gray-500">Input: </span>
                    &ldquo;{processingDoc.text.slice(0, 80)}
                    {processingDoc.text.length > 80 ? "..." : ""}&rdquo;
                    <br />
                    <span className="text-gray-500">Stop words removed: </span>
                    <span className="text-orange-400">
                      {processingDoc.text
                        .toLowerCase()
                        .replace(/[^a-z\s]/g, "")
                        .split(/\s+/)
                        .filter((w) => w.length > 1 && STOP_WORDS.has(w))
                        .join(", ") || "none"}
                    </span>
                    <br />
                    <span className="text-gray-500">Tokens: </span>
                    <span className="text-emerald-400">
                      [{processingDoc.tokens.map((t) => `"${t}"`).join(", ")}]
                    </span>
                  </div>
                )}

                {/* Vectorize step */}
                <StepIndicator
                  label="Vectorize"
                  active={processingDoc.step === "vectorize"}
                  done={["store", "done"].includes(processingDoc.step)}
                />
                {processingDoc.vector &&
                  ["vectorize", "store"].includes(processingDoc.step) && (
                    <div className="bg-gray-950 rounded p-2">
                      <div className="text-[0.65rem] text-gray-500 mb-1">
                        Vector ({processingDoc.vector.length} dimensions):
                      </div>
                      <div className="flex gap-px flex-wrap">
                        {processingDoc.vector.map((v, i) => (
                          <div
                            key={i}
                            className="w-3 h-5 flex items-center justify-center text-[0.5rem] rounded-sm"
                            style={{
                              background:
                                v > 0
                                  ? `rgba(56,189,248,${0.3 + v * 0.35})`
                                  : "rgba(255,255,255,0.04)",
                              color: v > 0 ? "#fff" : "#333",
                            }}
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Store step */}
                <StepIndicator
                  label="Store in Index"
                  active={processingDoc.step === "store"}
                  done={processingDoc.step === "done"}
                />

                {processingDoc.step === "done" && (
                  <div className="text-emerald-400 text-xs">
                    Document indexed successfully.
                  </div>
                )}
              </div>
            </Panel>
          )}

          {/* Query section */}
          <Panel title="Query the Index" step={5}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
              disabled={docs.length === 0}
            />
            {docs.length === 0 && (
              <p className="text-xs text-gray-600 mt-1">
                Index some documents first.
              </p>
            )}

            {queryResult && (
              <div className="mt-3 space-y-3">
                {/* Retrieval scores */}
                <div>
                  <div className="text-[0.65rem] text-gray-500 uppercase mb-1">
                    Step 6: Similarity Scores
                  </div>
                  {queryResult.scored.map((r, i) => {
                    const pct = Math.round(r.score * 100);
                    const isTop = i < 2;
                    return (
                      <div
                        key={r.id}
                        className="flex items-center gap-2 text-xs my-1"
                        style={{ opacity: isTop ? 1 : 0.4 }}
                      >
                        <span className="w-3 text-emerald-400">
                          {isTop ? "\u2713" : ""}
                        </span>
                        <span className="w-24 truncate text-gray-400">
                          {r.name}
                        </span>
                        <div className="flex-1 bg-gray-950 rounded h-3 overflow-hidden">
                          <div
                            className="h-full rounded transition-all"
                            style={{
                              width: `${pct}%`,
                              background: "var(--color-sky-500, #38bdf8)",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                        <span className="w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                {/* Augmented prompt */}
                <div>
                  <div className="text-[0.65rem] text-purple-400 uppercase mb-1">
                    Step 7: Augmented Prompt
                  </div>
                  <div className="bg-gray-950 border border-purple-900/50 rounded p-2.5 text-[0.7rem] whitespace-pre-wrap text-gray-300">
                    {queryResult.prompt}
                  </div>
                  <p className="text-[0.65rem] text-gray-600 mt-1">
                    Without RAG: just &ldquo;{query}&rdquo; | With RAG:{" "}
                    {queryResult.prompt.length} chars including context
                  </p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* RIGHT: What's stored (the index) */}
        <div className="space-y-5">
          <Panel title="The Vector Store" step={4}>
            <p className="text-[0.7rem] text-gray-500 mb-3">
              This is what&apos;s actually stored after RAG processing. Each
              document becomes a row of numbers.
            </p>

            {docs.length === 0 ? (
              <div className="text-center text-gray-600 py-8 text-xs">
                No documents indexed yet.
                <br />
                Upload a document or load samples.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Vocabulary */}
                <div>
                  <div className="text-[0.65rem] text-sky-400 uppercase mb-1">
                    Vocabulary ({vocab.length} words)
                  </div>
                  <div className="bg-gray-950 rounded p-2 text-[0.65rem] text-gray-400 max-h-20 overflow-y-auto">
                    {vocab.join(", ")}
                  </div>
                </div>

                {/* Indexed documents */}
                <div className="text-[0.65rem] text-sky-400 uppercase">
                  Indexed Documents ({indexedDocs.length})
                </div>
                {indexedDocs.map((d) => (
                  <div
                    key={d.id}
                    className="bg-gray-950 border border-gray-800 rounded p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs text-sky-400 font-bold">
                        {d.name}
                      </span>
                      <span className="text-[0.6rem] text-gray-600">
                        id: {d.id}
                      </span>
                    </div>
                    <div className="text-[0.7rem] text-gray-400 mb-2">
                      {d.text}
                    </div>
                    <div className="text-[0.6rem] text-gray-600 mb-1">
                      Tokens ({d.tokens.length}): [{d.tokens.join(", ")}]
                    </div>
                    <div className="text-[0.6rem] text-gray-600 mb-1">
                      Vector ({d.vector.length}d):
                    </div>
                    <div className="flex gap-px flex-wrap">
                      {d.vector.map((v, i) => (
                        <div
                          key={i}
                          className="w-3 h-4 flex items-center justify-center text-[0.45rem] rounded-sm"
                          title={`${vocab[i]}: ${v}`}
                          style={{
                            background:
                              v > 0
                                ? `rgba(56,189,248,${0.25 + v * 0.3})`
                                : "rgba(255,255,255,0.03)",
                            color: v > 0 ? "#fff" : "transparent",
                          }}
                        >
                          {v > 0 ? v : ""}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Similarity matrix */}
                {indexedDocs.length > 1 && (
                  <div>
                    <div className="text-[0.65rem] text-sky-400 uppercase mb-1">
                      Document Similarity Matrix
                    </div>
                    <div className="overflow-x-auto">
                      <table className="text-[0.65rem] border-collapse w-full">
                        <thead>
                          <tr>
                            <th className="p-1 border border-gray-800 bg-gray-950" />
                            {indexedDocs.map((d) => (
                              <th
                                key={d.id}
                                className="p-1 border border-gray-800 bg-gray-950 text-sky-400"
                              >
                                {d.name.slice(0, 8)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {indexedDocs.map((d1, i) => (
                            <tr key={d1.id}>
                              <th className="p-1 border border-gray-800 bg-gray-950 text-sky-400 text-left">
                                {d1.name.slice(0, 8)}
                              </th>
                              {indexedDocs.map((d2, j) => {
                                const sim = cosineSimilarity(
                                  d1.vector,
                                  d2.vector
                                );
                                return (
                                  <td
                                    key={j}
                                    className="p-1 border border-gray-800 text-center"
                                    style={{
                                      background: `rgba(56,189,248,${sim * 0.5})`,
                                    }}
                                  >
                                    {sim.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

// --- Helper components ---

function Panel({
  title,
  step,
  children,
}: {
  title: string;
  step?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-sky-400 mb-3">
        {step && (
          <span className="text-gray-600 text-[0.65rem] mr-1.5">
            Step {step}
          </span>
        )}
        {title}
      </h2>
      {children}
    </div>
  );
}

function StepIndicator({
  label,
  active,
  done,
}: {
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center text-[0.6rem] ${
          done
            ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
            : active
              ? "border-sky-500 text-sky-400 bg-sky-500/10 animate-pulse"
              : "border-gray-700 text-gray-600"
        }`}
      >
        {done ? "\u2713" : active ? "\u2022" : ""}
      </span>
      <span className={done ? "text-emerald-400" : active ? "text-sky-400" : "text-gray-600"}>
        {label}
      </span>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
