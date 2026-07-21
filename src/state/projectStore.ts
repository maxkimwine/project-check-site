import { create } from 'zustand';
import { temporal } from 'zundo';
import type { FlowEdge, FlowNode, Memo, MemoReply, Project } from '../types/project';
import * as repo from '../lib/supabaseRepo';
import { seedProject } from './seed';
import { createId } from '../utils/id';
import { diffById } from '../utils/diff';
import type { ProjectExport } from '../lib/exportImport';

interface ProjectState {
  hydrated: boolean;
  projects: Project[];
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];

  hydrate: () => Promise<void>;
  refetchProject: (projectId: string) => Promise<void>;

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

// Set to true around a store hydration/refresh (bulk-loading data that ALREADY exists in
// Supabase) so that burst of set() calls doesn't get recorded as a Ctrl+Z step — undoing a
// hydration would otherwise diff "empty/stale local state" against "freshly loaded state" and
// try to bulk-delete or overwrite rows in Supabase that were never actually touched by the user.
let suppressUndo = false;

function reportSyncError(err: unknown) {
  console.error(err);
  alert('클라우드 저장에 실패했습니다. 네트워크 상태를 확인해주세요.');
}

export const useProjectStore = create<ProjectState>()(
  temporal(
    (set) => ({
      hydrated: false,
      projects: [],
      nodes: [],
      edges: [],
      memos: [],
      replies: [],

      hydrate: async () => {
        try {
          const data = await repo.fetchAll();
          suppressUndo = true;
          set((state) => ({ ...state, ...data, hydrated: true }));
          suppressUndo = false;
        } catch (err) {
          console.error(err);
          alert('데이터를 불러오지 못했습니다. 새로고침해주세요.');
          set((state) => ({ ...state, hydrated: true }));
        }
      },

      refetchProject: async (projectId: string) => {
        try {
          const data = await repo.fetchProjectData(projectId);
          suppressUndo = true;
          set((state) => {
            const nodeIdsInProject = new Set(
              state.nodes.filter((n) => n.projectId === projectId).map((n) => n.id),
            );
            const memoIdsInProject = new Set(
              state.memos.filter((m) => nodeIdsInProject.has(m.nodeId)).map((m) => m.id),
            );
            return {
              ...state,
              nodes: [...state.nodes.filter((n) => n.projectId !== projectId), ...data.nodes],
              edges: [...state.edges.filter((e) => e.projectId !== projectId), ...data.edges],
              memos: [...state.memos.filter((m) => !nodeIdsInProject.has(m.nodeId)), ...data.memos],
              replies: [...state.replies.filter((r) => !memoIdsInProject.has(r.memoId)), ...data.replies],
            };
          });
          suppressUndo = false;
        } catch (err) {
          reportSyncError(err);
        }
      },

      createProject: (name: string) => {
        const { project, nodes, edges } = seedProject(name);
        set((state) => ({
          ...state,
          projects: [...state.projects, project],
          nodes: [...state.nodes, ...nodes],
          edges: [...state.edges, ...edges],
        }));
        (async () => {
          try {
            await repo.insertProject(project);
            await repo.insertNodes(nodes);
            await repo.insertEdges(edges);
          } catch (err) {
            reportSyncError(err);
          }
        })();
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
        repo.insertProjectBundle({ project, nodes, edges, memos, replies }).catch(reportSyncError);
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
        repo.deleteProjectCascade(projectId).catch(reportSyncError);
      },

      updateNodeTitle: (nodeId, title) => {
        let updatedNode: FlowNode | undefined;
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            updatedNode = { ...n, title };
            return updatedNode;
          }),
        }));
        if (updatedNode) repo.updateNode(updatedNode).catch(reportSyncError);
      },

      toggleNodeCompleted: (nodeId) => {
        let updatedNode: FlowNode | undefined;
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => {
            if (n.id !== nodeId) return n;
            const completed = !n.completed;
            updatedNode = { ...n, completed, completedAt: completed ? new Date().toISOString() : null };
            return updatedNode;
          }),
        }));
        if (updatedNode) repo.updateNode(updatedNode).catch(reportSyncError);
      },

      addNodes: (nodes) => {
        set((state) => ({ ...state, nodes: [...state.nodes, ...nodes] }));
        repo.insertNodes(nodes).catch(reportSyncError);
      },

      addEdges: (edges) => {
        set((state) => ({ ...state, edges: [...state.edges, ...edges] }));
        repo.insertEdges(edges).catch(reportSyncError);
      },

      removeEdges: (edgeIds) => {
        set((state) => ({
          ...state,
          edges: state.edges.filter((e) => !edgeIds.includes(e.id)),
        }));
        repo.deleteEdges(edgeIds).catch(reportSyncError);
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
        repo.deleteNode(nodeId).catch(reportSyncError);
      },

      updateNodePositions: (positions) => {
        const updatedNodes: FlowNode[] = [];
        set((state) => ({
          ...state,
          nodes: state.nodes.map((n) => {
            if (!positions[n.id]) return n;
            const next = { ...n, position: positions[n.id] };
            updatedNodes.push(next);
            return next;
          }),
        }));
        if (updatedNodes.length > 0) repo.updateNodePositionsBulk(updatedNodes).catch(reportSyncError);
      },

      addMemo: (nodeId, text, author) => {
        const memo: Memo = {
          id: createId(),
          nodeId,
          text,
          author,
          createdAt: new Date().toISOString(),
          resolved: false,
          resolvedAt: null,
        };
        let projectId = '';
        set((state) => {
          projectId = state.nodes.find((n) => n.id === nodeId)?.projectId ?? '';
          return { ...state, memos: [...state.memos, memo] };
        });
        if (projectId) repo.insertMemo(memo, projectId).catch(reportSyncError);
      },

      toggleMemoResolved: (memoId) => {
        let updatedMemo: Memo | undefined;
        let projectId = '';
        set((state) => ({
          ...state,
          memos: state.memos.map((m) => {
            if (m.id !== memoId) return m;
            const resolved = !m.resolved;
            updatedMemo = { ...m, resolved, resolvedAt: resolved ? new Date().toISOString() : null };
            projectId = state.nodes.find((n) => n.id === updatedMemo!.nodeId)?.projectId ?? '';
            return updatedMemo;
          }),
        }));
        if (updatedMemo && projectId) repo.updateMemo(updatedMemo, projectId).catch(reportSyncError);
      },

      addReply: (memoId, text, author) => {
        const reply: MemoReply = {
          id: createId(),
          memoId,
          text,
          author,
          createdAt: new Date().toISOString(),
        };
        let projectId = '';
        set((state) => {
          const memo = state.memos.find((m) => m.id === memoId);
          const node = memo ? state.nodes.find((n) => n.id === memo.nodeId) : undefined;
          projectId = node?.projectId ?? '';
          return { ...state, replies: [...state.replies, reply] };
        });
        if (projectId) repo.insertReply(reply, projectId).catch(reportSyncError);
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
        let batchSuppressed = false;
        return (pastState, replace) => {
          if (batchStartState === undefined) {
            batchStartState = pastState;
            batchSuppressed = suppressUndo;
          }
          if (suppressUndo) batchSuppressed = true;
          if (flushTimeout) clearTimeout(flushTimeout);
          flushTimeout = setTimeout(() => {
            if (!batchSuppressed) handleSet(batchStartState!, replace);
            batchStartState = undefined;
            batchSuppressed = false;
          }, 0);
        };
      },
    },
  ),
);

async function syncDiffToSupabase(before: ProjectState, after: ProjectState) {
  try {
    const projectsDiff = diffById(before.projects, after.projects);
    const nodesDiff = diffById(before.nodes, after.nodes);
    const edgesDiff = diffById(before.edges, after.edges);
    const memosDiff = diffById(before.memos, after.memos);
    const repliesDiff = diffById(before.replies, after.replies);

    const nodeProjectMap = new Map(after.nodes.map((n) => [n.id, n.projectId]));
    const memoProjectMap = new Map(
      after.memos.map((m) => [m.id, nodeProjectMap.get(m.nodeId) ?? '']),
    );

    await repo.upsertProjectsBulk(projectsDiff.upserted);
    await repo.upsertNodesBulk(nodesDiff.upserted);
    await Promise.all([
      repo.upsertEdgesBulk(edgesDiff.upserted),
      repo.upsertMemosBulk(memosDiff.upserted, nodeProjectMap),
    ]);
    await repo.upsertRepliesBulk(repliesDiff.upserted, memoProjectMap);

    await Promise.all([repo.deleteRepliesBulk(repliesDiff.deletedIds), repo.deleteMemosBulk(memosDiff.deletedIds)]);
    await repo.deleteEdgesBulk(edgesDiff.deletedIds);
    await repo.deleteNodesBulk(nodesDiff.deletedIds);
    await repo.deleteProjectsBulk(projectsDiff.deletedIds);
  } catch (err) {
    console.error(err);
    alert('되돌리기/다시실행 내용을 클라우드에 반영하지 못했습니다.');
  }
}

export function undoAndSync(): void {
  const before = useProjectStore.getState();
  useProjectStore.temporal.getState().undo();
  const after = useProjectStore.getState();
  void syncDiffToSupabase(before, after);
}

export function redoAndSync(): void {
  const before = useProjectStore.getState();
  useProjectStore.temporal.getState().redo();
  const after = useProjectStore.getState();
  void syncDiffToSupabase(before, after);
}
