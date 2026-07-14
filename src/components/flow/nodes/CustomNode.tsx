import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, CheckSquare, MessageSquareText, Plus, Square } from 'lucide-react';
import type { NodeKind } from '../../../types/project';
import { NODE_HEIGHT } from '../../../utils/graph';

export interface CustomNodeData {
  title: string;
  kind: NodeKind;
  completed: boolean;
  memoState: 'none' | 'unresolved' | 'resolved';
  onAddDirection: (nodeId: string, direction: 'top' | 'bottom' | 'left' | 'right') => void;
  onToggleCompleted: (nodeId: string) => void;
  canAddTop: boolean;
  canAddBottom: boolean;
  canAddLeft: boolean;
  canAddRight: boolean;
  hasLeftSource: boolean;
  hasRightSource: boolean;
  hasLeftTarget: boolean;
  hasRightTarget: boolean;
  [key: string]: unknown;
}

const kindPlaceholder: Record<NodeKind, string> = {
  start: '프로젝트 시작',
  task: '제목 없음',
  end: '프로젝트 완료',
};

const kindLabel: Record<NodeKind, string> = {
  start: '시작',
  task: '',
  end: '완료',
};

const kindBorder: Record<NodeKind, string> = {
  start: 'border-emerald-500/60',
  task: 'border-zinc-700',
  end: 'border-violet-500/60',
};

const addButtonClass =
  'absolute z-10 flex h-4 w-4 items-center justify-center rounded-full border border-zinc-600 bg-zinc-900 text-zinc-400 opacity-0 transition-opacity hover:border-teal-400 hover:text-teal-400 group-hover:opacity-100';

const connectorClass =
  'group !flex !h-[18px] !w-[18px] !items-center !justify-center !rounded-full !border-2 !border-zinc-500 !bg-zinc-900 transition-colors hover:!border-teal-400';

export function CustomNode({ id, data, selected }: NodeProps) {
  const {
    title,
    kind,
    completed,
    memoState,
    onAddDirection,
    onToggleCompleted,
    canAddTop,
    canAddBottom,
    canAddLeft,
    canAddRight,
    hasLeftSource,
    hasRightSource,
    hasLeftTarget,
    hasRightTarget,
  } = data as unknown as CustomNodeData;

  return (
    <div
      className={`group relative w-[200px] rounded-xl border bg-zinc-800 px-3.5 shadow-sm transition-colors ${kindBorder[kind]} ${
        selected ? 'ring-2 ring-yellow-400' : ''
      }`}
      style={{ height: NODE_HEIGHT }}
    >
      {kind !== 'start' && (
        <Handle
          id="top-target"
          type="target"
          position={Position.Top}
          title="드래그 도착 지점"
          className={`${connectorClass} !-top-2.5`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500 transition-colors group-hover:bg-teal-400" />
        </Handle>
      )}
      {kind !== 'end' && (
        <Handle
          id="bottom-source"
          type="source"
          position={Position.Bottom}
          title="드래그: 빈 곳에 놓으면 새 칸 추가, 다른 칸에 놓으면 합류 연결"
          className={`${connectorClass} !-bottom-2.5`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500 transition-colors group-hover:bg-teal-400" />
        </Handle>
      )}
      {hasLeftTarget && (
        <Handle
          id="left-target"
          type="target"
          position={Position.Left}
          title="왼쪽에서 연결됨"
          className={`${connectorClass} !-left-2.5 !top-[25%]`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500" />
        </Handle>
      )}
      {hasLeftSource && (
        <Handle
          id="left-source"
          type="source"
          position={Position.Left}
          title="왼쪽으로 연결됨"
          className={`${connectorClass} !-left-2.5 !top-1/2`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500" />
        </Handle>
      )}
      {hasRightTarget && (
        <Handle
          id="right-target"
          type="target"
          position={Position.Right}
          title="오른쪽에서 연결됨"
          className={`${connectorClass} !-right-2.5 !top-[25%]`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500" />
        </Handle>
      )}
      {hasRightSource && (
        <Handle
          id="right-source"
          type="source"
          position={Position.Right}
          title="오른쪽으로 연결됨"
          className={`${connectorClass} !-right-2.5 !top-1/2`}
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500" />
        </Handle>
      )}

      {canAddTop && (
        <button
          type="button"
          title="이전 단계 추가"
          onClick={(e) => {
            e.stopPropagation();
            onAddDirection(id, 'top');
          }}
          className={`${addButtonClass} -top-2.5 left-4`}
        >
          <Plus size={10} />
        </button>
      )}
      {canAddBottom && (
        <button
          type="button"
          title="다음 단계 추가"
          onClick={(e) => {
            e.stopPropagation();
            onAddDirection(id, 'bottom');
          }}
          className={`${addButtonClass} -bottom-2.5 right-4`}
        >
          <Plus size={10} />
        </button>
      )}
      {canAddLeft && (
        <button
          type="button"
          title="갈래 추가 (왼쪽)"
          onClick={(e) => {
            e.stopPropagation();
            onAddDirection(id, 'left');
          }}
          className={`${addButtonClass} -left-2.5 top-[75%] -translate-y-1/2`}
        >
          <Plus size={10} />
        </button>
      )}
      {canAddRight && (
        <button
          type="button"
          title="갈래 추가 (오른쪽)"
          onClick={(e) => {
            e.stopPropagation();
            onAddDirection(id, 'right');
          }}
          className={`${addButtonClass} -right-2.5 top-[75%] -translate-y-1/2`}
        >
          <Plus size={10} />
        </button>
      )}

      <button
        type="button"
        title={completed ? '완료 취소' : '완료로 표시'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCompleted(id);
        }}
        className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 transition-colors hover:text-teal-400"
      >
        {completed ? <CheckSquare size={14} className="text-zinc-400" /> : <Square size={14} />}
      </button>

      {memoState !== 'none' && (
        <div className="absolute -top-2 -right-2">
          {memoState === 'unresolved' ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
              <MessageSquareText size={12} />
            </span>
          ) : (
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-zinc-700 text-zinc-500">
              <MessageSquareText size={12} className="line-through decoration-2" />
              <CheckCircle2
                size={11}
                className="absolute -bottom-1 -right-1 rounded-full bg-zinc-900 text-emerald-500"
              />
            </span>
          )}
        </div>
      )}

      <div className="flex h-full flex-col justify-center overflow-hidden py-1">
        {kindLabel[kind] && (
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {kindLabel[kind]}
          </div>
        )}
        <div
          title={title || kindPlaceholder[kind]}
          className={`line-clamp-2 text-sm ${completed || !title ? 'text-zinc-500' : 'text-zinc-100'}`}
        >
          {title || kindPlaceholder[kind]}
        </div>
      </div>
    </div>
  );
}
