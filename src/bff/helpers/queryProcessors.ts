/**
 * queryProcessors.ts - Query Detection and Processing Helpers
 * 
 * Purpose:
 * - Pattern matching for fast query recognition
 * - Query type detection (counting, grouping, filtering, etc.)
 * - Name-based filtering for products
 */

/**
 * Detects pattern-matched queries and returns the appropriate tool call
 */
export function detectPatternMatch(normalizedCommand: string): { tool: string; parameters: any } | null {
  // Simple product list
  if (normalizedCommand.match(/^(show|list|get)\s+(all\s+)?products?\s*$/)) {
    console.log(`[Pattern Match] Recognized simple product list query - skipping LLM`);
    return { tool: 'list_products', parameters: {} };
  }
  
  // List tools
  if (normalizedCommand.match(/^(show|list|get)\s+(all\s+)?tools?\s*$/)) {
    console.log(`[Pattern Match] Recognized list tools query - skipping LLM`);
    return { tool: 'list_tools', parameters: {} };
  }
  
  // Category query
  if (normalizedCommand.match(/^(show|list|get)\s+.*products?\s+in\s+(\w+)\s+category$/)) {
    const categoryMatch = normalizedCommand.match(/in\s+(\w+)\s+category$/);
    let category = categoryMatch ? categoryMatch[1] : '';
    // Capitalize first letter to match database format (Electronics, Furniture, etc.)
    category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
    console.log(`[Pattern Match] Recognized category query for: ${category}`);
    return { tool: 'get_products_by_category', parameters: { category } };
  }
  
  return null;
}

/**
 * Checks if a command is a counting query
 */
export function isCountingQuery(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return lowerCommand.includes('how many') || 
         lowerCommand.includes('count') || 
         lowerCommand.includes('number of');
}

/**
 * Checks if a command is a duplicate management command
 */
export function isDuplicateCommand(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return lowerCommand.includes('duplicate') || lowerCommand.includes('find duplicates');
}

/**
 * Checks if a duplicate command is a cleanup command
 */
export function isCleanupCommand(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return lowerCommand.includes('clean') || 
         lowerCommand.includes('remove') || 
         lowerCommand.includes('delete');
}

/**
 * Checks if a command is a grouping request
 */
export function isGroupingQuery(command: string): boolean {
  const lowerCommand = command.toLowerCase();
  return (lowerCommand.includes('group') && lowerCommand.includes('by category')) ||
         lowerCommand.includes('grouped by category');
}

/**
 * Applies name-based filtering to products
 */
export function applyNameFilter(command: string, products: any[]): { filtered: any[]; applied: boolean } {
  const lowerCommand = command.toLowerCase();
  let filtered = products;
  let applied = false;
  
  if (lowerCommand.includes('macbook') || lowerCommand.includes('mac book')) {
    filtered = products.filter((p: any) => 
      p.name && p.name.toLowerCase().includes('macbook')
    );
    applied = true;
    console.log(`[Name Filter] Filtered to ${filtered.length} MacBook products`);
  } else if (lowerCommand.includes('iphone')) {
    filtered = products.filter((p: any) => 
      p.name && p.name.toLowerCase().includes('iphone')
    );
    applied = true;
    console.log(`[Name Filter] Filtered to ${filtered.length} iPhone products`);
  } else if (lowerCommand.includes('laptop')) {
    filtered = products.filter((p: any) => 
      p.name && p.name.toLowerCase().includes('laptop')
    );
    applied = true;
    console.log(`[Name Filter] Filtered to ${filtered.length} Laptop products`);
  }
  
  return { filtered, applied };
}

/**
 * Determines the context for counting queries
 */
export function getCountingContext(
  command: string,
  llmResult: any,
  products: any[]
): { products: any[]; context: string } {
  let filteredProducts = products;
  let context = '';
  
  // Apply additional filtering for name-based counting
  if (llmResult.tool === 'list_products') {
    const { filtered, applied } = applyNameFilter(command, products);
    if (applied) {
      filteredProducts = filtered;
      if (command.toLowerCase().includes('macbook')) {
        context = 'MacBook products';
      } else if (command.toLowerCase().includes('iphone')) {
        context = 'iPhone products';
      } else if (command.toLowerCase().includes('laptop')) {
        context = 'Laptop products';
      }
    }
  } else if (llmResult.tool === 'get_products_by_category' && llmResult.parameters.category) {
    context = `${llmResult.parameters.category} category`;
  } else if (llmResult.tool === 'get_products_by_segment' && llmResult.parameters.segment) {
    context = `${llmResult.parameters.segment} segment`;
  }
  
  return { products: filteredProducts, context };
}
