import { engineApi } from "./engineApi";

export interface SelfHealingLog {
  id: number;
  alert_name: string;
  severity: string;
  runbook_name: string;
  status: string;
  result_message: string;
  alert_payload: Record<string, unknown>;
  service: string;
  triggered_at: string;
  completed_at: string | null;
}

export async function getSocLogs(): Promise<SelfHealingLog[]> {
  const { data } = await engineApi.get("/monitoring/logs/");
  return data;
}
