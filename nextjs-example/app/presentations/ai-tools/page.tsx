"use client";

import { useState } from "react";

/* ── tiny "tool" registry ── */

type Tool = {
  name: string;
  description: string;
  keywords: string[];
  run: (a: number, b: number) => number;
};

const tools: Tool[] = [
  {
    name: "add",
    description: "Add two numbers",
    keywords: ["add", "plus", "sum"],
    run: (a, b) => a + b,
  },
  {
    name: "subtract",
    description: "Subtract two numbers",
    keywords: ["subtract", "minus", "difference"],
    run: (a, b) => a - b,
  },
  {
    name: "multiply",
    description: "Multiply two numbers",
    keywords: ["multiply", "times", "product"],
    run: (a, b) => a * b,
  },
  {
    name: "divide",
    description: "Divide two numbers",
    keywords: ["divide", "divided", "quotient"],
    run: (a, b) => a / b,
  },
];

/* ── parse user input ── */

function parseInput(text: string): { tool: string; a: number; b: number } | null {
  const lower = text.toLowerCase();

  // find which tool matches
  let matchedTool: string | null = null;
  for (const tool of tools) {
    if (tool.keywords.some((kw) => lower.includes(kw))) {
      matchedTool = tool.name;
      break;
    }
  }
  if (!matchedTool) return null;

  // pull out numbers – use the last two, since earlier numbers
  // are often incidental (e.g. "add 2 numbers together, 5 and 3")
  const nums = text.match(/-?\d+(\.\d+)?/g);
  if (!nums || nums.length < 2) return null;

  const a = parseFloat(nums[nums.length - 2]);
  const b = parseFloat(nums[nums.length - 1]);
  return { tool: matchedTool, a, b };
}

/* ── execute via switch/case ── */

function executeTool(name: string, a: number, b: number): number | null {
  switch (name) {
    case "add":
      return a + b;
    case "subtract":
      return a - b;
    case "multiply":
      return a * b;
    case "divide":
      return b !== 0 ? a / b : null;
    default:
      return null;
  }
}

/* ── step log for visualisation ── */

type Step = { label: string; detail: string };

export default function AIToolsDemo() {
  const [input, setInput] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<string | null>(null);

  function handleRun() {
    const log: Step[] = [];

    // Step 1 – receive input
    log.push({ label: "1. User input", detail: `"${input}"` });

    // Step 2 – parse
    const parsed = parseInput(input);
    if (!parsed) {
      log.push({ label: "2. Parse", detail: "Could not detect a tool or two numbers." });
      setSteps(log);
      setResult(null);
      return;
    }
    log.push({
      label: "2. Parse",
      detail: `Tool → "${parsed.tool}"  |  Numbers → ${parsed.a}, ${parsed.b}`,
    });

    // Step 3 – tool selection
    log.push({
      label: "3. Tool selected",
      detail: `Using "${parsed.tool}" from the tool registry`,
    });

    // Step 4 – execute
    const answer = executeTool(parsed.tool, parsed.a, parsed.b);
    if (answer === null) {
      log.push({ label: "4. Execute", detail: "Error (e.g. divide by zero)" });
      setSteps(log);
      setResult(null);
      return;
    }
    log.push({ label: "4. Execute", detail: `${parsed.a} ${opSymbol(parsed.tool)} ${parsed.b} = ${answer}` });

    setSteps(log);
    setResult(String(answer));
  }

  return (
    <main>
      <h1>AI Tool Use – Simple Demo</h1>
      <p>
        Type a calculation in plain English, e.g.{" "}
        <em>&quot;add 5 and 2&quot;</em> or <em>&quot;multiply 7 times 3&quot;</em>
      </p>

      <div>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRun()}
          placeholder="e.g. add 5 and 2"
        />
        <button onClick={handleRun}>Run</button>
      </div>

      <h3>Available Tools</h3>
      <ul>
        {tools.map((t) => (
          <li key={t.name}>{t.name}</li>
        ))}
      </ul>

      {steps.length > 0 && (
        <>
          <h3>Step-by-step</h3>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>
                <strong>{s.label}</strong> – {s.detail}
              </li>
            ))}
          </ol>
        </>
      )}

      {result !== null && (
        <p>
          <strong>Answer: {result}</strong>
        </p>
      )}
    </main>
  );
}

function opSymbol(tool: string): string {
  switch (tool) {
    case "add": return "+";
    case "subtract": return "-";
    case "multiply": return "*";
    case "divide": return "/";
    default: return "?";
  }
}
