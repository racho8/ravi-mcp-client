/**
 * duplicateManager.ts - Duplicate Product Detection and Cleanup
 * 
 * Purpose:
 * - Identifies duplicate products by name (case-insensitive)
 * - Recommends which duplicates to keep/delete based on price
 * - Provides cleanup analysis and recommendations
 */

export interface DuplicateRecommendation {
  productName: string;
  duplicateCount: number;
  recommended: {
    keep: any;
    delete: any[];
  };
}

export interface DuplicateAnalysis {
  summary: {
    duplicateGroups: number;
    totalProducts: number;
    recommendedToDelete: number;
  };
  recommendations: DuplicateRecommendation[];
}

/**
 * Identifies duplicate products by grouping products with the same name
 */
export function identifyDuplicates(products: any[]): Record<string, any[]> {
  const duplicates: Record<string, any[]> = {};
  const nameGroups: Record<string, any[]> = {};
  
  // Group products by name (case-insensitive)
  for (const product of products) {
    if (product.name) {
      const normalizedName = product.name.toLowerCase().trim();
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(product);
    }
  }
  
  // Find groups with more than one product (duplicates)
  for (const [name, group] of Object.entries(nameGroups)) {
    if (group.length > 1) {
      duplicates[name] = group;
    }
  }
  
  return duplicates;
}

/**
 * Recommends which duplicates to keep (highest price) and which to delete
 */
export function recommendDuplicateCleanup(duplicates: Record<string, any[]>): DuplicateAnalysis {
  const recommendations: DuplicateRecommendation[] = [];
  let totalToDelete = 0;
  
  for (const [name, group] of Object.entries(duplicates)) {
    // Sort by price descending, then by creation date if available
    const sorted = group.sort((a, b) => {
      if (a.price !== b.price) return b.price - a.price; // Higher price first
      return a.id.localeCompare(b.id); // Stable sort by ID
    });
    
    const toKeep = sorted[0];
    const toDelete = sorted.slice(1);
    
    recommendations.push({
      productName: name,
      duplicateCount: group.length,
      recommended: {
        keep: toKeep,
        delete: toDelete
      }
    });
    
    totalToDelete += toDelete.length;
  }
  
  return {
    summary: {
      duplicateGroups: Object.keys(duplicates).length,
      totalProducts: Object.values(duplicates).flat().length,
      recommendedToDelete: totalToDelete
    },
    recommendations
  };
}
