import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@mafia/shared";

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001";

let _socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!_socket) {
    _socket = io(SERVER_URL, { autoConnect: true });
  }
  return _socket;
}
