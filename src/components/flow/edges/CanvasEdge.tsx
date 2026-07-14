import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

export function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: selected ? '#facc15' : '#52525b', strokeWidth: selected ? 3 : 2 }}
    />
  );
}
