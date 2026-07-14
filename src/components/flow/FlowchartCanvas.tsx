import { useEffect, useMemo, useRef, useState } from 'react';
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
  addParentNode,
  connectExistingNodes,
  deleteNodeReconnect,
  layout,
} from '../../utils/graph';
import { createId } from '../../utils/id';
import type { FlowEdge, FlowNode } from '../../types/project';
import { nodeTypes } from './nodes/nodeTypes';
import type { CustomNodeData } from './nodes/CustomNode';
import { CanvasEdge } from './edges/CanvasEdge';
import { NodeDetailPanel } from '../panel/NodeDetailPanel';

const edgeTypes = { canvas: CanvasEdge };
const GRID_SIZE = 40;

function handlesForEdge(edge: FlowEdge): { sourceHandle: string; targetHandle: string } {
  if (edge.branchSide === 'right') return { sourceHandle: 'right-source', targetHandle: 'left-target' };
  if (edge.branchSide === 'left') return { sourceHandle: 'left-source', targetHandle: 'right-target' };
  return { sourceHandle: 'bottom-source', targetHandle: 'top-target' };
}

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
  const toggleNodeCompleted = useProjectStore((s) => s.toggleNodeCompleted);

  const nodes = useMemo(
    () => allNodes.filter((n) => n.projectId === projectId),
    [allNodes, projectId],
  );
  const edges = useMemo(
    () => allEdges.filter((e) => e.projectId === projectId),
    [allEdges, projectId],
  );

  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // In-memory only (not the OS clipboard): scoped to this tab/session, cleared on reload.
  const clipboardRef = useRef<{ nodes: FlowNode[]; edges: FlowEdge[] } | null>(null);

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

  function handleBranch(nodeId: string, direction: 'bottom' | 'left' | 'right' = 'bottom') {
    const { newNode, newEdge } = addBranchChild(
      projectId,
      nodeId,
      direction === 'left' || direction === 'right' ? direction : undefined,
    );
    addNodes([newNode]);
    addEdges([newEdge]);
    relayout([...nodes, newNode], [...edges, newEdge]);
  }

  function handleAddParent(nodeId: string) {
    const { newNode, newEdge } = addParentNode(projectId, nodeId);
    addNodes([newNode]);
    addEdges([newEdge]);
    relayout([...nodes, newNode], [...edges, newEdge]);
  }

  function handleAddDirection(nodeId: string, direction: 'top' | 'bottom' | 'left' | 'right') {
    if (direction === 'top') {
      handleAddParent(nodeId);
    } else {
      handleBranch(nodeId, direction);
    }
  }

  function handleDeleteNode(nodeId: string) {
    const { removedEdgeIds, newEdges } = deleteNodeReconnect(projectId, nodeId, edges);
    removeEdges(removedEdgeIds);
    addEdges(newEdges);
    removeNode(nodeId);
    setSelectedNodeIds([]);
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

  function handleCopy() {
    const copyableIds = new Set(
      nodes.filter((n) => selectedNodeIds.includes(n.id) && n.kind === 'task').map((n) => n.id),
    );
    if (copyableIds.size === 0) return;
    const copiedNodes = nodes.filter((n) => copyableIds.has(n.id));
    const copiedEdges = edges.filter((e) => copyableIds.has(e.source) && copyableIds.has(e.target));
    clipboardRef.current = { nodes: copiedNodes, edges: copiedEdges };
  }

  function handlePaste() {
    const clip = clipboardRef.current;
    if (!clip || clip.nodes.length === 0) return;
    const now = new Date().toISOString();
    const idMap = new Map<string, string>();
    const newNodes: FlowNode[] = clip.nodes.map((n) => {
      const newId = createId();
      idMap.set(n.id, newId);
      return {
        id: newId,
        projectId,
        kind: n.kind,
        title: n.title,
        position: { x: 0, y: 0 },
        createdAt: now,
        completed: n.completed,
        completedAt: n.completedAt,
      };
    });
    const newEdges: FlowEdge[] = clip.edges.map((e) => ({
      id: createId(),
      projectId,
      source: idMap.get(e.source)!,
      target: idMap.get(e.target)!,
      branchSide: e.branchSide,
    }));
    addNodes(newNodes);
    addEdges(newEdges);
    relayout([...nodes, ...newNodes], [...edges, ...newEdges]);
    setSelectedNodeIds(newNodes.map((n) => n.id));
  }

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const isEditable =
        active instanceof HTMLElement &&
        (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
      if (isEditable) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'c' || e.key === 'C') handleCopy();
      if (e.key === 'v' || e.key === 'V') handlePaste();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, selectedNodeIds, projectId]);

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

  const rfNodes: Node[] = nodes.map((n) => {
    const incomingCount = edges.filter((e) => e.target === n.id).length;
    const outgoingCount = edges.filter((e) => e.source === n.id).length;
    const hasLeftTarget = edges.some((e) => e.target === n.id && e.branchSide === 'right');
    const hasRightTarget = edges.some((e) => e.target === n.id && e.branchSide === 'left');

    return {
      id: n.id,
      type: 'custom',
      position: n.position,
      selected: selectedNodeIds.includes(n.id),
      data: {
        title: n.title,
        kind: n.kind,
        completed: n.completed,
        memoState: memoStateFor(n.id),
        onAddDirection: handleAddDirection,
        onToggleCompleted: toggleNodeCompleted,
        canAddTop: n.kind !== 'start' && incomingCount === 0,
        canAddBottom: n.kind !== 'end' && outgoingCount === 0,
        canAddLeft:
          n.kind !== 'end' &&
          !hasLeftTarget &&
          !edges.some((e) => e.source === n.id && e.branchSide === 'left'),
        canAddRight:
          n.kind !== 'end' &&
          !hasRightTarget &&
          !edges.some((e) => e.source === n.id && e.branchSide === 'right'),
        hasLeftSource: edges.some((e) => e.source === n.id && e.branchSide === 'left'),
        hasRightSource: edges.some((e) => e.source === n.id && e.branchSide === 'right'),
        hasLeftTarget,
        hasRightTarget,
      } satisfies CustomNodeData,
      deletable: n.kind === 'task',
    };
  });

  const rfEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...handlesForEdge(e),
    type: 'canvas',
    selected: e.id === selectedEdgeId,
  }));

  const selectedNode =
    selectedNodeIds.length === 1
      ? (nodes.find((n) => n.id === selectedNodeIds[0]) ?? null)
      : null;

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        colorMode="dark"
        onNodeClick={(event, node) => {
          setSelectedEdgeId(null);
          if (event.shiftKey) {
            setSelectedNodeIds((prev) =>
              prev.includes(node.id) ? prev.filter((id) => id !== node.id) : [...prev, node.id],
            );
          } else {
            setSelectedNodeIds([node.id]);
          }
        }}
        onEdgeClick={(_, edge) => {
          setSelectedNodeIds([]);
          setSelectedEdgeId(edge.id);
        }}
        onPaneClick={() => {
          setSelectedNodeIds([]);
          setSelectedEdgeId(null);
        }}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onConnectEnd={handleConnectEnd}
        connectionRadius={40}
        snapToGrid
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#3f3f46" gap={GRID_SIZE} />
        <Controls showInteractive={false} />
      </ReactFlow>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNodeIds([])}
          onDelete={
            selectedNode.kind === 'task' ? () => handleDeleteNode(selectedNode.id) : undefined
          }
        />
      )}
    </div>
  );
}
