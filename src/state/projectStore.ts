import { create } from 'zustand';
import { temporal } from 'zundo';
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
  toggleNodeCompleted: (nodeId: string) => void;
  addNodes: (nodes: FlowNode[]) => void;
  addEdges: (edges: FlowEdge[]) => void;
  removeEdges: (edgeIds: string[]) => void;
  removeNode: (nodeId: string) => void;
  updateNodePositions: (positions: Record<string, { x: number; y: number }>) => void;

  addMemo: (nodeId: string, text: string, author?: string) => void;
  toggleMemoResolved: (memoId: string) => void;
  addReply: (memoId: string, text: string, author?: string) => void;
}

const initial = loadState<{
  projects: Project[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];
}>();

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set) => ({
      projects: initial?.projects ?? [],
      nodes: initial?.nodes ?? [],
      edges: initial?.edges ?? [],
      memos: initial?.memos ?? [],
      replies: initial?.replies ?? [],

      createProject: (name: string) => {
        const { project, nodes, edges } = seedProject(name);
        set((state) => ({
          ...state,
          projects: [...state.projects, project],
          nodes: [...state.nodes, ...nodes],
          edges: [...state.edges, ...edges],
        }));
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
          return {
            id: newId,
            projectId,
            kind: n.kind,
            title: n.title,
            position: n.position,
            createdAt: now,
            completed: n.completed ?? false,
            completedAt: n.completedAt ?? null,
          };
        });

        const edges: FlowEdge[] = data.edges.flatMap((e) => {
          const source = nodeIdMap.get(e.source);
          const target = nodeIdMap.get(e.target);
          if (!source || !target) return [];
          return [{ id: createId(), projectId, source, target, branchSide: e.branchSide }];
        });

        const memoIdMap = new Map<string, string>();
        const memos: Memo[] = data.memos.flatMap((m) => {
          const nodeId = nodeIdMap.get(m.nodeId);
          if (!nodeId) return [];
          const newId = createId();
          memoIdMap.set(m.id, newId);
          return [
            {
              id: newId,
              nodeId,
              text: m.text,
              author: m.author,
              createdAt: m.createdAt,
              resolved: m.resolved,
              resolvedAt: m.resolvedAt ?? null,
            },
          ];
        });

        const replies: MemoReply[] = data.replies.flatMap((r) => {
          const memoId = memoIdMap.get(r.memoId);
          if (!memoId) return [];
          return [{ id: createId(), memoId, text: r.text, author: r.author, createdAt: r.createdAt }];
        });

        set((state) => ({
          ...state,
          projects: [...state.projects, project],
          nodes: [...state.nodes, ...nodes],
          edges: [...state.edges, ...edges],
          memos: [...state.memos, ...memos],
          replies: [...state.replies, ...replies],
        }));
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
          return {
            ...state,
            projects: state.projects.filter((p) => p.id !== projectId),
            nodes: state.nodes.filter((n) => n.projectId !== projectId),
            edges: state.edges.filter((e) => e.projectId !== projectId),
            memos: state.memos.filter((m) => !memoIds.has(m.id)),
            replies: state.replies.filter((r) => !memoIds.has(r.memoId)),
          };
        });
      },

      updateNodeTitle: (nodeId, title) => {
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, title } : n)),
        }));
      },

      toggleNodeCompleted: (nodeId) => {
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const completed = !n.completed;
            return { ...n, completed, completedAt: completed ? new Date().toISOString() : null };
          }),
        }));
      },

      addNodes: (nodes) => {
        set((state) => ({ ...state, nodes: [...state.nodes, ...nodes] }));
      },

      addEdges: (edges) => {
        set((state) => ({ ...state, edges: [...state.edges, ...edges] }));
      },

      removeEdges: (edgeIds) => {
        set((state) => ({
          ...state,
          edges: state.edges.filter((e) => !edgeIds.includes(e.id)),
        }));
      },

      removeNode: (nodeId) => {
        set((state) => {
          const removedMemoIds = new Set(
            state.memos.filter((m) => m.nodeId === nodeId).map((m) => m.id),
          );
          return {
            ...state,
            nodes: state.nodes.filter((n) => n.id !== nodeId),
            edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            memos: state.memos.filter((m) => m.nodeId !== nodeId),
            replies: state.replies.filter((r) => !removedMemoIds.has(r.memoId)),
          };
        });
      },

      updateNodePositions: (positions) => {
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => (positions[n.id] ? { ...n, position: positions[n.id] } : n)),
        }));
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
            resolvedAt: null,
          };
          return { ...state, memos: [...state.memos, memo] };
        });
      },

      toggleMemoResolved: (memoId) => {
        set((state) => ({
          ...state,
          memos: state.memos.map((m) => {
            if (m.id !== memoId) return m;
            const resolved = !m.resolved;
            return { ...m, resolved, resolvedAt: resolved ? new Date().toISOString() : null };
          }),
        }));
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
          return { ...state, replies: [...state.replies, reply] };
        });
      },
    }),
    {
      partialize: (state) => ({
        projects: state.projects,
        nodes: state.nodes,
        edges: state.edges,
        memos: state.memos,
        replies: state.replies,
      }),
      limit: 50,
      // Several user-facing actions (e.g. adding a branch) call multiple store
      // mutations back to back (addNodes, addEdges, then a relayout/position
      // update) in the same synchronous tick. Without this, each of those would
      // become its own undo step, so a single Ctrl+Z would only partially undo
      // the action. Deferring the actual history push to the next macrotask
      // coalesces a synchronous burst of set() calls into a single undo step,
      // using the state from *before* the first call in the burst.
      handleSet: (handleSet) => {
        let flushTimeout: ReturnType<typeof setTimeout> | undefined;
        let batchStartState: Parameters<typeof handleSet>[0] | undefined;
        return (pastState, replace) => {
          if (batchStartState === undefined) batchStartState = pastState;
          if (flushTimeout) clearTimeout(flushTimeout);
          flushTimeout = setTimeout(() => {
            handleSet(batchStartState!, replace);
            batchStartState = undefined;
          }, 0);
        };
      },
    },
  ),
);

useProjectStore.subscribe((state) => {
  saveState({
    projects: state.projects,
    nodes: state.nodes,
    edges: state.edges,
    memos: state.memos,
    replies: state.replies,
  });
});
