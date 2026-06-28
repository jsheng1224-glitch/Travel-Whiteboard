import express from "express";
import path from "path";
import http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini API client safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI organizer features will fallback gracefully.");
}

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-memory whiteboard store
// Rooms isolates different trip brainstorming boards (e.g. roomId = "main", "paris-2026")
interface RoomState {
  elements: { [id: string]: any };
}

const boards: { [roomId: string]: RoomState } = {
  main: { elements: {} }
};

// WebSocket server configuration
const wss = new WebSocketServer({ noServer: true });

// Attach WS upgrade handling
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Broadcast helper for clients inside the same room
function broadcastToRoom(sender: WebSocket, roomId: string, message: string) {
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      // We attach the roomId property to socket connections at connection time
      if ((client as any).roomId === roomId) {
        client.send(message);
      }
    }
  });
}

wss.on("connection", (ws: WebSocket, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const roomId = url.searchParams.get("roomId") || "main";
  const userId = url.searchParams.get("userId") || Math.random().toString(36).substring(2, 9);
  
  // Tag the socket with room details
  (ws as any).roomId = roomId;
  (ws as any).userId = userId;

  // Make sure room state is initialized
  if (!boards[roomId]) {
    boards[roomId] = { elements: {} };
  }

  console.log(`User ${userId} joined room: ${roomId}`);

  // Send initial room state to new user
  ws.send(JSON.stringify({
    type: "sync",
    elements: boards[roomId].elements,
    userId: userId
  }));

  // Notify others about presence update
  broadcastToRoom(ws, roomId, JSON.stringify({
    type: "user:join",
    userId,
    roomId
  }));

  ws.on("message", (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());
      
      switch (data.type) {
        case "element:create":
        case "element:update":
          // Store elements in memory database
          if (data.element && data.element.id) {
            boards[roomId].elements[data.element.id] = data.element;
            // Broadcast element change
            broadcastToRoom(ws, roomId, messageData.toString());
          }
          break;

        case "element:delete":
          if (data.elementId) {
            delete boards[roomId].elements[data.elementId];
            broadcastToRoom(ws, roomId, messageData.toString());
          }
          break;

        case "element:clear":
          boards[roomId].elements = {};
          broadcastToRoom(ws, roomId, messageData.toString());
          break;

        case "cursor:move":
          broadcastToRoom(ws, roomId, JSON.stringify({
            type: "cursor:move",
            userId: userId,
            name: data.name || "Traveller",
            color: data.color || "#64748b",
            x: data.x,
            y: data.y,
            activeTool: data.activeTool
          }));
          break;

        case "reaction:add":
          broadcastToRoom(ws, roomId, JSON.stringify({
            type: "reaction:add",
            userId: userId,
            emoji: data.emoji,
            x: data.x,
            y: data.y,
            id: Math.random().toString(36).substring(2, 11)
          }));
          break;

        default:
          break;
      }
    } catch (e) {
      console.error("Failed to parse WebSocket message:", e);
    }
  });

  ws.on("close", () => {
    console.log(`User ${userId} disconnected from room: ${roomId}`);
    broadcastToRoom(ws, roomId, JSON.stringify({
      type: "user:leave",
      userId
    }));
  });
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", activeRooms: Object.keys(boards) });
});

// AI Self-Organizer Route
app.post("/api/ai-organize", async (req, res) => {
  const { command, currentCards, roomId } = req.body;
  const activeRoomId = roomId || "main";

  if (!boards[activeRoomId]) {
    boards[activeRoomId] = { elements: {} };
  }

  // Graceful handling if Gemini API key is missing
  if (!ai) {
    // Generate a fallback layout client-side or simulate a simple layout
    return res.status(200).json({
      success: false,
      error: "Gemini API key is missing. Please set GEMINI_API_KEY in the Secrets panel.",
      aiSummary: "I see your command, but I can't access Gemini because your GEMINI_API_KEY is not defined. I've automatically arranged your cards chronologically so your whiteboard stays super organized!",
      fallback: true
    });
  }

  try {
    const formattedCards = currentCards.map((c: any) => ({
      id: c.id,
      name: c.name,
      day: c.day || "Day 1",
      x: c.x,
      y: c.y,
    }));

    // Instruct Gemini 3.5 Flash to organize, schedule, and connect travel items logically
    const prompt = `You are a helpful travel planning assistant helping beginners plan their trip.
The user wants to organize a whiteboard with travel cards. The cards represent attraction points or activities.

USER COMMAND: "${command}"

CURRENT TRAVEL CARDS ON THE WHITEBOARD:
${JSON.stringify(formattedCards, null, 2)}

YOUR TASKS:
1. Organize the existing cards as requested (modifying their Day or details if asked).
2. Generate NEW cards if the user command asks to add new locations, destinations, or attractions! Make up unique IDs for new cards.
   - Remember, travel cards must ONLY have the fields: id, name, day (e.g. "Day 1", "Day 2", "Day 3"), x, y. Keep name brief!
3. Assign coordinate layouts (x and y) to arrange them beautifully.
   - For a beginner-friendly layout, group them in vertical panels or columns representing each Day.
   - Let's place Day 1 cards in a column: x = 200, Day 2 column: x = 550, Day 3 column: x = 900.
   - For "Ideas" or unscheduled cards, place them in a column on the far left or right (e.g., x = -150 or x = 1250).
   - Arrange items in each column sequentially vertically: y starts at 150 and increments by 170 for each card.
4. Draw arrows / route connectors sequentially:
   - Within each Day, connect consecutive attractions in order. Form a connector object with { id: "connector_id", fromCardId: "card_prev_id", toCardId: "card_next_id", color: "#f43f5e" (romantic pink, ocean blue, active orange) }.
   - If appropriate, connect the last item of Day 1 to the first item of Day 2 to map the continuous dream route!
5. Compose a friendly, cheerful, short paragraph summary explaining how you organized their trip, suggesting useful advice. Keep the tone beginner friendly, warm, and highly visual. Do not include path files.

Return your answer strictly in the requested JSON structure.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            updatedCards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  day: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER }
                },
                required: ["id", "name", "day", "x", "y"]
              }
            },
            newConnectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  fromCardId: { type: Type.STRING },
                  toCardId: { type: Type.STRING },
                  color: { type: Type.STRING }
                },
                required: ["id", "fromCardId", "toCardId", "color"]
              }
            },
            aiSummary: { type: Type.STRING }
          },
          required: ["updatedCards", "newConnectors", "aiSummary"]
        }
      }
    });

    const resultText = response.text || "{}";
    const parsedResult = JSON.parse(resultText);

    // Update in-memory room states with the newly formatted/generated items!
    // We remove stale connectors and cards, then inject new ones.
    const roomElements = boards[activeRoomId].elements;

    // Filter out existing cards and existing auto-connectors
    Object.keys(roomElements).forEach((key) => {
      const el = roomElements[key];
      if (el.type === "card" || el.type === "connector") {
        delete roomElements[key];
      }
    });

    // Write new cards
    parsedResult.updatedCards.forEach((card: any) => {
      roomElements[card.id] = {
        ...card,
        type: "card"
      };
    });

    // Write new connectors
    parsedResult.newConnectors.forEach((conn: any) => {
      roomElements[conn.id] = {
        ...conn,
        type: "connector"
      };
    });

    res.json({
      success: true,
      updatedCards: parsedResult.updatedCards,
      newConnectors: parsedResult.newConnectors,
      aiSummary: parsedResult.aiSummary
    });

  } catch (error: any) {
    console.error("AI self-organization failed:", error);
    res.status(500).json({ success: false, error: error.message || "Unknown error occurred" });
  }
});

// Vite Middleware & Static Assets Routing
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
