import React from 'react';
import { Collaborator, EmojiReaction } from '../types';

interface CollaborationPresenceProps {
  collaborators: { [id: string]: Collaborator };
  reactions: EmojiReaction[];
  onTriggerReaction: (emoji: string) => void;
  userId: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '🎉', '🚀', '💡', '🍿'];

export default function CollaborationPresence({
  collaborators,
  reactions,
  onTriggerReaction,
  userId
}: CollaborationPresenceProps) {
  const activeTeammates = Object.values(collaborators);

  return (
    <>
      {/* 3. Render Floating Reaction Animation Items */}
      {reactions.map((react) => (
        <div
          key={react.id}
          className="absolute pointer-events-none text-2xl z-30 emoji-float-item select-none"
          style={{
            left: react.x - 12,
            top: react.y - 12,
          }}
        >
          {react.emoji}
        </div>
      ))}

      {/* 4. Render Live Teammate Mouse Cursor Indicators */}
      {activeTeammates.map((mate) => {
        // Skip rendering our own cursor
        if (mate.id === userId) return null;

        return (
          <div
            key={mate.id}
            id={`teammate-cursor-${mate.id}`}
            className="absolute pointer-events-none transition-all duration-75 z-40 select-none"
            style={{
              left: mate.x,
              top: mate.y,
            }}
          >
            {/* Elegant transparent cursor arrow vector */}
            <svg
              className="w-5 h-5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.5 3V19L9.5 14L13.5 22L17.5 20L13.5 12.2L19.5 12.2L4.5 3Z"
                fill={mate.color}
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            
            {/* Hover floating teammate name badge */}
            <div
              className="ml-4 mt-2 px-2 py-0.5 rounded-md text-[9px] font-bold text-white shadow-md font-mono whitespace-nowrap"
              style={{ backgroundColor: mate.color }}
            >
              {mate.name} {mate.activeTool ? `• ✍️ ${mate.activeTool}` : ''}
            </div>
          </div>
        );
      })}
    </>
  );
}
