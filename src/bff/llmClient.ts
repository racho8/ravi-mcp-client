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

EXAMPLES:
Query:
• "Show Furniture" → get_products_by_category {"category":"Furniture"}
• "Show all products in Electronics category" → get_products_by_category {"category":"Electronics"}
• "Show me all products in Furniture category" → get_products_by_category {"category":"Furniture"}
• "Find Laptops" → get_products_by_segment {"segment":"Laptops"}
• "Get iPhone" → get_product_by_name {"name":"iPhone"}
• "Show all products" → list_products {}
• "List everything" → list_products {}

Create:
• "Create iPhone 16 at 899" → create_product {"name":"iPhone 16","price":899}
• "Create Desk Lamp 45 in Office furniture, HomeOffice segment" → create_product {"name":"Desk Lamp","price":45,"category":"Office furniture","segment":"HomeOffice"}
• "Add Office Desk 400, Office Chair 200 in Office furniture category and HomeOffice segment" → create_multiple_products {"products":[{"name":"Office Desk","price":400,"category":"Office furniture","segment":"HomeOffice"},{"name":"Office Chair","price":200,"category":"Office furniture","segment":"HomeOffice"}]}

Update (→ list_products, handler resolves):
• "Update iPhone 17 to 799" → list_products {}
• "Set all MacBook to 2800" → list_products {}

Delete:
• "Delete HP Spectre" → delete_product {"id":"HP Spectre"}
• "Remove iPhone 16" → delete_product {"id":"iPhone 16"}
• "Delete all MacBook" → delete_products {"ids":["MacBook"]}

Count:
• "How many products" → list_products {}
• "Count Electronics" → get_products_by_category {"category":"Electronics"}

Duplicates:
• "Show duplicates" → list_products {}
• "Remove duplicates" → list_products {}

Output JSON only:
${command}`;

  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt: toolDefinitions,
      stream: false
    });
    return JSON.parse(response.data.response);
  } catch (err) {
    throw new Error('LLM call failed: ' + (err as any).message);
  }
}
