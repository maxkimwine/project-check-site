import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface SyncErrorModalProps {
  title: string;
  detail: string;
  onClose: () => void;
}

export function SyncErrorModal({ title, detail, onClose }: SyncErrorModalProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(detail);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-zinc-400">
        아래 오류 내용을 복사해서 알려주시면 원인 확인이 쉬워집니다.
      </p>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-xs text-zinc-300">
        {detail}
      </pre>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
        <Button variant="secondary" onClick={handleCopy}>
          {copied ? '복사됨' : '복사'}
        </Button>
      </div>
    </Modal>
  );
}
