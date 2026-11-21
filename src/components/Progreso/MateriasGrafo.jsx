import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MateriaNode from './MateriaNode';
import { Button, ButtonGroup } from '@heroui/react';
import { ZoomIn, ZoomOut, Home } from 'lucide-react';

/**
 * SemesterNode: Encabezados y separadores de cuatrimestre con estado visual claro
 * (`current` = cuatrimestre siendo simulado, `past` = completado, `future` = proyectado, `neutral` = explorar).
 */
const SemesterNode = ({ data }) => {
  if (data.variant === 'separator') {
    return (
      <div className="pointer-events-none select-none flex items-center justify-center">
        <div
          className="border-primary/30 dark:border-primary/20 border-dashed border-l-2"
          style={{ height: `${data.height || 900}px` }}
        />
      </div>
    );
  }

  const status = data.status || 'neutral';

  if (status === 'current') {
    return (
      <div className="pointer-events-none select-none w-[255px] sm:w-[275px] flex justify-center">
        <div className="bg-[#005A36] dark:bg-[#2E8B63] text-white font-bold px-4 py-2 rounded-xl text-xs tracking-wide shadow-md ring-4 ring-[#005A36]/20 dark:ring-[#4A9D68]/30 inline-flex items-center justify-center gap-2 uppercase min-w-[170px]">
          <span className="w-2 h-2 rounded-full bg-[#86EFAC] animate-pulse shrink-0" aria-hidden="true" />
          <span>{data.label}</span>
          <span className="text-[10px] font-semibold normal-case px-1.5 py-0.5 rounded-md bg-white/20 text-white">
            Actual
          </span>
        </div>
      </div>
    );
  }

  if (status === 'past') {
    return (
      <div className="pointer-events-none select-none w-[255px] sm:w-[275px] flex justify-center">
        <div className="bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] font-semibold px-4 py-2 rounded-xl text-xs tracking-wide text-center uppercase min-w-[140px]">
          ✓ {data.label}
        </div>
      </div>
    );
  }

  if (status === 'future') {
    return (
      <div className="pointer-events-none select-none w-[255px] sm:w-[275px] flex justify-center">
        <div className="bg-white dark:bg-[#161D24] text-[#64748B] dark:text-[#94A3B8] border border-dashed border-[#CBD5E1] dark:border-[#2A3540] font-semibold px-4 py-2 rounded-xl text-xs tracking-wide text-center uppercase min-w-[140px]">
          {data.label}
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none select-none w-[255px] sm:w-[275px] flex justify-center">
      <div className="bg-[#F1F5F9] dark:bg-[#1E2730] text-[#334155] dark:text-[#E2E8F0] border border-[#E2E8F0] dark:border-[#2A3540] font-semibold px-4 py-2 rounded-xl text-xs tracking-wide text-center uppercase min-w-[140px]">
        {data.label}
      </div>
    </div>
  );
};

const nodeTypes = {
  materia: MateriaNode,
  semester: SemesterNode,
};

/**
 * getLayoutedElements: Organiza materias en grilla horizontal por cuatrimestre.
 */
const getLayoutedElements = (nodes, edges, projectionData = null, interactionMode = 'planificar') => {
  const { items, labels, maxCol } = projectionData || { items: {}, labels: {}, maxCol: 0 };

  let currentCol = projectionData?.currentCol ?? null;
  if (currentCol === null && projectionData && !('currentCol' in projectionData)) {
    for (const cod in items) {
      if (items[cod]?.estado === 'Presente') {
        currentCol = items[cod].columna;
        break;
      }
    }
  }

  const getHeaderStatus = (col) => {
    if (interactionMode === 'explorar') return 'neutral';
    if (currentCol === null) return 'past';
    if (col === currentCol) return 'current';
    if (col < currentCol) return 'past';
    return 'future';
  };

  const materiasPorColumna = {};
  nodes.forEach(node => {
    const m = node.data.materia;
    let col;
    if (node.data.columna) {
      col = node.data.columna;
    } else if (items && items[m.codigo]) {
      col = items[m.codigo].columna;
    } else {
      col = (Number(m.anio) - 1) * 2 + (Number(m.cuatrimestre) % 2 === 0 ? 2 : 1);
    }
    if (!materiasPorColumna[col]) materiasPorColumna[col] = [];
    materiasPorColumna[col].push(node);
  });

  const cardWidth = 275;
  const gapX = 345;
  const gapY = 170;
  const maxNodesInCol = Math.max(...Object.values(materiasPorColumna).map((arr) => arr.length), 5);
  const separatorHeight = Math.max(850, maxNodesInCol * gapY + 120);

  const newNodes = [];
  const startCol = 1;
  const endCol = maxCol || Math.max(...Object.keys(materiasPorColumna).map(Number), 0);

  for (let col = startCol; col <= endCol; col++) {
    const colIdx = col - startCol;
    const label = labels?.[col] || `Cuatrimestre ${col}`;

    newNodes.push({
      id: `header-${col}`,
      type: 'semester',
      data: { label, direction: 'LR', variant: 'header', status: getHeaderStatus(col) },
      position: { x: colIdx * gapX, y: -80 },
      zIndex: -1,
      draggable: false,
    });

    if (colIdx > 0) {
      newNodes.push({
        id: `sep-${col}`,
        type: 'semester',
        data: { direction: 'LR', variant: 'separator', height: separatorHeight },
        position: { x: colIdx * gapX - Math.round((gapX - cardWidth) / 2) - 1, y: -80 },
        zIndex: -2,
        draggable: false,
      });
    }

    const nodesInCol = materiasPorColumna[col] || [];
    nodesInCol.forEach((node, nodeIdx) => {
      newNodes.push({
        ...node,
        targetPosition: 'left',
        sourcePosition: 'right',
        position: { x: colIdx * gapX, y: nodeIdx * gapY },
        draggable: false,
      });
    });
  }

  return { nodes: newNodes, edges };
};

/**
 * FlowInner: Componente interno con la lógica de interacción del grafo.
 */
const FlowInner = ({
  materias,
  progreso,
  onNodeClick,
  projection,
  topRightContent,
  selectedNodeId = null,
  interactionMode = 'planificar',
  controlsPosition = 'top-left',
  topOverlayContent = null,
  bottomRightContent = null,
  rounded = true,
}) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const { zoomIn: rfZoomIn, zoomOut: rfZoomOut, fitView, setViewport } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const hasCenteredRef = React.useRef(false);

  const activeNodeId = selectedNodeId || hoveredNode;

  const initialNodes = useMemo(() => {
    const projItems = projection?.items || {};
    const skippedItems = projection?.skippedItems || [];

    const baseNodes = materias.map((m) => {
      const proj = projItems[m.codigo];
      const prog = progreso?.[m.codigo];
      let estadoFinal = 'Disponible';

      if (proj) {
        if (proj.estado === 'Presente') {
          estadoFinal = (prog === 'Cursado' || prog === 'Aprobado' || prog === 'Promocionado') ? 'Seleccionada' : 'Disponible';
        } else {
          estadoFinal = proj.estado;
        }
      } else {
        estadoFinal = prog || 'Disponible';
      }

      return {
        id: m.codigo,
        type: 'materia',
        data: { materia: m, estado: estadoFinal, onClick: onNodeClick },
        position: { x: 0, y: 0 },
      };
    });

    skippedItems.forEach((skip, idx) => {
      baseNodes.push({
        id: `skipped-${skip.codigo}-${skip.columna}-${idx}`,
        type: 'materia',
        data: { materia: skip.materia, estado: skip.estado, columna: skip.columna, onClick: null },
        position: { x: 0, y: 0 },
      });
    });

    return baseNodes;
  }, [materias, progreso, onNodeClick, projection]);

  const initialEdges = useMemo(() => {
    const edges = [];
    materias.forEach((m) => {
      if (m.correlativas && m.correlativas.length > 0) {
        m.correlativas.forEach((corrCodigo) => {
          if (materias.some(mat => mat.codigo === corrCodigo)) {
            edges.push({
              id: `e-${corrCodigo}-${m.codigo}`,
              source: corrCodigo,
              target: m.codigo,
              animated: false,
              style: { strokeWidth: 1.5, stroke: '#cbd5e1', opacity: 0.4 },
              markerEnd: { type: MarkerType.ArrowClosed, color: '#cbd5e1', width: 12, height: 12 },
            });
          }
        });
      }
    });
    return edges;
  }, [materias]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes, initialEdges, projection, interactionMode
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, projection, interactionMode]);

  const focusInitialColumns = useCallback(
    (maxCols = 3) => {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        setViewport({ x: 25, y: 40, zoom: 0.85 });
        return;
      }

      const focusNodes = nodes.filter((n) => {
        if (n.type === 'semester' && n.id.startsWith('header-')) {
          const colNum = parseInt(n.id.replace('header-', ''), 10);
          return !Number.isNaN(colNum) && colNum <= maxCols;
        }
        if (n.data?.materia) {
          const m = n.data.materia;
          const projCol = projection?.items?.[m.codigo]?.columna;
          const col = projCol || (Number(m.anio) - 1) * 2 + (Number(m.cuatrimestre) % 2 === 0 ? 2 : 1);
          return col <= maxCols;
        }
        return false;
      });

      if (focusNodes.length > 0) {
        fitView({
          nodes: focusNodes,
          padding: 0.18,
          duration: 450,
          minZoom: 0.65,
          maxZoom: 0.95,
        });
      } else {
        fitView({ padding: 0.18, duration: 450, minZoom: 0.65, maxZoom: 0.95 });
      }
    },
    [nodes, projection, fitView, setViewport],
  );

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0 || hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    focusInitialColumns(3);
  }, [nodesInitialized, nodes.length, focusInitialColumns]);

  const handleGoHome = () => {
    focusInitialColumns(3);
  };

  const onNodeMouseEnter = useCallback((event, node) => setHoveredNode(node.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

  const processedEdges = useMemo(() => {
    if (!activeNodeId) {
      return edges.map(e => ({
        ...e,
        style: { ...e.style, opacity: 0, strokeWidth: 0 },
        markerEnd: { ...e.markerEnd, color: 'transparent' },
      }));
    }

    return edges.map(e => {
      const isPrerequisite = e.target === activeNodeId;
      const isUnlockedByActive = e.source === activeNodeId;
      if (isPrerequisite || isUnlockedByActive) {
        const edgeColor = isPrerequisite ? '#D97706' : '#005A36';
        return {
          ...e,
          type: 'straight',
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 2.5, opacity: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor, width: 14, height: 14 },
        };
      }
      return {
        ...e,
        style: { ...e.style, opacity: 0, strokeWidth: 0 },
        markerEnd: { ...e.markerEnd, color: 'transparent' },
      };
    });
  }, [edges, activeNodeId]);

  const zoomControls = (
    <ButtonGroup size="sm" variant="flat" className="bg-white dark:bg-[#161D24] shadow-xs border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl">
      <Button isIconOnly onPress={() => rfZoomIn()} aria-label="Acercar" title="Acercar" className="min-w-8 h-8 sm:min-w-9 sm:h-9"><ZoomIn size={15} /></Button>
      <Button isIconOnly onPress={() => rfZoomOut()} aria-label="Alejar" title="Alejar" className="min-w-8 h-8 sm:min-w-9 sm:h-9"><ZoomOut size={15} /></Button>
      <Button isIconOnly onPress={handleGoHome} aria-label="Centrar inicio" title="Centrar inicio" className="min-w-8 h-8 sm:min-w-9 sm:h-9"><Home size={15} /></Button>
    </ButtonGroup>
  );

  return (
    <div className={`w-full h-full min-h-0 relative overflow-hidden bg-[#F8FAFC] dark:bg-[#0F1419] ${rounded ? 'rounded-2xl' : 'rounded-none'}`}>
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-8 gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-foreground/70">Cargando malla curricular...</span>
          </div>
        </div>
      )}

      {topOverlayContent ? (
        <div className="absolute top-3 left-3 right-3 z-20 pointer-events-none">
          {topOverlayContent}
        </div>
      ) : (
        <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
          {controlsPosition === 'top-left' && (
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {zoomControls}
            </div>
          )}

          {topRightContent && (
            <div className="flex items-center gap-1.5 pointer-events-auto ml-auto shrink-0">
              {topRightContent}
            </div>
          )}
        </div>
      )}

      {controlsPosition === 'bottom-left' && (
        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 pointer-events-auto">
          {zoomControls}
        </div>
      )}

      {bottomRightContent && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 pointer-events-auto">
          {bottomRightContent}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={processedEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        minZoom={0.15}
        maxZoom={1.5}
        nodesDraggable={false}
        elementsSelectable={false}
        nodesConnectable={false}
        selectionMode="none"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" variant="dots" gap={28} size={1.5} />
      </ReactFlow>
    </div>
  );
};

const MateriasGrafo = (props) => (
  <ReactFlowProvider>
    <FlowInner {...props} />
  </ReactFlowProvider>
);

export default MateriasGrafo;


