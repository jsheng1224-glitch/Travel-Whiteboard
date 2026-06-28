export interface Point {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  type: 'drawing';
  points: Point[];
  color: string;
  width: number;
}

export interface StickyNote {
  id: string;
  type: 'note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string; // pastel background color hex
  isEditingInitially?: boolean;
}

export interface TravelCard {
  id: string;
  type: 'card';
  x: number;
  y: number;
  name: string;
  day: string; // e.g. "Day 1", "Day 2", "Ideas"
}

export interface Connector {
  id: string;
  type: 'connector';
  fromCardId: string;
  toCardId: string;
  color: string;
}

export interface BoardText {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  alignment: 'left' | 'center' | 'right';
  isBulletPoints: boolean;
  color?: string; // e.g. text color or size category
  isEditingInitially?: boolean;
}

export type BoardElement = DrawingStroke | StickyNote | TravelCard | Connector | BoardText;

export interface Collaborator {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  activeTool?: string;
  lastActive: number;
}

export interface EmojiReaction {
  id: string;
  userId: string;
  emoji: string;
  x: number;
  y: number;
  createdAt: number;
}

export interface BoardState {
  elements: { [id: string]: BoardElement };
  roomId: string;
}
