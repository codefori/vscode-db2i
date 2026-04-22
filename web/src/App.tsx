import { useCallback, useLayoutEffect } from 'react';
import { ReactFlow, Background, Controls, useNodesState, useEdgesState, useReactFlow, ReactFlowProvider, type Node, type Edge, MiniMap } from '@xyflow/react';
import { VISUAL_EXPLAIN_NODE, VisualExplainNode } from './components/visual-explain-node';
import ELK from 'elkjs/lib/elk.bundled.js';
import '@xyflow/react/dist/style.css';

// Types for ExplainNode
export interface ExplainNode {
  id: number;
  title: string;
  objectSchema: string;
  objectName: string;
  childrenIds: number[];
  children: ExplainNode[];
  props: ExplainProperty[];
  tooltipProps: ExplainProperty[];
  highlights: NodeHighlights;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contextObjects: any[];
  nodeContext: string;
}

export interface ExplainProperty {
  type: number;
  title: string;
  value: string | number;
}

export interface NodeHighlights {
  formatValue: number;
}

export interface InitialState {
  topLevelNode?: ExplainNode | null;
}

// Highlight color mappings (from package.json theme colors)
const HIGHLIGHT_COLORS: { [key: number]: string } = {
  1: '#dbdb01', // ESTIMATED_ROW_EXPENSIVE (dark theme)
  2: '#f2bdbd', // ESTIMATED_TIME_EXPENSIVE
  3: '#8c8cbd', // INDEX_ADVISED
  5: '#00ff00', // LOOKAHEAD_PREDICATE_GENERATION
  6: '#ff8400', // MATERIALIZED_QUERY_TABLE
  7: '#cc9933', // ACTUAL_ROWS_EXPENSIVE
  8: '#bc0f0f', // ACTUAL_TIME_EXPENSIVE
};

// Priority order for highlights (higher priority = more important)
const HIGHLIGHT_PRIORITY = [3, 7, 8, 1, 2, 5, 6]; // INDEX_ADVISED first, then ACTUAL_ROWS, etc.

function getHighlightColor(highlights: NodeHighlights): string | undefined {
  if (!highlights || !highlights.formatValue || highlights.formatValue === 0) {
    return undefined;
  }

  // Check each highlight in priority order
  for (const priority of HIGHLIGHT_PRIORITY) {
    const mask = 1 << (priority - 1);
    if (highlights.formatValue & mask) {
      return HIGHLIGHT_COLORS[priority];
    }
  }

  return undefined;
}

/**
 * Converts an ExplainNode tree to React Flow nodes and edges
 */
function convertExplainTreeToFlow(topLevelNode: ExplainNode): { nodes: Node[], edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const position = { x: 0, y: 0 };

  // Traverse the tree to create nodes and edges
  function traverse(node: ExplainNode) {
    const highlightColor = getHighlightColor(node.highlights);

    nodes.push({
      id: String(node.id),
      position,
      data: {
        label: node.title,
        tooltipProps: node.tooltipProps || [],
        nodeId: node.id,
        highlightColor,
        objectSchema: node.objectSchema,
        objectName: node.objectName
      },
      type: VISUAL_EXPLAIN_NODE
    });

    // Create edges to children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        edges.push({
          id: `${child.id}-${node.id}`,
          source: String(child.id),
          target: String(node.id),
          type: 'smoothstep',
          markerEnd: {
            type: 'arrowclosed'
          },
          style: {
            strokeWidth: 2
          }
        });

        traverse(child);
      });
    }
  }

  traverse(topLevelNode);

  return { nodes, edges };
}

const nodeTypes = {
    [VISUAL_EXPLAIN_NODE]: VisualExplainNode,
};

declare global {
    interface Window {
        initialState?: InitialState;
    }
}

const initialState: InitialState = window.initialState ?? {
    topLevelNode: null
};

// Convert the explain tree to React Flow format
let initialNodes: Node[] = [];
let initialEdges: Edge[] = [];

if (initialState.topLevelNode) {
    const converted = convertExplainTreeToFlow(initialState.topLevelNode);
    initialNodes = converted.nodes;
    initialEdges = converted.edges;
}

const elk = new ELK();

// Elk has a *huge* amount of options to configure. To see everything you can
// tweak check out:
//
// - https://www.eclipse.org/elk/reference/algorithms.html
// - https://www.eclipse.org/elk/reference/options.html
const elkOptions = {
    'elk.algorithm': 'layered',
    'elk.layered.spacing.nodeNodeBetweenLayers': '100',
    'elk.spacing.nodeNode': '80',
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], options = {}) => {
    const isHorizontal = options?.['elk.direction'] === 'RIGHT';
    const graph = {
        id: 'root',
        layoutOptions: options,
        children: nodes.map((node: Node) => ({
            ...node,
            // Adjust the target and source handle positions based on the layout
            // direction.
            targetPosition: isHorizontal ? 'left' : 'top',
            sourcePosition: isHorizontal ? 'right' : 'bottom',

            // Hardcode a width and height for elk to use when layouting.
            width: 150,
            height: 50,
        })),
        edges: edges,
    };

    return elk
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .layout(graph as any)
        .then((layoutedGraph) => ({
            nodes: layoutedGraph.children?.map((node) => ({
                ...node,
                // React Flow expects a position property on the node instead of `x` and `y` fields.
                position: { x: node.x, y: node.y },
            })) as Node[],

            edges: layoutedGraph.edges as unknown as Edge[],
        }));
};

function LayoutFlow() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const { fitView } = useReactFlow();

    const onLayout = useCallback(
        ({ direction, useInitialNodes = false }: {direction: string, useInitialNodes: boolean}) => {
            const opts = { 'elk.direction': direction, ...elkOptions };
            const ns = useInitialNodes ? initialNodes : nodes;
            const es = useInitialNodes ? initialEdges : edges;

            getLayoutedElements(ns, es, opts).then(
                ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
                    setNodes(layoutedNodes || []);
                    setEdges(layoutedEdges || []);
                    fitView();
                },
            );
        },
        [nodes, edges],
    );

    // Calculate the initial layout on mount.
    useLayoutEffect(() => {
        onLayout({ direction: 'RIGHT', useInitialNodes: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <ReactFlow
                colorMode="light"
                nodes={nodes}
                nodeTypes={nodeTypes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background />
                <Controls />
                <MiniMap/>
            </ReactFlow>
        </div>
    );
}

export default () => (
  <ReactFlowProvider>
    <LayoutFlow />
  </ReactFlowProvider>
);
