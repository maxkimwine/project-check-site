import { useMemo, useState } from 'react';
import { CornerDownRight } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { Button } from '../ui/Button';

interface MemoReplyThreadProps {
  memoId: string;
  authorName: string;
}

export function MemoReplyThread({ memoId, authorName }: MemoReplyThreadProps) {
  const allReplies = useProjectStore((s) => s.replies);
  const replies = useMemo(() => allReplies.filter((r) => r.memoId === memoId), [allReplies, memoId]);
  const addReply = useProjectStore((s) => s.addReply);
  const [text, setText] = useState('');
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    addReply(memoId, trimmed, authorName || undefined);
    setText('');
    setShowForm(false);
  }

  return (
    <div className="ml-4 mt-2 flex flex-col gap-2 border-l border-zinc-800 pl-3">
      {replies.map((r) => (
        <div key={r.id} className="text-xs">
          <div className="flex items-center gap-1.5 text-zinc-500">
            <CornerDownRight size={11} />
            <span className="font-medium text-zinc-400">{r.author || '익명'}</span>
            <span>{new Date(r.createdAt).toLocaleString('ko-KR')}</span>
          </div>
          <p className="mt-0.5 text-zinc-300">{r.text}</p>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="처리 내용을 남겨주세요"
            rows={2}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
          />
          <div className="flex justify-end gap-1.5">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              취소
            </Button>
            <Button type="submit" variant="secondary" disabled={!text.trim()}>
              등록
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-fit text-xs text-zinc-500 hover:text-teal-400"
        >
          답글 추가
        </button>
      )}
    </div>
  );
}
