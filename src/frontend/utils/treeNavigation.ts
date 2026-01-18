import { TreeNode } from './schemaParser';

/**
 * Find and expand all parent nodes for a given path
 * 
 * @param treeNodes Array of tree nodes
 * @param path Path in dot notation (e.g., 'HyperSolve.states')
 * @returns Modified tree with expanded nodes along the path
 */
export const expandPathInTree = (treeNodes: TreeNode[], path: string): TreeNode[] => {
  // If path is empty, return the tree as-is
  if (!path) return treeNodes;
  
  // Convert dot notation to parts
  const pathParts = path.split('.');
  if (pathParts[0] === 'root') {
    pathParts.shift(); // Remove 'root' prefix if present
  }
  
  // Clone the tree to avoid modifying the original
  const result = JSON.parse(JSON.stringify(treeNodes)) as TreeNode[];
  
  // Expand nodes recursively
  const expandNodesRecursive = (nodes: TreeNode[], parts: string[], currentDepth: number): boolean => {
    // If we've processed all path parts, we've found the target
    if (currentDepth >= parts.length) return true;
    
    const currentPart = parts[currentDepth];
    
    // Check for special cases like array items with IDs
    // For example, if path part is 'boundary conditions[BC-123]'
    const isSpecialNode = currentPart.includes('[');
    const basePart = isSpecialNode ? currentPart.split('[')[0] : currentPart;
    
    for (const node of nodes) {
      // Extract the node name from the id
      const nodeName = node.id.split('.').pop() || '';
      
      // Check if this node matches the current path part
      let isMatch = false;
      
      if (isSpecialNode && nodeName === basePart) {
        // For array/special nodes, check if this is the parent container
        isMatch = true;
      } else if (nodeName === currentPart) {
        // Direct match
        isMatch = true;
      }
      
      if (isMatch) {
        // This node is in our path, so expand it
        node.expanded = true;
        
        // If there are children and we haven't reached the end of the path,
        // continue down this branch
        if (node.children && currentDepth < parts.length - 1) {
          if (expandNodesRecursive(node.children, parts, currentDepth + 1)) {
            return true;
          }
        }
      }
    }
    
    return false;
  };
  
  expandNodesRecursive(result, pathParts, 0);
  return result;
};

/**
 * Find a tree node by path
 * 
 * @param treeNodes Array of tree nodes
 * @param path Path in dot notation (e.g., 'HyperSolve.states')
 * @returns The found node or null if not found
 */
export const findNodeByPath = (treeNodes: TreeNode[], path: string): TreeNode | null => {
  // If path is empty, return null
  if (!path) return null;
  
  // Convert dot notation to parts
  const pathParts = path.split('.');
  if (pathParts[0] === 'root') {
    pathParts.shift(); // Remove 'root' prefix if present
  }
  
  // Find node recursively
  const findNodeRecursive = (nodes: TreeNode[], parts: string[], currentDepth: number): TreeNode | null => {
    // If we've processed all path parts, we've found the target
    if (currentDepth >= parts.length) return null;
    
    const currentPart = parts[currentDepth];
    
    // Check for special cases like array items with IDs
    const isSpecialNode = currentPart.includes('[');
    const basePart = isSpecialNode ? currentPart.split('[')[0] : currentPart;
    const specialId = isSpecialNode ? currentPart.match(/\[(.*?)\]/)?.[1] : null;
    
    for (const node of nodes) {
      // Extract the node name from the id
      const nodeName = node.id.split('.').pop() || '';
      
      // Check if this node matches the current path part
      let isMatch = false;
      
      if (isSpecialNode && nodeName === basePart) {
        // For array nodes, check if this is the parent container
        if (currentDepth === parts.length - 1) {
          return node; // Return the array node itself
        }
        isMatch = true;
      } else if (nodeName === currentPart) {
        // Direct match - if this is the last part, we found our node
        if (currentDepth === parts.length - 1) {
          return node;
        }
        isMatch = true;
      }
      
      // If this node matched and has children, continue searching
      if (isMatch && node.children) {
        const found = findNodeRecursive(node.children, parts, currentDepth + 1);
        if (found) return found;
      }
    }
    
    return null;
  };
  
  return findNodeRecursive(treeNodes, pathParts, 0);
};
