import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type Node,
  type OnNodeDrag,
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
import type { FlowEdge, FlowNode } from '../../types/project';
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
  const updateNodePositions = useProjectStore((s) => s.updateNodePositions);

  const nodes = useMemo(
    () => allNodes.filter((n) => n.projectId === projectId),
    [allNodes, projectId],
  );
  const edges = useMemo(
    () => allEdges.filter((e) => e.projectId === projectId),
    [allEdges, projectId],
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  function memoStateFor(nodeId: string): 'none' | 'unresolved' | 'resolved' {
    const nodeMemos = memos.filter((m) => m.nodeId === nodeId);
    if (nodeMemos.length === 0) return 'none';
    return nodeMemos.some((m) => !m.resolved) ? 'unresolved' : 'resolved';
  }

  // Re-run auto layout after a structural change (nodes/edges added or removed),
  // so new elements get sensibly placed. Manual drags done afterwards are left alone
  // until the next structural change.
  function relayout(nextNodes: FlowNode[], nextEdges: FlowEdge[]) {
    updateNodePositions(layout(nextNodes, nextEdges));
  }

  function handleBranch(nodeId: string) {
    const { newNode, newEdge } = addBranchChild(projectId, nodeId);
    addNodes([newNode]);
    addEdges([newEdge]);
    relayout([...nodes, newNode], [...edges, newEdge]);
  }

  function handleInsert(edgeId: string) {
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const { newNode, newEdges, removedEdgeId } = insertNodeInChain(projectId, edge);
    removeEdges([removedEdgeId]);
    addNodes([newNode]);
    addEdges(newEdges);
    relayout(
      [...nodes, newNode],
      [...edges.filter((e) => e.id !== removedEdgeId), ...newEdges],
    );
  }

  function handleDeleteNode(nodeId: string) {
    const { removedEdgeIds, newEdges } = deleteNodeReconnect(projectId, nodeId, edges);
    removeEdges(removedEdgeIds);
    addEdges(newEdges);
    removeNode(nodeId);
    setSelectedNodeId(null);
    relayout(
      nodes.filter((n) => n.id !== nodeId),
      [...edges.filter((e) => !removedEdgeIds.includes(e.id)), ...newEdges],
    );
  }

  function handleDeleteEdge(edgeId: string) {
    removeEdges([edgeId]);
    setSelectedEdgeId(null);
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) return;
    const edge = connectExistingNodes(projectId, connection.source, connection.target);
    addEdges([edge]);
    relayout(nodes, [...edges, edge]);
  }

  // Dragging the "+" handle: dropped on an existing node -> onConnect already created a
  // merge edge above. Dropped on empty canvas (invalid target) -> spawn a new branch node.
  function handleConnectEnd(_event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) {
    if (connectionState.isValid) return;
    const sourceId = connectionState.fromNode?.id;
    if (!sourceId) return;
    handleBranch(sourceId);
  }

  const handleNodeDragStop: OnNodeDrag = (_event, node) => {
    updateNodePositions({ [node.id]: node.position });
  };

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Delete') return;
      if (!selectedEdgeId) return;
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;
      handleDeleteEdge(selectedEdgeId);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEdgeId]);

  // Positions are only ever written by relayout()/drag-stop, so data that predates
  // that (or was seeded without positions) can have every node stacked on top of
  // each other. Detect that once per project view and auto-arrange it.
  useEffect(() => {
    if (nodes.length < 2) return;
    const seen = new Set<string>();
    let hasOverlap = false;
    for (const n of nodes) {
      const key = `${n.position.x},${n.position.y}`;
      if (seen.has(key)) {
        hasOverlap = true;
        break;
      }
      seen.add(key);
    }
    if (hasOverlap) relayout(nodes, edges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const rfNodes: Node[] = nodes.map((n) => ({
    id: n.id,
    type: 'custom',
    position: n.position,
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
    selected: e.id === selectedEdgeId,
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
        onNodeClick={(_, node) => {
          setSelectedEdgeId(null);
          setSelectedNodeId(node.id);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedNodeId(null);
          setSelectedEdgeId(edge.id);
        }}
        onPaneClick={() => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }}
        onNodeDragStop={handleNodeDragStop}
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
