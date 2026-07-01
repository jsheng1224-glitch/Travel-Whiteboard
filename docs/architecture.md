# System Architecture Reference - WanderBoard

This document serves as the technical architecture reference for the WanderBoard collaborative whiteboard application. Any future structural or design changes to the application should be updated here.

```mermaid
graph TD
    subgraph Client (Vite + React SPA)
        App[App.tsx - Canvas Orchestrator]
        Toolbar[Floating Toolbar UI]
        Canvas[whiteboard-board-canvas]
        
        subgraph Sub-Components
            CardComp[TravelCardComponent]
            StickyComp[StickyNoteComponent]
            TextComp[BoardTextComponent]
            LinesComp[ConnectorLines SVG]
            CollabComp[CollaborationPresence]
        end
        
        App --> Toolbar
        App --> Canvas
        Canvas --> CardComp
        Canvas --> StickyComp
        Canvas --> TextComp
        Canvas --> LinesComp
        Canvas --> CollabComp
    end

    subgraph Server (Express + WebSocket Server)
        HttpServer[HTTP Server]
        Wss[WebSocket Server]
        MemoryDB[(In-Memory Boards Store)]
        AiRoute[/api/ai-organize Route]
        
        HttpServer --> Wss
        HttpServer --> AiRoute
    end
    
    subgraph External
        Gemini[Gemini 3.5 Flash API]
    end

    %% Client-Server Connections
    App <-->|WebSocket Connection| Wss
    App -->|POST Request| AiRoute
    AiRoute <-->|SDK Call| Gemini
    Wss <-->|Sync State| MemoryDB
```

---

## 1. Frontend Client Architecture (React SPA)
The frontend is a single-page application built with **React**, **TypeScript**, and **Vite**. It centers around an **infinite virtual canvas** coordination model:

*   **Virtual Space Mapping & Coordinate System**: The canvas operates on a logical 3200px coordinate grid. The client maps screen space (client pixels) to canvas space (logical pixels) by taking the camera state (`x`, `y` translation offset and `z` zoom scale) into account:
    $$\text{Logical Coordinate} = \frac{\text{Client Coordinate} - \text{Camera Offset}}{\text{Camera Zoom}}$$
*   **Viewport & Gesture Controls**: 
    *   **Panning**: Handled by tracking mouse movement when the spacebar is held down (`isSpacePressed`) or the `pan` tool is active.
    *   **Pinch-to-Zoom**: Captured by intercepting raw, non-passive trackpad `wheel` events and adjusting the zoom factor centered relative to the pointer's coordinates.
*   **Frustum Culling (Spatial Filtering)**: To prevent browser lag on dense boards, elements (notes, cards, drawings) check their absolute boundary coordinates against `isElementVisible()` and `isStrokeVisible()`. Items that fall outside of the viewport boundary with a safe margin (+200px) are culled from rendering in the DOM.
*   **SVG Rendering Layer**: 
    *   *Freehand Strokes*: Captured in mouseMove events as raw coordinate coordinates, which are converted on the fly to SVG vector lines using custom bezier/poly path rendering (`pointsToSvgPath`).
    *   *Arrow Connectors*: Rendered dynamically using `<line>` overlays between card coordinates, configured with custom marker arrowheads (`markerEnd`).

---

## 2. Backend Server Architecture (`server.ts`)
The server serves a dual purpose using a unified HTTP/WebSocket entrypoint running on **Node.js** with **Express**:

*   **Static Asset Delivery & Development Middleware**: In production, Express hosts Vite's built bundles (`dist/`). In development, Vite is integrated as a middleware to support Hot Module Replacement (HMR).
*   **Multiplayer WebSocket Orchestration (`ws`)**: 
    *   Every connection is initialized with a `roomId` and `userId` query parameter.
    *   The backend holds an in-memory database of room states (`boards`).
    *   When an element is edited (dragged, updated, created, or deleted), the backend records the delta in the active room store and broadcasts the JSON payload to other participants inside that specific room.
*   **Presence & Interaction Sync**: Tracks peer cursors (`cursor:move`) and renders transient floating emoji reactions (`reaction:add`) on top of the viewport canvas.

---

## 3. AI Copilot Architecture (Gemini 3.5 Flash)
The application handles semantic whiteboard organizing through a custom backend API route (`/api/ai-organize`):

*   **Prompt Engineering Structure**: The server formats active whiteboard cards (names, scheduling day, coordinate positions) into a string structure. It passes the user's natural language command alongside this state to Gemini 3.5 Flash.
*   **Structured JSON Output**: Using the `@google/genai` library, the model is configured with a strict `responseSchema` requirement. The AI must return:
    1.  `updatedCards`: Realigned cards mapped into neat vertical day-columns ($x = 200$, $550$, $900$) sorted chronologically.
    2.  `newConnectors`: Sequentially drawn arrows linking related cards together.
    3.  `aiSummary`: A friendly, cheerful conversational summary of the changes made.
*   **State Syncing**: The server updates the in-memory board state with the AI-aligned layout and triggers a `sync` event down to all client WebSockets to redraw the layout in real-time.
