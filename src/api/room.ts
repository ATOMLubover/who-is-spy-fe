import { WS_BASE_URL, API_BASE_URL } from "../config";
import type {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  UpdateWordListRequest,
  RoomStreamRequest,
  RoomStreamResponse,
  RoomStatus,
  NewChatResponse,
  NewPlayerJoinedResponse,
  RoomStatusUpdateResponse,
  SpeakTurnResponse,
  VotedPlayer,
  VotingUpdateResponse,
  VotingResultResponse,
} from "../model/room";
import type { Player, Role } from "../model/player";

// ==================== Unary RPCs ====================

type WireCreateRoomRequest = {
  room_name: string;
  creator_name: string;
};

type WireJoinRoomRequest = {
  room_id: string;
  player_name: string;
};

type WireUpdateWordListRequest = {
  room_id: string;
  words: string[];
};

export async function createRoom(
  request: CreateRoomRequest,
): Promise<CreateRoomResponse> {
  const wireRequest: WireCreateRoomRequest = {
    room_name: request.roomName,
    creator_name: request.creatorName,
  };
  const res = await fetch(`${API_BASE_URL}/room/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wireRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `POST /room/create failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return (await res.json()) as CreateRoomResponse;
}

export async function joinRoom(
  request: JoinRoomRequest,
): Promise<JoinRoomResponse> {
  const wireRequest: WireJoinRoomRequest = {
    room_id: request.roomId,
    player_name: request.playerName,
  };
  const res = await fetch(`${API_BASE_URL}/room/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wireRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `POST /room/join failed: ${res.status} ${res.statusText} ${text}`,
    );
  }

  return (await res.json()) as JoinRoomResponse;
}

export async function updateWordList(
  roomId: string,
  request: UpdateWordListRequest,
): Promise<void> {
  const wireRequest: WireUpdateWordListRequest = {
    room_id: roomId,
    words: request.words,
  };
  const res = await fetch(`${API_BASE_URL}/room/words`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(wireRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `POST /room/words failed: ${res.status} ${res.statusText} ${text}`,
    );
  }
  return;
}

// ==================== WebSocket Stream ====================

// Wire format types (snake_case for Proto JSON mapping)
type WirePlayer = {
  id: string;
  name: string;
  role: string;
  word?: string;
};

type WireStartGameRequest = {
  room_id: string;
};

type WireSendMessageRequest = {
  message: string;
};

type WireVotePlayerRequest = {
  voted_player_id: string;
};

type WireRequest = {
  room_id: string;
  player_id: string;
  start_game?: WireStartGameRequest;
  send_message?: WireSendMessageRequest;
  vote_player?: WireVotePlayerRequest;
};

type WireNewChatResponse = {
  player_id: string;
  message: string;
};

type WireNewPlayerJoinedResponse = {
  new_player: WirePlayer;
};

type WireRoomStatusUpdateResponse = {
  new_status: string;
  assigned_word?: string;
};

type WireSpeakTurnResponse = {
  player_id: string;
};

type WireVotedPlayer = {
  voted_player_id: string;
  total_votes: number;
};

type WireVotingUpdateResponse = {
  voted_players: WireVotedPlayer[];
};

type WireVotingResultResponse = {
  eliminated_player_id?: string;
};

type WireResponse = {
  new_chat?: WireNewChatResponse;
  new_player_joined?: WireNewPlayerJoinedResponse;
  room_status_update?: WireRoomStatusUpdateResponse;
  speak_turn?: WireSpeakTurnResponse;
  voting_update?: WireVotingUpdateResponse;
  voting_result?: WireVotingResultResponse;
};

// Helper: Convert wire Player to TS Player
function fromWirePlayer(wire: WirePlayer): Player {
  return {
    id: wire.id,
    name: wire.name,
    role: wire.role as Role,
    word: wire.word,
  };
}

// Helper: Convert wire RoomStatus to TS RoomStatus
function fromWireRoomStatus(wire: string): RoomStatus {
  // Proto enum values: Waiting, AssigningRoles, Voting, Judging, Finished
  // TS type: "Waiting" | "Preparing" | "Voting" | "Judging" | "Finished"
  if (wire === "AssigningRoles") {
    return "Preparing";
  }
  return wire as RoomStatus;
}

// Adapter: TS Discriminated Union → Proto JSON (Wire Format)
function toWireRequest(request: RoomStreamRequest): WireRequest {
  const wire: WireRequest = {
    room_id: request.roomId,
    player_id: request.playerId,
  };

  switch (request.type) {
    case "start_game": {
      const wirePayload: WireStartGameRequest = {
        room_id: request.payload.roomId,
      };
      wire.start_game = wirePayload;
      break;
    }
    case "send_message": {
      const wirePayload: WireSendMessageRequest = {
        message: request.payload.message,
      };
      wire.send_message = wirePayload;
      break;
    }
    case "vote_player": {
      const wirePayload: WireVotePlayerRequest = {
        voted_player_id: request.payload.votedPlayerId,
      };
      wire.vote_player = wirePayload;
      break;
    }
  }

  return wire;
}

// Adapter: Proto JSON (Wire Format) → TS Discriminated Union
function fromWireResponse(wire: WireResponse): RoomStreamResponse {
  if (wire.new_chat) {
    const payload: NewChatResponse = {
      playerId: wire.new_chat.player_id,
      message: wire.new_chat.message,
    };
    return {
      type: "new_chat",
      payload,
    };
  }

  if (wire.new_player_joined) {
    const payload: NewPlayerJoinedResponse = {
      newPlayer: fromWirePlayer(wire.new_player_joined.new_player),
    };
    return {
      type: "new_player_joined",
      payload,
    };
  }

  if (wire.room_status_update) {
    const payload: RoomStatusUpdateResponse = {
      newStatus: fromWireRoomStatus(wire.room_status_update.new_status),
      assignedWord: wire.room_status_update.assigned_word,
    };
    return {
      type: "room_status_update",
      payload,
    };
  }

  if (wire.speak_turn) {
    const payload: SpeakTurnResponse = {
      playerId: wire.speak_turn.player_id,
    };
    return {
      type: "speak_turn",
      payload,
    };
  }

  if (wire.voting_update) {
    const payload: VotingUpdateResponse = {
      votedPlayers: wire.voting_update.voted_players.map(
        (vp): VotedPlayer => ({
          votedPlayerId: vp.voted_player_id,
          totalVotes: vp.total_votes,
        }),
      ),
    };
    return {
      type: "voting_update",
      payload,
    };
  }

  if (wire.voting_result) {
    const payload: VotingResultResponse = {
      eliminatedPlayerId: wire.voting_result.eliminated_player_id,
    };
    return {
      type: "voting_result",
      payload,
    };
  }

  throw new Error("Unknown wire response format");
}

export type RoomStreamEventHandler = (response: RoomStreamResponse) => void;

export class RoomStreamClient {
  private ws: WebSocket | null = null;
  private listeners: Set<RoomStreamEventHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private roomId: string | null = null;
  private playerId: string | null = null;

  connect(roomId: string, playerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.roomId = roomId;
      this.playerId = playerId;

      const url = `${WS_BASE_URL}/room/stream?room_id=${roomId}&player_id=${playerId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const wireResponse: WireResponse = JSON.parse(event.data);
          const tsResponse = fromWireResponse(wireResponse);
          this.listeners.forEach((listener) => listener(tsResponse));
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket closed");
        this.attemptReconnect();
      };
    });
  }

  private attemptReconnect(): void {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      this.roomId &&
      this.playerId
    ) {
      this.reconnectAttempts++;
      console.log(
        `Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );

      setTimeout(() => {
        this.connect(this.roomId!, this.playerId!).catch((error) => {
          console.error("Reconnect failed:", error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(request: RoomStreamRequest): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket is not connected");
    }

    const wireRequest = toWireRequest(request);
    this.ws.send(JSON.stringify(wireRequest));
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
    this.roomId = null;
    this.playerId = null;
  }

  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
