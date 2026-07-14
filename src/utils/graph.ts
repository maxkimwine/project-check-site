import dagre from '@dagrejs/dagre';
import type { FlowEdge, FlowNode } from '../types/project';
import { createId } from './id';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 72;
const SIDE_GAP = 60;

export function layout(
  nodes: FlowNode[],
  edges: FlowEdge[],
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  // Left/right branches are placed beside their parent (below), not by rank, so
  // they're excluded from dagre's graph entirely -- otherwise dagre would treat a
  // side-branch as just another rank-below child and shift the parent's *normal*
  // children sideways to make room for it.
  const verticalEdges = edges.filter((e) => e.branchSide !== 'left' && e.branchSide !== 'right');
  const sideEdges = edges.filter((e) => e.branchSide === 'left' || e.branchSide === 'right');

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of verticalEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of nodes) {
    const pos = g.node(node.id);
    positions[node.id] = {
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT / 2,
    };
  }

  // Re-anchor each side-branch: pin its target beside the parent's final position,
  // then carry the target's whole (normally-connected) subtree along by the same
  // delta, so anything hanging below a side-branch keeps its shape relative to it.
  const childrenByParent = new Map<string, string[]>();
  for (const e of verticalEdges) {
    if (!childrenByParent.has(e.source)) childrenByParent.set(e.source, []);
    childrenByParent.get(e.source)!.push(e.target);
  }
  function collectSubtree(rootId: string, acc: Set<string>) {
    if (acc.has(rootId)) return;
    acc.add(rootId);
    for (const childId of childrenByParent.get(rootId) ?? []) collectSubtree(childId, acc);
  }

  // Multiple side-branches off the same parent, on the same side, are stacked
  // vertically below one another so they don't all land on the same spot.
  const sideGroups = new Map<string, FlowEdge[]>();
  for (const e of sideEdges) {
    const key = `${e.source}:${e.branchSide}`;
    if (!sideGroups.has(key)) sideGroups.set(key, []);
    sideGroups.get(key)!.push(e);
  }

  for (const group of sideGroups.values()) {
    group.forEach((edge, index) => {
      const parentPos = positions[edge.source];
      const targetPos = positions[edge.target];
      if (!parentPos || !targetPos) return;
      const anchored = {
        x: parentPos.x + (edge.branchSide === 'right' ? NODE_WIDTH + SIDE_GAP : -(NODE_WIDTH + SIDE_GAP)),
        y: parentPos.y + index * (NODE_HEIGHT + SIDE_GAP),
      };
      const dx = anchored.x - targetPos.x;
      const dy = anchored.y - targetPos.y;
      const subtree = new Set<string>();
      collectSubtree(edge.target, subtree);
      for (const id of subtree) {
        positions[id] = { x: positions[id].x + dx, y: positions[id].y + dy };
      }
    });
  }

  return positions;
}

/** Insert a new task node in the middle of an existing edge (A->B becomes A->new->B). */
export function insertNodeInChain(
  projectId: string,
  edge: FlowEdge,
): { newNode: FlowNode; newEdges: FlowEdge[]; removedEdgeId: string } {
  const now = new Date().toISOString();
  const newNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'task',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };
  const newEdges: FlowEdge[] = [
    { id: createId(), projectId, source: edge.source, target: newNode.id },
    { id: createId(), projectId, source: newNode.id, target: edge.target },
  ];
  return { newNode, newEdges, removedEdgeId: edge.id };
}

/** Create a brand-new sibling branch: a new unconnected task node linked from parentNodeId. */
export function addBranchChild(
  projectId: string,
  parentNodeId: string,
  branchSide?: 'left' | 'right',
): { newNode: FlowNode; newEdge: FlowEdge } {
  const now = new Date().toISOString();
  const newNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'task',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };
  const newEdge: FlowEdge = {
    id: createId(),
    projectId,
    source: parentNodeId,
    target: newNode.id,
    branchSide,
  };
  return { newNode, newEdge };
}

/** Create a new preceding node: a new unconnected task node linked into childNodeId. */
export function addParentNode(
  projectId: string,
  childNodeId: string,
): { newNode: FlowNode; newEdge: FlowEdge } {
  const now = new Date().toISOString();
  const newNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'task',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };
  const newEdge: FlowEdge = {
    id: createId(),
    projectId,
    source: newNode.id,
    target: childNodeId,
  };
  return { newNode, newEdge };
}

/** Manually connect two existing nodes (used for merge: dragging a handle onto another node). */
export function connectExistingNodes(
  projectId: string,
  sourceId: string,
  targetId: string,
): FlowEdge {
  return { id: createId(), projectId, source: sourceId, target: targetId };
}

/**
 * Delete a node and reconnect its graph neighborhood: every parent gets a new edge
 * to every child, so the flow stays continuous whether the node was a simple link,
 * a branch point, or a merge point.
 */
export function deleteNodeReconnect(
  projectId: string,
  nodeId: string,
  edges: FlowEdge[],
): { removedEdgeIds: string[]; newEdges: FlowEdge[] } {
  const incoming = edges.filter((e) => e.target === nodeId);
  const outgoing = edges.filter((e) => e.source === nodeId);
  const removedEdgeIds = [...incoming, ...outgoing].map((e) => e.id);

  const newEdges: FlowEdge[] = [];
  for (const inEdge of incoming) {
    for (const outEdge of outgoing) {
      newEdges.push(connectExistingNodes(projectId, inEdge.source, outEdge.target));
    }
  }

  return { removedEdgeIds, newEdges };
}
