import React, { useState, useEffect, useRef } from 'react';
import {
  BoardElement,
  Point,
  DrawingStroke,
  StickyNote,
  TravelCard,
  Connector,
  BoardText,
} from './types';
import BoardTextComponent from './components/BoardTextComponent';
import StickyNoteComponent from './components/StickyNoteComponent';
import TravelCardComponent from './components/TravelCardComponent';
import ConnectorLines from './components/ConnectorLines';
import CollaborationPresence from './components/CollaborationPresence';
import FloatingToolbar from './components/FloatingToolbar';
import AICanvasOrganizer from './components/AICanvasOrganizer';

import useKeyboard from './hooks/useKeyboard';
import useCamera from './hooks/useCamera';
import useWebSocket from './hooks/useWebSocket';

import {
  Compass,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Minus,
  Plus,
  Maximize,
  Locate,
} from 'lucide-react';

const TRAVELER_ADJECTIVES = [
  'Joyful',
  'Wanderlust',
  'Dreamy',
  'Compass',
  'Backpack',
  'Nomad',
  'Explorer',
  'Aesthetic',
  'Cozy',
  'Sunny',
];
const TRAVELER_ANIMALS = [
  'Koala',
  'Otter',
  'Dolphin',
  'Parrot',
  'Bear',
  'Panda',
  'Seagull',
  'Deer',
  'Fox',
  'Squirrel',
];
const RANDOM_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
];

function generateProfile() {
  const adj = TRAVELER_ADJECTIVES[Math.floor(Math.random() * TRAVELER_ADJECTIVES.length)];
  const anim = TRAVELER_ANIMALS[Math.floor(Math.random() * TRAVELER_ANIMALS.length)];
  const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
  return {
    name: `${adj} ${anim}`,
    color: color,
  };
}

function pointsToSvgPath(points: Point[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

const AVAILABLE_ROOMS = [
  { id: 'main', label: '🌍 World Odyssey' },
  { id: 'tokyo', label: '🗼 Tokyo Escapade' },
  { id: 'paris', label: '🥐 Parisian Dream' },
  { id: 'hawaii', label: '🌴 Tropical Getaway' },
];

export default function App() {
  const [profile] = useState(() => generateProfile());
  const [userId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main';
  });

  // Custom Hooks managing shared states
  const isSpacePressed = useKeyboard();
  const {
    camera,
    setCamera,
    cameraRef,
    boardContainerRef,
    whiteboardSurfaceRef,
    isPanningRef,
    lastPointerRef,
    handlePushToNearestContents,
    resetCamera,
    zoomIn,
    zoomOut,
    isElementVisible,
    isStrokeVisible,
  } = useCamera();

  const {
    elements,
    setElements,
    collaborators,
    reactions,
    setReactions,
    sendSocketMessage,
  } = useWebSocket(roomId, userId, profile);

  // Interaction / Active tool tracking
  const [activeTool, setActiveTool] = useState<string>('select');
  const [activeColor, setActiveColor] = useState<string>('#f43f5e'); // Coral Pink
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [isNavExpanded, setIsNavExpanded] = useState(true);

  // Line Connector source card selection
  const [connectorSourceId, setConnectorSourceId] = useState<string | null>(null);

  // Active drag-connector state
  const [draggingConnector, setDraggingConnector] = useState<{
    fromId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Freehand drawing temporary state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStrokePoints, setCurrentStrokePoints] = useState<Point[]>([]);

  // History stack for Local Undos
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Toggle state for the AI Organizer panel
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);

  // Sync window URL with active Room selections
  const handleRoomSwap = (targetRoomId: string) => {
    setRoomId(targetRoomId);
    setElements({}); // Wipe temporary visual state
    setConnectorSourceId(null);
    setCurrentStrokePoints([]);

    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoomId);
    window.history.pushState({}, '', url.toString());
  };

  // Mouse / Drawing Stroke handlers
  const handleWhiteboardMouseDown = (e: React.MouseEvent) => {
    const board = whiteboardSurfaceRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / cameraRef.current.z);
    const y = Math.round((e.clientY - rect.top) / cameraRef.current.z);

    const targetElement = e.target as HTMLElement;
    const isBackground =
      targetElement.id === 'whiteboard-board-canvas' ||
      targetElement.id === 'whiteboard-scroll-area';

    if (
      isSpacePressed ||
      activeTool === 'pan' ||
      e.button === 1 ||
      e.shiftKey ||
      (isBackground && activeTool === 'select')
    ) {
      isPanningRef.current = true;
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      return;
    }

    if (activeTool === 'pen') {
      setIsDrawing(true);
      setCurrentStrokePoints([{ x, y }]);
      return;
    }

    if (activeTool === 'note') {
      const newNote: StickyNote = {
        id: 'note_' + Math.random().toString(36).substring(2, 9),
        type: 'note',
        x: x - 100,
        y: y - 100,
        width: 200,
        height: 180,
        text: '✏️ Double-click to write hotel plans, transport details or packing lists!',
        color: activeColor,
      };

      setElements((prev) => ({ ...prev, [newNote.id]: newNote }));
      setUndoStack((prev) => [...prev, newNote.id]);
      sendSocketMessage({ type: 'element:create', element: newNote });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'card') {
      const newCard: TravelCard = {
        id: 'card_' + Math.random().toString(36).substring(2, 9),
        type: 'card',
        x: x - 100,
        y: y - 70,
        name: 'New Attraction Point',
        day: 'Ideas',
      };

      setElements((prev) => ({ ...prev, [newCard.id]: newCard }));
      setUndoStack((prev) => [...prev, newCard.id]);
      sendSocketMessage({ type: 'element:create', element: newCard });
      setActiveTool('select');
      return;
    }

    if (activeTool === 'text') {
      const newText: BoardText = {
        id: 'text_' + Math.random().toString(36).substring(2, 9),
        type: 'text',
        x: x - 120,
        y: y - 25,
        width: 240,
        height: 60,
        text: '',
        alignment: 'left',
        isBulletPoints: false,
        isEditingInitially: true,
      };

      setElements((prev) => ({ ...prev, [newText.id]: newText }));
      setUndoStack((prev) => [...prev, newText.id]);
      sendSocketMessage({ type: 'element:create', element: newText });
      setActiveTool('select');
      return;
    }
  };

  const handleWhiteboardMouseMove = (e: React.MouseEvent) => {
    const board = whiteboardSurfaceRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / cameraRef.current.z);
    const y = Math.round((e.clientY - rect.top) / cameraRef.current.z);

    // Broadcast active pointer coordinates to multiplayer room peers
    sendSocketMessage({
      type: 'cursor:move',
      x,
      y,
      name: profile.name,
      color: profile.color,
      activeTool: activeTool !== 'select' ? activeTool : undefined,
    });

    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isDrawing && activeTool === 'pen') {
      setCurrentStrokePoints((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.abs(last.x - x) > 3 || Math.abs(last.y - y) > 3) {
          return [...prev, { x, y }];
        }
        return prev;
      });
    }
  };

  const handleStartConnectorDrag = (
    id: string,
    startX: number,
    startY: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setDraggingConnector({
      fromId: id,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      const board = whiteboardSurfaceRef.current;
      if (!board) return;

      const rect = board.getBoundingClientRect();
      const x = Math.round((moveEvent.clientX - rect.left) / cameraRef.current.z);
      const y = Math.round((moveEvent.clientY - rect.top) / cameraRef.current.z);

      setDraggingConnector((prev) =>
        prev
          ? {
              ...prev,
              currentX: x,
              currentY: y,
            }
          : null
      );
    };

    const handleWindowMouseUp = (upEvent: MouseEvent) => {
      const board = whiteboardSurfaceRef.current;
      if (board) {
        const rect = board.getBoundingClientRect();
        const x = Math.round((upEvent.clientX - rect.left) / cameraRef.current.z);
        const y = Math.round((upEvent.clientY - rect.top) / cameraRef.current.z);

        const targetElement = (Object.values(elements) as any[]).find((el) => {
          if (el.id === id) return false;
          if (el.type === 'card') {
            const w = 200;
            const h = 140;
            return x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h;
          }
          if (el.type === 'text') {
            const w = el.width || 240;
            const h = el.height || 60;
            return x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h;
          }
          if (el.type === 'note') {
            const w = el.width || 200;
            const h = el.height || 180;
            return x >= el.x && x <= el.x + w && y >= el.y && y <= el.y + h;
          }
          return false;
        });

        if (targetElement) {
          const newConnector: Connector = {
            id: 'connector_' + Math.random().toString(36).substring(2, 9),
            type: 'connector',
            fromCardId: id,
            toCardId: targetElement.id,
            color: '#8FA18C',
          };
          setElements((prev) => ({ ...prev, [newConnector.id]: newConnector }));
          setUndoStack((prev) => [...prev, newConnector.id]);
          sendSocketMessage({ type: 'element:create', element: newConnector });
        }
      }

      setDraggingConnector(null);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleWhiteboardMouseUp = () => {
    isPanningRef.current = false;

    if (isDrawing && activeTool === 'pen') {
      setIsDrawing(false);
      if (currentStrokePoints.length > 1) {
        const newStroke: DrawingStroke = {
          id: 'stroke_' + Math.random().toString(36).substring(2, 9),
          type: 'drawing',
          points: currentStrokePoints,
          color: activeColor,
          width: brushWidth,
        };

        setElements((prev) => ({ ...prev, [newStroke.id]: newStroke }));
        setUndoStack((prev) => [...prev, newStroke.id]);
        sendSocketMessage({ type: 'element:create', element: newStroke });
      }
      setCurrentStrokePoints([]);
    }
  };

  const handleWhiteboardDoubleClick = (e: React.MouseEvent) => {
    const targetElement = e.target as HTMLElement;
    if (
      targetElement.id !== 'whiteboard-board-canvas' &&
      targetElement.id !== 'whiteboard-scroll-area'
    ) {
      return;
    }

    const board = whiteboardSurfaceRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / cameraRef.current.z);
    const y = Math.round((e.clientY - rect.top) / cameraRef.current.z);

    const newText: BoardText = {
      id: 'text_' + Math.random().toString(36).substring(2, 9),
      type: 'text',
      x: x - 120,
      y: y - 30,
      width: 240,
      height: 60,
      text: '',
      alignment: 'center',
      isBulletPoints: false,
      isEditingInitially: true,
    };

    setElements((prev) => ({ ...prev, [newText.id]: newText }));
    setUndoStack((prev) => [...prev, newText.id]);
    sendSocketMessage({ type: 'element:create', element: newText });
    setActiveTool('select');
  };

  const handleEmojiClick = (emoji: string) => {
    if (!boardContainerRef.current || !whiteboardSurfaceRef.current) return;

    const container = boardContainerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const cx = (width / 2 - camera.x) / camera.z + (Math.random() * 160 - 80);
    const cy = (height / 2 - camera.y) / camera.z + (Math.random() * 160 - 80);

    sendSocketMessage({
      type: 'reaction:add',
      emoji,
      x: cx,
      y: cy,
    });

    const localId = 'reaction_local_' + Math.random().toString(36).substring(2, 9);
    setReactions((prev) => [
      ...prev,
      {
        id: localId,
        userId,
        emoji,
        x: cx,
        y: cy,
        createdAt: Date.now(),
      },
    ]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== localId));
    }, 1800);
  };

  const handleUpdateElement = (updatedElement: BoardElement) => {
    setElements((prev) => ({
      ...prev,
      [updatedElement.id]: updatedElement,
    }));
    sendSocketMessage({ type: 'element:update', element: updatedElement });
  };

  const handleDeleteElement = (id: string) => {
    setElements((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    sendSocketMessage({ type: 'element:delete', elementId: id });
  };

  const handleClearBoardComplete = () => {
    if (
      window.confirm('Are you sure you want to clean the WanderBoard completely for all participants?')
    ) {
      setElements({});
      setUndoStack([]);
      sendSocketMessage({ type: 'element:clear' });
    }
  };

  const handleLocalUndo = () => {
    if (undoStack.length === 0) return;
    const nextStack = [...undoStack];
    const lastId = nextStack.pop();
    if (lastId) {
      handleDeleteElement(lastId);
      setUndoStack(nextStack);
    }
  };

  const startDragObjectRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    objX: number;
    objY: number;
  } | null>(null);

  const handleElementDragStart = (id: string, e: React.MouseEvent) => {
    if (isSpacePressed || activeTool === 'pan') {
      isPanningRef.current = true;
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
      return;
    }
    e.stopPropagation();
    const element = elements[id];
    if (!element || element.type === 'drawing' || element.type === 'connector') return;

    startDragObjectRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      objX: element.x,
      objY: element.y,
    };

    let lastSentTime = 0;

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!startDragObjectRef.current) return;
      const drag = startDragObjectRef.current;
      const deltaX = (moveEvent.clientX - drag.startX) / cameraRef.current.z;
      const deltaY = (moveEvent.clientY - drag.startY) / cameraRef.current.z;

      const updatedX = Math.max(20, Math.min(3000, drag.objX + deltaX));
      const updatedY = Math.max(20, Math.min(2200, drag.objY + deltaY));

      let updatedElement: any = null;

      setElements((prev) => {
        const item = prev[drag.id];
        if (!item || item.type === 'drawing' || item.type === 'connector') return prev;
        updatedElement = {
          ...item,
          x: updatedX,
          y: updatedY,
        };
        return {
          ...prev,
          [drag.id]: updatedElement,
        };
      });

      const now = Date.now();
      if (now - lastSentTime > 30) {
        if (updatedElement) {
          sendSocketMessage({ type: 'element:update', element: updatedElement });
          lastSentTime = now;
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (startDragObjectRef.current) {
        const dragId = startDragObjectRef.current.id;
        setElements((prev) => {
          const finalItem = prev[dragId];
          if (finalItem) {
            sendSocketMessage({ type: 'element:update', element: finalItem });
          }
          return prev;
        });
        startDragObjectRef.current = null;
      }
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
  };

  const handleConfigureConnectorStart = (cardId: string) => {
    if (!connectorSourceId) {
      setConnectorSourceId(cardId);
    } else {
      if (connectorSourceId === cardId) {
        setConnectorSourceId(null);
        return;
      }

      const newConnector: Connector = {
        id: 'connector_' + Math.random().toString(36).substring(2, 9),
        type: 'connector',
        fromCardId: connectorSourceId,
        toCardId: cardId,
        color: activeColor,
      };

      setElements((prev) => ({ ...prev, [newConnector.id]: newConnector }));
      setUndoStack((prev) => [...prev, newConnector.id]);
      sendSocketMessage({ type: 'element:create', element: newConnector });

      setConnectorSourceId(null);
      setActiveTool('select');
    }
  };

  const handleAIExecuteOrganizeCall = async (userCommand: string) => {
    setAiProcessing(true);

    try {
      const boardElements = Object.values(elements) as BoardElement[];
      const activeTravelCards = boardElements.filter(
        (el) => el.type === 'card'
      ) as TravelCard[];

      const response = await fetch('/api/ai-organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: userCommand,
          currentCards: activeTravelCards,
          roomId: roomId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setElements((prev) => {
          const preservedElements = { ...prev };
          Object.keys(preservedElements).forEach((k) => {
            const el = preservedElements[k];
            if (el.type === 'card' || el.type === 'connector') {
              delete preservedElements[k];
            }
          });

          data.updatedCards.forEach((card: any) => {
            preservedElements[card.id] = { ...card, type: 'card' };
          });

          data.newConnectors.forEach((conn: any) => {
            preservedElements[conn.id] = { ...conn, type: 'connector' };
          });

          return preservedElements;
        });

        sendSocketMessage({
          type: 'sync',
          elements: {
            ...elements,
          },
        });

        setAiProcessing(false);
        return { success: true, aiResult: data.aiSummary };
      } else {
        setAiProcessing(false);
        return { success: false, error: data.error };
      }
    } catch (error: any) {
      console.error('Server sync AI organizer failed:', error);
      setAiProcessing(false);
      return {
        success: false,
        error: error.message || 'Server timeout or connection closed.',
      };
    }
  };

  const boardElementsList = Object.values(elements) as BoardElement[];
  const stickyNotes = boardElementsList.filter((el) => el.type === 'note') as StickyNote[];
  const travelCards = boardElementsList.filter((el) => el.type === 'card') as TravelCard[];
  const connectors = boardElementsList.filter((el) => el.type === 'connector') as Connector[];
  const drawingStrokes = boardElementsList.filter((el) => el.type === 'drawing') as DrawingStroke[];
  const textElements = boardElementsList.filter((el) => el.type === 'text') as BoardText[];

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-[#FAF8F5] select-none text-[#4A443F]">
      {/* Dynamic Top Navigation Header Bar */}
      <header className="w-full bg-[#FFFDFB]/60 backdrop-blur-md border-b border-[#E8E2D9] px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#8FA18C] rounded-xl flex items-center justify-center text-white shadow-md">
              <Compass className="w-5 h-5 animate-bounce-slow" />
            </div>
            <div>
              <h1
                className="font-display italic font-semibold text-[#4A443F] text-base leading-none"
                style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
              >
                WanderBoard
              </h1>
            </div>
          </div>

          {/* Room Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#FAF8F5] px-3 py-1.5 rounded-xl border border-[#E8E2D9]">
            <span className="text-[10px] font-mono text-[#8FA18C]/80 font-bold uppercase tracking-wider select-none">
              Room:
            </span>
            <select
              value={roomId}
              onChange={(e) => handleRoomSwap(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-[#4A443F] outline-none cursor-pointer pr-1"
            >
              {AVAILABLE_ROOMS.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Sync status and AI actions */}
        <div className="flex items-center gap-4">
          {/* Toggle AI Organizer Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer text-xs font-semibold ${
              isSidebarOpen
                ? 'bg-[#8FA18C]/15 border-[#8FA18C] text-[#3D4C3A] shadow-inner'
                : 'bg-white border-[#E8E2D9] text-[#4A443F] hover:bg-[#FAF8F5]'
            }`}
            title="Toggle AI Organizer Console"
          >
            <Sparkles
              className={`w-4 h-4 ${
                isSidebarOpen ? 'text-[#8FA18C] fill-[#8FA18C]/10 animate-pulse' : 'text-[#4A443F]/60'
              }`}
            />
            <span>AI Organizer</span>
          </button>

          {/* Traveler User Avatar Details */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: profile.color }} />
            <div className="flex flex-col text-left">
              <span className="text-[10.5px] font-bold text-[#4A443F] leading-none">
                {profile.name}
              </span>
              <span className="text-[8px] font-mono text-[#8FA18C] leading-none">
                Anonymous Traveler
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interactive Workspace Area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Collaboration heads, overlay reactions & multi-user cursors */}
        <CollaborationPresence
          collaborators={collaborators}
          reactions={reactions}
          onTriggerReaction={handleEmojiClick}
          userId={userId}
        />

        {/* Scrollable Whiteboard Masking Container */}
        <div
          id="whiteboard-scroll-area"
          ref={boardContainerRef}
          className="w-full h-full overflow-hidden relative touch-none whiteboard-grid bg-[#FAF8F5]"
          style={{
            cursor: isPanningRef.current
              ? 'grabbing'
              : isSpacePressed || activeTool === 'pan'
              ? 'grab'
              : activeTool === 'select'
              ? 'default'
              : activeTool === 'pen'
              ? 'crosshair'
              : 'default',
            backgroundPosition: `${camera.x}px ${camera.y}px`,
            backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
            backgroundImage: `radial-gradient(circle, var(--color-natural-border) ${
              1.2 * camera.z
            }px, transparent ${1.2 * camera.z}px)`,
          }}
          onMouseDown={handleWhiteboardMouseDown}
          onMouseMove={handleWhiteboardMouseMove}
          onMouseUp={handleWhiteboardMouseUp}
          onDoubleClick={handleWhiteboardDoubleClick}
        >
          {/* Inner Absolute Board canvas surface */}
          <div
            id="whiteboard-board-canvas"
            ref={whiteboardSurfaceRef}
            className="absolute"
            style={{
              transformOrigin: '0 0',
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
              willChange: isPanningRef.current ? 'transform' : 'auto',
            }}
          >
            {/* 1. SVG Layer for Freehand Brush Strokes */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
              {drawingStrokes.filter(isStrokeVisible).map((stroke) => (
                <path
                  key={stroke.id}
                  id={`svg-stroke-${stroke.id}`}
                  d={pointsToSvgPath(stroke.points)}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {isDrawing && currentStrokePoints.length > 0 && (
                <path
                  id="svg-active-stroke"
                  d={pointsToSvgPath(currentStrokePoints)}
                  stroke={activeColor}
                  strokeWidth={brushWidth}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {/* 2. SVG Route Connectors Overlay Layer */}
            <ConnectorLines
              connectors={connectors}
              elements={elements}
              onDeleteConnector={handleDeleteElement}
            />

            {draggingConnector && (
              <svg
                className="absolute inset-0 pointer-events-none w-full h-full z-20 overflow-visible"
                style={{
                  transform: `scale(${camera.z})`,
                  transformOrigin: '0 0',
                }}
              >
                <line
                  x1={draggingConnector.startX}
                  y1={draggingConnector.startY}
                  x2={draggingConnector.currentX}
                  y2={draggingConnector.currentY}
                  stroke="#8FA18C"
                  strokeWidth={3}
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                <circle
                  cx={draggingConnector.currentX}
                  cy={draggingConnector.currentY}
                  r={5}
                  fill="#8FA18C"
                />
              </svg>
            )}

            {/* 3. Render Draggable Sticky notes components */}
            {stickyNotes
              .filter((note) => isElementVisible(note.x, note.y, note.width || 200, note.height || 180))
              .map((note) => (
                <StickyNoteComponent
                  key={note.id}
                  note={note}
                  onDragStart={handleElementDragStart}
                  onUpdate={handleUpdateElement}
                  onDelete={handleDeleteElement}
                  scale={1}
                />
              ))}

            {/* 3.1. Render Draggable Canvas Text components */}
            {textElements
              .filter((t) => isElementVisible(t.x, t.y, t.width || 240, t.height || 60))
              .map((textElement) => (
                <BoardTextComponent
                  key={textElement.id}
                  textElement={textElement}
                  onDragStart={handleElementDragStart}
                  onUpdate={handleUpdateElement}
                  onDelete={handleDeleteElement}
                  activeTool={activeTool}
                  onStartConnectorDrag={handleStartConnectorDrag}
                />
              ))}

            {/* 4. Render Draggable Travel attraction Cards */}
            {travelCards
              .filter((card) => isElementVisible(card.x, card.y, 300, 320))
              .map((card) => (
                <TravelCardComponent
                  key={card.id}
                  card={card}
                  onDragStart={handleElementDragStart}
                  onUpdate={handleUpdateElement}
                  onDelete={handleDeleteElement}
                  onStartConnector={handleConfigureConnectorStart}
                  isConnectingSource={connectorSourceId === card.id}
                />
              ))}
          </div>
        </div>

        {/* Helper linking banner advice overlay */}
        {connectorSourceId && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#D48C70] text-white shadow-xl rounded-full px-5 py-2 z-20 flex items-center gap-3 animate-bounce border-2 border-[#FAF8F5]">
            <Sparkles className="w-4 h-4" />
            <span className="text-[12px] font-semibold">
              Route Connection Active! Click other destination card to draw arrow route.
            </span>
            <button
              onClick={() => setConnectorSourceId(null)}
              className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full bg-black/15 hover:bg-black/25 cursor-pointer ml-2"
              title="Cancel routing connection"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Floating Mode-Selection & Tool Toolbar */}
        <FloatingToolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          isSpacePressed={isSpacePressed}
          setConnectorSourceId={setConnectorSourceId}
          activeColor={activeColor}
          setActiveColor={setActiveColor}
          brushWidth={brushWidth}
          setBrushWidth={setBrushWidth}
          undoStackLength={undoStack.length}
          onUndo={handleLocalUndo}
          onClear={handleClearBoardComplete}
        />

        {/* AI Canvas Organizer Panel */}
        {isSidebarOpen && (
          <AICanvasOrganizer
            onExecuteCommand={handleAIExecuteOrganizeCall}
            isProcessing={aiProcessing}
          />
        )}

        {/* Floating Horizontal Collapsible Navigation Viewport Controls */}
        <div
          id="compact-navigation-viewport"
          className="absolute left-6 bottom-6 z-20 bg-[#FFFDFB]/95 backdrop-blur-md rounded-xl shadow-lg border border-[#E8E2D9] p-1.5 flex items-center gap-1.5 select-none transition-all duration-300"
        >
          {isNavExpanded ? (
            <div className="flex items-center gap-1.5">
              <button
                id="viewport-collapse-btn"
                onClick={() => setIsNavExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#4A443F]/60 hover:text-[#8FA18C] transition-all cursor-pointer"
                title="Collapse Controls"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <button
                id="zoom-out-btn"
                onClick={zoomOut}
                className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-[#4A443F] hover:bg-[#8FA18C]/15 hover:text-[#3D4C3A] active:scale-95 transition-all cursor-pointer"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10.5px] font-mono font-bold text-[#4A443F]/75 w-10 text-center">
                {Math.round(camera.z * 100)}%
              </span>

              <button
                id="zoom-in-btn"
                onClick={zoomIn}
                className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-[#4A443F] hover:bg-[#8FA18C]/15 hover:text-[#3D4C3A] active:scale-95 transition-all cursor-pointer"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-[#E8E2D9]" />

              <button
                id="zoom-reset-btn"
                onClick={resetCamera}
                className="flex items-center gap-1 text-[9.5px] font-sans font-bold leading-none tracking-wider text-[#4A443F] uppercase py-1 px-1.5 rounded-lg hover:bg-[#FAF8F5] border border-[#E8E2D9]/40 hover:text-[#8FA18C] cursor-pointer"
                title="Fit Canvas to Center"
              >
                <Maximize className="w-3 h-3 text-[#8FA18C]" />
                <span>Reset</span>
              </button>

              <div className="w-[1px] h-4 bg-[#E8E2D9]" />

              <button
                id="zoom-nearest-btn"
                onClick={() => handlePushToNearestContents(elements)}
                className="flex items-center gap-1 text-[9.5px] font-sans font-bold leading-none tracking-wider text-[#4A443F] uppercase py-1 px-1.5 rounded-lg hover:bg-[#FAF8F5] border border-[#E8E2D9]/40 hover:text-[#8FA18C] cursor-pointer"
                title="Focus View on Nearest Elements"
              >
                <Locate className="w-3 h-3 text-[#8FA18C]" />
                <span>Nearest</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                id="viewport-expand-btn"
                onClick={() => setIsNavExpanded(true)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#4A443F]/60 hover:text-[#8FA18C] transition-all cursor-pointer"
                title="Expand Controls"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <span className="text-[10.5px] font-mono font-bold text-[#4A443F]/75 px-1">
                {Math.round(camera.z * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
