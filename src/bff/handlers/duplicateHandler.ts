/**
 * duplicateHandler.ts - Duplicate Management Command Handler
 * 
 * Purpose:
 * - Handles duplicate detection and analysis
 * - Handles duplicate cleanup operations
 */

import { callMCP } from '../mcpClient.js';
import { identifyDuplicates, recommendDuplicateCleanup } from '../helpers/duplicateManager.js';
import { invalidateProductCache } from '../helpers/cacheManager.js';
import { isCleanupCommand } from '../helpers/queryProcessors.js';

/**
 * Handles duplicate management commands
 */
export async function handleDuplicateCommand(
  command: string,
  allProducts: any[],
  listResultId: number
): Promise<any> {
  console.log(`[Duplicate Management] Processing duplicate command`);
  
  const isCleanup = isCleanupCommand(command);
  const duplicates = identifyDuplicates(allProducts);
  
  if (Object.keys(duplicates).length === 0) {
    return {
      jsonrpc: "2.0",
      id: listResultId,
      result: {
        type: isCleanup ? 'cleanup_result' : 'duplicate_analysis',
        message: isCleanup ? 'No duplicates found to clean up.' : 'No duplicate products found! All product names are unique.',
        duplicateCount: 0,
        totalProducts: allProducts.length,
        deletedCount: isCleanup ? 0 : undefined
      }
    };
  }
  
  if (isCleanup) {
    // Perform cleanup
    console.log(`[Duplicate Cleanup] Processing cleanup command`);
    const analysis = recommendDuplicateCleanup(duplicates);
    const idsToDelete = analysis.recommendations.flatMap((rec: any) => 
      rec.recommended.delete.map((product: any) => product.id)
    );
    
    // Perform the deletion
    const deleteResult = await callMCP({
      tool: 'delete_products',
      parameters: {
        ids: idsToDelete
      }
    });
    
    // Invalidate cache after successful deletion
    invalidateProductCache(`Duplicate cleanup: ${idsToDelete.length} products deleted`);
    
    return {
      jsonrpc: "2.0",
      id: deleteResult.id,
      result: {
        type: 'cleanup_result',
        message: `Successfully cleaned up ${idsToDelete.length} duplicate products`,
        deletedCount: idsToDelete.length,
        duplicateGroups: analysis.summary.duplicateGroups,
        deletedProducts: analysis.recommendations.flatMap((rec: any) => rec.recommended.delete),
        keptProducts: analysis.recommendations.map((rec: any) => rec.recommended.keep)
      }
    };
  } else {
    // Just show analysis
    const analysis = recommendDuplicateCleanup(duplicates);
    return {
      jsonrpc: "2.0",
      id: listResultId,
      result: {
        type: 'duplicate_analysis',
        message: `Found ${analysis.summary.duplicateGroups} duplicate product groups`,
        ...analysis,
        duplicates: duplicates
      }
    };
  }
}
