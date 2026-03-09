import type { Phase, Role, PlayerInfo, GameState } from "@mafia/shared";
import { mulberry32, shuffleArray } from "./prng.js";

// ── Internal player representation ───────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  role: Role;
  alive: boolean;
}

// ── Internal game bundle (everything the engine needs) ────────────────────────
export interface GameBundle {
  roomId: string;
  phase: Phase;
  round: number;
  players: Player[];
  hostId: string;
  winner: "MAFIA" | "CITIZENS" | null;
  lastEvent: string | null;
  seed: number;
}

// ── Role distribution ─────────────────────────────────────────────────────────
function assignRoles(players: Player[], rand: () => number): Player[] {
  const count = players.length;
  const mafiaCount = Math.max(1, Math.floor(count / 4));
  const detectiveCount = count >= 6 ? 1 : 0;
  const doctorCount = count >= 5 ? 1 : 0;

  const roles: Role[] = [
    ...Array<Role>(mafiaCount).fill("MAFIA"),
    ...Array<Role>(detectiveCount).fill("DETECTIVE"),
    ...Array<Role>(doctorCount).fill("DOCTOR"),
    ...Array<Role>(count - mafiaCount - detectiveCount - doctorCount).fill(
      "CITIZEN"
    ),
  ];

  const shuffled = shuffleArray(roles, rand);
  return players.map((p, i) => ({ ...p, role: shuffled[i] }));
}

// ── Win-condition check ───────────────────────────────────────────────────────
function checkWinner(players: Player[]): "MAFIA" | "CITIZENS" | null {
  const alive = players.filter((p) => p.alive);
  const mafiaAlive = alive.filter((p) => p.role === "MAFIA").length;
  const citizenAlive = alive.filter((p) => p.role !== "MAFIA").length;

  if (mafiaAlive === 0) return "CITIZENS";
  if (mafiaAlive >= citizenAlive) return "MAFIA";
  return null;
}

// ── Phase transitions ─────────────────────────────────────────────────────────
const PHASE_ORDER: Phase[] = [
  "LOBBY",
  "NIGHT",
  "DAY_DISCUSSION",
  "DAY_VOTE1",
  "VOTE2",
];

function nextPhase(current: Phase): Phase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return "NIGHT"; // wrap
  return PHASE_ORDER[idx + 1];
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a brand-new game bundle in LOBBY phase.
 */
export function createBundle(
  roomId: string,
  hostId: string,
  playerNames: { id: string; name: string }[],
  seed?: number
): GameBundle {
  const actualSeed = seed ?? Date.now();
  const players: Player[] = playerNames.map((p) => ({
    ...p,
    role: "CITIZEN",
    alive: true,
  }));
  return {
    roomId,
    phase: "LOBBY",
    round: 0,
    players,
    hostId,
    winner: null,
    lastEvent: null,
    seed: actualSeed,
  };
}

/**
 * Start the game: assign roles and advance to NIGHT.
 */
export function startGame(bundle: GameBundle): GameBundle {
  if (bundle.phase !== "LOBBY") {
    throw new Error("Game already started");
  }
  if (bundle.players.length < 3) {
    throw new Error("Need at least 3 players");
  }
  const rand = mulberry32(bundle.seed);
  const players = assignRoles(bundle.players, rand);
  return {
    ...bundle,
    phase: "NIGHT",
    round: 1,
    players,
    lastEvent: "Game started – good luck!",
  };
}

/**
 * Advance to the next phase (demo / host shortcut).
 * Also checks win conditions when appropriate.
 */
export function advancePhase(bundle: GameBundle): GameBundle {
  if (bundle.phase === "ENDED") return bundle;

  const phase = nextPhase(bundle.phase);

  const winner = checkWinner(bundle.players);
  if (winner) {
    return { ...bundle, phase: "ENDED", winner, lastEvent: `${winner} wins!` };
  }

  return { ...bundle, phase, lastEvent: `Phase → ${phase}` };
}

/**
 * Apply a night kill (target player is eliminated).
 */
export function applyNightKill(
  bundle: GameBundle,
  targetId: string
): GameBundle {
  const players = bundle.players.map((p) =>
    p.id === targetId ? { ...p, alive: false } : p
  );
  const target = bundle.players.find((p) => p.id === targetId);
  const winner = checkWinner(players);
  const phase: Phase = winner ? "ENDED" : "DAY_DISCUSSION";
  return {
    ...bundle,
    phase,
    players,
    winner,
    lastEvent: target
      ? `${target.name} was eliminated during the night.`
      : "Someone was eliminated.",
  };
}

/**
 * Apply a day vote elimination.
 */
export function applyVoteElimination(
  bundle: GameBundle,
  targetId: string
): GameBundle {
  const players = bundle.players.map((p) =>
    p.id === targetId ? { ...p, alive: false } : p
  );
  const target = bundle.players.find((p) => p.id === targetId);
  const winner = checkWinner(players);
  const phase: Phase = winner ? "ENDED" : "NIGHT";
  const round = winner ? bundle.round : bundle.round + 1;
  return {
    ...bundle,
    phase,
    round,
    players,
    winner,
    lastEvent: target
      ? `${target.name} was voted out.`
      : "Someone was voted out.",
  };
}

/**
 * Convert a GameBundle to the public GameState (strips private role info).
 */
export function toPublicState(bundle: GameBundle): GameState {
  return {
    roomId: bundle.roomId,
    phase: bundle.phase,
    round: bundle.round,
    players: bundle.players.map(
      (p): PlayerInfo => ({ id: p.id, name: p.name, alive: p.alive })
    ),
    hostId: bundle.hostId,
    winner: bundle.winner,
    lastEvent: bundle.lastEvent,
  };
}
