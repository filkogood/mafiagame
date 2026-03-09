// ── Game phases ──────────────────────────────────────────────────────────────
export type Phase =
  | "LOBBY"
  | "NIGHT"
  | "DAY_DISCUSSION"
  | "DAY_VOTE1"
  | "VOTE2"
  | "ENDED";

// ── Player roles ─────────────────────────────────────────────────────────────
export type Role = "MAFIA" | "DETECTIVE" | "DOCTOR" | "CITIZEN";

// ── Shared player info visible to all ────────────────────────────────────────
export interface PlayerInfo {
  id: string;
  name: string;
  alive: boolean;
}

// ── Private player info sent only to that player ─────────────────────────────
export interface MyInfo {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
}

// ── Public game state broadcast to every client ──────────────────────────────
export interface GameState {
  roomId: string;
  phase: Phase;
  round: number;
  players: PlayerInfo[];
  hostId: string;
  winner: "MAFIA" | "CITIZENS" | null;
  lastEvent: string | null;
}

// ── Room creation / join payloads ─────────────────────────────────────────────
export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomId: string;
  playerName: string;
}

// ── Night-action payload ──────────────────────────────────────────────────────
export interface NightActionPayload {
  targetId: string;
}

// ── Vote payload ──────────────────────────────────────────────────────────────
export interface VotePayload {
  targetId: string;
}

// ── Socket.IO event maps ──────────────────────────────────────────────────────

/** Events the client emits, server listens */
export interface ClientToServerEvents {
  "room:create": (payload: CreateRoomPayload) => void;
  "room:join": (payload: JoinRoomPayload) => void;
  "game:start": () => void;
  "game:advance": () => void; // host advances phase (for demo)
  "night:action": (payload: NightActionPayload) => void;
  "vote:cast": (payload: VotePayload) => void;
}

/** Events the server emits, client listens */
export interface ServerToClientEvents {
  "state:update": (state: GameState) => void;
  "me:info": (info: MyInfo) => void;
  error: (message: string) => void;
}

/** Events between server sockets (unused but required by Socket.IO typing) */
export interface InterServerEvents {
  ping: () => void;
}

/** Per-socket data stored server-side */
export interface SocketData {
  playerId: string;
  playerName: string;
  roomId: string | null;
}
