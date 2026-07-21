import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Upload, Workflow } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { parseProjectExport } from '../../lib/exportImport';
import { useOpenProjectIds } from '../../hooks/useProjectPresence';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { ProjectCreateModal } from './ProjectCreateModal';
import { DeleteProjectConfirm } from '../controls/DeleteProjectConfirm';

export function ProjectListScreen() {
  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);
  const importProject = useProjectStore((s) => s.importProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const openProjectIds = useOpenProjectIds();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  function handleCreate(name: string) {
    const project = createProject(name);
    setShowCreate(false);
    navigate(`/project/${project.id}`);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const data = parseProjectExport(text);
      const project = importProject(data);
      navigate(`/project/${project.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '가져오기에 실패했습니다');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-medium text-zinc-100">프로젝트 현황</h1>
          <p className="mt-1 text-sm text-zinc-400">순서도로 진행 상황을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={16} />
            가져오기
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            새 프로젝트
          </Button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-20 text-center">
          <Workflow size={28} className="text-zinc-600" />
          <p className="text-sm text-zinc-500">아직 프로젝트가 없습니다</p>
          <Button variant="secondary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />첫 프로젝트 만들기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((p) => (
            <li key={p.id} className="group flex items-center rounded-xl border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60">
              <button
                onClick={() => navigate(`/project/${p.id}`)}
                className="flex flex-1 items-center gap-3 px-4 py-3.5 text-left"
              >
                <Workflow size={18} className="shrink-0 text-teal-400" />
                <span className="flex-1 text-sm font-medium text-zinc-100">{p.name}</span>
                {openProjectIds.has(p.id) && (
                  <span className="flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                    편집 중
                  </span>
                )}
                <span className="text-xs text-zinc-500">
                  {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </button>
              <IconButton
                icon={<Trash2 size={15} />}
                label="프로젝트 삭제"
                onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                className="mr-2 hover:text-red-400"
              />
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <ProjectCreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}

      {deleteTarget && (
        <DeleteProjectConfirm
          projectName={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteProject(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
