import { supabase, clientId } from './supabaseClient';
import type { FlowEdge, FlowNode, Memo, MemoReply, NodeKind, Orientation, Project } from '../types/project';

interface ProjectRow {
  id: string;
  name: string;
  created_at: string;
  orientation: Orientation;
  client_id: string | null;
}

interface FlowNodeRow {
  id: string;
  project_id: string;
  kind: NodeKind;
  title: string;
  position: { x: number; y: number };
  created_at: string;
  completed: boolean;
  completed_at: string | null;
  client_id: string | null;
}

interface FlowEdgeRow {
  id: string;
  project_id: string;
  source: string;
  target: string;
  branch_side: 'left' | 'right' | null;
  client_id: string | null;
}

interface MemoRow {
  id: string;
  node_id: string;
  project_id: string;
  text: string;
  author: string | null;
  created_at: string;
  resolved: boolean;
  resolved_at: string | null;
  client_id: string | null;
}

interface MemoReplyRow {
  id: string;
  memo_id: string;
  project_id: string;
  text: string;
  author: string | null;
  created_at: string;
  client_id: string | null;
}

function projectFromRow(r: ProjectRow): Project {
  return { id: r.id, name: r.name, createdAt: r.created_at, orientation: r.orientation };
}
function projectToRow(p: Project): ProjectRow {
  return { id: p.id, name: p.name, created_at: p.createdAt, orientation: p.orientation, client_id: clientId };
}

function nodeFromRow(r: FlowNodeRow): FlowNode {
  return {
    id: r.id,
    projectId: r.project_id,
    kind: r.kind,
    title: r.title,
    position: r.position,
    createdAt: r.created_at,
    completed: r.completed,
    completedAt: r.completed_at,
  };
}
function nodeToRow(n: FlowNode): FlowNodeRow {
  return {
    id: n.id,
    project_id: n.projectId,
    kind: n.kind,
    title: n.title,
    position: n.position,
    created_at: n.createdAt,
    completed: n.completed,
    completed_at: n.completedAt,
    client_id: clientId,
  };
}

function edgeFromRow(r: FlowEdgeRow): FlowEdge {
  return {
    id: r.id,
    projectId: r.project_id,
    source: r.source,
    target: r.target,
    branchSide: r.branch_side ?? undefined,
  };
}
function edgeToRow(e: FlowEdge): FlowEdgeRow {
  return {
    id: e.id,
    project_id: e.projectId,
    source: e.source,
    target: e.target,
    branch_side: e.branchSide ?? null,
    client_id: clientId,
  };
}

function memoFromRow(r: MemoRow): Memo {
  return {
    id: r.id,
    nodeId: r.node_id,
    text: r.text,
    author: r.author ?? undefined,
    createdAt: r.created_at,
    resolved: r.resolved,
    resolvedAt: r.resolved_at,
  };
}
function memoToRow(m: Memo, projectId: string): MemoRow {
  return {
    id: m.id,
    node_id: m.nodeId,
    project_id: projectId,
    text: m.text,
    author: m.author ?? null,
    created_at: m.createdAt,
    resolved: m.resolved,
    resolved_at: m.resolvedAt,
    client_id: clientId,
  };
}

function replyFromRow(r: MemoReplyRow): MemoReply {
  return {
    id: r.id,
    memoId: r.memo_id,
    text: r.text,
    author: r.author ?? undefined,
    createdAt: r.created_at,
  };
}
function replyToRow(rep: MemoReply, projectId: string): MemoReplyRow {
  return {
    id: rep.id,
    memo_id: rep.memoId,
    project_id: projectId,
    text: rep.text,
    author: rep.author ?? null,
    created_at: rep.createdAt,
    client_id: clientId,
  };
}

export interface FetchedProjectData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];
}

export interface FetchedAllData extends FetchedProjectData {
  projects: Project[];
}

function throwIfError<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

export async function fetchAll(): Promise<FetchedAllData> {
  const [projects, nodes, edges, memos, replies] = await Promise.all([
    supabase.from('projects').select('*'),
    supabase.from('flow_nodes').select('*'),
    supabase.from('flow_edges').select('*'),
    supabase.from('memos').select('*'),
    supabase.from('memo_replies').select('*'),
  ]);
  return {
    projects: throwIfError<ProjectRow[]>(projects).map(projectFromRow),
    nodes: throwIfError<FlowNodeRow[]>(nodes).map(nodeFromRow),
    edges: throwIfError<FlowEdgeRow[]>(edges).map(edgeFromRow),
    memos: throwIfError<MemoRow[]>(memos).map(memoFromRow),
    replies: throwIfError<MemoReplyRow[]>(replies).map(replyFromRow),
  };
}

export async function fetchProjectData(projectId: string): Promise<FetchedProjectData> {
  const [nodes, edges, memos, replies] = await Promise.all([
    supabase.from('flow_nodes').select('*').eq('project_id', projectId),
    supabase.from('flow_edges').select('*').eq('project_id', projectId),
    supabase.from('memos').select('*').eq('project_id', projectId),
    supabase.from('memo_replies').select('*').eq('project_id', projectId),
  ]);
  return {
    nodes: throwIfError<FlowNodeRow[]>(nodes).map(nodeFromRow),
    edges: throwIfError<FlowEdgeRow[]>(edges).map(edgeFromRow),
    memos: throwIfError<MemoRow[]>(memos).map(memoFromRow),
    replies: throwIfError<MemoReplyRow[]>(replies).map(replyFromRow),
  };
}

// These all use upsert (not insert) even though callers only ever pass freshly-created rows:
// the row's id is client-generated, so if a write ever fires twice for the same object (a
// double-click before UI feedback, a resent request on a flaky connection, etc.) it must be a
// harmless no-op instead of a primary-key violation.

export async function insertProject(p: Project): Promise<void> {
  const { error } = await supabase.from('projects').upsert(projectToRow(p));
  if (error) throw new Error(error.message);
}

export async function insertNodes(nodes: FlowNode[]): Promise<void> {
  if (nodes.length === 0) return;
  const { error } = await supabase.from('flow_nodes').upsert(nodes.map(nodeToRow));
  if (error) throw new Error(error.message);
}

export async function insertEdges(edges: FlowEdge[]): Promise<void> {
  if (edges.length === 0) return;
  const { error } = await supabase.from('flow_edges').upsert(edges.map(edgeToRow));
  if (error) throw new Error(error.message);
}

export async function insertMemo(memo: Memo, projectId: string): Promise<void> {
  const { error } = await supabase.from('memos').upsert(memoToRow(memo, projectId));
  if (error) throw new Error(error.message);
}

export async function insertReply(reply: MemoReply, projectId: string): Promise<void> {
  const { error } = await supabase.from('memo_replies').upsert(replyToRow(reply, projectId));
  if (error) throw new Error(error.message);
}

export async function updateNode(node: FlowNode): Promise<void> {
  const { error } = await supabase.from('flow_nodes').update(nodeToRow(node)).eq('id', node.id);
  if (error) throw new Error(error.message);
}

export async function updateNodePositionsBulk(nodes: FlowNode[]): Promise<void> {
  if (nodes.length === 0) return;
  const { error } = await supabase.from('flow_nodes').upsert(nodes.map(nodeToRow));
  if (error) throw new Error(error.message);
}

export async function updateMemo(memo: Memo, projectId: string): Promise<void> {
  const { error } = await supabase.from('memos').update(memoToRow(memo, projectId)).eq('id', memo.id);
  if (error) throw new Error(error.message);
}

export async function deleteNode(nodeId: string): Promise<void> {
  const { error } = await supabase.from('flow_nodes').delete().eq('id', nodeId);
  if (error) throw new Error(error.message);
}

export async function deleteEdges(edgeIds: string[]): Promise<void> {
  if (edgeIds.length === 0) return;
  const { error } = await supabase.from('flow_edges').delete().in('id', edgeIds);
  if (error) throw new Error(error.message);
}

export async function deleteProjectCascade(projectId: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw new Error(error.message);
}

export async function insertProjectBundle(data: {
  project: Project;
  nodes: FlowNode[];
  edges: FlowEdge[];
  memos: Memo[];
  replies: MemoReply[];
}): Promise<void> {
  await insertProject(data.project);
  await insertNodes(data.nodes);
  await Promise.all([
    insertEdges(data.edges),
    ...data.memos.map((m) => insertMemo(m, data.project.id)),
  ]);
  await Promise.all(data.replies.map((r) => insertReply(r, data.project.id)));
}

// ---- Bulk upsert/delete helpers used to sync Ctrl+Z/Ctrl+Y (undo/redo) with Supabase ----

export async function upsertProjectsBulk(rows: Project[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('projects').upsert(rows.map(projectToRow));
  if (error) throw new Error(error.message);
}
export async function deleteProjectsBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('projects').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function upsertNodesBulk(rows: FlowNode[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('flow_nodes').upsert(rows.map(nodeToRow));
  if (error) throw new Error(error.message);
}
export async function deleteNodesBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('flow_nodes').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function upsertEdgesBulk(rows: FlowEdge[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('flow_edges').upsert(rows.map(edgeToRow));
  if (error) throw new Error(error.message);
}
export async function deleteEdgesBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('flow_edges').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function upsertMemosBulk(rows: Memo[], nodeProjectMap: Map<string, string>): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('memos')
    .upsert(rows.map((m) => memoToRow(m, nodeProjectMap.get(m.nodeId) ?? '')));
  if (error) throw new Error(error.message);
}
export async function deleteMemosBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('memos').delete().in('id', ids);
  if (error) throw new Error(error.message);
}

export async function upsertRepliesBulk(rows: MemoReply[], memoProjectMap: Map<string, string>): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase
    .from('memo_replies')
    .upsert(rows.map((r) => replyToRow(r, memoProjectMap.get(r.memoId) ?? '')));
  if (error) throw new Error(error.message);
}
export async function deleteRepliesBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from('memo_replies').delete().in('id', ids);
  if (error) throw new Error(error.message);
}
