import React from 'react';
import { Connector, BoardElement } from '../types';
import { X } from 'lucide-react';

interface ConnectorLinesProps {
  connectors: Connector[];
  elements: { [id: string]: BoardElement };
  onDeleteConnector: (id: string) => void;
}

export default function ConnectorLines({
  connectors,
  elements,
  onDeleteConnector
}: ConnectorLinesProps) {
  return (
    <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
      <defs>
        {/* Natural Tones solid arrowheads */}
        <marker
          id="arrow-terra"
          viewBox="0 0 10 10"
          refX="28" // Offsets arrow to sit just on the border of the card rather than inside
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D48C70" />
        </marker>
        <marker
          id="arrow-sage"
          viewBox="0 0 10 10"
          refX="28"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#8FA18C" />
        </marker>
        <marker
          id="arrow-charcoal"
          viewBox="0 0 10 10"
          refX="28"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#4A443F" />
        </marker>
      </defs>

      {connectors.map((connector) => {
        const fromEl = elements[connector.fromCardId];
        const toEl = elements[connector.toCardId];

        // If either element doesn't exist anymore, we don't render the line
        if (!fromEl || !toEl) return null;

        const getElRect = (el: any) => {
          if (el.type === 'card') {
            return { x: el.x, y: el.y, w: 200, h: 140 };
          }
          if (el.type === 'text') {
            return { x: el.x, y: el.y, w: el.width || 240, h: el.height || 60 };
          }
          if (el.type === 'note') {
            return { x: el.x, y: el.y, w: el.width || 200, h: el.height || 180 };
          }
          return { x: el.x, y: el.y, w: 100, h: 100 };
        };

        const rFrom = getElRect(fromEl);
        const rTo = getElRect(toEl);

        const startX = rFrom.x + rFrom.w / 2;
        const startY = rFrom.y + rFrom.h / 2;
        const endX = rTo.x + rTo.w / 2;
        const endY = rTo.y + rTo.h / 2;

        // Midpoint for delete overlay indicator
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const connColor = connector.color || '#D48C70';
        const normColor = connColor.toLowerCase();
        
        let arrowMarker = 'url(#arrow-terra)';
        if (normColor === '#8fa18c') arrowMarker = 'url(#arrow-sage)';
        else if (normColor === '#4a443f') arrowMarker = 'url(#arrow-charcoal)';

        return (
          <g key={connector.id} className="group/line pointer-events-auto">
            {/* Wider interactive path for easier hover selection */}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="transparent"
              strokeWidth={15}
              className="cursor-pointer"
            />

            {/* Aesthetic actual visible connection pointer */}
            <line
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={connColor}
              strokeWidth={3}
              strokeDasharray="6 4"
              markerEnd={arrowMarker}
              className="transition duration-150 group-hover/line:stroke-[#8FA18C] group-hover/line:stroke-5"
            />

            {/* Midpoint route deleter pill */}
            <foreignObject
              x={midX - 12}
              y={midY - 12}
              width={24}
              height={24}
              className="overflow-visible"
            >
              <button
                id={`connector-delete-btn-${connector.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteConnector(connector.id);
                }}
                className="w-6 h-6 rounded-full bg-red-500 shadow-md border-2 border-[#FAF8F5] flex items-center justify-center text-white scale-0 group-hover/line:scale-100 focus:scale-100 transition-transform duration-200 cursor-pointer hover:bg-red-650 hover:scale-110 active:scale-95"
                title="Remove route connection"
              >
                <X className="w-3 h-3" />
              </button>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
