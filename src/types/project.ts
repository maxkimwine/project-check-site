export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export type NodeKind = 'start' | 'task' | 'end';

export interface FlowNode {
  id: string;
  projectId: string;
  kind: NodeKind;
  title: string;
  position: { x: number; y: number };
  createdAt: string;
}

export interface FlowEdge {
  id: string;
  projectId: string;
  source: string;
  target: string;
}

export interface Memo {
  id: string;
  nodeId: string;
  text: string;
  author?: string;
  createdAt: string;
  resolved: boolean;
}

export interface MemoReply {
  id: string;
  memoId: string;
  text: string;
  author?: string;
  createdAt: string;
}
