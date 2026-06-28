import React, { useState, useEffect, useRef } from 'react';
import { BoardElement, Point, DrawingStroke, StickyNote, TravelCard, Connector, Collaborator, EmojiReaction, BoardText } from './types';
import BoardTextComponent from './components/BoardTextComponent';
import StickyNoteComponent from './components/StickyNoteComponent';
import TravelCardComponent from './components/TravelCardComponent';
import ConnectorLines from './components/ConnectorLines';
import CollaborationPresence from './components/CollaborationPresence';
import { Compass, Sparkles, AlertCircle, Share2, Info, Plus, ChevronRight, ChevronLeft, Map, Calendar, List, Minus, Maximize, Locate, Hand, MousePointer, Pen, StickyNote as StickyNoteIcon, Type, MapPin, ArrowRight, Trash2, RotateCcw } from 'lucide-react';

const TRAVELER_ADJECTIVES = ['Joyful', 'Wanderlust', 'Dreamy', 'Compass', 'Backpack', 'Nomad', 'Explorer', 'Aesthetic', 'Cozy', 'Sunny'];
const TRAVELER_ANIMALS = ['Koala', 'Otter', 'Dolphin', 'Parrot', 'Bear', 'Panda', 'Seagull', 'Deer', 'Fox', 'Squirrel'];
const RANDOM_COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];

// Safe generator for custom temporary traveler usernames
function generateProfile() {
  const adj = TRAVELER_ADJECTIVES[Math.floor(Math.random() * TRAVELER_ADJECTIVES.length)];
  const anim = TRAVELER_ANIMALS[Math.floor(Math.random() * TRAVELER_ANIMALS.length)];
  const color = RANDOM_COLORS[Math.floor(Math.random() * RANDOM_COLORS.length)];
  return {
    name: `${adj} ${anim}`,
    color: color
  };
}

// Convert points stack array into robust SVG vector line
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
  { id: 'hawaii', label: '🌴 Tropical Getaway' }
];

export default function App() {
  const [profile] = useState(() => generateProfile());
  const [userId] = useState(() => Math.random().toString(36).substring(2, 9));
  const [roomId, setRoomId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || 'main';
  });

  // Whiteboard Board States
  const [elements, setElements] = useState<{ [id: string]: BoardElement }>({});
  const [collaborators, setCollaborators] = useState<{ [id: string]: Collaborator }>({});
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  
  // Interaction/Active tool tracking
  const [activeTool, setActiveTool] = useState<string>('select');
  const [activeColor, setActiveColor] = useState<string>('#f43f5e'); // Defaults to Coral Pink
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(true);

  // Keyboard spacebar listener for panning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          e.preventDefault();
        }
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

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

  // Camera State: x, y (pan offset), z (zoom level) - default zoom 90%
  const [camera, setCamera] = useState({ x: -640, y: -480, z: 0.9 });
  const cameraRef = useRef(camera);
  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const boardContainerRef = useRef<HTMLDivElement>(null);

  // Set default initial camera centering at 90% on mount
  useEffect(() => {
    if (boardContainerRef.current) {
      const w = boardContainerRef.current.clientWidth;
      const h = boardContainerRef.current.clientHeight;
      setCamera({
        x: Math.round(w / 2 - 1600 * 0.9),
        y: Math.round(h / 2 - 1200 * 0.9),
        z: 0.9
      });
    }
  }, []);
  const whiteboardSurfaceRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // WebSockets Connection & Replay Logs
  const socketRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);

  // History stack for Local Undos
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // Collapsible itinerary sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 1. Establish WebSocket Connection
  useEffect(() => {
    // Determine WS protocol and construct URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}?roomId=${roomId}&userId=${userId}`;

    console.log(`Connecting to WebSocket at: ${socketUrl}`);
    const socket = new WebSocket(socketUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Successfully connected to WanderBoard Server!');
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'sync':
            // Receive whole elements pool on jointure
            setElements(data.elements || {});
            break;

          case 'element:create':
          case 'element:update':
            if (data.element) {
              setElements((prev) => ({
                ...prev,
                [data.element.id]: data.element
              }));
            }
            break;

          case 'element:delete':
            if (data.elementId) {
              setElements((prev) => {
                const copy = { ...prev };
                delete copy[data.elementId];
                return copy;
              });
            }
            break;

          case 'element:clear':
            setElements({});
            break;

          case 'cursor:move':
            setCollaborators((prev) => ({
              ...prev,
              [data.userId]: {
                id: data.userId,
                name: data.name,
                color: data.color,
                x: data.x,
                y: data.y,
                activeTool: data.activeTool,
                lastActive: Date.now()
              }
            }));
            break;

          case 'user:leave':
            setCollaborators((prev) => {
              const copy = { ...prev };
              delete copy[data.userId];
              return copy;
            });
            break;

          case 'reaction:add':
            const newReaction: EmojiReaction = {
              id: data.id,
              userId: data.userId,
              emoji: data.emoji,
              x: data.x,
              y: data.y,
              createdAt: Date.now()
            };
            setReactions((prev) => [...prev, newReaction]);
            // Purge reaction from float list after animations complete
            setTimeout(() => {
              setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
            }, 1800);
            break;

          default:
            break;
        }
      } catch (e) {
        console.error('Error handling sync socket packet:', e);
      }
    };

    socket.onclose = () => {
      console.warn('WanderBoard Server connection lost. Operating in local mode.');
      setWsConnected(false);
    };

    // Auto-clean on URL Room swap
    return () => {
      socket.close();
    };
  }, [roomId, userId]);

  // Non-passive wheel event listener for trackpad pinch-to-zoom and two-finger pans
  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      // Prevent browser default zoom & swipe gestures
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom logic
        const zoomSensitivity = 0.008;
        const zoomDelta = -e.deltaY * zoomSensitivity;
        
        setCamera((prev) => {
          const newZ = Math.min(Math.max(prev.z + zoomDelta, 0.2), 3); // zoom bounds: 20% to 300%
          
          const rect = container.getBoundingClientRect();
          const clientX = e.clientX - rect.left;
          const clientY = e.clientY - rect.top;
          
          const zoomRatio = newZ / prev.z;
          const newX = clientX - (clientX - prev.x) * zoomRatio;
          const newY = clientY - (clientY - prev.y) * zoomRatio;

          return { x: newX, y: newY, z: newZ };
        });
      } else {
        // Trackpad / Scrollwheel pan logic
        setCamera((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

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

  // Helper: send live events safely to WebSocket server
  const sendSocketMessage = (payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  // 2. Mouse / Drawing Stroke handlers
  const handleWhiteboardMouseDown = (e: React.MouseEvent) => {
    const board = whiteboardSurfaceRef.current;
    if (!board) return;

    // Calculate current absolute position inside virtual 3200px board keeping zoom scale in account
    const rect = board.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / cameraRef.current.z);
    const y = Math.round((e.clientY - rect.top) / cameraRef.current.z);

    // Target checks: If they clicked on background or is in selection mode, let them pan
    const targetElement = e.target as HTMLElement;
    const isBackground = targetElement.id === 'whiteboard-board-canvas' || targetElement.id === 'whiteboard-scroll-area';

    if (isSpacePressed || activeTool === 'pan' || e.button === 1 || e.shiftKey || (isBackground && activeTool === 'select')) {
      isPanningRef.current = true;
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY
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
        x: x - 100, // half of width
        y: y - 100, // half of height
        width: 200,
        height: 180,
        text: '✏️ Double-click to write hotel plans, transport details or packing lists!',
        color: activeColor
      };

      setElements((prev) => ({ ...prev, [newNote.id]: newNote }));
      setUndoStack((prev) => [...prev, newNote.id]);
      sendSocketMessage({ type: 'element:create', element: newNote });

      // Automatically reset to selection pointer tool for beginner friendliness
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
        day: 'Ideas'
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
        text: '', // Blank text to prompt them to type
        alignment: 'left',
        isBulletPoints: false,
        isEditingInitially: true
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

    // Broadcast our active user pointer coordinates to other connected friends!
    sendSocketMessage({
      type: 'cursor:move',
      x,
      y,
      name: profile.name,
      color: profile.color,
      activeTool: activeTool !== 'select' ? activeTool : undefined
    });

    // Process panning adjustments
    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      setCamera((prev) => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // Process freehand brush stroke points appending
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

  const handleStartConnectorDrag = (id: string, startX: number, startY: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setDraggingConnector({
      fromId: id,
      startX,
      startY,
      currentX: startX,
      currentY: startY
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
              currentY: y
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
            color: '#8FA18C'
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

  const handleWhiteboardMouseUp = (e: React.MouseEvent) => {
    isPanningRef.current = false;

    if (isDrawing && activeTool === 'pen') {
      setIsDrawing(false);
      if (currentStrokePoints.length > 1) {
        const newStroke: DrawingStroke = {
          id: 'stroke_' + Math.random().toString(36).substring(2, 9),
          type: 'drawing',
          points: currentStrokePoints,
          color: activeColor,
          width: brushWidth
        };

        setElements((prev) => ({ ...prev, [newStroke.id]: newStroke }));
        setUndoStack((prev) => [...prev, newStroke.id]);
        sendSocketMessage({ type: 'element:create', element: newStroke });
      }
      setCurrentStrokePoints([]);
    }
  };

  // New Double-Click handler: double-clicking anywhere makes a beautiful fresh text elements to start typing
  const handleWhiteboardDoubleClick = (e: React.MouseEvent) => {
    // Only trigger if we are clicking directly on the board canvas base surface (or children that are NOT cards/notes/etc)
    const targetElement = e.target as HTMLElement;
    if (targetElement.id !== 'whiteboard-board-canvas' && targetElement.id !== 'whiteboard-scroll-area') {
      return;
    }

    const board = whiteboardSurfaceRef.current;
    if (!board) return;

    const rect = board.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / cameraRef.current.z);
    const y = Math.round((e.clientY - rect.top) / cameraRef.current.z);

    // Create a new empty floating text right there!
    const newText: BoardText = {
      id: 'text_' + Math.random().toString(36).substring(2, 9),
      type: 'text',
      x: x - 120, // centered
      y: y - 30,
      width: 240,
      height: 60,
      text: '', // Start blank
      alignment: 'center', // Center aligned is ideal for floating board headers!
      isBulletPoints: false,
      isEditingInitially: true // Trigger auto-focus editing
    };

    setElements((prev) => ({ ...prev, [newText.id]: newText }));
    setUndoStack((prev) => [...prev, newText.id]);
    sendSocketMessage({ type: 'element:create', element: newText });

    setActiveTool('select');
  };

  // Handler to center the viewport on the nearest contents on the canvas
  const handlePushToNearestContents = () => {
    // Collect all element coordinates
    const coords: Point[] = [];
    (Object.values(elements) as BoardElement[]).forEach((elem) => {
      if (elem.type === 'note' || elem.type === 'card' || elem.type === 'text') {
        coords.push({ x: elem.x, y: elem.y });
      } else if (elem.type === 'drawing' && elem.points && elem.points.length > 0) {
        coords.push({ x: elem.points[0].x, y: elem.points[0].y });
      }
    });

    const viewportWidth = boardContainerRef.current?.clientWidth || window.innerWidth || 1200;
    const viewportHeight = boardContainerRef.current?.clientHeight || window.innerHeight || 800;
    const targetZoom = 0.9; // Default zoom of 90% space

    // If there is no content, reset to default canvas center
    if (coords.length === 0) {
      setCamera({
        x: Math.round(viewportWidth / 2 - 1600 * targetZoom),
        y: Math.round(viewportHeight / 2 - 1200 * targetZoom),
        z: targetZoom
      });
      return;
    }

    // Solve for "nearest contents relative to current screen viewpoint":
    const viewportCenterX = (viewportWidth / 2 - camera.x) / camera.z;
    const viewportCenterY = (viewportHeight / 2 - camera.y) / camera.z;

    let nearestNode = coords[0];
    let minDistance = Infinity;

    coords.forEach((point) => {
      const dx = point.x - viewportCenterX;
      const dy = point.y - viewportCenterY;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        nearestNode = point;
      }
    });

    // Center viewport on the nearest element at 90%
    const newCameraX = viewportWidth / 2 - nearestNode.x * targetZoom;
    const newCameraY = viewportHeight / 2 - nearestNode.y * targetZoom;

    setCamera({
      x: Math.round(newCameraX),
      y: Math.round(newCameraY),
      z: targetZoom
    });
  };

  // 3. Collaborative Emoji trigger callback
  const handleEmojiClick = (emoji: string) => {
    if (!boardContainerRef.current || !whiteboardSurfaceRef.current) return;
    
    // Convert middle of the viewport container straight into logical coordinates
    const container = boardContainerRef.current;
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const cx = ((width / 2) - camera.x) / camera.z + (Math.random() * 160 - 80);
    const cy = ((height / 2) - camera.y) / camera.z + (Math.random() * 160 - 80);

    sendSocketMessage({
      type: 'reaction:add',
      emoji,
      x: cx,
      y: cy
    });

    // Self-render locally optimistically
    const localId = 'reaction_local_' + Math.random().toString(36).substring(2, 9);
    setReactions((prev) => [
      ...prev,
      {
        id: localId,
        userId,
        emoji,
        x: cx,
        y: cy,
        createdAt: Date.now()
      }
    ]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== localId));
    }, 1800);
  };

  // 4. Object CRUD actions
  const handleUpdateElement = (updatedElement: BoardElement) => {
    setElements((prev) => ({
      ...prev,
      [updatedElement.id]: updatedElement
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
    if (window.confirm('Are you sure you want to clean the WanderBoard completely for all participants?')) {
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

  // 5. Drag Object Handler engine
  const startDragObjectRef = useRef<{ id: string; startX: number; startY: number; objX: number; objY: number } | null>(null);

  const handleElementDragStart = (id: string, e: React.MouseEvent) => {
    if (isSpacePressed || activeTool === 'pan') {
      isPanningRef.current = true;
      lastPointerRef.current = {
        x: e.clientX,
        y: e.clientY
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
      objY: element.y
    };

    let lastSentTime = 0;

    const handleWindowMouseMove = (moveEvent: MouseEvent) => {
      if (!startDragObjectRef.current) return;
      const drag = startDragObjectRef.current;
      const deltaX = (moveEvent.clientX - drag.startX) / cameraRef.current.z;
      const deltaY = (moveEvent.clientY - drag.startY) / cameraRef.current.z;

      // Ensure elements don't get dragged completely off canvas limits
      const updatedX = Math.max(20, Math.min(3000, drag.objX + deltaX));
      const updatedY = Math.max(20, Math.min(2200, drag.objY + deltaY));

      let updatedElement: any = null;

      setElements((prev) => {
        const item = prev[drag.id];
        if (!item || item.type === 'drawing' || item.type === 'connector') return prev;
        updatedElement = {
          ...item,
          x: updatedX,
          y: updatedY
        };
        return {
          ...prev,
          [drag.id]: updatedElement
        };
      });

      // Real-time synchronization broadcast to multiplayer room peers
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
        // Always execute inside setElements to read the absolute latest state (resolving the stale closure issue)
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

  // 6. Manual Connector drawing
  const handleConfigureConnectorStart = (cardId: string) => {
    if (!connectorSourceId) {
      // First click: select start card
      setConnectorSourceId(cardId);
    } else {
      // Second click: If clicked on same card, cancel connection
      if (connectorSourceId === cardId) {
        setConnectorSourceId(null);
        return;
      }

      // Draw connection line
      const newConnector: Connector = {
        id: 'connector_' + Math.random().toString(36).substring(2, 9),
        type: 'connector',
        fromCardId: connectorSourceId,
        toCardId: cardId,
        color: activeColor
      };

      setElements((prev) => ({ ...prev, [newConnector.id]: newConnector }));
      setUndoStack((prev) => [...prev, newConnector.id]);
      sendSocketMessage({ type: 'element:create', element: newConnector });

      // Clean up pointer
      setConnectorSourceId(null);
      setActiveTool('select');
    }
  };

  // 7. Execute AI Self-Organizer Command
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
          roomId: roomId
        })
      });

      const data = await response.json();

      if (data.success) {
        // Redraw whole list of elements to match new visual layout
        // Keep non-card/non-connector items (freehand strokes or informational stickies) intact!
        setElements((prev) => {
          const preservedElements = { ...prev };
          Object.keys(preservedElements).forEach((k) => {
            const el = preservedElements[k];
            if (el.type === 'card' || el.type === 'connector') {
              delete preservedElements[k];
            }
          });

          // Unpack new cards
          data.updatedCards.forEach((card: any) => {
            preservedElements[card.id] = { ...card, type: 'card' };
          });

          // Unpack new routing lines
          data.newConnectors.forEach((conn: any) => {
            preservedElements[conn.id] = { ...conn, type: 'connector' };
          });

          return preservedElements;
        });

        // Broadcast current final layout so other attendees in-room receive update
        sendSocketMessage({
          type: 'sync',
          elements: {
            ...elements, // current state placeholder
          }
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
      return { success: false, error: error.message || 'Server timeout or connection closed.' };
    }
  };

  // Extract separated arrays for easier sub-module processing
  const boardElementsList = Object.values(elements) as BoardElement[];
  const stickyNotes = boardElementsList.filter((el) => el.type === 'note') as StickyNote[];
  const travelCards = boardElementsList.filter((el) => el.type === 'card') as TravelCard[];
  const connectors = boardElementsList.filter((el) => el.type === 'connector') as Connector[];
  const drawingStrokes = boardElementsList.filter((el) => el.type === 'drawing') as DrawingStroke[];
  const textElements = boardElementsList.filter((el) => el.type === 'text') as BoardText[];

  // Render travelCards mapped by ID for dictionary mapping in arrows
  const cardsDict = travelCards.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as { [id: string]: TravelCard });

  // High-performance spatial filtering (Frustum Culling) of elements
  const isElementVisible = (elX: number, elY: number, elW: number, elH: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Project coordinates into scale-dependent client pixels
    const clientX = camera.x + elX * camera.z;
    const clientY = camera.y + elY * camera.z;
    const clientW = elW * camera.z;
    const clientH = elH * camera.z;

    // Buffer margin to ensure smooth scrolling transitions near boundaries
    const margin = 200;
    return (
      clientX + clientW >= -margin &&
      clientX <= viewportWidth + margin &&
      clientY + clientH >= -margin &&
      clientY <= viewportHeight + margin
    );
  };

  const isStrokeVisible = (stroke: DrawingStroke) => {
    if (stroke.points.length === 0) return false;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const pt of stroke.points) {
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    return isElementVisible(minX, minY, maxX - minX, maxY - minY);
  };

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-[#FAF8F5] select-none text-[#4A443F]">
      
      {/* Dynamic Top Navigation Header Bar */}
      <header className="w-full bg-[#FFFDFB]/60 backdrop-blur-md border-b border-[#E8E2D9] px-6 py-3.5 flex items-center justify-between z-10 shrink-0">
        
        {/* Logo and Room dropdown Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#8FA18C] rounded-xl flex items-center justify-center text-white shadow-md">
              <Compass className="w-5 h-5 animate-bounce-slow" />
            </div>
            <div>
              <h1 className="font-display italic font-semibold text-[#4A443F] text-base leading-none" style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}>WanderBoard</h1>
            </div>
          </div>
        </div>

        {/* Sync status info banner */}
        <div className="flex items-center gap-4">
          
          {/* Traveler User Avatar Details */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
            <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: profile.color }} />
            <div className="flex flex-col text-left">
              <span className="text-[10.5px] font-bold text-[#4A443F] leading-none">{profile.name}</span>
              <span className="text-[8px] font-mono text-[#8FA18C] leading-none">Anonymous Traveler</span>
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
              : (isSpacePressed || activeTool === 'pan'
                  ? 'grab'
                  : (activeTool === 'select'
                      ? 'default'
                      : (activeTool === 'pen' ? 'crosshair' : 'default')
                    )
                ),
            backgroundPosition: `${camera.x}px ${camera.y}px`,
            backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
            backgroundImage: `radial-gradient(circle, var(--color-natural-border) ${1.2 * camera.z}px, transparent ${1.2 * camera.z}px)`
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
              willChange: isPanningRef.current ? 'transform' : 'auto'
            }}
          >
            
            {/* 1. SVG Layer for Freehand Brush Strokes */}
            <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
              {/* Completed stroke vectors (filtered by visible camera bounds) */}
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

              {/* Live drawing active stroke path update */}
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
                  transformOrigin: '0 0'
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

            {/* 3. Render Draggable Sticky notes components (with viewport culling) */}
            {stickyNotes.filter((note) => isElementVisible(note.x, note.y, note.width || 200, note.height || 180)).map((note) => (
              <StickyNoteComponent
                key={note.id}
                note={note}
                onDragStart={handleElementDragStart}
                onUpdate={handleUpdateElement}
                onDelete={handleDeleteElement}
                scale={1}
              />
            ))}

            {/* 3.1. Render Draggable Canvas Text components (with viewport culling) */}
            {textElements.filter((t) => isElementVisible(t.x, t.y, t.width || 240, t.height || 60)).map((textElement) => (
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

            {/* 4. Render Draggable Travel attraction Cards (with viewport culling) */}
            {travelCards.filter((card) => isElementVisible(card.x, card.y, 300, 320)).map((card) => (
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
        <div 
          id="floating-canvas-toolbar"
          className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-[#FFFDFB]/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#E8E2D9] p-1.5 flex items-center gap-1.5 select-none"
        >
          {/* Default Select/Cursor Tool */}
          <button
            id="tool-select"
            onClick={() => {
              setActiveTool('select');
              setConnectorSourceId(null);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold ${
              activeTool === 'select' && !isSpacePressed
                ? 'bg-[#8FA18C] text-white shadow-md font-bold'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Interact Mode (Normal Mouse Cursor to Select & Edit)"
          >
            <MousePointer className="w-4 h-4" />
            <span className="hidden sm:inline">Interact</span>
          </button>

          {/* Pan/Drag Canvas Mode */}
          <button
            id="tool-pan"
            onClick={() => {
              setActiveTool('pan');
              setConnectorSourceId(null);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold ${
              activeTool === 'pan' || isSpacePressed
                ? 'bg-[#8FA18C] text-white shadow-md font-bold'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Drag Canvas Mode (Pan without holding spacebar)"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden sm:inline">Pan</span>
          </button>

          {/* Vertical Separator */}
          <div className="w-[1px] h-5 bg-[#E8E2D9] mx-0.5" />

          {/* Sticky Info Note */}
          <button
            id="tool-note"
            onClick={() => {
              setActiveTool('note');
              setConnectorSourceId(null);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              activeTool === 'note'
                ? 'bg-[#8FA18C] text-white shadow-md'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Create Sticky Info Note"
          >
            <StickyNoteIcon className="w-4 h-4" />
          </button>

          {/* Floating Text */}
          <button
            id="tool-text"
            onClick={() => {
              setActiveTool('text');
              setConnectorSourceId(null);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              activeTool === 'text'
                ? 'bg-[#8FA18C] text-white shadow-md'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Draw Floating Text"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Travel Attraction Card */}
          <button
            id="tool-card"
            onClick={() => {
              setActiveTool('card');
              setConnectorSourceId(null);
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              activeTool === 'card'
                ? 'bg-[#8FA18C] text-white shadow-md'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Place Travel Card"
          >
            <MapPin className="w-4 h-4" />
          </button>

          {/* Connector Arrow */}
          <button
            id="tool-connector"
            onClick={() => {
              setActiveTool('connector');
            }}
            className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold ${
              activeTool === 'connector'
                ? 'bg-[#8FA18C] text-white shadow-md font-bold'
                : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
            }`}
            title="Connect"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="hidden sm:inline">Connect</span>
          </button>

          {/* Vertical Separator */}
          <div className="w-[1px] h-5 bg-[#E8E2D9] mx-0.5" />

          {/* Color Palette dropdown list */}
          <div className="flex items-center gap-1 px-1">
            {['#4A443F', '#D48C70', '#8FA18C', '#E5D3B3', '#A8C5DB', '#f43f5e'].map((color) => (
              <button
                key={color}
                onClick={() => setActiveColor(color)}
                className={`w-4 h-4 rounded-full border relative transition-all duration-200 hover:scale-125 cursor-pointer ${
                  activeColor === color ? 'border-[#8FA18C] scale-110 ring-2 ring-[#8FA18C]/20' : 'border-[#E8E2D9]/60'
                }`}
                style={{ backgroundColor: color }}
              >
                {activeColor === color && (
                  <span className="absolute inset-1 rounded-full bg-white opacity-90" />
                )}
              </button>
            ))}
          </div>

          {/* Vertical Separator */}
          <div className="w-[1px] h-5 bg-[#E8E2D9] mx-0.5" />

          {/* Undo action button */}
          <button
            onClick={handleLocalUndo}
            className={`p-2 rounded-xl transition-all ${undoStack.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#FAF8F5] cursor-pointer'}`}
            disabled={undoStack.length === 0}
            title="Undo Last Activity"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#8FA18C]" />
          </button>

          {/* Global reset clear canvas button */}
          <button
            onClick={handleClearBoardComplete}
            className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-all cursor-pointer"
            title="Clear WanderBoard Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Floating Horizontal Collapsible Navigation Viewport Controls */}
        <div 
          id="compact-navigation-viewport"
          className="absolute left-6 bottom-6 z-20 bg-[#FFFDFB]/95 backdrop-blur-md rounded-xl shadow-lg border border-[#E8E2D9] p-1.5 flex items-center gap-1.5 select-none transition-all duration-300"
        >
          {isNavExpanded ? (
            <div className="flex items-center gap-1.5">
              {/* Collapse button */}
              <button
                id="viewport-collapse-btn"
                onClick={() => setIsNavExpanded(false)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#4A443F]/60 hover:text-[#8FA18C] transition-all cursor-pointer"
                title="Collapse Controls"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Zoom out widget */}
              <button
                id="zoom-out-btn"
                onClick={() => setCamera(prev => ({ ...prev, z: Math.max(prev.z - 0.1, 0.2) }))}
                className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-[#4A443F] hover:bg-[#8FA18C]/15 hover:text-[#3D4C3A] active:scale-95 transition-all cursor-pointer"
                title="Zoom Out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              {/* Zoom percentage text indicator */}
              <span className="text-[10.5px] font-mono font-bold text-[#4A443F]/75 w-10 text-center">
                {Math.round(camera.z * 100)}%
              </span>

              {/* Zoom in widget */}
              <button
                id="zoom-in-btn"
                onClick={() => setCamera(prev => ({ ...prev, z: Math.min(prev.z + 0.1, 3) }))}
                className="p-1 rounded-lg bg-[#FAF8F5] border border-[#E8E2D9] text-[#4A443F] hover:bg-[#8FA18C]/15 hover:text-[#3D4C3A] active:scale-95 transition-all cursor-pointer"
                title="Zoom In"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              {/* Split separator */}
              <div className="w-[1px] h-4 bg-[#E8E2D9]" />

              {/* Fitting board center resetting */}
              <button
                id="zoom-reset-btn"
                onClick={() => {
                  const viewportWidth = boardContainerRef.current?.clientWidth || window.innerWidth || 1200;
                  const viewportHeight = boardContainerRef.current?.clientHeight || window.innerHeight || 800;
                  setCamera({
                    x: Math.round(viewportWidth / 2 - 1600 * 0.9),
                    y: Math.round(viewportHeight / 2 - 1200 * 0.9),
                    z: 0.9
                  });
                }}
                className="flex items-center gap-1 text-[9.5px] font-sans font-bold leading-none tracking-wider text-[#4A443F] uppercase py-1 px-1.5 rounded-lg hover:bg-[#FAF8F5] border border-[#E8E2D9]/40 hover:text-[#8FA18C] cursor-pointer"
                title="Fit Canvas to Center"
              >
                <Maximize className="w-3 h-3 text-[#8FA18C]" />
                <span>Reset</span>
              </button>

              {/* Split separator */}
              <div className="w-[1px] h-4 bg-[#E8E2D9]" />

              {/* Center viewport on nearest node elements */}
              <button
                id="zoom-nearest-btn"
                onClick={handlePushToNearestContents}
                className="flex items-center gap-1 text-[9.5px] font-sans font-bold leading-none tracking-wider text-[#4A443F] uppercase py-1 px-1.5 rounded-lg hover:bg-[#FAF8F5] border border-[#E8E2D9]/40 hover:text-[#8FA18C] cursor-pointer"
                title="Focus View on Nearest Elements"
              >
                <Locate className="w-3 h-3 text-[#8FA18C]" />
                <span>Nearest</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {/* Expand button */}
              <button
                id="viewport-expand-btn"
                onClick={() => setIsNavExpanded(true)}
                className="p-1.5 rounded-lg hover:bg-[#FAF8F5] text-[#4A443F]/60 hover:text-[#8FA18C] transition-all cursor-pointer"
                title="Expand Controls"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Zoom percentage static text preview */}
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
