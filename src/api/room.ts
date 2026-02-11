import { WS_BASE_URL, API_BASE_URL } from "../config";
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  RoomStatus,
} from "../model/room";
import type { Player, Role } from "../model/player";

// ==================== HTTP ====================

/**
 * 创建房间的第一步：调用 HTTP POST /rooms/create 接口
 * 作用：在服务端创建一个新房间，并返回该房间的唯一 room_id
 *
 * 注意：此接口仅创建房间，不会将玩家加入房间！
 * 创建后需要通过 WebSocket 发送 JoinGame 请求才能加入房间（见 RoomStreamClient.connectAndJoin）
 *
 * 完整的创建房间流程：
 * 1. 调用此 createRoom() 函数（HTTP）获取 roomId
 * 2. 调用 RoomStreamClient.connectAndJoin()（WebSocket）加入房间
 */
export async function createRoom(
  request: Pick<CreateRoomRequest, "roomName">,
): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE_URL}/rooms/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ room_name: request.roomName }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `POST /rooms/create failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  const data = await res.json();
  return { roomId: data.room_id };
}

// ==================== WebSocket ====================

// --- Data Types from Docs (websock_api.md) ---

// Response Envelope
type WireRequest = {
  request_type: string;
  data: Record<string, unknown>;
};

type WireResponse = {
  response_type: string;
  data: Record<string, unknown> | null;
  error_message?: string;
};

// High-level events the rest of the app consumes
export type RoomEvent =
  | { type: "error"; message: string }
  | {
      type: "joined";
      isSelf: boolean;
      roomId: string;
      stage: RoomStatus;
      joiner: Player;
      players: Player[];
      masterId: string;
    }
  | { type: "player_left"; playerId: string; playerName: string }
  | { type: "words_set"; wordList: string[] }
  | { type: "started"; role: Role; word: string; players?: Player[] }
  | {
      type: "describe";
      speakerId: string;
      speakerName: string;
      message: string;
    }
  | {
      type: "vote";
      voterId: string;
      voterName: string;
      targetId: string;
      targetName: string;
    }
  | {
      type: "state";
      stage: RoomStatus;
      currentTurnId?: string;
      currentTurnName?: string;
      round: number;
    }
  | {
      type: "eliminate";
      eliminatedId: string;
      eliminatedName: string;
      eliminatedWord: string;
    }
  | {
      type: "result";
      winner: string;
      answerWord: string;
      spyWord: string;
      playerRoles: Record<string, string>;
      playerWords: Record<string, string>;
    };

export type RoomStreamEventHandler = (event: RoomEvent) => void;

export class RoomStreamClient {
  private ws: WebSocket | null = null;
  private listeners: Set<RoomStreamEventHandler> = new Set();
  private selfName: string | null = null;
  private selfId: string | null = null;

  /**
   * 通过 WebSocket 连接并加入房间
   *
   * 用途：
   * 1. 创建房间后的第二步：使用 HTTP createRoom() 获得的 roomId 加入房间
   * 2. 直接加入已有房间：使用已知的 roomId 加入房间
   *
   * 流程：
   * - 建立 WebSocket 连接到 /api/v1/ws/join
   * - 连接成功后立即发送 JoinGame 请求
   * - 首个加入者成为管理员（Admin），后续加入者为普通玩家或观察者
   */
  connectAndJoin(roomId: string, joinerName: string): Promise<Player> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE_URL}/join`;
      this.ws = new WebSocket(url);
      this.selfName = joinerName;
      let settled = false;
      const guard = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("JoinGame timeout"));
          this.ws?.close();
        }
      }, 5000);

      const cleanup = () => {
        clearTimeout(guard);
      };

      const onOpen = () => {
        // 发送 JoinGame 请求加入房间（创建房间的第二步，或直接加入的唯一步骤）
        this.send("JoinGame", { room_id: roomId, joiner_name: joinerName });
      };

      const onMessage = (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data) as WireResponse;
          const mapped = this.fromWire(raw);
          if (!mapped) return;
          // Resolve on first self join
          if (mapped.type === "joined" && mapped.isSelf && !settled) {
            settled = true;
            cleanup();
            resolve(mapped.joiner);
          }
          this.listeners.forEach((l) => l(mapped));
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      const onError = (error: Event) => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(error);
        }
      };

      const onClose = () => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error("Connection closed before JoinGame"));
        }
      };

      this.ws.onopen = onOpen;
      this.ws.onmessage = onMessage;
      this.ws.onerror = onError;
      this.ws.onclose = onClose;
    });
  }

  private fromWire(raw: WireResponse): RoomEvent | null {
    const type = raw.response_type;

    if (type === "Error") {
      return { type: "error", message: raw.error_message || "Unknown error" };
    }

    if (type === "JoinGame" && raw.data) {
      const joiner = raw.data.joiner as Player;
      const isSelf =
        (this.selfId && this.selfId === joiner.id) ||
        (!this.selfId && this.selfName === joiner.name);
      if (isSelf && !this.selfId) {
        this.selfId = joiner.id;
      }
      return {
        type: "joined",
        isSelf,
        roomId: String(raw.data.room_id || ""),
        stage: raw.data.stage as RoomStatus,
        joiner,
        players: (raw.data.players as Player[]) || [],
        masterId: String(raw.data.master_id || ""),
      };
    }

    if (type === "ExitGame" && raw.data) {
      return {
        type: "player_left",
        playerId: String(raw.data.left_player_id || ""),
        playerName: String(raw.data.left_player_name || ""),
      };
    }

    if (type === "SetWords" && raw.data) {
      return {
        type: "words_set",
        wordList: (raw.data.word_list as string[]) || [],
      };
    }

    if (type === "StartGame" && raw.data) {
      return {
        type: "started",
        role: raw.data.assigned_role as Role,
        word: (raw.data.assigned_word as string) || "",
        players: (raw.data.players as Player[]) || undefined,
      };
    }

    if (type === "Describe" && raw.data) {
      return {
        type: "describe",
        speakerId: String(raw.data.speaker_id || ""),
        speakerName: String(raw.data.speaker_name || ""),
        message: String(raw.data.message || ""),
      };
    }

    if (type === "Vote" && raw.data) {
      return {
        type: "vote",
        voterId: String(raw.data.voter_id || ""),
        voterName: String(raw.data.voter_name || ""),
        targetId: String(raw.data.target_id || ""),
        targetName: String(raw.data.target_name || ""),
      };
    }

    if (type === "GameState" && raw.data) {
      return {
        type: "state",
        stage: raw.data.stage as RoomStatus,
        currentTurnId: raw.data.current_turn_id as string | undefined,
        currentTurnName: raw.data.current_turn_name as string | undefined,
        round: Number(raw.data.round || 0),
      };
    }

    if (type === "Eliminate" && raw.data) {
      return {
        type: "eliminate",
        eliminatedId: String(raw.data.eliminated_id || ""),
        eliminatedName: String(raw.data.eliminated_name || ""),
        eliminatedWord: String(raw.data.eliminated_word || ""),
      };
    }

    if (type === "GameResult" && raw.data) {
      return {
        type: "result",
        winner: String(raw.data.winner || ""),
        answerWord: String(raw.data.answer_word || ""),
        spyWord: String(raw.data.spy_word || ""),
        playerRoles: (raw.data.player_roles as Record<string, string>) || {},
        playerWords: (raw.data.player_words as Record<string, string>) || {},
      };
    }

    return null;
  }

  private send(requestType: string, data: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("WS not open, cannot send", requestType);
      return;
    }
    const payload: WireRequest = {
      request_type: requestType,
      data,
    };
    this.ws.send(JSON.stringify(payload));
  }

  // Client-facing send helpers
  setWords(adminId: string, words: string[]) {
    this.send("SetWords", { set_player_id: adminId, word_list: words });
  }

  startGame(adminId: string) {
    this.send("StartGame", { start_player_id: adminId });
  }

  describe(playerId: string, message: string) {
    this.send("Describe", { req_player_id: playerId, message });
  }

  vote(playerId: string, targetId: string) {
    this.send("Vote", { voter_id: playerId, target_id: targetId });
  }

  subscribe(handler: RoomStreamEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.selfName = null;
    this.selfId = null;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
