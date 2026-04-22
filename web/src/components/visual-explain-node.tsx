import { memo } from 'react';
import { Position } from '@xyflow/react';
import { BaseNode, BaseNodeContent } from "@/components/base-node";
import {
  NodeTooltip,
  NodeTooltipContent,
  NodeTooltipTrigger,
} from "@/components/node-tooltip";

interface ExplainNodeData {
  data: {
    label: string;
    toolTip: string;
  };
}

export const VISUAL_EXPLAIN_NODE = `visualExplainNode`;

export const VisualExplainNode = memo(({ data }: ExplainNodeData) => {
  return (
    <NodeTooltip>
      <NodeTooltipContent position={Position.Top}>
        {data.toolTip}
      </NodeTooltipContent>
      <NodeTooltipTrigger>
        <BaseNode>
          <BaseNodeContent>
            {data.label}
          </BaseNodeContent>
        </BaseNode>
      </NodeTooltipTrigger>
    </NodeTooltip>
  );
}
);