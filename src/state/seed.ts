import type { FlowEdge, FlowNode, Project } from '../types/project';
import { createId } from '../utils/id';

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
  };
  const middleNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'task',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
  };
  const endNode: FlowNode = {
    id: createId(),
    projectId,
    kind: 'end',
    title: '',
    position: { x: 0, y: 0 },
    createdAt: now,
  };

  const edges: FlowEdge[] = [
    { id: createId(), projectId, source: startNode.id, target: middleNode.id },
    { id: createId(), projectId, source: middleNode.id, target: endNode.id },
  ];

  return {
    project: { id: projectId, name, createdAt: now },
    nodes: [startNode, middleNode, endNode],
    edges,
  };
}
