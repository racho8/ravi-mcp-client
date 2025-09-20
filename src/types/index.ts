// src/types/index.ts

export interface LLMToolInvocation {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPResponse {
  result: any;
  error?: string;
}
