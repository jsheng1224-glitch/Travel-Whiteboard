import React, { useState, useEffect } from 'react';
import { TravelCard as TravelCardType } from '../types';
import { X, Calendar, Edit3, Check, MapPin, Tag } from 'lucide-react';

interface TravelCardComponentProps {
  key?: any;
  card: TravelCardType;
  onDragStart: (id: string, e: React.MouseEvent) => void;
  onUpdate: (card: any) => void;
  onDelete: (id: string) => void;
  onStartConnector?: (id: string) => void;
  isConnectingSource?: boolean;
}

const AVAILABLE_DAYS = ['Ideas', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];

export default function TravelCardComponent({
  card,
  onDragStart,
  onUpdate,
  onDelete,
  onStartConnector,
  isConnectingSource = false
}: TravelCardComponentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(card.name);
  const [day, setDay] = useState(card.day);

  useEffect(() => {
    setName(card.name);
    setDay(card.day);
  }, [card.name, card.day]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    onUpdate({
      ...card,
      name: name.trim() || 'Cozy Local Attraction',
      day: day
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  // Beautiful visual color blocks per day
  const getDayTheme = (dayVal: string) => {
    switch (dayVal) {
      case 'Day 1':
        return {
          banner: 'bg-[#8FA18C] text-white',
          badge: 'bg-[#FAFDF9] text-[#3D4C3A] border-[#E2F0DD]',
          cardBorder: 'border-[#E2F0DD] focus-within:ring-[#8FA18C]/20'
        };
      case 'Day 2':
        return {
          banner: 'bg-[#D48C70] text-white',
          badge: 'bg-[#FFF0EB] text-[#7A402A] border-[#FADBD0]',
          cardBorder: 'border-[#FADBD0] focus-within:ring-[#D48C70]/20'
        };
      case 'Day 3':
        return {
          banner: 'bg-[#E5D3B3] text-[#4A443F]',
          badge: 'bg-[#FFF9EA] text-[#63553C] border-[#E8DEC4]',
          cardBorder: 'border-[#E8DEC4] focus-within:ring-[#E5D3B3]/20'
        };
      case 'Day 4':
        return {
          banner: 'bg-[#A8C5DB] text-[#2C485A]',
          badge: 'bg-[#EBF5FA] text-[#2C485A] border-[#CFDFE8]',
          cardBorder: 'border-[#CFDFE8] focus-within:ring-[#A8C5DB]/20'
        };
      case 'Day 5':
        return {
          banner: 'bg-[#C9B6A1] text-[#4A443F]',
          badge: 'bg-[#FAF8F3] text-[#5C4D3E] border-[#EADFCF]',
          cardBorder: 'border-[#EADFCF] focus-within:ring-[#C9B6A1]/20'
        };
      default: // Ideas / general unscheduled
        return {
          banner: 'bg-[#4A443F] text-white',
          badge: 'bg-[#FAF8F5] text-[#4A443F] border-[#E8E2D9]',
          cardBorder: 'border-[#E8E2D9] focus-within:ring-[#4A443F]/20'
        };
    }
  };

  const theme = getDayTheme(card.day);

  return (
    <div
      id={`travel-card-${card.id}`}
      style={{
        position: 'absolute',
        left: card.x,
        top: card.y,
        width: 200,
        height: 140,
        transformOrigin: 'top left',
      }}
      className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-lg transition-[box-shadow] duration-200 flex flex-col justify-between overflow-hidden group/card cursor-grab active:cursor-grabbing ${theme.cardBorder} ${
        isConnectingSource ? 'ring-4 ring-[#D48C70] ring-offset-2' : ''
      }`}
      onMouseDown={(e) => {
        if (!isEditing) onDragStart(card.id, e);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Top Banner Tag */}
      <div className={`px-3 py-1 text-[11px] font-display font-semibold tracking-wider flex items-center justify-between select-none ${theme.banner}`}>
        <div className="flex items-center gap-1.5 opacity-90">
          <Calendar className="w-3.5 h-3.5" />
          <span>{card.day}</span>
        </div>
        {!isEditing && (
          <span className="text-[9px] px-1.5 py-0.5 bg-white/20 rounded font-normal leading-none opacity-85 select-none font-mono">
            Attraction
          </span>
        )}
      </div>

      {/* Delete button */}
      <button
        id={`card-delete-btn-${card.id}`}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(card.id);
        }}
        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/25 hover:bg-white text-white hover:text-red-500 flex items-center justify-center transition cursor-pointer z-10"
        title="Delete attraction card"
      >
        <X className="w-3 h-3" />
      </button>

      {/* Primary Card Contents */}
      <div className="p-3 flex-1 flex flex-col justify-center items-center text-center">
        {isEditing ? (
          <div className="w-full flex flex-col gap-1.5">
            <input
              id={`card-input-name-${card.id}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-xs font-semibold px-2 py-1 border border-[#E8E2D9] rounded-lg text-center font-sans focus:outline-none focus:ring-2 focus:ring-[#8FA18C] focus:border-transparent bg-[#FAF8F5] text-[#4A443F]"
              placeholder="e.g. Eiffel Tower"
              maxLength={40}
              autoFocus
            />
            
            <div className="flex items-center gap-1 bg-[#FAF8F5] p-0.5 rounded-lg border border-[#E8E2D9]">
              <select
                id={`card-select-day-${card.id}`}
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-transparent border-none text-[10px] font-semibold text-[#4A443F] outline-none p-1 cursor-pointer"
              >
                {AVAILABLE_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              
              <button
                id={`card-save-btn-${card.id}`}
                onClick={handleSave}
                className="bg-[#8FA18C] text-white rounded-md p-1 hover:bg-[#7D8E7A] shrink-0 cursor-pointer"
                title="Save"
              >
                <Check className="w-3 h-3" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center select-none w-full">
            <div className="p-1 px-2.5 bg-[#FAF8F5] border border-[#E8E2D9]/70 rounded-full flex items-center gap-1 mb-1 shadow-2xs max-w-full overflow-hidden">
              <MapPin className="w-3 h-3 text-[#D48C70] shrink-0" />
              <span className="text-[12px] font-semibold text-[#4A443F] whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                {card.name}
              </span>
            </div>

            <div className={`p-0.5 px-2 text-[10px] rounded-full border flex items-center gap-1 font-mono ${theme.badge}`}>
              <Tag className="w-2.5 h-2.5 text-[#D48C70]" />
              <span>{card.day} Plan</span>
            </div>
          </div>
        )}
      </div>

      {/* Connector Actions Floor */}
      {!isEditing && onStartConnector && (
        <div className="px-3 py-1.5 border-t border-[#E8E2D9]/40 bg-[#FAF8F5]/80 flex justify-between items-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 select-none">
          <span className="text-[9px] text-[#4A443F]/60 font-mono leading-none">Double-click to Edit</span>
          <button
            id={`card-conn-btn-${card.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onStartConnector(card.id);
            }}
            className="flex items-center gap-1 py-1 px-2 rounded-md bg-[#8FA18C]/15 border border-[#8FA18C]/30 hover:bg-[#8FA18C] hover:text-white text-[#3D4C3A] text-[10px] font-semibold transition cursor-pointer"
            title="Start connector arrow"
          >
            <span>+ Link Route</span>
          </button>
        </div>
      )}
    </div>
  );
}
