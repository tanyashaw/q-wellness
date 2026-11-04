export interface ChatMsg {
  role: "caller" | "ava";
  text: string;
  streaming?: boolean;
}

export interface ToolEvent {
  id: string;
  tool: string;
  input: unknown;
  output: unknown;
  summary: string;
  ok: boolean;
  at: string;
}
