export type CompanyStatus = "customer" | "prospect" | "researched" | "competitor";

export const PIPELINE_STAGES = [
  "Identified",
  "Researched",
  "Engaged",
  "Demo Scheduled",
  "Proposal",
  "Closed Won",
  "Closed Lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface Signal {
  text: string;
  source: string;
}

export interface Company {
  id: number;
  name: string;
  domain: string;
  industry: string;
  address: string;
  lat: number;
  lng: number;
  employees: number;
  funding: string;
  status: CompanyStatus;
  fitScore: number;
  pipelineStage: PipelineStage | null;
  estimatedValue: string | null;
  lastResearchAt: string | null;
  description: string;
  sources: string[];
  signals: Signal[];
  discovered: number; // 0 = in accounts, 1 = discovered-not-yet-imported
  stageChangedAt?: string | null; // ts of last pipeline move (from company_events)
  hasChampion?: number; // sqlite EXISTS() → 0/1: a starred contact exists on this account
  sequenceProgress?: { done: number; total: number }; // parsed from active sequence steps
}

export interface Claim {
  id: number;
  category: string;
  text: string;
  sourceUrl: string | null;
}

export interface ResearchBrief {
  id: number;
  companyId: number;
  companyName?: string;
  companyStatus?: CompanyStatus;
  companyPipelineStage?: PipelineStage | null;
  createdAt: string;
  whatTheyDo: string;
  whyNow: string;
  claims: Claim[];
}

export interface LogEntry {
  id: number;
  ts: string;
  jobId: string;
  level: "info" | "success" | "warn";
  message: string;
}

export interface JobStatus {
  jobId: string;
  running: boolean;
  total: number;
  done: number;
  failed: number;
  items: { companyId: number; name: string; state: "queued" | "running" | "done" | "failed" }[];
}

export interface Exec {
  id: number;
  companyId: number;
  name: string;
  role: string;
}

export interface SequenceStep {
  day: number;
  label: string;
  done: boolean;
  doneAt?: string | null;
}

export interface Sequence {
  companyId: number;
  startedAt: string;
  steps: SequenceStep[];
}

export interface SequenceDue {
  companyId: number;
  name: string;
  status: CompanyStatus;
  stepIndex: number;
  day: number;
  label: string;
  overdue: number; // days past its scheduled day; 0 = due today
}

export interface AccountIntel {
  tool: string;
  url: string;
  tier: "cognition" | "competitor"; // Windsurf = Cognition product (warm path)
  angle: string;                  // talk track for this specific rival
  evidence: { text: string; sourceUrl: string | null }[]; // deduped signal/claim texts + their source
}

export interface NoChampionDeal {
  companyId: number;
  name: string;
  pipelineStage: PipelineStage;
}

export interface Contact {
  id: number;
  companyId: number;
  name: string;
  role: string;
  url: string;
  notes: string;
  champion: number;
  createdAt: string;
}

export interface CompanyEvent {
  id: number;
  companyId: number;
  ts: string;
  type: "pipeline" | "research" | "note" | "status" | "import";
  text: string;
}

export type FocusActionType = "research" | "advance" | "re-research";

export interface FocusItem {
  companyId: number;
  name: string;
  status: CompanyStatus;
  fitScore: number;
  industry: string;
  pipelineStage: PipelineStage | null;
  action: FocusActionType;
  label: string;
  reason: string;
  targetStage?: PipelineStage;
}

export interface IntelTool {
  tool: string;
  url: string;
  tier: "cognition" | "competitor"; // Windsurf = Cognition product (warm path)
  angle: string;                  // talk track for this rival
  mentions: number;
  accounts: string[];
}

export interface IntelSummary {
  tools: IntelTool[];
  competitorClaims: number;
}

export interface SearchHit {
  companyId: number;
  name: string;
  status: CompanyStatus;
  fitScore: number;
  kind: "claim" | "brief";
  snippet: string;
}
