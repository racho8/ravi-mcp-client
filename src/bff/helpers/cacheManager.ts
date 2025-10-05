/**
 * cacheManager.ts - Response Caching and Invalidation
 * 
 * Purpose:
 * - Manages response cache for common queries (30-second TTL)
 * - Automatically invalidates cache on mutations (create/update/delete)
 * - Improves performance by reducing redundant MCP calls
 */

const responseCache = new Map<string, { response: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds cache

/**
 * Gets a cached response if available and not expired
 */
export function getCachedResponse(cacheKey: string): any | null {
  const cached = responseCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    console.log(`[Cache Hit] Returning cached response for: "${cacheKey}"`);
    return cached.response;
  }
  
  return null;
}

/**
 * Stores a response in the cache
 */
export function setCachedResponse(cacheKey: string, response: any): void {
  responseCache.set(cacheKey, {
    response,
    timestamp: Date.now()
  });
  console.log(`[Cache Store] Cached response for key: "${cacheKey}"`);
}

/**
 * Invalidates all product-related cache entries
 */
export function invalidateProductCache(reason: string): void {
  let invalidatedCount = 0;
  const keysToDelete: string[] = [];
  
  for (const [key] of responseCache) {
    // Match any query that involves products
    if (key.includes('product') || 
        key.includes('show all') || 
        key.includes('list all') ||
        key.includes('get all') ||
        key.match(/^(show|list|get)\s+(all\s+)?products?\s*$/)) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    responseCache.delete(key);
    invalidatedCount++;
  });
  
  console.log(`[Cache Invalidation] ${reason} - Cleared ${invalidatedCount} cached queries: [${keysToDelete.join(', ')}]`);
}

/**
 * Checks if a tool is a mutation operation
 */
export function isMutationOperation(toolName: string): boolean {
  const mutationTools = [
    'create_product', 
    'update_product', 
    'delete_product',
    'create_multiple_products',
    'update_products', 
    'delete_products'
  ];
  return mutationTools.includes(toolName);
}
