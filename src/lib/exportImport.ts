import type { FlowEdge, FlowNode, Memo, MemoReply, NodeKind, Project } from '../types/project';

export interface ProjectExport {
  version: 1;
  exportedAt: string;
  project: { name: string };
  nodes: {
    id: string;
    kind: NodeKind;
    title: string;
    position: { x: number; y: number };
    completed?: boolean;
    completedAt?: string | null;
  }[];
  edges: { id: string; source: string; target: string; branchSide?: 'left' | 'right' }[];
  memos: {
    id: string;
    nodeId: string;
    text: string;
    author?: string;
    createdAt: string;
    resolved: boolean;
    resolvedAt?: string | null;
  }[];
  replies: { id: string; memoId: string; text: string; author?: string; createdAt: string }[];
}

export function buildProjectExport(
  project: Project,
  nodes: FlowNode[],
  edges: FlowEdge[],
  memos: Memo[],
  replies: MemoReply[],
): ProjectExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: { name: project.name },
    nodes: nodes.map(({ id, kind, title, position, completed, completedAt }) => ({
      id,
      kind,
      title,
      position,
      completed,
      completedAt,
    })),
    edges: edges.map(({ id, source, target, branchSide }) => ({ id, source, target, branchSide })),
    memos: memos.map(({ id, nodeId, text, author, createdAt, resolved, resolvedAt }) => ({
      id,
      nodeId,
      text,
      author,
      createdAt,
      resolved,
      resolvedAt,
    })),
    replies: replies.map(({ id, memoId, text, author, createdAt }) => ({
      id,
      memoId,
      text,
      author,
      createdAt,
    })),
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]/g, '_').trim();
  return cleaned || 'project';
}

export function parseProjectExport(json: string): ProjectExport {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('JSON 형식이 아닙니다');
  }
  if (
    !data ||
    typeof data !== 'object' ||
    !('nodes' in data) ||
    !('edges' in data) ||
    !Array.isArray((data as ProjectExport).nodes) ||
    !Array.isArray((data as ProjectExport).edges) ||
    typeof (data as ProjectExport).project?.name !== 'string'
  ) {
    throw new Error('올바른 프로젝트 파일이 아닙니다');
  }
  return data as ProjectExport;
}
