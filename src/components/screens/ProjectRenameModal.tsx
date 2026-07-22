import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ProjectRenameModalProps {
  initialName: string;
  onClose: () => void;
  onRename: (name: string) => void;
}

export function ProjectRenameModal({ initialName, onClose, onRename }: ProjectRenameModalProps) {
  const [name, setName] = useState(initialName);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onRename(trimmed);
  }

  return (
    <Modal title="프로젝트 이름 변경" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-rename" className="text-sm text-zinc-400">
            프로젝트명
          </label>
          <input
            id="project-rename"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  );
}
