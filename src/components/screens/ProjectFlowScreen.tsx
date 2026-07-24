import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Columns3, Download, RefreshCw, Rows3, Save } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { buildProjectExport, downloadJson, sanitizeFilename } from '../../lib/exportImport';
import { useTrackPresence } from '../../hooks/useProjectPresence';
import { useProjectChangeBanner } from '../../hooks/useProjectChangeBanner';
import { FlowchartCanvas } from '../flow/FlowchartCanvas';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';

export function ProjectFlowScreen() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === projectId));
  const allNodes = useProjectStore((s) => s.nodes);
  const allEdges = useProjectStore((s) => s.edges);
  const allMemos = useProjectStore((s) => s.memos);
  const allReplies = useProjectStore((s) => s.replies);
  const setProjectOrientation = useProjectStore((s) => s.setProjectOrientation);
  const [justSaved, setJustSaved] = useState(false);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useTrackPresence(projectId ?? '');
  const { hasRemoteChange, refresh } = useProjectChangeBanner(projectId ?? '');

  const nodes = useMemo(() => allNodes.filter((n) => n.projectId === projectId), [allNodes, projectId]);
  const edges = useMemo(() => allEdges.filter((e) => e.projectId === projectId), [allEdges, projectId]);
  const memos = useMemo(() => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    return allMemos.filter((m) => nodeIds.has(m.nodeId));
  }, [allMemos, nodes]);
  const replies = useMemo(() => {
    const memoIds = new Set(memos.map((m) => m.id));
    return allReplies.filter((r) => memoIds.has(r.memoId));
  }, [allReplies, memos]);

  function handleExport() {
    if (!project) return;
    const data = buildProjectExport(project, nodes, edges, memos, replies);
    downloadJson(`${sanitizeFilename(project.name)}.json`, data);
  }

  function handleSave() {
    // Every change already syncs to Supabase as it happens; this just gives visual
    // confirmation for users who want to double-check before walking away.
    setJustSaved(true);
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 1500);
  }

  function handleToggleOrientation() {
    if (!project) return;
    setProjectOrientation(project.id, project.orientation === 'horizontal' ? 'vertical' : 'horizontal');
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-zinc-500">
        <p className="text-sm">프로젝트를 찾을 수 없습니다</p>
        <button onClick={() => navigate('/')} className="text-sm text-teal-400 hover:underline">
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-4 py-3">
        <IconButton icon={<ArrowLeft size={16} />} label="목록으로" onClick={() => navigate('/')} />
        <h1 className="flex-1 text-sm font-medium text-zinc-100">{project.name}</h1>
        {hasRemoteChange && (
          <button
            type="button"
            onClick={refresh}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            <RefreshCw size={12} />
            다른 사용자가 수정했습니다 · 새로고침
          </button>
        )}
        <Button
          variant="secondary"
          onClick={handleToggleOrientation}
          title="방향을 바꾸면 손으로 옮긴 칸 위치가 초기화되고 자동으로 다시 배치됩니다 (Ctrl+Z로 되돌릴 수 있어요)"
        >
          {project.orientation === 'horizontal' ? <Columns3 size={14} /> : <Rows3 size={14} />}
          {project.orientation === 'horizontal' ? '가로' : '세로'}
        </Button>
        <Button variant="secondary" onClick={handleSave}>
          {justSaved ? <Check size={14} className="text-teal-400" /> : <Save size={14} />}
          {justSaved ? '저장됨' : '저장'}
        </Button>
        <Button variant="secondary" onClick={handleExport}>
          <Download size={14} />
          내보내기
        </Button>
      </header>
      <div className="relative flex-1">
        <FlowchartCanvas projectId={project.id} />
      </div>
    </div>
  );
}
