import { create } from 'zustand';
import type { FlowEdge, FlowNode, Memo, MemoReply, Project } from '../types/project';
import { loadState, saveState } from '../lib/storage';
import { seedProject } from './seed';
import { createId } from '../utils/id';
import type { ProjectExport } from '../lib/exportImport';

interface ProjectState {
  projects: Project[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];

  createProject: (name: string) => Project;
  importProject: (data: ProjectExport) => Project;
  deleteProject: (projectId: string) => void;

  updateNodeTitle: (nodeId: string, title: string) => void;
  addNodes: (nodes: FlowNode[]) => void;
  addEdges: (edges: FlowEdge[]) => void;
  removeEdges: (edgeIds: string[]) => void;
  removeNode: (nodeId: string) => void;
  updateNodePositions: (positions: Record<string, { x: number; y: number }>) => void;

  addMemo: (nodeId: string, text: string, author?: string) => void;
  toggleMemoResolved: (memoId: string) => void;
  addReply: (memoId: string, text: string, author?: string) => void;
}

function persist(state: Pick<ProjectState, 'projects' | 'nodes' | 'edges' | 'memos' | 'replies'>) {
  saveState(state);
}

const initial = loadState<{
  projects: Project[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];
}>();

export const useProjectStore = create<ProjectState>((set) => ({
  projects: initial?.projects ?? [],
  nodes: initial?.nodes ?? [],
  edges: initial?.edges ?? [],
  memos: initial?.memos ?? [],
  replies: initial?.replies ?? [],

  createProject: (name: string) => {
    const { project, nodes, edges } = seedProject(name);
    set((state) => {
      const next = {
        ...state,
        projects: [...state.projects, project],
        nodes: [...state.nodes, ...nodes],
        edges: [...state.edges, ...edges],
      };
      persist(next);
      return next;
    });
    return project;
  },

  importProject: (data: ProjectExport) => {
    const now = new Date().toISOString();
    const projectId = createId();
    const project: Project = { id: projectId, name: data.project.name, createdAt: now };

    const nodeIdMap = new Map<string, string>();
    const nodes: FlowNode[] = data.nodes.map((n) => {
      const newId = createId();
      nodeIdMap.set(n.id, newId);
      return { id: newId, projectId, kind: n.kind, title: n.title, position: n.position, createdAt: now };
    });

    const edges: FlowEdge[] = data.edges.flatMap((e) => {
      const source = nodeIdMap.get(e.source);
      const target = nodeIdMap.get(e.target);
      if (!source || !target) return [];
      return [{ id: createId(), projectId, source, target }];
    });

    const memoIdMap = new Map<string, string>();
    const memos: Memo[] = data.memos.flatMap((m) => {
      const nodeId = nodeIdMap.get(m.nodeId);
      if (!nodeId) return [];
      const newId = createId();
      memoIdMap.set(m.id, newId);
      return [
        { id: newId, nodeId, text: m.text, author: m.author, createdAt: m.createdAt, resolved: m.resolved },
      ];
    });

    const replies: MemoReply[] = data.replies.flatMap((r) => {
      const memoId = memoIdMap.get(r.memoId);
      if (!memoId) return [];
      return [{ id: createId(), memoId, text: r.text, author: r.author, createdAt: r.createdAt }];
    });

    set((state) => {
      const next = {
        ...state,
        projects: [...state.projects, project],
        nodes: [...state.nodes, ...nodes],
        edges: [...state.edges, ...edges],
        memos: [...state.memos, ...memos],
        replies: [...state.replies, ...replies],
      };
      persist(next);
      return next;
    });
    return project;
  },

  deleteProject: (projectId: string) => {
    set((state) => {
      const nodeIds = new Set(
        state.nodes.filter((n) => n.projectId === projectId).map((n) => n.id),
      );
      const memoIds = new Set(
        state.memos.filter((m) => nodeIds.has(m.nodeId)).map((m) => m.id),
      );
      const next = {
        ...state,
        projects: state.projects.filter((p) => p.id !== projectId),
        nodes: state.nodes.filter((n) => n.projectId !== projectId),
        edges: state.edges.filter((e) => e.projectId !== projectId),
        memos: state.memos.filter((m) => !memoIds.has(m.id)),
        replies: state.replies.filter((r) => !memoIds.has(r.memoId)),
      };
      persist(next);
      return next;
    });
  },

  updateNodeTitle: (nodeId, title) => {
    set((state) => {
      const next = {
        ...state,
        nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)),
      };
      persist(next);
      return next;
    });
  },

  addNodes: (nodes) => {
    set((state) => {
      const next = { ...state, nodes: [...state.nodes, ...nodes] };
      persist(next);
      return next;
    });
  },

  addEdges: (edges) => {
    set((state) => {
      const next = { ...state, edges: [...state.edges, ...edges] };
      persist(next);
      return next;
    });
  },

  removeEdges: (edgeIds) => {
    set((state) => {
      const next = { ...state, edges: state.edges.filter((e) => !edgeIds.includes(e.id)) };
      persist(next);
      return next;
    });
  },

  removeNode: (nodeId) => {
    set((state) => {
      const removedMemoIds = new Set(
        state.memos.filter((m) => m.nodeId === nodeId).map((m) => m.id),
      );
      const next = {
        ...state,
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        memos: state.memos.filter((m) => m.nodeId !== nodeId),
        replies: state.replies.filter((r) => !removedMemoIds.has(r.memoId)),
      };
      persist(next);
      return next;
    });
  },

  updateNodePositions: (positions) => {
    set((state) => {
      const next = {
        ...state,
        nodes: state.nodes.map((n) =>
          positions[n.id] ? { ...n, position: positions[n.id] } : n,
        ),
      };
      persist(next);
      return next;
    });
  },

  addMemo: (nodeId, text, author) => {
    set((state) => {
      const memo: Memo = {
        id: createId(),
        nodeId,
        text,
        author,
        createdAt: new Date().toISOString(),
        resolved: false,
      };
      const next = { ...state, memos: [...state.memos, memo] };
      persist(next);
      return next;
    });
  },

  toggleMemoResolved: (memoId) => {
    set((state) => {
      const next = {
        ...state,
        memos: state.memos.map((m) => (m.id === memoId ? { ...m, resolved: !m.resolved } : m)),
      };
      persist(next);
      return next;
    });
  },

  addReply: (memoId, text, author) => {
    set((state) => {
      const reply: MemoReply = {
        id: createId(),
        memoId,
        text,
        author,
        createdAt: new Date().toISOString(),
      };
      const next = { ...state, replies: [...state.replies, reply] };
      persist(next);
      return next;
    });
  },
}));
