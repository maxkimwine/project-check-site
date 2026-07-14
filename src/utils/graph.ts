import dagre from '@dagrejs/dagre';
import type { FlowEdge, FlowNode } from '../types/project';
import { createId } from './id';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 72;

export function layout(
  nodes: FlowNode[],
  edges: FlowEdge[],
): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
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
