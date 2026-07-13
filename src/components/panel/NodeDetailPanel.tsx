import { useEffect, useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';
import type { FlowNode } from '../../types/project';
import { useProjectStore } from '../../state/projectStore';
import { IconButton } from '../ui/IconButton';
import { MemoItem } from './MemoItem';
import { AddMemoForm } from './AddMemoForm';
import { DeleteNodeConfirm } from '../controls/DeleteNodeConfirm';

interface NodeDetailPanelProps {
  node: FlowNode;
  onClose: () => void;
  onDelete?: () => void;
}

export function NodeDetailPanel({ node, onClose, onDelete }: NodeDetailPanelProps) {
  const allMemos = useProjectStore((s) => s.memos);
  const memos = useMemo(() => allMemos.filter((m) => m.nodeId === node.id), [allMemos, node.id]);
  const updateNodeTitle = useProjectStore((s) => s.updateNodeTitle);
  const addMemo = useProjectStore((s) => s.addMemo);

  const [title, setTitle] = useState(node.title);
  const [authorName, setAuthorName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTitle(node.title);
  }, [node.id, node.title]);

  useEffect(() => {
    if (!onDelete) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return;
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;
      setConfirmDelete(true);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDelete]);

  function handleTitleBlur() {
    if (title !== node.title) updateNodeTitle(node.id, title);
  }

  const sortedMemos = [...memos].sort((a, b) => (a.resolved === b.resolved ? 0 : a.resolved ? 1 : -1));

  return (
    <div className="absolute inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-zinc-800 bg-zinc-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-sm font-medium text-zinc-100">칸 상세</h2>
        <IconButton icon={<X size={16} />} label="닫기" onClick={onClose} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <label className="mb-1.5 block text-xs text-zinc-500">업무 내용</label>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          placeholder="이 칸에서 할 일을 적어주세요"
          rows={2}
          className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
        />

        <label className="mb-1.5 block text-xs text-zinc-500">이름 (선택)</label>
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="메모/답글에 표시될 이름"
          className="mb-5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
        />

        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            메모 ({memos.length})
          </h3>
        </div>
        <div className="mb-4 flex flex-col gap-2">
          {sortedMemos.map((memo) => (
            <MemoItem key={memo.id} memo={memo} authorName={authorName} />
          ))}
          {memos.length === 0 && (
            <p className="text-xs text-zinc-600">아직 남긴 메모가 없습니다</p>
          )}
        </div>
        <AddMemoForm onAdd={(text) => addMemo(node.id, text, authorName || undefined)} />
      </div>

      {onDelete && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={14} />이 칸 삭제
          </button>
        </div>
      )}

      {confirmDelete && onDelete && (
        <DeleteNodeConfirm
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
        />
      )}
    </div>
  );
}
