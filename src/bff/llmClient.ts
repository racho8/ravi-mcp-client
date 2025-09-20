// LLM client for Ollama (local) or Google LLM (cloud)
import axios from 'axios';
import { fetchAndCacheToolSchemas } from './mcpSchemaCache.js';

// Example: Use Ollama's local API (http://localhost:11434)
export async function callLLM(command: string): Promise<any> {
  // Dynamically build tool definitions from MCP schemas
  const schemas = await fetchAndCacheToolSchemas();
  console.log('[LLM] Available tools:', Object.keys(schemas));
  
  let toolDefinitions = `You are an assistant that converts user commands into JSON tool invocations for the MCP server.

IMPORTANT RULES:
- For "show [item]" or "find [item]" or "get [item]" → try to match by name first, then segment, then category
- For "show products by category" or "products in [category] category" → use get_products_by_category
- For "show products by segment" or "products in [segment] segment" → use get_products_by_segment  
- For "find product named [name]" or "get product [name]" → use get_product_by_name
- For "show all products" or "list products" → use list_products
- For "update price of [product]" or "change [product] price" → use update_product with id as product name and new price
- For "how many" or "count" queries → use list_products to get all products for counting
- For creating, updating, deleting → use appropriate tools

COUNTING QUERIES:
- "How many products are there" → use list_products
- "How many products in Electronics category" → use get_products_by_category with category="Electronics" 
- "Count products in Furniture" → use get_products_by_category with category="Furniture"
- "How many MacBook products" → use list_products (for filtering by name)
- "Count Laptops" → use get_products_by_segment with segment="Laptops"
- "How many iPhone models do we have" → use list_products (for filtering by name pattern)

SMART MATCHING LOGIC:
- "Show me Laptops" could mean segment="Laptops", category="Laptops", or name="Laptops"
- "Show me Electronics" could mean category="Electronics" or segment="Electronics"
- "Show me Furniture" could mean category="Furniture" or segment="Furniture"
- Choose the most logical interpretation based on common product categorization

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

EXAMPLE MAPPINGS:
- "Show me all products from Furniture category" → {"tool": "get_products_by_category", "parameters": {"category": "Furniture"}}
- "Show me Furniture" → {"tool": "get_products_by_category", "parameters": {"category": "Furniture"}}
- "Show me Electronics" → {"tool": "get_products_by_category", "parameters": {"category": "Electronics"}}
- "Show me Laptops" → {"tool": "get_products_by_segment", "parameters": {"segment": "Laptops"}}
- "Find laptops" → {"tool": "get_products_by_segment", "parameters": {"segment": "Laptops"}}
- "Show me mobiles" → {"tool": "get_products_by_segment", "parameters": {"segment": "mobiles"}}
- "Get product named Laptop1" → {"tool": "get_product_by_name", "parameters": {"name": "Laptop1"}}
- "Find iPhone" → {"tool": "get_product_by_name", "parameters": {"name": "iPhone"}}
- "Show me all MacBooks" → {"tool": "list_products", "parameters": {}}
- "Find MacBook products" → {"tool": "list_products", "parameters": {}}
- "Show all products" → {"tool": "list_products", "parameters": {}}
- "Update the price of iPhone 17 to 799" → {"tool": "update_product", "parameters": {"id": "iPhone 17", "price": 799}}
- "Change Laptop1 price to 1200" → {"tool": "update_product", "parameters": {"id": "Laptop1", "price": 1200}}
- "Set MacBook Pro price to 2999" → {"tool": "update_product", "parameters": {"id": "MacBook Pro", "price": 2999}}
- "Update product iPhone 15 Pro with price 1100" → {"tool": "update_product", "parameters": {"id": "iPhone 15 Pro", "price": 1100}}
- "Update price of all MacBook Pro 16-inch to 2900" → {"tool": "update_products", "parameters": {"products": [{"id": "MacBook Pro 16-inch", "price": 2900}]}}
- "Update all MacBook products to price 2800" → {"tool": "update_products", "parameters": {"products": [{"id": "MacBook Pro 16-inch", "price": 2800}]}}
- "Set all Laptop1 prices to 1500" → {"tool": "update_products", "parameters": {"products": [{"id": "Laptop1", "price": 1500}]}}
- "Change all iPhone prices to 900" → {"tool": "update_products", "parameters": {"products": [{"id": "iPhone", "price": 900}]}}
- "Find duplicate products" → {"tool": "list_products", "parameters": {}}
- "Show me duplicate products" → {"tool": "list_products", "parameters": {}}
- "Identify duplicates" → {"tool": "list_products", "parameters": {}}
- "Clean up duplicate products" → {"tool": "list_products", "parameters": {}}
- "Remove duplicate products" → {"tool": "list_products", "parameters": {}}
- "How many products are there" → {"tool": "list_products", "parameters": {}}
- "Count all products" → {"tool": "list_products", "parameters": {}}
- "How many products in Electronics category" → {"tool": "get_products_by_category", "parameters": {"category": "Electronics"}}
- "Count products in Furniture" → {"tool": "get_products_by_category", "parameters": {"category": "Furniture"}}
- "How many MacBook products" → {"tool": "list_products", "parameters": {}}
- "Count Laptops" → {"tool": "get_products_by_segment", "parameters": {"segment": "Laptops"}}
- "How many iPhone models do we have" → {"tool": "list_products", "parameters": {}}

DUPLICATE MANAGEMENT RULES:
- If command contains "duplicate" or "duplicates" → use list_products (processed by route handler)
- "find duplicates", "show duplicates", "identify duplicates" → analyze for duplicates
- "clean duplicates", "remove duplicates", "cleanup duplicates" → delete duplicate products

BULK UPDATE RULES:
- If command contains "all" or "every" → use update_products
- For single specific product → use update_product

COUNTING RULES:
- If command contains "how many", "count", "number of" → will be processed for counting
- Use appropriate tool to get products, then count will be calculated by route handler

SMART INTERPRETATION GUIDE:
- Electronics, Furniture, Office furniture = likely CATEGORY
- Laptops, mobiles, Smartphones, HomeOffice = likely SEGMENT  
- Specific product names like iPhone, Laptop1, MacBook = likely NAME
- For partial matches like "MacBook", "iPhone models" → use list_products to get all products and let frontend filter

Convert this command to JSON (output ONLY the JSON):
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
