import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { RoomStreamClient } from "../../../api/room";
import type { RoomEvent } from "../../../api/room";
import type { Player, Role } from "../../../model/player";
import type { RoomStatus } from "../../../model/room";

// ==================== Types ====================

export type LogType =
  | "chat"
  | "join"
  | "status"
  | "speak"
  | "vote"
  | "result"
  | "system";

export type GameLog = {
  id: string;
  timestamp: number;
} & (
  | { type: "chat"; playerId: string; message: string; playerName?: string }
  | { type: "join"; player: Player }
  | {
      type: "status";
      status: RoomStatus;
      assignedWord?: string;
      currentTurnId?: string;
      currentTurnName?: string;
    }
  | { type: "speak"; playerId: string }
  | { type: "vote"; votedPlayers: VotedPlayer[] }
  | { type: "result"; eliminatedPlayerId?: string }
  | { type: "system"; message: string }
);

type VotedPlayer = {
  votedPlayerId: string;
  totalVotes: number;
};

export interface GameState {
  roomId: string | null;
  playerId: string | null;
  myRole: Role | null;
  myWord: string | null;
  myName: string | null;
  masterId: string | null;
  roomStatus: RoomStatus;
  hasVoted: boolean;
  myVotedFor: string | null;
  joinStatus: "idle" | "connecting" | "joined" | "failed";
  joinError?: string;
  connected: boolean;
  players: Player[];
  messages: GameLog[];
  wordList: string[];
  eliminatedIds: string[];
  gameResult: {
    winner: string;
    answerWord: string;
    spyWord: string;
    playerRoles: Record<string, string>;
    playerWords: Record<string, string>;
  } | null;
}

// ==================== Context Definition ====================

interface GameContextValue extends GameState {
  sendMessage: (message: string) => void;
  startGame: () => void;
  votePlayer: (votedPlayerId: string) => void;
  updateWordList: (words: string[]) => Promise<void>;
  disconnect: () => void;
  connect: (roomId: string, playerName: string) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

// ==================== Reducer ====================

const initialState: GameState = {
  roomId: null,
  playerId: null,
  myName: null,
  myRole: null,
  myWord: null,
  myVotedFor: null,
  masterId: null,
  roomStatus: "Waiting",
  hasVoted: false,
  joinStatus: "idle",
  joinError: undefined,
  connected: false,
  players: [],
  messages: [],
  wordList: [],
  eliminatedIds: [],
  gameResult: null,
};

type GameAction =
  | { type: "CONNECT_START" }
  | { type: "CONNECT_SUCCESS"; roomId: string; playerName: string }
  | { type: "CONNECT_FAILURE"; error: string }
  | { type: "DISCONNECTED" }
  | { type: "ROOM_EVENT"; payload: RoomEvent };

const generateId = () =>
  globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "CONNECT_START":
      return {
        ...state,
        joinStatus: "connecting",
        joinError: undefined,
        connected: false,
      };

    case "CONNECT_SUCCESS":
      return {
        ...state,
        joinStatus: "joined",
        connected: true,
        roomId: action.roomId,
        myName: action.playerName,
      };

    case "CONNECT_FAILURE":
      return {
        ...state,
        joinStatus: "failed",
        joinError: action.error,
        connected: false,
      };

    case "DISCONNECTED":
      return {
        ...state,
        joinStatus: "idle",
        connected: false,
        messages: [
          ...state.messages,
          {
            id: generateId(),
            timestamp: Date.now(),
            type: "system",
            message: "已断开与服务器的连接",
          },
        ],
      };

    case "ROOM_EVENT": {
      const event = action.payload;
      const logId = generateId();
      const now = Date.now();
      const { messages, players } = state;

      // Handle disconnected specifically
      if ((event as unknown as { type: string }).type === "disconnected") {
        return {
          ...state,
          connected: false,
          joinStatus: "idle",
          messages: [
            ...messages,
            {
              id: logId,
              timestamp: now,
              type: "system",
              message: "已断开与服务器的连接",
            },
          ],
        };
      }

      switch (event.type) {
        case "error":
          return {
            ...state,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "system",
                message: event.message,
              },
            ],
            joinStatus:
              state.joinStatus === "connecting" ? "failed" : state.joinStatus,
            joinError:
              state.joinStatus === "connecting"
                ? event.message
                : state.joinError,
          };

        case "joined": {
          const selfUpdate = event.isSelf
            ? {
                playerId: event.joiner.id,
                myRole: event.joiner.role,
                myWord: event.joiner.word || null,
                joinStatus: "joined" as const,
              }
            : {};

          return {
            ...state,
            ...selfUpdate,
            masterId: event.masterId,
            roomStatus: event.stage,
            hasVoted: false,
            myVotedFor: null,
            players: event.players,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "join",
                player: event.joiner,
              },
            ],
          };
        }

        case "player_left": {
          const updatedPlayers = players.filter((p) => p.id !== event.playerId);
          return {
            ...state,
            players: updatedPlayers,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "system",
                message: `${event.playerName} 已离开房间`,
              },
            ],
          };
        }

        case "words_set":
          return {
            ...state,
            wordList: event.wordList,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "system",
                message: `词库已更新 (${event.wordList.length})`,
              },
            ],
          };

        case "started":
          return {
            ...state,
            myRole: event.role,
            myWord: event.word,
            roomStatus: "Preparing",
            hasVoted: false,
            myVotedFor: null,
            players: event.players || players,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "status",
                status: "Preparing",
                assignedWord: event.word,
              },
            ],
          };

        case "describe":
          return {
            ...state,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "chat",
                playerId: event.speakerId,
                playerName: event.speakerName,
                message: event.message,
              },
            ],
          };

        case "vote": {
          const newState = {
            ...state,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "vote",
                votedPlayers: [
                  {
                    votedPlayerId: event.targetId,
                    totalVotes: 1,
                  },
                ],
              },
            ] as GameLog[],
          };

          if (event.voterId && event.voterId === state.playerId) {
            newState.hasVoted = true;
            newState.myVotedFor = event.targetId;
          }
          return newState;
        }

        case "state":
          return {
            ...state,
            roomStatus: event.stage,
            hasVoted: event.stage === "Voting" ? false : state.hasVoted,
            myVotedFor: event.stage === "Voting" ? null : state.myVotedFor,
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "status",
                status: event.stage,
                currentTurnId: event.currentTurnId,
                currentTurnName: event.currentTurnName,
              },
            ],
          };

        case "eliminate": {
          const eliminatedId = event.eliminatedId;
          const updatedPlayers = players.map((p) =>
            p.id === eliminatedId ? { ...p, role: "Observer" as Role } : p,
          );
          const currentEliminatedIds = state.eliminatedIds;

          return {
            ...state,
            players: updatedPlayers,
            myRole:
              state.playerId && state.playerId === eliminatedId
                ? "Observer"
                : state.myRole,
            eliminatedIds: [...currentEliminatedIds, eliminatedId],
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "result",
                eliminatedPlayerId: eliminatedId,
              },
            ],
          };
        }

        case "result":
          return {
            ...state,
            roomStatus: "Finished",
            hasVoted: false,
            myVotedFor: null,
            gameResult: {
              winner: event.winner,
              answerWord: event.answerWord,
              spyWord: event.spyWord,
              playerRoles: event.playerRoles,
              playerWords: event.playerWords,
            },
            messages: [
              ...messages,
              {
                id: logId,
                timestamp: now,
                type: "system",
                message: `游戏结束，${event.winner}`,
              },
            ],
          };

        default:
          return state;
      }
    }

    default:
      return state;
  }
}

// ==================== Provider ====================

export const GameProvider: React.FC<{
  roomId: string;
  playerName: string;
  children: ReactNode;
}> = ({ roomId, playerName, children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const clientRef = useRef<RoomStreamClient | null>(null);

  // 核心逻辑：Strict Mode 安全的连接管理
  useEffect(() => {
    let isActive = true;

    // 每次 Effect 执行都创建一个全新的 Client 实例
    const client = new RoomStreamClient();
    clientRef.current = client;

    const handleEvent = (event: RoomEvent) => {
      if (isActive) {
        dispatch({ type: "ROOM_EVENT", payload: event });
      }
    };

    client.subscribe(handleEvent);

    const init = async () => {
      if (isActive) {
        dispatch({ type: "CONNECT_START" });
      }
      try {
        await client.connectAndJoin(roomId, playerName);
        if (isActive) {
          dispatch({ type: "CONNECT_SUCCESS", roomId, playerName });
        }
      } catch (err) {
        if (isActive) {
          dispatch({
            type: "CONNECT_FAILURE",
            error: err instanceof Error ? err.message : "连接失败",
          });
        }
      }
    };

    init();

    return () => {
      isActive = false;
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [roomId, playerName]);

  const sendMessage = useCallback(
    (message: string) => {
      if (clientRef.current && state.playerId) {
        clientRef.current.describe(state.playerId, message);
      }
    },
    [state.playerId],
  );

  const startGame = useCallback(() => {
    if (clientRef.current && state.playerId) {
      clientRef.current.startGame(state.playerId);
    }
  }, [state.playerId]);

  const votePlayer = useCallback(
    (votedPlayerId: string) => {
      if (clientRef.current && state.playerId) {
        clientRef.current.vote(state.playerId, votedPlayerId);
      }
    },
    [state.playerId],
  );

  const updateWordList = useCallback(
    async (words: string[]) => {
      if (clientRef.current && state.playerId) {
        clientRef.current.setWords(state.playerId, words);
      }
    },
    [state.playerId],
  );

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      dispatch({ type: "DISCONNECTED" });
    }
  }, []);

  const connect = useCallback(async () => {
    // No-op, managed by effect
  }, []);

  const value: GameContextValue = {
    ...state,
    sendMessage,
    startGame,
    votePlayer,
    updateWordList,
    disconnect,
    connect,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
