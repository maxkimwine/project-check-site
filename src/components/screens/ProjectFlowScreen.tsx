import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { buildProjectExport, downloadJson, sanitizeFilename } from '../../lib/exportImport';
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
