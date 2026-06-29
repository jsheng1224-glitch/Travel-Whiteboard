import { useState, useEffect, useRef, useCallback } from 'react';
import { BoardElement, Collaborator, EmojiReaction } from '../types';

export default function useWebSocket(
  roomId: string,
  userId: string,
  profile: { name: string; color: string }
) {
  const [elements, setElements] = useState<{ [id: string]: BoardElement }>({});
  const [collaborators, setCollaborators] = useState<{ [id: string]: Collaborator }>({});
  const [reactions, setReactions] = useState<EmojiReaction[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const sendSocketMessage = useCallback((payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  }, []);

  useEffect(() => {
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
            setElements(data.elements || {});
            break;

          case 'element:create':
          case 'element:update':
            if (data.element) {
              setElements((prev) => ({
                ...prev,
                [data.element.id]: data.element,
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
                lastActive: Date.now(),
              },
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
              createdAt: Date.now(),
            };
            setReactions((prev) => [...prev, newReaction]);
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

    return () => {
      socket.close();
    };
  }, [roomId, userId]);

  return {
    elements,
    setElements,
    collaborators,
    setCollaborators,
    reactions,
    setReactions,
    wsConnected,
    sendSocketMessage,
  };
}
