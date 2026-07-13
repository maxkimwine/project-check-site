import { useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useProjectStore } from '../../state/projectStore';
import {
  addBranchChild,
  connectExistingNodes,
  deleteNodeReconnect,
  insertNodeInChain,
  layout,
} from '../../utils/graph';
import { nodeTypes } from './nodes/nodeTypes';
import type { CustomNodeData } from './nodes/CustomNode';
import { InsertEdge, type InsertEdgeData } from './edges/InsertEdge';
import { NodeDetailPanel } from '../panel/NodeDetailPanel';

const edgeTypes = { insert: InsertEdge };

interface FlowchartCanvasProps {
  projectId: string;
}

export function FlowchartCanvas({ projectId }: FlowchartCanvasProps) {
  const allNodes = useProjectStore((s) => s.nodes);
  const allEdges = useProjectStore((s) => s.edges);
  const memos = useProjectStore((s) => s.memos);
  const addNodes = useProjectStore((s) => s.addNodes);
  const addEdges = useProjectStore((s) => s.addEdges);
  const removeEdges = useProjectStore((s) => s.removeEdges);
  const removeNode = useProjectStore((s) => s.removeNode);

  const nodes = useMemo(
    () => allNodes.filter((n) => n.projectId === projectId),
    [allNodes, projectId],
  );
  const edges = useMemo(
    () => allEdges.filter((e) => e.projectId === projectId),
    [allEdges, projectId],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const positions = useMemo(() => layout(nodes, edges), [nodes, edges]);

  function memoStateFor(nodeId: string): 'none' | 'unresolved' | 'resolved' {
    const nodeMemos = memos.filter((m) => m.nodeId === nodeId);
    if (nodeMemos.length === 0) return 'none';
    return nodeMemos.some((m) => !m.resolved) ? 'unresolved' : 'resolved';
  }

  function handleBranch(nodeId: string) {
    const { newNode, newEdge } = addBranchChild(projectId, nodeId);
    addNodes([newNode]);
    addEdges([newEdge]);
  }

  function handleInsert(edgeId: string) {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const { newNode, newEdges, removedEdgeId } = insertNodeInChain(projectId, edge);
    removeEdges([removedEdgeId]);
    addNodes([newNode]);
    addEdges(newEdges);
  }

  function handleDeleteNode(nodeId: string) {
    const { removedEdgeIds, newEdges } = deleteNodeReconnect(projectId, nodeId, edges);
    removeEdges(removedEdgeIds);
    addEdges(newEdges);
    removeNode(nodeId);
    setSelectedNodeId(null);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const edge = connectExistingNodes(projectId, connection.source, connection.target);
    addEdges([edge]);
  }

  // Dragging the "+" handle: dropped on an existing node -> onConnect already created a
  // merge edge above. Dropped on empty canvas (invalid target) -> spawn a new branch node.
  function handleConnectEnd(_event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) {
    if (connectionState.isValid) return;
    const sourceId = connectionState.fromNode?.id;
    if (!sourceId) return;
    handleBranch(sourceId);
  }

  const rfNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    type: 'custom',
    position: positions[n.id] ?? n.position,
    selected: n.id === selectedNodeId,
    data: {
      title: n.title,
      kind: n.kind,
      memoState: memoStateFor(n.id),
      onBranch: handleBranch,
    } satisfies CustomNodeData,
    deletable: n.kind === 'task',
  }));

  const rfEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: 'insert',
    data: { onInsert: handleInsert } satisfies InsertEdgeData,
  }));

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        connectionRadius={40}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f3f46" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeId(null)}
          onDelete={
            selectedNode.kind === 'task' ? () => handleDeleteNode(selectedNode.id) : undefined
          }
        />
      )}
    </div>
  );
}
