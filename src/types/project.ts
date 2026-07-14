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
  completed: boolean;
  completedAt: string | null;
}

export interface FlowEdge {
  id: string;
  projectId: string;
  source: string;
  target: string;
  // Which side of the source node's "+" button created this edge, so the
  // canvas can hide that specific button once it's been used. Undefined for
  // edges made via drag-connect, chain-insert, or the initial seed.
  branchSide?: 'left' | 'right';
}

export interface Memo {
  id: string;
  nodeId: string;
  text: string;
  author?: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt: string | null;
}

export interface MemoReply {
  id: string;
  memoId: string;
  text: string;
  author?: string;
  createdAt: string;
}
