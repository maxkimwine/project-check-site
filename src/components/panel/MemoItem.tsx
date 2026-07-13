import type { Memo } from '../../types/project';
import { useProjectStore } from '../../state/projectStore';
import { MemoReplyThread } from './MemoReplyThread';

interface MemoItemProps {
  memo: Memo;
  authorName: string;
}

export function MemoItem({ memo, authorName }: MemoItemProps) {
  const toggleMemoResolved = useProjectStore((s) => s.toggleMemoResolved);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={memo.resolved}
          onChange={() => toggleMemoResolved(memo.id)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
        />
        <div className="flex-1">
          <p className={`text-sm ${memo.resolved ? 'text-zinc-500 line-through' : 'text-zinc-100'}`}>
            {memo.text}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
            <span>{memo.author || '익명'}</span>
            <span>{new Date(memo.createdAt).toLocaleString('ko-KR')}</span>
            {memo.resolved && <span className="text-emerald-500">처리 완료</span>}
          </div>
        </div>
      </div>
      <MemoReplyThread memoId={memo.id} authorName={authorName} />
    </div>
  );
}
