import { useState } from "react";
import { Link } from "react-router-dom";
import {
  createBundle,
  startGame,
  advancePhase,
  toPublicState,
} from "@mafia/game-core";
import type { GameBundle } from "@mafia/game-core";

const EXAMPLE_PLAYERS = [
  { id: "p1", name: "민준" },
  { id: "p2", name: "서연" },
  { id: "p3", name: "지호" },
  { id: "p4", name: "하은" },
  { id: "p5", name: "도윤" },
];

function makeDefaultBundle(): GameBundle {
  return createBundle("TEST", "p1", EXAMPLE_PLAYERS, 42);
}

export default function TestLabPage() {
  const [bundle, setBundle] = useState<GameBundle>(makeDefaultBundle());
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(makeDefaultBundle(), null, 2)
  );
  const [parseError, setParseError] = useState("");

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as GameBundle;
      setBundle(parsed);
      setParseError("");
    } catch (e: unknown) {
      setParseError("JSON 파싱 오류: " + (e as Error).message);
    }
  };

  const update = (fn: (b: GameBundle) => GameBundle) => {
    try {
      const next = fn(bundle);
      setBundle(next);
      setJsonText(JSON.stringify(next, null, 2));
      setParseError("");
    } catch (e: unknown) {
      setParseError((e as Error).message);
    }
  };

  const pub = toPublicState(bundle);

  return (
    <div className="container">
      <h1>🧪 테스트 랩</h1>
      <Link to="/" style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        ← 게임으로 돌아가기
      </Link>

      {/* Controls */}
      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>엔진 조작</h2>
        <div className="row">
          <button onClick={() => update(() => makeDefaultBundle())}>
            초기화
          </button>
          <button
            onClick={() => update(startGame)}
            disabled={bundle.phase !== "LOBBY"}
          >
            게임 시작
          </button>
          <button
            onClick={() => update(advancePhase)}
            disabled={bundle.phase === "LOBBY" || bundle.phase === "ENDED"}
          >
            다음 페이즈 →
          </button>
        </div>

        {bundle.phase !== "LOBBY" && bundle.phase !== "ENDED" && (
          <div style={{ marginTop: "0.75rem" }}>
            <h2>플레이어 제거 (테스트)</h2>
            <div className="row">
              {bundle.players
                .filter((p) => p.alive)
                .map((p) => (
                  <button
                    key={p.id}
                    style={{ background: "#7f1d1d" }}
                    onClick={() =>
                      update((b) => ({
                        ...b,
                        players: b.players.map((pp) =>
                          pp.id === p.id ? { ...pp, alive: false } : pp
                        ),
                        lastEvent: `${p.name} 제거됨`,
                      }))
                    }
                  >
                    {p.name} 제거
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* State view */}
      <div className="card">
        <h2>현재 상태</h2>
        <div className="row" style={{ marginBottom: "0.5rem" }}>
          <span className="phase-tag">{pub.phase}</span>
          <span>라운드 {pub.round}</span>
          {pub.winner && (
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>
              우승: {pub.winner}
            </span>
          )}
        </div>
        {pub.lastEvent && (
          <p style={{ color: "#94a3b8", marginBottom: "0.5rem" }}>
            {pub.lastEvent}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {bundle.players.map((p) => (
            <span
              key={p.id}
              className={`badge ${p.role.toLowerCase()} ${p.alive ? "" : "dead"}`}
            >
              {p.name} ({p.role})
            </span>
          ))}
        </div>
      </div>

      {/* JSON editor */}
      <div className="card">
        <h2>번들 JSON 편집</h2>
        <textarea
          rows={20}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: "0.8rem" }}
        />
        <div className="row" style={{ marginTop: "0.5rem" }}>
          <button onClick={applyJson}>JSON 적용</button>
          <button
            onClick={() => setJsonText(JSON.stringify(bundle, null, 2))}
            style={{ background: "#475569" }}
          >
            현재 상태로 되돌리기
          </button>
        </div>
        {parseError && <p className="error-msg">{parseError}</p>}
      </div>
    </div>
  );
}
