import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';

export interface InsertEdgeData {
  onInsert: (edgeId: string) => void;
  [key: string]: unknown;
}

export function InsertEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });
  const { onInsert } = (data ?? {}) as Partial<InsertEdgeData>;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: selected ? '#facc15' : '#52525b', strokeWidth: selected ? 3 : 2 }}
      />
      <EdgeLabelRenderer>
        <button
          aria-label="중간 단계 추가"
          title="중간 단계 추가"
          onClick={(e) => {
            e.stopPropagation();
            onInsert?.(id);
          }}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 opacity-70 transition-opacity hover:text-teal-400 hover:opacity-100"
        >
          <Plus size={12} />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}
