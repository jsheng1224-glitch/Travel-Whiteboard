# Requirements & Functional Specification Reference - WanderBoard

This document defines the functional scope, user interactions, entity schemas, and core operational constraints of the WanderBoard application. It serves as a persistent context guide for developers and AI agents when modifying features or verifying behaviors.

---

## 1. Core Core Features & Functional Scope

### A. Infinite Collaborative Canvas
*   **Coordinate Bounds**: Logical canvas space extends to a $3200\text{px} \times 2400\text{px}$ grid centered in space.
*   **Panning**: Panning moves the camera coordinate offset. Triggered by:
    1.  Holding the `Spacebar` + dragging with the mouse.
    2.  Activating the **Pan** tool from the toolbar and dragging anywhere.
    3.  Middle mouse button click-and-drag.
*   **Zooming**: Zoom bounds are clamped between $20\%$ (scale $0.2$) and $300\%$ (scale $3.0$). Triggered by:
    1.  Using a trackpad pinch gesture (detected via control-key wheel events).
    2.  Clicking the **Zoom In (+)** / **Zoom Out (-)** widgets on the bottom-left navigation bar.
*   **Viewport Alignment Controls**:
    *   `Reset`: Centers the canvas view in the middle of the workspace at $90\%$ zoom.
    *   `Nearest`: Moves the camera to center focus on the nearest element (notes, cards, drawings, text) relative to the current viewpoint center.

### B. Element Types & Interactions

#### 1. Travel Attraction Cards (`type: 'card'`)
*   **Purpose**: Represents travel spots or checkpoints mapped to a schedule.
*   **Design & Styling**: Fixed size ($200\text{px} \times 140\text{px}$). Visual theme adapts to scheduled Days:
    *   `Day 1`: Sage Green (`#8FA18C`)
    *   `Day 2`: Sunset Terra Cotta (`#D48C70`)
    *   `Day 3`: Sandy Gold (`#E5D3B3`)
    *   `Day 4`: Oceanic Dust (`#A8C5DB`)
    *   `Day 5`: Lavender Ash (`#C9B6A1`)
    *   `Ideas`: Earthy Charcoal (`#4A443F`)
*   **Interactions**:
    *   Drag anywhere on the card body to move it.
    *   Double-click to open edit menu (supports renaming attraction, updating assigned Day, or saving changes).
    *   Click **+ Link Route** (or drag connection node) to start a connector line mapping to another card.

#### 2. Sticky Notes (`type: 'note'`)
*   **Purpose**: Flexible information boards for packing lists, flight bookings, or hotel details.
*   **Design**: Mimics a physical sticky note with a transparent tape header overlay. Adapts to active palette selection color.
*   **Interactions**:
    *   Double-click to edit text inside a scrollable textbox (max 180 characters).
    *   Blur input or press checkmark to save changes.

#### 3. Floating Text Elements (`type: 'text'`)
*   **Purpose**: Custom headers, notes, or section titles.
*   **Interactions**:
    *   Created instantly by double-clicking on empty space on the canvas background.
    *   Renders with a top-left hover drag handle (`Move`) to prevent mouse conflicts while typing.
    *   Double-click inline text to edit font style, alignment (left, center, right), or bullet points list.

#### 4. SVG Connector Lines (`type: 'connector'`)
*   **Purpose**: Displays routes and sequential flow directions between travel locations.
*   **Design**: Rendered as a dashed animated line (`strokeDasharray`) using the source card's color, ending in an directional arrowhead (`markerEnd`).
*   **Interactions**:
    *   Midpoint displays a red deletion button (`X`) on hover, allowing users to remove route connections.

#### 5. Freehand Drawings (`type: 'drawing'`)
*   **Purpose**: Sketched paths, circular markups, or custom doodles.
*   **Design**: Freehand lines rendered using SVG path points. Line width can be customized in the toolbar (range $2\text{px}$ to $12\text{px}$).

---

## 2. Shared State & Multiplayer Communication Schema

Collaboration is coordinated via WebSockets under Room-level isolation.

```json
// Example element payloads sent over WebSocket
{
  "type": "element:create" | "element:update",
  "element": {
    "id": "card_a1b2c3d",
    "type": "card",
    "x": 420,
    "y": 680,
    "name": "Senso-ji Temple",
    "day": "Day 1"
  }
}
```

### Supported Events:
1.  `sync`: Sent by the server immediately after connecting to deliver all active room elements.
2.  `element:create` / `element:update`: Broadcasts updates when elements are dragged or modified.
3.  `element:delete`: Sent when a card, note, or connector is removed.
4.  `element:clear`: Wipes the board clean.
5.  `cursor:move`: Real-time coordinate broadcast tracking collaborator mouse positions.
6.  `reaction:add`: Triggers float-rise emoji animation overlays (`👍`, `❤️`, `🎉`, `🚀`, `💡`, `🍿`).

---

## 3. AI Organizer Integration Specifications

*   **Endpoint**: `/api/ai-organize`
*   **Input Context**:
    *   `command`: Natural language instruction (e.g. *"Plan a 3-Day Tokyo itinerary starting at Shibuya"*).
    *   `currentCards`: Array of travel cards currently residing on the canvas.
*   **Gemini Model**: `gemini-3.5-flash`
*   **Output Guidelines (JSON Schema)**:
    1.  Arrange Day 1 cards vertically in column $x=200$, Day 2 in column $x=550$, Day 3 in column $x=900$. Unscheduled cards go to $x=-150$.
    2.  Re-arrange y coordinates sequentially starting at $y=150$, incrementing by $170\text{px}$ per card to prevent overlaps.
    3.  Generate sequence connector arrows linking consecutive spots in order.
    4.  Deliver a short, visual, and warm travel summary paragraph explaining the planned route.
