// Rival-tool registry: one source of truth for which AI coding products Apex
// tracks in account signals and research claims, how to talk about each, and
// how they relate to Cognition.
//
// Windsurf is tier "cognition" — Cognition acquired it in July 2025 ($82M ARR,
// 350+ enterprise customers). A Windsurf mention is a WARM EXPANSION PATH,
// not a competitor: shared champions, existing budget line, familiar brand.

export type RivalTier = "cognition" | "competitor";

export interface Rival {
  tool: string;
  url: string;
  tier: RivalTier;
  re: RegExp;
  /** Talk track shown wherever this tool surfaces on an account. */
  angle: string;
}

export const RIVALS: Rival[] = [
  {
    tool: "Windsurf",
    url: "https://windsurf.com",
    tier: "cognition",
    re: /\b(windsurf|codeium)\b/i,
    angle:
      "Cognition product (acquired July 2025). An existing Windsurf footprint is a warm intro — ask for the team already using it and expand from there.",
  },
  {
    tool: "GitHub Copilot",
    url: "https://github.com/features/copilot",
    tier: "competitor",
    re: /\bcopilot(s)?\b/i,
    angle:
      "Copilot completes lines; Devin completes tickets. Position autonomy vs autocomplete — the win is throughput, not keystroke speed.",
  },
  {
    tool: "Cursor",
    url: "https://cursor.com",
    tier: "competitor",
    re: /\bcursor\b/i,
    angle:
      "Cursor makes a developer faster inside the editor; Devin takes whole tasks end-to-end in its own environment. Different category — compliment, don't bash.",
  },
  {
    tool: "Claude Code",
    url: "https://www.anthropic.com/claude-code",
    tier: "competitor",
    re: /\bclaude code\b/i,
    angle:
      "Strong harness, but an engineer still drives it. Devin runs autonomously, works tickets in parallel, and reports back — it's a teammate, not a tool.",
  },
  {
    tool: "OpenAI Codex",
    url: "https://openai.com/codex/",
    tier: "competitor",
    re: /\bcodex\b/i,
    angle:
      "Codex is a model plus a light harness; Devin is a managed autonomous engineer — persistent environment, review workflow, Slack/Linear, PRs.",
  },
  {
    tool: "Factory AI",
    url: "https://factory.ai",
    tier: "competitor",
    re: /\bfactory (ai|droid)\b/i,
    angle:
      "Factory's droids pitch multi-agent autonomy too. Differentiate on maturity: Devin is GA inside enterprise production repos with real references.",
  },
  {
    tool: "Replit Agent",
    url: "https://replit.com",
    tier: "competitor",
    re: /\breplit\b/i,
    angle:
      "Replit is prototyping-first and lives in its own IDE. Devin works inside the customer's real repos, CI, and code review — no migration.",
  },
  {
    tool: "Amazon Q Developer",
    url: "https://aws.amazon.com/q/developer/",
    tier: "competitor",
    re: /\b(amazon q|aws q developer)\b/i,
    angle:
      "Q is bundled with AWS — breadth over depth. Devin is purpose-built for autonomous software work, not a sidecar to a cloud suite.",
  },
  {
    tool: "Tabnine",
    url: "https://www.tabnine.com",
    tier: "competitor",
    re: /\btabnine\b/i,
    angle:
      "Tabnine is completion-first and sells privacy. Devin operates at task scope — full tickets, tests, and PRs, not suggestions.",
  },
  {
    tool: "JetBrains AI",
    url: "https://www.jetbrains.com/ai/",
    tier: "competitor",
    re: /\bjetbrains ai\b/i,
    angle:
      "Bundled IDE assistant — good autocomplete, weak autonomy. Devin owns tasks end-to-end outside the editor.",
  },
];

/** Scan a text for every registered rival; returns matched rivals (deduped). */
export function rivalsIn(text: string): Rival[] {
  return RIVALS.filter((r) => r.re.test(text));
}
