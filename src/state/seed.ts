import type { FlowEdge, FlowNode, Project } from '../types/project';
import { createId } from '../utils/id';
import { layout } from '../utils/graph';

export interface SeededProject {
  project: Project;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export function seedProject(name: string): SeededProject {
  const now = new Date().toISOString();
  const projectId = createId();

  const startNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'start',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };
  const middleNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'task',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };
  const endNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'end',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
    completed: false,
    completedAt: null,
  };

  const edges: FlowEdge[] = [
    { id: createId(), projectId, source: startNode.id, target: middleNode.id },
    { id: createId(), projectId, source: middleNode.id, target: endNode.id },
  ];

  const nodes = [startNode, middleNode, endNode];
  const positions = layout(nodes, edges);
  for (const node of nodes) {
    node.position = positions[node.id] ?? node.position;
  }

  return {
    project: { id: projectId, name, createdAt: now, orientation: 'vertical' },
    nodes,
    edges,
  };
}
