
import { VISUAL_EXPLAIN_NODE } from '@/components/visual-explain-node';
import type { Node, Edge } from '@xyflow/react';

export interface InitialState {
  topLevelNode?: ExplainNode | null;
}

export interface ExplainNode {
  id: number;
  title: string;
  objectSchema: string;
  objectName: string;
  childrenIds: number[];
  children: ExplainNode[];
  props: ExplainProperty[];
  tooltipProps: ExplainProperty[];
  // highlights: any;
  // contextObjects: any[];
  nodeContext: string;
}

export interface ExplainProperty {
  type: number;
  title: string;
  value: string | number;
}

const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 100;

/**
 * Converts an ExplainNode tree to React Flow nodes and edges
 */
export function convertExplainTreeToFlow(topLevelNode: ExplainNode): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodePositions = new Map<number, { x: number, y: number }>();

  // Calculate positions using a breadth-first traversal
  function calculatePositions(node: ExplainNode, level: number, horizontalIndex: number): number {
    const x = horizontalIndex * HORIZONTAL_SPACING;
    const y = level * VERTICAL_SPACING;
    
    nodePositions.set(node.id, { x, y });

    let nextHorizontalIndex = horizontalIndex;
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, index) => {
        if (index === 0) {
          nextHorizontalIndex = calculatePositions(child, level + 1, nextHorizontalIndex);
        } else {
          nextHorizontalIndex = calculatePositions(child, level + 1, nextHorizontalIndex);
        }
      });
    } else {
      nextHorizontalIndex += 1;
    }

    return nextHorizontalIndex;
  }

  // Traverse the tree to create nodes and edges
  function traverse(node: ExplainNode) {
    const position = nodePositions.get(node.id) || { x: 0, y: 0 };
    
    // Create tooltip text from tooltipProps
    const tooltip = node.tooltipProps
      ?.map(prop => `${prop.title}: ${prop.value}`)
      .join('\n') || ``;

    nodes.push({
      id: String(node.id),
      position,
      data: { 
        label: node.title,
        tooltip
      },
      type: VISUAL_EXPLAIN_NODE
    });

    // Create edges to children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        edges.push({
          id: `${node.id}-${child.id}`,
          source: String(node.id),
          target: String(child.id)
        });

        traverse(child);
      });
    }
  }

  console.log(nodes);
  console.log(edges);

  // Calculate all positions first
  calculatePositions(topLevelNode, 0, 0);
  
  // Then create nodes and edges
  traverse(topLevelNode);

  return { nodes, edges };
}
