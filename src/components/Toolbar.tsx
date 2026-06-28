import React from 'react';
import { MousePointer, Pen, StickyNote, MapPin, ArrowRight, Trash2, RotateCcw, Compass, Type } from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  activeColor: string;
  setActiveColor: (color: string) => void;
  brushWidth: number;
  setBrushWidth: (width: number) => void;
  onClear: () => void;
  onUndo: () => void;
}

const PALETTE_COLORS = [
  { value: '#4A443F', label: 'Earthy Charcoal' },
  { value: '#D48C70', label: 'Sunset Terra Cotta' },
  { value: '#8FA18C', label: 'Sage Green' },
  { value: '#E5D3B3', label: 'Sandy Gold' },
  { value: '#A8C5DB', label: 'Oceanic Dust' },
  { value: '#C9B6A1', label: 'Lavender Ash' },
];

export default function Toolbar({
  activeTool,
  setActiveTool,
  activeColor,
  setActiveColor,
  brushWidth,
  setBrushWidth,
  onClear,
  onUndo
}: ToolbarProps) {
  return (
    <div id="toolbar-panel" className="absolute left-6 top-1/2 -translate-y-1/2 bg-[#FFFDFB] rounded-2xl shadow-xl border border-[#E8E2D9] p-4 flex flex-col gap-5 z-20 transition-all duration-300 hover:shadow-2xl max-w-xs text-[#4A443F]">
      {/* App Branding */}
      <div className="flex items-center gap-2 pb-3 border-b border-[#E8E2D9]">
        <div className="p-2 bg-[#8FA18C]/15 text-[#8FA18C] rounded-xl">
          <Compass className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-display font-semibold text-[#4A443F] text-sm leading-tight italic">WanderBoard</h1>
          <span className="text-[10px] font-mono text-[#8FA18C]/80 font-bold">Nature-Inspired Planner</span>
        </div>
      </div>

      {/* Primary Canvas Tools */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-mono tracking-wider uppercase text-[#8FA18C] font-semibold mb-1">Canvas Tools</span>
        
        <button
          id="tool-select"
          onClick={() => setActiveTool('select')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'select'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Pointer & Drag Canvas"
        >
          <MousePointer className="w-4 h-4" />
          <span>Move & Drag</span>
        </button>

        <button
          id="tool-pen"
          onClick={() => setActiveTool('pen')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'pen'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Freehand Sketching"
        >
          <Pen className="w-4 h-4" />
          <span>Sketch Path</span>
        </button>

        <button
          id="tool-note"
          onClick={() => setActiveTool('note')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'note'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Sticky note for information dumps"
        >
          <StickyNote className="w-4 h-4" />
          <span>Sticky Info Note</span>
        </button>

        <button
          id="tool-text"
          onClick={() => setActiveTool('text')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'text'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Clean text writing on canvas"
        >
          <Type className="w-4 h-4" />
          <span>Floating Text</span>
        </button>

        <button
          id="tool-card"
          onClick={() => setActiveTool('card')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'card'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Travel card for attractions with days"
        >
          <MapPin className="w-4 h-4" />
          <span>Travel Card (Day-based)</span>
        </button>

        <button
          id="tool-connector"
          onClick={() => setActiveTool('connector')}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTool === 'connector'
              ? 'bg-[#8FA18C] text-white shadow-md'
              : 'text-[#4A443F]/80 hover:bg-[#FAF8F5]'
          }`}
          title="Connect Travel Cards with Sequential Arrows"
        >
          <ArrowRight className="w-4 h-4" />
          <span>Arrow Connector</span>
        </button>
      </div>

      {/* Styled Color Palette */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-[#E8E2D9]">
        <span className="text-[10px] font-mono tracking-wider uppercase text-[#8FA18C] font-semibold mb-1 col-span-3">Aesthetic Palette</span>
        <div className="grid grid-cols-6 gap-2">
          {PALETTE_COLORS.map((color) => (
            <button
              key={color.value}
              id={`color-btn-${color.value.replace('#', '')}`}
              onClick={() => setActiveColor(color.value)}
              className={`w-6 h-6 rounded-full border-2 relative transition-all duration-200 hover:scale-110 cursor-pointer ${
                activeColor === color.value ? 'border-[#8FA18C] scale-105 shadow-sm' : 'border-[#E8E2D9]'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.label}
            >
              {activeColor === color.value && (
                <span className="absolute inset-1.5 rounded-full bg-white opacity-85" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Customizations (Pen Width) */}
      {activeTool === 'pen' && (
        <div className="flex flex-col gap-1 pt-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-[#4A443F]/70">Brush Size</span>
            <span className="text-[10px] font-mono text-[#4A443F] font-semibold">{brushWidth}px</span>
          </div>
          <input
            id="input-brush-width"
            type="range"
            min="2"
            max="12"
            value={brushWidth}
            onChange={(e) => setBrushWidth(Number(e.target.value))}
            className="w-full accent-[#8FA18C] cursor-pointer h-1 bg-[#FAF8F5] rounded-lg appearance-none"
          />
        </div>
      )}

      {/* Actions (Clear, Undo) */}
      <div className="flex flex-col gap-1.5 pt-3 border-t border-[#E8E2D9]">
        <button
          id="btn-undo"
          onClick={onUndo}
          className="flex items-center gap-2 w-full justify-center py-1.5 rounded-lg border border-[#E8E2D9] text-[#4A443F] hover:bg-[#FAF8F5] text-[11px] font-semibold transition cursor-pointer"
          title="Undo last stroke or card"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#8FA18C]" />
          <span>Undo Last Action</span>
        </button>

        <button
          id="btn-clear"
          onClick={onClear}
          className="flex items-center gap-2 w-full justify-center py-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 text-[11px] font-semibold transition cursor-pointer"
          title="Wipe whiteboard slate"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Board</span>
        </button>
      </div>

      {/* Guide Card */}
      <div className="bg-[#FAF8F5] rounded-xl p-2.5 text-[10px] text-[#4A443F]/80 border border-[#E8E2D9]/60 leading-relaxed font-sans">
        <p className="font-semibold text-[#8FA18C] mb-0.5">💡 Quick Tips:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Hold <kbd className="px-1 py-0.5 bg-[#FFFDFB] border border-[#E8E2D9] rounded">Spacebar</kbd> + Drag canvas to Pan around the workspace.</li>
          <li>Double-click any card or note to directly edit text details.</li>
        </ul>
      </div>
    </div>
  );
}
