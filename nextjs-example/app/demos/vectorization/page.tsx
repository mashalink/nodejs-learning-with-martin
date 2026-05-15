"use client";

import { useState, useMemo } from "react";
import {
  DOCUMENTS,
  TOPIC_COLORS,
  tokenize,
  buildVocab,
  vectorize,
  cosineSimilarity,
} from "../rag-engine";

export default function VectorizationDemo() {
  const [query, setQuery] = useState("");

  const vocab = useMemo(() => buildVocab(DOCUMENTS), []);
  const docVectors = useMemo(
    () => DOCUMENTS.map((d) => vectorize(d.text, vocab)),
    [vocab]
  );

  const queryTokens = tokenize(query);
  const queryVector = query.trim() ? vectorize(query, vocab) : null;

  const similarities = queryVector
    ? DOCUMENTS.map((d, i) => ({
        doc: d,
        score: cosineSimilarity(queryVector, docVectors[i]),
      })).sort((a, b) => b.score - a.score)
    : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-mono">
      <h1 className="text-2xl font-bold mb-1">Text Vectorization</h1>
      <p className="text-sm text-gray-500 mb-8">
        From words to numbers — no libraries, just code.
      </p>

      {/* Step 1: Documents */}
      <Section title="Step 1: The Documents" subtitle="our knowledge base">
        <div className="grid gap-2">
          {DOCUMENTS.map((d) => (
            <div
              key={d.id}
              className="bg-gray-950 rounded px-3 py-2 text-sm border-l-3"
              style={{ borderLeftColor: TOPIC_COLORS[d.topic] }}
            >
              <span
                className="text-xs font-bold mr-2"
                style={{ color: TOPIC_COLORS[d.topic] }}
              >
                {d.topic}
              </span>
              {d.text}
            </div>
          ))}
        </div>
      </Section>

      {/* Step 2: Tokenize */}
      <Section title="Step 2: Tokenize" subtitle="split into meaningful words">
        <Code>{`function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\\s]/g, "")  // remove punctuation
    .split(/\\s+/)               // split on whitespace
    .filter(w => w.length > 1 && !stopWords.has(w));
}`}</Code>
        <Output label="Example">
          {`tokenize("${DOCUMENTS[0].text.slice(0, 50)}...")\n→ [${tokenize(DOCUMENTS[0].text)
            .map((w) => `"${w}"`)
            .join(", ")}]`}
        </Output>
      </Section>

      {/* Step 3: Vocabulary */}
      <Section
        title="Step 3: Build Vocabulary"
        subtitle={`${vocab.length} unique words`}
      >
        <Code>{`const vocab = [...new Set(docs.flatMap(d => tokenize(d.text)))].sort();`}</Code>
        <Output label={`Vocabulary (${vocab.length} words)`}>
          {vocab.join(", ")}
        </Output>
      </Section>

      {/* Step 4: Vectorize */}
      <Section
        title="Step 4: Vectorize"
        subtitle="count each vocab word per document"
      >
        <Code>{`function vectorize(text, vocab) {
  const tokens = tokenize(text);
  return vocab.map(word => tokens.filter(t => t === word).length);
}
// "I love pizza" → [0, 0, 0, ..., 1, ..., 1, ...]
//                                  ^love    ^pizza`}</Code>
        <div className="mt-3 space-y-3">
          {DOCUMENTS.map((d, di) => (
            <div key={d.id}>
              <div
                className="text-xs mb-1"
                style={{ color: TOPIC_COLORS[d.topic] }}
              >
                Doc {d.id}: &ldquo;{d.text.slice(0, 50)}&hellip;&rdquo;
              </div>
              <div className="flex gap-px flex-wrap">
                {docVectors[di].map((v, vi) => (
                  <div
                    key={vi}
                    className="w-3.5 h-6 flex items-center justify-center text-[0.55rem] rounded-sm"
                    style={{
                      background:
                        v > 0
                          ? `rgba(56,189,248,${0.3 + v * 0.3})`
                          : "rgba(255,255,255,0.05)",
                      color: v > 0 ? "#fff" : "#333",
                    }}
                    title={`${vocab[vi]}: ${v}`}
                  >
                    {v}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Step 5: Cosine Similarity */}
      <Section
        title="Step 5: Compare Vectors"
        subtitle="cosine similarity"
      >
        <Code>{`function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}
// 1.0 = identical, 0.0 = completely different`}</Code>
        <div className="overflow-x-auto mt-2">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="p-1.5 border border-gray-800 bg-gray-950" />
                {DOCUMENTS.map((d) => (
                  <th
                    key={d.id}
                    className="p-1.5 border border-gray-800 bg-gray-950"
                    style={{ color: TOPIC_COLORS[d.topic] }}
                  >
                    Doc {d.id}
                    <br />
                    <span className="text-[0.6rem]">{d.topic}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DOCUMENTS.map((d1, i) => (
                <tr key={d1.id}>
                  <th
                    className="p-1.5 border border-gray-800 bg-gray-950"
                    style={{ color: TOPIC_COLORS[d1.topic] }}
                  >
                    Doc {d1.id}
                  </th>
                  {DOCUMENTS.map((_, j) => {
                    const sim = cosineSimilarity(docVectors[i], docVectors[j]);
                    return (
                      <td
                        key={j}
                        className="p-1.5 border border-gray-800 text-center"
                        style={{
                          background: `rgba(56,189,248,${sim * 0.6})`,
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
      </Section>

      {/* Step 6: Try it */}
      <Section
        title="Step 6: Try It"
        subtitle="type a query, see similarity scores"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a query... e.g. 'delicious pizza dinner'"
          className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
        />
        {queryVector && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              Tokens: [{queryTokens.map((w) => `"${w}"`).join(", ")}]
            </p>
            <p className="text-xs text-gray-500">
              Vector: [{queryVector.join(", ")}]
            </p>
            {similarities!.map((r) => {
              const pct = Math.round(r.score * 100);
              return (
                <div key={r.doc.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="w-14 text-xs"
                    style={{ color: TOPIC_COLORS[r.doc.topic] }}
                  >
                    Doc {r.doc.id}
                  </span>
                  <div className="flex-1 bg-gray-900 rounded h-4 overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        background: TOPIC_COLORS[r.doc.topic],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="w-12 text-right text-xs">{pct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 mb-5">
      <h2 className="text-base font-bold text-sky-400 mb-3">
        {title}{" "}
        {subtitle && (
          <span className="text-gray-500 text-xs font-normal">
            ({subtitle})
          </span>
        )}
      </h2>
      {children}
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="bg-gray-950 rounded p-3 text-xs overflow-x-auto leading-relaxed">
      {children}
    </pre>
  );
}

function Output({ label, children }: { label: string; children: string }) {
  return (
    <div className="mt-2">
      <div className="text-[0.65rem] text-gray-500 uppercase mb-1">{label}</div>
      <div className="bg-gray-950 border border-gray-800 rounded p-3 text-xs whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
