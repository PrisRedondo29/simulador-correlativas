import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import MateriaNode from './MateriaNode';
import { Button, ButtonGroup } from '@heroui/react';
import { ArrowRight, ArrowDown, ZoomIn, ZoomOut, Home, Maximize } from 'lucide-react';

/**
 * SemesterNode: Encabezados y separadores de cuatrimestre, más grandes y prominentes.
 */
const SemesterNode = ({ data }) => {
  const isHorizontal = data.direction === 'LR';

  if (data.variant === 'separator') {
    return (
      <div className="pointer-events-none select-none flex items-center justify-center">
        <div className={`border-primary/30 dark:border-primary/20 border-dashed ${isHorizontal ? 'border-l-2 h-[900px]' : 'border-t-2 w-[900px]'}`} />
      </div>
    );
  }

  return (
    <div className="pointer-events-none select-none">
      <div className="bg-primary text-white font-black px-6 py-3 rounded-2xl text-sm tracking-wider shadow-lg text-center uppercase min-w-[140px]">
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
 * getLayoutedElements: Organiza materias en grilla según dirección.
 */
const getLayoutedElements = (nodes, edges, direction = 'LR', projectionData = null) => {
  const isHorizontal = direction === 'LR';
  const { items, labels, maxCol } = projectionData || { items: {}, labels: {}, maxCol: 0 };

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

  // Espaciado generoso para las tarjetas (280px de ancho)
  const gapX = isHorizontal ? 340 : 320;
  const gapY = isHorizontal ? 170 : 200;

  const newNodes = [];
  const startCol = 1;
  const endCol = maxCol || Math.max(...Object.keys(materiasPorColumna).map(Number), 0);

  for (let col = startCol; col <= endCol; col++) {
    const colIdx = col - startCol;
    const label = labels?.[col] || `Cuatrimestre ${col}`;

    // Encabezado de cuatrimestre
    newNodes.push({
      id: `header-${col}`,
      type: 'semester',
      data: { label, direction, variant: 'header' },
      position: {
        x: isHorizontal ? colIdx * gapX + 40 : 60,
        y: isHorizontal ? -80 : colIdx * gapY - 70,
      },
      zIndex: -1,
      draggable: false,
    });

    // Separador
    if (colIdx > 0) {
      newNodes.push({
        id: `sep-${col}`,
        type: 'semester',
        data: { direction, variant: 'separator' },
        position: {
          x: isHorizontal ? (colIdx * gapX) - 20 : 60,
          y: isHorizontal ? -80 : (colIdx * gapY) - 100,
        },
        zIndex: -2,
        draggable: false,
      });
    }

    // Materias
    const nodesInCol = materiasPorColumna[col] || [];
    nodesInCol.forEach((node, nodeIdx) => {
      newNodes.push({
        ...node,
        targetPosition: isHorizontal ? 'left' : 'top',
        sourcePosition: isHorizontal ? 'right' : 'bottom',
        position: {
          x: isHorizontal ? colIdx * gapX : nodeIdx * gapX,
          y: isHorizontal ? (nodeIdx * gapY) : colIdx * gapY,
        },
        draggable: false,
      });
    });
  }

  return { nodes: newNodes, edges };
};

/**
 * FlowInner: Componente interno con la lógica de interacción del grafo.
 */
const FlowInner = ({ materias, progreso, onNodeClick, projection }) => {
  // Mobile First: modo Vertical en pantallas pequeñas
  const [direction, setDirection] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'TB';
    return 'LR';
  });

  const [hoveredNode, setHoveredNode] = useState(null);
  const { zoomIn: rfZoomIn, zoomOut: rfZoomOut, fitView, setViewport } = useReactFlow();

  const activeNodeId = hoveredNode;

  // Nodos iniciales
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

  // Edges
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

  // Calcular layout
  useEffect(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      initialNodes, initialEdges, direction, projection
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [initialNodes, initialEdges, direction, setNodes, setEdges, projection]);

  // CÁMARA: Focalizar en los primeros 2-3 cuatrimestres al cargar (legible, no microscópico)
  useEffect(() => {
    if (nodes.length === 0) return;
    const timer = setTimeout(() => {
      // Encontrar nodos de los primeros 3 cuatrimestres (o 2 en móvil)
      const maxInitialCols = direction === 'TB' ? 2 : 3;
      const focusNodes = nodes.filter(n => {
        if (n.type === 'semester') {
          const colNum = parseInt(n.id.replace('header-', '').replace('sep-', ''));
          return !isNaN(colNum) && colNum <= maxInitialCols;
        }
        if (n.data?.materia) {
          const m = n.data.materia;
          const col = (Number(m.anio) - 1) * 2 + (Number(m.cuatrimestre) % 2 === 0 ? 2 : 1);
          return col <= maxInitialCols;
        }
        return false;
      });

      if (focusNodes.length > 0) {
        fitView({ nodes: focusNodes, padding: 0.3, duration: 700, maxZoom: 0.85 });
      } else {
        fitView({ padding: 0.3, duration: 700, maxZoom: 0.85 });
      }
    }, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, nodes.length === 0]);

  // Home: Volver a los primeros cuatrimestres
  const handleGoHome = () => {
    const maxInitialCols = direction === 'TB' ? 2 : 3;
    const focusNodes = nodes.filter(n => {
      if (n.type === 'semester') {
        const colNum = parseInt(n.id.replace('header-', '').replace('sep-', ''));
        return !isNaN(colNum) && colNum <= maxInitialCols;
      }
      if (n.data?.materia) {
        const m = n.data.materia;
        const col = (Number(m.anio) - 1) * 2 + (Number(m.cuatrimestre) % 2 === 0 ? 2 : 1);
        return col <= maxInitialCols;
      }
      return false;
    });
    if (focusNodes.length > 0) {
      fitView({ nodes: focusNodes, padding: 0.3, duration: 700, maxZoom: 0.85 });
    } else {
      fitView({ padding: 0.3, duration: 700, maxZoom: 0.85 });
    }
  };

  // Fit all: Ver toda la malla (botón de "ver todo")
  const handleFitAll = () => {
    fitView({ padding: 0.1, duration: 700 });
  };

  const onNodeMouseEnter = useCallback((event, node) => setHoveredNode(node.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNode(null), []);

  /**
   * processedEdges: Arcos ocultos por defecto, se muestran SOLO al hacer hover/tap en un nodo.
   * Esto elimina la telaraña visual y deja la malla limpia.
   */
  const processedEdges = useMemo(() => {
    // Sin hover → no mostrar arcos (malla limpia)
    if (!activeNodeId) {
      return edges.map(e => ({
        ...e,
        style: { ...e.style, opacity: 0, strokeWidth: 0 },
        markerEnd: { ...e.markerEnd, color: 'transparent' },
      }));
    }

    // Con hover → mostrar solo las conexiones de la materia activa
    return edges.map(e => {
      const isRelated = e.source === activeNodeId || e.target === activeNodeId;
      if (isRelated) {
        return {
          ...e,
          type: 'straight',
          animated: true,
          style: { stroke: '#2563eb', strokeWidth: 3, opacity: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#2563eb', width: 16, height: 16 },
        };
      }
      // Edges no relacionados se atenúan
      return {
        ...e,
        style: { ...e.style, opacity: 0, strokeWidth: 0 },
        markerEnd: { ...e.markerEnd, color: 'transparent' },
      };
    });
  }, [edges, activeNodeId]);

  return (
    <div className="w-full h-full min-h-[600px] sm:min-h-[700px] relative overflow-hidden bg-slate-50/30 dark:bg-zinc-950/30 rounded-3xl">
      {/* Loading skeleton */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 z-20 bg-background/90 backdrop-blur-xs flex flex-col items-center justify-center p-8 gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-bold text-foreground/70">Cargando malla curricular...</span>
          </div>
        </div>
      )}

      {/* Controles flotantes */}
      <div className="absolute top-3 left-3 z-10 flex flex-col sm:flex-row gap-1.5">
        <ButtonGroup size="sm" variant="flat" className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-zinc-700 rounded-xl">
          <Button isIconOnly onPress={() => rfZoomIn()} title="Acercar" className="min-w-9 h-9"><ZoomIn size={16} /></Button>
          <Button isIconOnly onPress={() => rfZoomOut()} title="Alejar" className="min-w-9 h-9"><ZoomOut size={16} /></Button>
          <Button isIconOnly onPress={handleGoHome} title="Inicio" className="min-w-9 h-9"><Home size={16} /></Button>
          <Button isIconOnly onPress={handleFitAll} title="Ver toda la malla" className="min-w-9 h-9"><Maximize size={16} /></Button>
        </ButtonGroup>

        <ButtonGroup size="sm" variant="flat" className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md shadow-lg border border-slate-200/80 dark:border-zinc-700 rounded-xl">
          <Button
            isIconOnly
            color={direction === 'LR' ? 'primary' : 'default'}
            onPress={() => setDirection('LR')}
            title="Horizontal"
            className="min-w-9 h-9"
          >
            <ArrowRight size={16} />
          </Button>
          <Button
            isIconOnly
            color={direction === 'TB' ? 'primary' : 'default'}
            onPress={() => setDirection('TB')}
            title="Vertical"
            className="min-w-9 h-9"
          >
            <ArrowDown size={16} />
          </Button>
        </ButtonGroup>
      </div>

      {/* Hint flotante: Indicar que se puede hacer hover */}
      {!activeNodeId && nodes.length > 0 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md text-foreground/60 text-[11px] font-semibold px-3 py-1.5 rounded-full shadow-md border border-slate-200/60 dark:border-zinc-700 flex items-center gap-1.5">
            <i className="fa-solid fa-hand-pointer text-primary/70" />
            Tocá una materia para ver sus correlativas
          </div>
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


