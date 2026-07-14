import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface ProjectCreateModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function ProjectCreateModal({ onClose, onCreate }: ProjectCreateModalProps) {
  const [name, setName] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  }

  return (
    <Modal title="새 프로젝트" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="project-name" className="text-sm text-zinc-400">
            프로젝트명
          </label>
          <input
            id="project-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 신제품 개발 프로젝트"
            className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-teal-400"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            생성
          </Button>
        </div>
      </form>
    </Modal>
  );
}
