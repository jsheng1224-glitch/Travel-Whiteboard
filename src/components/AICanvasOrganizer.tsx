import React, { useState } from 'react';
import { Sparkles, Send, Map, Loader2, Compass, CheckCircle2 } from 'lucide-react';

interface AICanvasOrganizerProps {
  onExecuteCommand: (command: string) => Promise<{ success: boolean; aiResult?: string; error?: string }>;
  isProcessing: boolean;
}

const PRESET_COMMANDS = [
  { label: '📂 Group into Neat Columns', text: 'Group all active cards into beautiful neat columns representing Days, and connect them sequentially.' },
  { label: '🗼 Spawn a 3-Day Tokyo Plan', text: 'Create a 3-Day Tokyo itinerary with cards like Shibuya Crossing, TeamLab, and Sensoji Temple. Align them in Day columns and hook them with sequencial arrows.' },
  { label: '🥐 Sprout a 2-Day Paris Route', text: 'Add cards for a 2-Day Paris adventure including Eiffel Tower, Louvre Museum, and Montmartre, and link them sequentially.' },
  { label: '🔌 Connect my lose cards', text: 'Analyze all travel cards already on the board, keep their positions but connect them with route arrows sequentially based on Day 1, Day 2, and Day 3 order.' }
];

const LOADING_PHASES = [
  'Inspecting your travel cards...',
  'Checking geographical maps & travel times...',
  'Organizing and aligning Day schedules...',
  'Drawing arrow routes and connections...',
  'Polishing your collaborative WanderBoard...'
];

export default function AICanvasOrganizer({
  onExecuteCommand,
  isProcessing
}: AICanvasOrganizerProps) {
  const [command, setCommand] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [loadingPhaseIndex, setLoadingPhaseIndex] = useState(0);
  const [responseLog, setResponseLog] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // Rotate loading text hints
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      setLoadingPhaseIndex(0);
      interval = setInterval(() => {
        setLoadingPhaseIndex((prev) => (prev + 1) % LOADING_PHASES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setResponseLog({ text: '', type: null });
    const res = await onExecuteCommand(command);
    if (res.success) {
      setCommand('');
      setResponseLog({
        text: res.aiResult || "I've successfully reorganized and connected your travel cards!",
        type: 'success'
      });
    } else {
      setResponseLog({
        text: res.error || "Something went wrong while organizing. Is your GEMINI_API_KEY set?",
        type: 'error'
      });
    }
  };

  const handlePresetClick = async (index: number, text: string) => {
    if (isProcessing) return;
    setActivePreset(index);
    setResponseLog({ text: '', type: null });
    
    const res = await onExecuteCommand(text);
    setActivePreset(null);
    if (res.success) {
      setResponseLog({
        text: res.aiResult || "Optimized successfully!",
        type: 'success'
      });
    } else {
      setResponseLog({
        text: res.error || "Failed setup.",
        type: 'error'
      });
    }
  };

  return (
    <div id="ai-organizer-panel" className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-3xl bg-[#FFFDFB]/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#E8E2D9] p-4 z-20 flex flex-col gap-3 transition-all duration-300 hover:shadow-2xl">
      
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-[#8FA18C] to-[#D48C70] text-white rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-[#4A443F] text-xs">AI Self-Organizer Console</h2>
            <p className="text-[10px] text-[#4A443F]/75">Command Gemini to arrange attraction cards and draw sequential pathways</p>
          </div>
        </div>

        {isProcessing && (
          <div className="flex items-center gap-2 px-3 py-1 bg-[#8FA18C]/15 rounded-full border border-[#8FA18C]/35 animate-pulse text-[10px] text-[#3D4C3A] font-semibold font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>{LOADING_PHASES[loadingPhaseIndex]}</span>
          </div>
        )}
      </div>

      {/* Action Presets */}
      {!isProcessing && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {PRESET_COMMANDS.map((preset, i) => (
            <button
              key={i}
              id={`preset-cmd-${i}`}
              onClick={() => handlePresetClick(i, preset.text)}
              disabled={isProcessing}
              className={`px-3 py-1 bg-[#FAF8F5] border border-[#E8E2D9] hover:border-[#8FA18C] hover:bg-[#8FA18C]/15 hover:text-[#3D4C3A] rounded-lg text-[10px] font-semibold text-[#4A443F]/80 transition cursor-pointer disabled:opacity-50 select-none ${
                activePreset === i ? 'bg-[#8FA18C]/15 border-[#8FA18C] text-[#3D4C3A]' : ''
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Custom Command Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8FA18C] w-4 h-4" />
          <input
            id="ai-command-input"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isProcessing}
            placeholder={isProcessing ? "Gemini is moving elements..." : "What dream trip are we planning? List attractions to map out or day schedules..."}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-[#FAF8F5]/80 border border-[#E8E2D9] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8FA18C] focus:bg-white transition-all text-[#4A443F] font-medium"
          />
        </div>
        <button
          id="ai-submit-btn"
          type="submit"
          disabled={!command.trim() || isProcessing}
          className="px-4 py-2 bg-[#8FA18C] hover:bg-[#7D8E7A] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition active:scale-95 shadow-md"
          title="Send organization command"
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span>Execute</span>
              <Send className="w-3 h-3" />
            </>
          )}
        </button>
      </form>

      {/* Response Board Explaner Log */}
      {responseLog.text && (
        <div id="ai-response-log" className={`p-2.5 rounded-xl border text-[11.5px] leading-relaxed flex items-start gap-2 max-h-24 overflow-y-auto ${
          responseLog.type === 'success'
            ? 'bg-[#FAFDF9]/90 border-[#E2F0DD] text-[#3D4C3A]'
            : 'bg-[#FFF0EB]/90 border-[#FADBD0] text-[#7A402A]'
        }`}>
          {responseLog.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#8FA18C] shrink-0 mt-0.5" />
          ) : (
            <Sparkles className="w-4 h-4 text-[#D48C70] shrink-0 mt-0.5" />
          )}
          <p className="font-sans font-medium">{responseLog.text}</p>
        </div>
      )}

    </div>
  );
}
