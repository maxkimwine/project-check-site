import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface DeleteProjectConfirmProps {
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteProjectConfirm({ projectName, onClose, onConfirm }: DeleteProjectConfirmProps) {
  return (
    <Modal title="프로젝트 삭제" onClose={onClose}>
      <p className="text-sm text-zinc-400">
        <span className="text-zinc-200">{projectName}</span> 프로젝트를 삭제하면 순서도, 메모,
        답글이 모두 사라지며 되돌릴 수 없습니다.
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
