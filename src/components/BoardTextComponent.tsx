import React, { useState, useRef, useEffect } from 'react';
import { BoardText } from '../types';
import { GripHorizontal } from 'lucide-react';

interface BoardTextComponentProps {
  key?: string;
  textElement: BoardText;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onUpdate: (element: any) => void;
  onDelete: (id: string) => void;
  activeTool?: string;
  onStartConnectorDrag?: (id: string, startX: number, startY: number, e: React.MouseEvent) => void;
}

export default function BoardTextComponent({
  textElement,
  onDragStart,
  onUpdate,
  onDelete,
  activeTool,
  onStartConnectorDrag
}: BoardTextComponentProps) {
  const [isEditing, setIsEditing] = useState(textElement.isEditingInitially || false);
  const [text, setText] = useState(textElement.text);
  const [alignment, setAlignment] = useState(textElement.alignment || 'left');
  const [isBulletPoints, setIsBulletPoints] = useState(textElement.isBulletPoints || false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(textElement.text);
  }, [textElement.text]);

  useEffect(() => {
    setAlignment(textElement.alignment || 'left');
  }, [textElement.alignment]);

  useEffect(() => {
    setIsBulletPoints(textElement.isBulletPoints || false);
  }, [textElement.isBulletPoints]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Set cursor to end of text
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    const trimmed = text.trim();
    if (trimmed === '') {
      onDelete(textElement.id);
      return;
    }
    onUpdate({
      ...textElement,
      text: trimmed,
      alignment,
      isBulletPoints,
      isEditingInitially: false
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Save on Enter only if Shift key is NOT pressed
    if (e.key === 'Enter' && !e.shiftKey && !isBulletPoints) {
      e.preventDefault();
      handleSave();
    }
  };

  // Convert raw text into list items if bullet points is enabled
  const getLines = () => {
    return text.split('\n');
  };

  const alignmentClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  }[alignment];

  return (
    <div
      id={`canvas-text-${textElement.id}`}
      style={{
        position: 'absolute',
        left: textElement.x,
        top: textElement.y,
        width: Math.max(textElement.width, 240),
        minHeight: 60,
      }}
      className={`group select-text transition-[background-color,border-color,box-shadow] rounded-xl p-2 pb-3 flex flex-col ${
        isEditing 
          ? 'bg-transparent border border-transparent z-30'
          : activeTool === 'connector'
            ? 'border border-transparent hover:border-neutral-300/80 hover:bg-[#FAF8F5]/40 hover:shadow-xs cursor-pointer z-10'
            : 'border border-transparent hover:bg-[#FAF8F5]/60 hover:border-[#E8E2D9]/60 hover:shadow-xs cursor-text z-10'
      }`}
      onDoubleClick={handleDoubleClick}
    >
      {/* Small floating drag handle for easy movement without triggering mouse click edit conflicts */}
      <div 
        className="absolute -top-3.5 left-2 bg-[#FFFDFB] border border-[#E8E2D9] rounded-md py-0.5 px-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing z-20 flex items-center gap-1 shadow-sm select-none"
        onMouseDown={(e) => {
          e.stopPropagation();
          onDragStart(textElement.id, e);
        }}
        title="Drag tool"
      >
        <GripHorizontal className="w-3 h-3 text-[#4A443F]/60" />
        <span className="text-[8px] font-mono text-[#4A443F]/50 font-bold uppercase tracking-wider">Move</span>
      </div>

      {/* 4 hover points for active link arrow route connections */}
      {activeTool === 'connector' && (
        <>
          {/* Top connection dot */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#8FA18C] rounded-full shadow-sm hover:bg-[#8FA18C] hover:scale-125 hover:border-white transition-all cursor-crosshair z-30 opacity-0 group-hover:opacity-100 flex items-center justify-center"
            onMouseDown={(e) => {
              e.stopPropagation();
              const width = Math.max(textElement.width, 240);
              const startX = textElement.x + width / 2;
              const startY = textElement.y;
              onStartConnectorDrag?.(textElement.id, startX, startY, e);
            }}
            title="Drag to Connect"
          />
          {/* Bottom connection dot */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#8FA18C] rounded-full shadow-sm hover:bg-[#8FA18C] hover:scale-125 hover:border-white transition-all cursor-crosshair z-30 opacity-0 group-hover:opacity-100 flex items-center justify-center"
            onMouseDown={(e) => {
              e.stopPropagation();
              const width = Math.max(textElement.width, 240);
              const height = Math.max(textElement.height || 60, 60);
              const startX = textElement.x + width / 2;
              const startY = textElement.y + height;
              onStartConnectorDrag?.(textElement.id, startX, startY, e);
            }}
            title="Drag to Connect"
          />
          {/* Left connection dot */}
          <div
            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#8FA18C] rounded-full shadow-sm hover:bg-[#8FA18C] hover:scale-125 hover:border-white transition-all cursor-crosshair z-30 opacity-0 group-hover:opacity-100 flex items-center justify-center"
            onMouseDown={(e) => {
              e.stopPropagation();
              const height = Math.max(textElement.height || 60, 60);
              const startX = textElement.x;
              const startY = textElement.y + height / 2;
              onStartConnectorDrag?.(textElement.id, startX, startY, e);
            }}
            title="Drag to Connect"
          />
          {/* Right connection dot */}
          <div
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-[#8FA18C] rounded-full shadow-sm hover:bg-[#8FA18C] hover:scale-125 hover:border-white transition-all cursor-crosshair z-30 opacity-0 group-hover:opacity-100 flex items-center justify-center"
            onMouseDown={(e) => {
              e.stopPropagation();
              const width = Math.max(textElement.width, 240);
              const height = Math.max(textElement.height || 60, 60);
              const startX = textElement.x + width;
              const startY = textElement.y + height / 2;
              onStartConnectorDrag?.(textElement.id, startX, startY, e);
            }}
            title="Drag to Connect"
          />
        </>
      )}
      {/* Primary visual content */}
      <div className={`mt-1 flex flex-col w-full h-full text-[#4A443F] font-sans ${alignmentClass}`}>
        {isEditing ? (
          <textarea
            id={`text-textarea-${textElement.id}`}
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            placeholder=""
            className={`w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm font-semibold leading-relaxed resize-y ${
              alignment === 'center' ? 'text-center' : alignment === 'right' ? 'text-right' : 'text-left'
            }`}
            style={{ minHeight: '44px' }}
          />
        ) : (
          <div className="w-full break-words">
            {isBulletPoints ? (
              <ul className={`text-sm font-medium leading-relaxed space-y-1 ${
                alignment === 'center' 
                  ? 'flex flex-col items-center' 
                  : alignment === 'right' 
                    ? 'flex flex-col items-end' 
                    : 'list-disc pl-5'
              }`}>
                {getLines().map((line, i) => {
                  if (!line.trim() && getLines().length > 1) return null;
                  return (
                    <li 
                      key={i} 
                      className={`${
                        alignment === 'center' 
                          ? 'before:content-["•"] before:mr-2 flex items-center'
                          : alignment === 'right' 
                            ? 'after:content-["•"] after:ml-2 flex items-center'
                            : ''
                      }`}
                    >
                      <span>{line || ' '}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap break-words">
                {text || <span className="opacity-40 italic font-normal">Double-click to type text</span>}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
