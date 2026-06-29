import { useState, useEffect, useRef, useCallback } from 'react';
import { BoardElement, Point, DrawingStroke } from '../types';

export default function useCamera() {
  const [camera, setCamera] = useState({ x: -640, y: -480, z: 0.9 });
  const cameraRef = useRef(camera);

  useEffect(() => {
    cameraRef.current = camera;
  }, [camera]);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const whiteboardSurfaceRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  // Center camera at 90% on mount based on clientWidth/clientHeight
  useEffect(() => {
    if (boardContainerRef.current) {
      const w = boardContainerRef.current.clientWidth;
      const h = boardContainerRef.current.clientHeight;
      setCamera({
        x: Math.round(w / 2 - 1600 * 0.9),
        y: Math.round(h / 2 - 1200 * 0.9),
        z: 0.9,
      });
    }
  }, []);

  // Listen to mouse/trackpad wheel on container
  useEffect(() => {
    const container = boardContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
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

  const handlePushToNearestContents = useCallback((elements: { [id: string]: BoardElement }) => {
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
    const targetZoom = 0.9;

    if (coords.length === 0) {
      setCamera({
        x: Math.round(viewportWidth / 2 - 1600 * targetZoom),
        y: Math.round(viewportHeight / 2 - 1200 * targetZoom),
        z: targetZoom,
      });
      return;
    }

    const currentCam = cameraRef.current;
    const viewportCenterX = (viewportWidth / 2 - currentCam.x) / currentCam.z;
    const viewportCenterY = (viewportHeight / 2 - currentCam.y) / currentCam.z;

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

    const newCameraX = viewportWidth / 2 - nearestNode.x * targetZoom;
    const newCameraY = viewportHeight / 2 - nearestNode.y * targetZoom;

    setCamera({
      x: Math.round(newCameraX),
      y: Math.round(newCameraY),
      z: targetZoom,
    });
  }, []);

  const resetCamera = useCallback(() => {
    const viewportWidth = boardContainerRef.current?.clientWidth || window.innerWidth || 1200;
    const viewportHeight = boardContainerRef.current?.clientHeight || window.innerHeight || 800;
    setCamera({
      x: Math.round(viewportWidth / 2 - 1600 * 0.9),
      y: Math.round(viewportHeight / 2 - 1200 * 0.9),
      z: 0.9,
    });
  }, []);

  const zoomIn = useCallback(() => {
    setCamera((prev) => ({ ...prev, z: Math.min(prev.z + 0.1, 3) }));
  }, []);

  const zoomOut = useCallback(() => {
    setCamera((prev) => ({ ...prev, z: Math.max(prev.z - 0.1, 0.2) }));
  }, []);

  const isElementVisible = useCallback(
    (elX: number, elY: number, elW: number, elH: number) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const clientX = camera.x + elX * camera.z;
      const clientY = camera.y + elY * camera.z;
      const clientW = elW * camera.z;
      const clientH = elH * camera.z;

      const margin = 200;
      return (
        clientX + clientW >= -margin &&
        clientX <= viewportWidth + margin &&
        clientY + clientH >= -margin &&
        clientY <= viewportHeight + margin
      );
    },
    [camera]
  );

  const isStrokeVisible = useCallback(
    (stroke: DrawingStroke) => {
      if (stroke.points.length === 0) return false;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of stroke.points) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
      return isElementVisible(minX, minY, maxX - minX, maxY - minY);
    },
    [isElementVisible]
  );

  return {
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
  };
}
