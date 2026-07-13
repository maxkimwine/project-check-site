import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2, MessageSquareText } from 'lucide-react';
import type { NodeKind } from '../../../types/project';

export interface CustomNodeData {
  title: string;
  kind: NodeKind;
  memoState: 'none' | 'unresolved' | 'resolved';
  onBranch: (nodeId: string) => void;
  [key: string]: unknown;
}

const kindPlaceholder: Record<NodeKind, string> = {
  start: '프로젝트 시작',
  task: '제목 없음',
  end: '프로젝트 완료',
};

const kindBorder: Record<NodeKind, string> = {
  start: 'border-emerald-500/60',
  task: 'border-zinc-700',
  end: 'border-violet-500/60',
};

const kindLabel: Record<NodeKind, string> = {
  start: '시작',
  task: '',
  end: '완료',
};

export function CustomNode({ id, data, selected }: NodeProps) {
  const { title, kind, memoState, onBranch } = data as unknown as CustomNodeData;

  return (
    <div
      className={`group relative w-[200px] rounded-xl border bg-zinc-800 px-3.5 py-3 shadow-sm transition-colors ${kindBorder[kind]} ${
        selected ? 'ring-2 ring-yellow-400' : ''
      }`}
    >
      {kind !== 'start' && (
        <Handle
          type="target"
          position={Position.Top}
          title="드래그 도착 지점"
          className="group !-top-2.5 !flex !h-[18px] !w-[18px] !items-center !justify-center !rounded-full !border-2 !border-zinc-500 !bg-zinc-900 transition-colors hover:!border-teal-400"
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500 transition-colors group-hover:bg-teal-400" />
        </Handle>
      )}
      {kind !== 'end' && (
        <Handle
          type="source"
          position={Position.Bottom}
          title="클릭: 새 칸 추가 / 드래그 시작 지점: 빈 곳에 놓으면 새 칸 추가, 다른 칸에 놓으면 합류 연결"
          onClick={(e) => {
            e.stopPropagation();
            onBranch(id);
          }}
          className="group !-bottom-2.5 !flex !h-[18px] !w-[18px] !items-center !justify-center !rounded-full !border-2 !border-zinc-500 !bg-zinc-900 transition-colors hover:!border-teal-400"
        >
          <span className="pointer-events-none h-1.5 w-1.5 rounded-full bg-zinc-500 transition-colors group-hover:bg-teal-400" />
        </Handle>
      )}

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

      {kindLabel[kind] && (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {kindLabel[kind]}
        </div>
      )}
      <div className={`text-sm ${title ? 'text-zinc-100' : 'text-zinc-500'}`}>
        {title || kindPlaceholder[kind]}
      </div>
    </div>
  );
}
