import React from 'react';
import {
  MousePointer,
  Hand,
  Pen,
  StickyNote as StickyNoteIcon,
  Type,
  MapPin,
  ArrowRight,
  RotateCcw,
  Trash2,
} from 'lucide-react';

interface FloatingToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  isSpacePressed: boolean;
  setConnectorSourceId: (id: string | null) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  undoStackLength: number;
  onUndo: () => void;
  onClear: () => void;
}

export default function FloatingToolbar({
  activeTool,
  setActiveTool,
  isSpacePressed,
  setConnectorSourceId,
  activeColor,
  setActiveColor,
  brushWidth,
  setBrushWidth,
  undoStackLength,
  onUndo,
  onClear,
}: FloatingToolbarProps) {
  return (
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

      {/* Freehand Pen/Brush Mode */}
      <button
        id="tool-pen"
        onClick={() => {
          setActiveTool('pen');
          setConnectorSourceId(null);
        }}
        className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-semibold ${
          activeTool === 'pen'
            ? 'bg-[#8FA18C] text-white shadow-md font-bold'
            : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
        }`}
        title="Freehand Sketch Tool"
      >
        <Pen className="w-4 h-4" />
        <span className="hidden sm:inline">Sketch</span>
      </button>

      {/* Brush Size Adjustment Slider (shown only when Sketch is active) */}
      {activeTool === 'pen' && (
        <div className="flex items-center gap-2 px-2.5 py-1 bg-[#FAF8F5] rounded-xl border border-[#E8E2D9]">
          <span className="text-[9px] font-mono text-[#4A443F]/70 whitespace-nowrap">
            Size: {brushWidth}px
          </span>
          <input
            type="range"
            min="2"
            max="12"
            value={brushWidth}
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            className="w-16 accent-[#8FA18C] cursor-pointer h-1 bg-neutral-200 rounded-lg appearance-none"
          />
        </div>
      )}

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
              activeColor === color
                ? 'border-[#8FA18C] scale-110 ring-2 ring-[#8FA18C]/20'
                : 'border-[#E8E2D9]/60'
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
        id="btn-undo"
        onClick={onUndo}
        className={`p-2 rounded-xl transition-all ${
          undoStackLength === 0
            ? 'opacity-30 cursor-not-allowed'
            : 'hover:bg-[#FAF8F5] cursor-pointer'
        }`}
        disabled={undoStackLength === 0}
        title="Undo Last Activity"
      >
        <RotateCcw className="w-3.5 h-3.5 text-[#8FA18C]" />
      </button>

      {/* Global reset clear canvas button */}
      <button
        id="btn-clear"
        onClick={onClear}
        className="p-2 rounded-xl hover:bg-red-50 text-red-500 transition-all cursor-pointer"
        title="Clear WanderBoard Canvas"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
