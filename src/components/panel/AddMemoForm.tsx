import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

interface AddMemoFormProps {
  onAdd: (text: string) => void;
}

export function AddMemoForm({ onAdd }: AddMemoFormProps) {
  const [text, setText] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setText('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="메모를 남겨주세요"
        rows={2}
        className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
      />
      <Button type="submit" variant="secondary" disabled={!text.trim()} className="self-end">
        <Plus size={14} />
        메모 추가
      </Button>
    </form>
  );
}
