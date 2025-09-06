
export type RiskLevel = 'Critical' | 'Material' | 'Procedural';

export type ClauseTag = 'TEC' | 'LEG' | 'FIN' | 'COM' | 'IPX' | 'TRM' | 'DIS' | 'DOC' | 'EXE' | 'EXT';

export type RiskCategory = 'Financial' | 'Legal' | 'Operational' | 'Compliance' | 'Reputational' | 'Strategic';

export interface AnalysisResult {
  clause: string;
  interpretation: string;
  exposure: string;
  opportunity: string;
  clauseTag: ClauseTag;
  riskScore: RiskLevel;
  riskCategories: RiskCategory[];
  negotiationRecommendation: string;
}
