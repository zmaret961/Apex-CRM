export type CompanyStatus = "customer" | "prospect" | "researched";

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
  mentions: number;
  accounts: string[];
}

export interface IntelSummary {
  tools: IntelTool[];
  competitorClaims: number;
}
