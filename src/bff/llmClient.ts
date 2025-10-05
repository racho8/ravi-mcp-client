/**
 * llmClient.ts - LLM Integration Layer
 * 
 * Purpose:
 * - Interfaces with Ollama (llama3 model) at http://localhost:11434
 * - Converts natural language commands to structured JSON tool calls
 * - Dynamically builds tool definitions from MCP schemas
 * 
 * Key Features:
 * - Enhanced prompt engineering with explicit JSON format requirements
 * - Includes query/create/update/delete examples for better LLM guidance
 * - Robust JSON parsing with fallback extraction from markdown blocks
 * - Handles LLM response errors gracefully with user-friendly messages
 * - Dynamic tool schema loading from mcpSchemaCache
 * 
 * LLM Prompt Strategy:
 * - Provides clear rules for query matching (name > segment > category)
 * - Includes specific examples for filtering, CRUD operations, and counting
 * - Forces JSON format with 'format: json' parameter
 * - Explicit "Return ONLY valid JSON" instruction to prevent text responses
 * 
 * Error Handling:
 * - Extracts JSON from markdown code blocks (```json ... ```)
 * - Falls back to regex pattern matching for JSON objects
 * - Provides clear error messages when JSON parsing fails
 */

// LLM client for Ollama (local) or Google LLM (cloud)
import axios from 'axios';
import { fetchAndCacheToolSchemas } from './mcpSchemaCache.js';

// Example: Use Ollama's local API (http://localhost:11434)
export async function callLLM(command: string): Promise<any> {
  // Dynamically build tool definitions from MCP schemas
  const schemas = await fetchAndCacheToolSchemas();
  console.log('[LLM] Available tools:', Object.keys(schemas));
  
  let toolDefinitions = `Convert user commands to JSON tool calls. Handler resolves names to UUIDs.

RULES:
• Query: "show/find/get [X]" → match by name > segment > category
• If command mentions a specific category/segment name, use the specific filter tool
• Create: Extract name, price, category (optional), segment (optional)
• Update: Always use list_products (handler extracts names & resolves UUIDs)
• Delete: Use delete_product with product name as "id" parameter (handler resolves name to UUID)
• Count: use list_products or specific filter tools
• "all/every" in delete = delete_products; in update = bulk operation

MATCHING:
• Electronics/Furniture/Office furniture = category | Laptops/mobiles/HomeOffice = segment | iPhone/MacBook = name

Available tools:`;
  
  let idx = 1;
  for (const [toolName, { description, inputSchema, samplePayload }] of Object.entries(schemas)) {
    toolDefinitions += `\n${idx}. ${toolName}: ${description}`;
    if (inputSchema && inputSchema.properties) {
      toolDefinitions += `\n  Parameters: ${JSON.stringify(inputSchema.properties, null, 2)}`;
    }
    if (samplePayload) {
      toolDefinitions += `\n  Example: ${JSON.stringify(samplePayload, null, 2)}`;
    }
    idx++;
  }
  
  // Add specific examples for filtering
  toolDefinitions += `

EXAMPLES (return format: {"tool":"tool_name","parameters":{...}}):
Query:
• "Show Furniture" → {"tool":"get_products_by_category","parameters":{"category":"Furniture"}}
• "Show all products in Electronics category" → {"tool":"get_products_by_category","parameters":{"category":"Electronics"}}
• "How many products are in Electronics category" → {"tool":"get_products_by_category","parameters":{"category":"Electronics"}}
• "Show me all products in Furniture category" → {"tool":"get_products_by_category","parameters":{"category":"Furniture"}}
• "Find Laptops" → {"tool":"get_products_by_segment","parameters":{"segment":"Laptops"}}
• "Get iPhone" → {"tool":"get_product_by_name","parameters":{"name":"iPhone"}}
• "Show all products" → {"tool":"list_products","parameters":{}}
• "List everything" → {"tool":"list_products","parameters":{}}

Create:
• "Create iPhone 16 at 899" → {"tool":"create_product","parameters":{"name":"iPhone 16","price":899}}
• "Create Desk Lamp 45 in Office furniture, HomeOffice segment" → {"tool":"create_product","parameters":{"name":"Desk Lamp","price":45,"category":"Office furniture","segment":"HomeOffice"}}

Update (→ list_products, handler resolves):
• "Update iPhone 17 to 799" → {"tool":"list_products","parameters":{}}
• "Set all MacBook to 2800" → {"tool":"list_products","parameters":{}}

Delete:
• "Delete HP Spectre" → {"tool":"delete_product","parameters":{"id":"HP Spectre"}}
• "Remove iPhone 16" → {"tool":"delete_product","parameters":{"id":"iPhone 16"}}
• "Delete Laptop2" → {"tool":"delete_product","parameters":{"id":"Laptop2"}}
• "Delete product named Dell Laptop" → {"tool":"delete_product","parameters":{"id":"Dell Laptop"}}

Count:
• "How many products" → {"tool":"list_products","parameters":{}}
• "Count Electronics" → {"tool":"get_products_by_category","parameters":{"category":"Electronics"}}
• "How many in Laptops segment" → {"tool":"get_products_by_segment","parameters":{"segment":"Laptops"}}

Duplicates:
• "Show duplicates" → {"tool":"list_products","parameters":{}}
• "Remove duplicates" → {"tool":"list_products","parameters":{}}

CRITICAL: Return ONLY valid JSON in this exact format: {"tool":"tool_name","parameters":{...}}
Do NOT include explanations, markdown, or any text before/after the JSON.

User command: ${command}
JSON response:`;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: toolDefinitions,
      stream: false,
      format: 'json'  // Request JSON format from Ollama
    });
    
    let rawResponse = response.data.response.trim();
    console.log('[LLM] Raw response:', rawResponse);
    
    // Try to extract JSON if it's wrapped in markdown or text
    if (rawResponse.includes('```json')) {
      const jsonMatch = rawResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        rawResponse = jsonMatch[1];
      }
    } else if (rawResponse.includes('```')) {
      const jsonMatch = rawResponse.match(/```\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        rawResponse = jsonMatch[1];
      }
    }
    
    // If response doesn't start with {, try to find the JSON object
    if (!rawResponse.startsWith('{')) {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawResponse = jsonMatch[0];
      }
    }
    
    return JSON.parse(rawResponse);
  } catch (err: any) {
    console.error('[LLM] Error details:', err.message);
    if (err.message.includes('Unexpected token')) {
      throw new Error('LLM returned invalid JSON. Please try rephrasing your command.');
    }
    throw new Error('LLM call failed: ' + err.message);
  }
}
