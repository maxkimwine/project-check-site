import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DeleteNodeConfirmProps {
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteNodeConfirm({ onClose, onConfirm }: DeleteNodeConfirmProps) {
  return (
    <Modal title="칸 삭제" onClose={onClose}>
      <p className="text-sm text-zinc-400">
        이 칸을 삭제하면 연결된 이전/다음 칸들이 서로 자동으로 다시 연결됩니다. 이 칸에 남긴
        메모도 함께 삭제됩니다.
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          삭제
        </Button>
      </div>
    </Modal>
  );
}
