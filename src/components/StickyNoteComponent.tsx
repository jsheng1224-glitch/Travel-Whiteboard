import React, { useState, useRef, useEffect } from 'react';
import { StickyNote as StickyNoteType } from '../types';
import { X, Check } from 'lucide-react';

interface StickyNoteComponentProps {
  key?: any;
  note: StickyNoteType;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onUpdate: (note: any) => void;
  onDelete: (id: string) => void;
  scale: number;
}

export default function StickyNoteComponent({
  note,
  onDragStart,
  onUpdate,
  onDelete,
  scale
}: StickyNoteComponentProps) {
  const [isEditing, setIsEditing] = useState(note.isEditingInitially || false);
  const [text, setText] = useState(note.text);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(note.text);
  }, [note.text]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    onUpdate({
      ...note,
      text: text.trim() || 'Double-click to type ideas!',
      isEditingInitially: false
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const noteColorClass = (hex: string) => {
    const norm = hex.toLowerCase();
    const map: { [key: string]: string } = {
      '#f59e0b': 'bg-[#FFF9EA] border-[#EADFCF] text-[#63553C]',
      '#f43f5e': 'bg-[#FFF0EB] border-[#FADBD0] text-[#7A402A]',
      '#0ea5e9': 'bg-[#EBF5FA] border-[#CFDFE8] text-[#2C485A]',
      '#10b981': 'bg-[#FAFDF9] border-[#E2F0DD] text-[#3D4C3A]',
      '#8b5cf6': 'bg-[#FAF8F3] border-[#EADFCF] text-[#5C4D3E]',
      '#0f172a': 'bg-[#FAF8F5] border-[#E8E2D9] text-[#4A443F]',
      '#4a443f': 'bg-[#FAF8F5] border-[#E8E2D9] text-[#4A443F]',
      '#d48c70': 'bg-[#FFF0EB] border-[#FADBD0] text-[#7A402A]',
      '#8fa18c': 'bg-[#FAFDF9] border-[#E2F0DD] text-[#3D4C3A]',
      '#e5d3b3': 'bg-[#FFF9EA] border-[#E8DEC4] text-[#63553C]',
      '#a8c5db': 'bg-[#EBF5FA] border-[#CFDFE8] text-[#2C485A]',
      '#c9b6a1': 'bg-[#FAF8F3] border-[#EADFCF] text-[#5C4D3E]',
    };
    return map[norm] || 'bg-[#FFF9EA] border-[#EADFCF] text-[#63553C]';
  };

  return (
    <div
      id={`sticky-note-${note.id}`}
      style={{
        position: 'absolute',
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        transformOrigin: 'top left',
      }}
      className={`rounded-2xl border p-4 shadow-md flex flex-col justify-between transition-shadow hover:shadow-lg group rotate-1 cursor-grab active:cursor-grabbing ${noteColorClass(note.color)}`}
      onMouseDown={(e) => {
        if (!isEditing) onDragStart(note.id, e);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Tape decoration effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-white/40 backdrop-blur-sm -rotate-3 border border-white/20 select-none pointer-events-none" />

      {/* Close button */}
      <button
        id={`note-delete-btn-${note.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white shadow-md border border-slate-100 items-center justify-center text-slate-400 hover:text-red-500 hover:scale-115 flex opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 cursor-pointer"
        title="Delete information note"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Context info message (Double click helper) */}
      {!isEditing && (
        <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase select-none leading-none absolute bottom-1 right-2 group-hover:block hidden">
          Edit ✎
        </span>
      )}

      {isEditing ? (
        <div className="flex flex-col h-full gap-2">
          <textarea
            id={`note-textarea-${note.id}`}
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            maxLength={180}
            className="w-full h-full bg-transparent border-none resize-none focus:outline-none focus:ring-0 text-sm font-medium font-sans leading-relaxed"
            placeholder="What's on your mind? Activities, hotel info, flight links..."
          />
          <div className="flex justify-end pt-1">
            <button
              id={`note-save-btn-${note.id}`}
              onMouseDown={handleSave}
              className="bg-slate-800 text-white rounded-lg p-1 hover:scale-105 hover:bg-slate-700 transition flex items-center justify-center cursor-pointer"
              title="Save changes"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto pr-1 h-full select-none select-text">
          <p className="text-sm font-sans font-medium leading-relaxed whitespace-pre-wrap break-words pr-2">
            {note.text}
          </p>
        </div>
      )}
    </div>
  );
}
