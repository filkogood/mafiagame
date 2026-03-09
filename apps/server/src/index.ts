import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { randomUUID as uuid } from "node:crypto";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "@mafia/shared";
import {
  createBundle,
  startGame,
  advancePhase,
  toPublicState,
  applyNightKill,
  applyVoteElimination,
} from "@mafia/game-core";
import type { GameBundle } from "@mafia/game-core";

// ── State ─────────────────────────────────────────────────────────────────────
const rooms = new Map<string, GameBundle>();

// ── HTTP server ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: "*" }));
app.get("/health", (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: { origin: "*" },
});

function broadcast(roomId: string) {
  const bundle = rooms.get(roomId);
  if (!bundle) return;
  io.to(roomId).emit("state:update", toPublicState(bundle));
}

function sendMyInfo(socketId: string, roomId: string) {
  const bundle = rooms.get(roomId);
  if (!bundle) return;
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) return;
  const playerId = socket.data.playerId;
  const player = bundle.players.find((p) => p.id === playerId);
  if (!player) return;
  socket.emit("me:info", {
    id: player.id,
    name: player.name,
    role: player.role,
    alive: player.alive,
  });
}

io.on("connection", (socket) => {
  // Assign stable playerId
  socket.data.playerId = uuid();
  socket.data.roomId = null;

  // ── room:create ──────────────────────────────────────────────────────────
  socket.on("room:create", ({ playerName }) => {
    let roomId: string;
    do {
      roomId = Math.random().toString(36).slice(2, 7).toUpperCase();
    } while (rooms.has(roomId));
    socket.data.playerName = playerName;
    socket.data.roomId = roomId;

    const bundle = createBundle(
      roomId,
      socket.data.playerId,
      [{ id: socket.data.playerId, name: playerName }]
    );
    rooms.set(roomId, bundle);
    socket.join(roomId);
    broadcast(roomId);
  });

  // ── room:join ────────────────────────────────────────────────────────────
  socket.on("room:join", ({ roomId, playerName }) => {
    const bundle = rooms.get(roomId);
    if (!bundle) {
      socket.emit("error", `Room ${roomId} not found`);
      return;
    }
    if (bundle.phase !== "LOBBY") {
      socket.emit("error", "Game already started");
      return;
    }

    socket.data.playerName = playerName;
    socket.data.roomId = roomId;

    const updated: GameBundle = {
      ...bundle,
      players: [
        ...bundle.players,
        { id: socket.data.playerId, name: playerName, role: "CITIZEN", alive: true },
      ],
    };
    rooms.set(roomId, updated);
    socket.join(roomId);
    broadcast(roomId);
  });

  // ── game:start ───────────────────────────────────────────────────────────
  socket.on("game:start", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const bundle = rooms.get(roomId);
    if (!bundle) return;
    if (bundle.hostId !== socket.data.playerId) {
      socket.emit("error", "Only the host can start");
      return;
    }
    try {
      const updated = startGame(bundle);
      rooms.set(roomId, updated);
      // Send private role info to each player
      io.sockets.sockets.forEach((s) => {
        if (s.data.roomId === roomId) {
          sendMyInfo(s.id, roomId);
        }
      });
      broadcast(roomId);
    } catch (err: unknown) {
      socket.emit("error", (err as Error).message);
    }
  });

  // ── game:advance ─────────────────────────────────────────────────────────
  socket.on("game:advance", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const bundle = rooms.get(roomId);
    if (!bundle) return;
    if (bundle.hostId !== socket.data.playerId) {
      socket.emit("error", "Only the host can advance");
      return;
    }
    const updated = advancePhase(bundle);
    rooms.set(roomId, updated);
    broadcast(roomId);
  });

  // ── night:action ─────────────────────────────────────────────────────────
  socket.on("night:action", ({ targetId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const bundle = rooms.get(roomId);
    if (!bundle || bundle.phase !== "NIGHT") return;
    const updated = applyNightKill(bundle, targetId);
    rooms.set(roomId, updated);
    broadcast(roomId);
  });

  // ── vote:cast ────────────────────────────────────────────────────────────
  socket.on("vote:cast", ({ targetId }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const bundle = rooms.get(roomId);
    if (!bundle) return;
    if (bundle.phase !== "DAY_VOTE1" && bundle.phase !== "VOTE2") return;
    const updated = applyVoteElimination(bundle, targetId);
    rooms.set(roomId, updated);
    broadcast(roomId);
  });

  // ── disconnect ───────────────────────────────────────────────────────────
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const bundle = rooms.get(roomId);
    if (!bundle) return;
    // Remove from room if still in lobby
    if (bundle.phase === "LOBBY") {
      const players = bundle.players.filter(
        (p) => p.id !== socket.data.playerId
      );
      if (players.length === 0) {
        rooms.delete(roomId);
      } else {
        const hostId =
          bundle.hostId === socket.data.playerId
            ? players[0].id
            : bundle.hostId;
        rooms.set(roomId, { ...bundle, players, hostId });
        broadcast(roomId);
      }
    }
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
httpServer.listen(PORT, () => {
  console.log(`🎭 Mafia server running on http://localhost:${PORT}`);
});
