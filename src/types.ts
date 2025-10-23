export interface TenantData {
  property: string;
  unit: string;
  tenant: string;
  rentAmount: number;
  marketRent: number;
  pastDue: number;
  delinquentRent: number;
  amountReceivable: number;
  aging30: number;
  aging60: number;
  aging90: number;
  agingOver90: number;
  delinquentSubsidyAmount: number;
  delinquencyNotes: string;
  lateCount: number;
  tenureMonths: number;
  latePaymentRate: number;
  leaseEndDate: string;
  moveInDate: string;
  phoneNumbers?: string;
  emails?: string;
}

export interface LocationInsight {
  id: string;
  property: string;
  user_id: string;
  rental_market_strength_score: number;
  vacancy_rate: string;
  rent_trend: string;
  new_construction_supply: string;
  competitor_summary: string;
  overall_market_summary: string;
  created_at: string;
  latitude: number;
  longitude: number;
  recent_news_summary?: string;
}

export interface TenantInsight {
  id: string;
  tenant_name: string;
  tenant_score: number;
  renewal_recommendation: string;
  turnover_risk: string;
  predicted_delinquency: string;
  raise_rent_opportunity: boolean;
  retention_outreach_needed: boolean;
  high_delinquency_alert: boolean;
  notes_analysis: string;
  recommended_actions: string[];
  property: string;
  created_at: string;
  unit: string;
  reasoning_summary: string;
  user_id: string;
  rent_amount: number;
  past_due: number;
  delinquent_rent: number;
  aging_30: number;
  aging_60: number;
  aging_90: number;
  aging_over_90: number;
  lease_start_date: string;
  lease_end_date: string;
  total_balance: number;
  delinquency_notes: string;
  changes?: {
    tenant_score?: { old: number; new: number };
    turnover_risk?: { old: string; new: string };
    predicted_delinquency?: { old: string; new: string };
    past_due?: { old: number; new: number };
    delinquent_rent?: { old: number; new: number };
    total_balance?: { old: number; new: number };
  };
  report_id?: string;
  previous_insight_id?: string | null;
  email?: string;
  phone_number?: string;
}