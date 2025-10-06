/**
 * types/index.ts - TypeScript Type Definitions
 * 
 * Purpose:
 * - Centralizes all shared TypeScript interfaces and types used across the BFF layer
 * - Ensures type safety and consistency in data structures
 * - Documents the contract between LLM, MCP client, and route handlers
 * 
 * Key Types:
 * - LLMToolInvocation: Structure returned by LLM after parsing user commands
 * - MCPResponse: Standardized response format from MCP server calls
 * 
 * Usage:
 * - Imported by llmClient.ts, mcpClient.ts, and routes.ts
 * - Provides type checking at compile time
 * - Serves as living documentation for data contracts
 */

export interface LLMToolInvocation {
  tool: string;
  parameters: Record<string, any>;
}

export interface MCPResponse {
  result: any;
  error?: string;
}
