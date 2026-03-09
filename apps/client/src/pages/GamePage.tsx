import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getSocket } from "../socket.ts";
import type { GameState, MyInfo } from "@mafia/shared";

const ROLE_ICONS: Record<string, string> = {
  MAFIA: "🔪",
  DETECTIVE: "🔍",
  DOCTOR: "💊",
  CITIZEN: "👤",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  MAFIA: "Eliminate citizens at night",
  DETECTIVE: "Investigate a player each night",
  DOCTOR: "Protect a player from being killed",
  CITIZEN: "Find and vote out the Mafia",
};

export default function GamePage() {
  const socket = getSocket();
  const [state, setState] = useState<GameState | null>(null);
  const [myInfo, setMyInfo] = useState<MyInfo | null>(null);
  const [error, setError] = useState<string>("");

  // Form state
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [inRoom, setInRoom] = useState(false);

  useEffect(() => {
    socket.on("state:update", (s) => {
      setState(s);
      setInRoom(true);
    });
    socket.on("me:info", (info) => setMyInfo(info));
    socket.on("error", (msg) => setError(msg));

    return () => {
      socket.off("state:update");
      socket.off("me:info");
      socket.off("error");
    };
  }, [socket]);

  const handleCreate = () => {
    if (!playerName.trim()) return;
    setError("");
    socket.emit("room:create", { playerName: playerName.trim() });
  };

  const handleJoin = () => {
    if (!playerName.trim() || !joinRoomId.trim()) return;
    setError("");
    socket.emit("room:join", {
      roomId: joinRoomId.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  const handleStart = () => socket.emit("game:start");
  const handleAdvance = () => socket.emit("game:advance");

  const isHost = state && myInfo && state.hostId === myInfo.id;

  return (
    <div className="container">
      <h1>🎭 Mafia Game</h1>
      <Link to="/test-lab" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        → 테스트 랩
      </Link>

      {!inRoom && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <h2>Join or Create</h2>
          <div className="row" style={{ marginBottom: "0.75rem" }}>
            <input
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ maxWidth: 200 }}
            />
          </div>
          <div className="row">
            <button onClick={handleCreate} disabled={!playerName.trim()}>
              Create Room
            </button>
            <input
              placeholder="Room ID"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              style={{ maxWidth: 120 }}
            />
            <button
              onClick={handleJoin}
              disabled={!playerName.trim() || !joinRoomId.trim()}
            >
              Join Room
            </button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
      )}

      {state && (
        <>
          <div className="card">
            <div className="row">
              <span>Room:</span>
              <strong>{state.roomId}</strong>
              <span className="phase-tag">{state.phase}</span>
              {state.round > 0 && <span>Round {state.round}</span>}
            </div>
            {state.lastEvent && (
              <p style={{ marginTop: "0.5rem", color: "#94a3b8" }}>
                {state.lastEvent}
              </p>
            )}
            {state.winner && (
              <p style={{ marginTop: "0.5rem", fontWeight: 700, color: "#fbbf24" }}>
                🏆 Winner: {state.winner}
              </p>
            )}
          </div>

          {myInfo && (
            <div className="card profile-card">
              <div
                className="profile-avatar"
                data-role={myInfo.role.toLowerCase()}
              >
                <span className="profile-icon">
                  {ROLE_ICONS[myInfo.role] ?? "❓"}
                </span>
              </div>
              <div className="profile-details">
                <div className="profile-name">
                  <span className={myInfo.alive ? "" : "profile-dead"}>
                    {myInfo.name}
                  </span>
                  {!myInfo.alive && (
                    <span className="badge dead" style={{ marginLeft: "0.5rem" }}>
                      💀 Dead
                    </span>
                  )}
                  {myInfo.alive && (
                    <span className="profile-alive-dot" title="Alive" />
                  )}
                </div>
                <div className="profile-role">
                  <span className={`badge ${myInfo.role.toLowerCase()}`}>
                    {myInfo.role}
                  </span>
                  <span className="profile-role-desc">
                    {ROLE_DESCRIPTIONS[myInfo.role]}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h2>Players ({state.players.filter((p) => p.alive).length} alive)</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {state.players.map((p) => (
                <span
                  key={p.id}
                  className={`badge ${p.alive ? "" : "dead"}`}
                >
                  {p.name}
                  {state.hostId === p.id ? " 👑" : ""}
                </span>
              ))}
            </div>
          </div>

          {isHost && state.phase === "LOBBY" && (
            <div className="row">
              <button onClick={handleStart} disabled={state.players.length < 3}>
                Start Game
              </button>
              {state.players.length < 3 && (
                <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                  Need at least 3 players
                </span>
              )}
            </div>
          )}

          {isHost && state.phase !== "LOBBY" && state.phase !== "ENDED" && (
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button onClick={handleAdvance}>Advance Phase →</button>
            </div>
          )}

          {error && <p className="error-msg">{error}</p>}
        </>
      )}
    </div>
  );
}
