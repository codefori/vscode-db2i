import { memo } from 'react';
import { Position, Handle } from '@xyflow/react';
import { 
  BaseNode, 
  BaseNodeContent, 
  BaseNodeHeader, 
  BaseNodeHeaderTitle 
} from "@/components/base-node";
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";
import { icons, defaultIcon } from "@/lib/icons";
import type { ExplainProperty } from '../App';

interface ExplainNodeData {
  data: {
    label: string;
    tooltipProps: ExplainProperty[];
    nodeId: number;
    highlightColor?: string;
    objectSchema?: string;
    objectName?: string;
  };
}

export const VISUAL_EXPLAIN_NODE = `visualExplainNode`;

// Get VS Code API for messaging
declare const acquireVsCodeApi: () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage: (message: any) => void;
};

const vscode = acquireVsCodeApi();

export const VisualExplainNode = memo(({ data }: ExplainNodeData) => {
  const handleClick = () => {
    vscode.postMessage({
      type: 'NODE_SELECTED',
      nodeId: data.nodeId
    });
  };

  // Apply highlight color as background if present
  const backgroundColor = data.highlightColor || undefined;

  // Get the icon for this node type
  const IconComponent = icons[data.label] || defaultIcon;

  // Check if node has a description (based on objectSchema and objectName)
  const hasDescription = data.objectSchema && data.objectName;
  const description = hasDescription ? `${data.objectSchema}.${data.objectName}` : null;

  return (
    <NodeTooltip>
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <NodeTooltipContent position={Position.Top}>
        <div>
          {data.tooltipProps.map((prop, index) => (
            <div key={index}>
              {prop.title}: {prop.value}
            </div>
          ))}
        </div>
      </NodeTooltipContent>
      <NodeTooltipTrigger>
        <BaseNode onClick={handleClick} style={{ backgroundColor }}>
          {description ? (
            <>
              <BaseNodeHeader className="border-b">
                <IconComponent className="size-4" />
                <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
              </BaseNodeHeader>
              <BaseNodeContent>
                <p className="text-xs truncate">{description}</p>
              </BaseNodeContent>
            </>
          ) : (
            <BaseNodeContent>
              <div className="flex items-center gap-2">
                <IconComponent className="size-4" />
                <span>{data.label}</span>
              </div>
            </BaseNodeContent>
          )}
        </BaseNode>
      </NodeTooltipTrigger>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </NodeTooltip>
  );
}
);
