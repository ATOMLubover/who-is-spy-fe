import type { Player } from "./player";

export type RoomStatus =
  | "Waiting"
  | "Preparing"
  | "Voting"
  | "Judging"
  | "Finished";

export type Room = {
  id: string;
  name: string;
  creator: Player;
  words: string[];
  joinedPlayers: Player[];
  status: RoomStatus;
};

export type CreateRoomRequest = {
  roomName: string;
  creatorName: string;
};

export type CreateRoomResponse = {
  roomId: string;
  creator: Player;
};

export type JoinRoomRequest = {
  roomId: string;
  playerName: string;
};

export type JoinRoomResponse = {
  joinedPlayers: Player[];
};

export type UpdateWordListRequest = {
  words: string[];
};

export type StartGameRequest = {
  roomId: string;
};

export type SendMessageRequest = {
  message: string;
};

export type VotePlayerRequest = {
  votedPlayerId: string;
};

export type ReqMsgTypeStartGame = "start_game";
export type ReqMsgTypeSendMessage = "send_message";
export type ReqMsgTypeVotePlayer = "vote_player";

export type RoomStreamRequest =
  | {
      type: ReqMsgTypeStartGame;
      payload: StartGameRequest;
      roomId: string;
      playerId: string;
    }
  | {
      type: ReqMsgTypeSendMessage;
      payload: SendMessageRequest;
      roomId: string;
      playerId: string;
    }
  | {
      type: ReqMsgTypeVotePlayer;
      payload: VotePlayerRequest;
      roomId: string;
      playerId: string;
    };

export type NewChatResponse = {
  playerId: string;
  message: string;
};

export type NewPlayerJoinedResponse = {
  newPlayer: Player;
};

export type RoomStatusUpdateResponse = {
  newStatus: RoomStatus;
  assignedWord?: string;
};

export type SpeakTurnResponse = {
  playerId: string;
};

export type VotedPlayer = {
  votedPlayerId: string;
  totalVotes: number;
};

export type VotingUpdateResponse = {
  votedPlayers: VotedPlayer[];
};

export type VotingResultResponse = {
  eliminatedPlayerId?: string;
};

export type RespMsgTypeNewChat = "new_chat";
export type RespMsgTypeNewPlayerJoined = "new_player_joined";
export type RespMsgTypeRoomStatusUpdate = "room_status_update";
export type RespMsgTypeSpeakTurn = "speak_turn";
export type RespMsgTypeVotingUpdate = "voting_update";
export type RespMsgTypeVotingResult = "voting_result";

export type RoomStreamResponse =
  | { type: RespMsgTypeNewChat; payload: NewChatResponse }
  | { type: RespMsgTypeNewPlayerJoined; payload: NewPlayerJoinedResponse }
  | { type: RespMsgTypeRoomStatusUpdate; payload: RoomStatusUpdateResponse }
  | { type: RespMsgTypeSpeakTurn; payload: SpeakTurnResponse }
  | { type: RespMsgTypeVotingUpdate; payload: VotingUpdateResponse }
  | { type: RespMsgTypeVotingResult; payload: VotingResultResponse };
