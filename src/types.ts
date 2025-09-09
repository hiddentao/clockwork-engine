// Game execution states for engine lifecycle management
export enum GameState {
  READY = "READY",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
}

// Event classification for game event processing
export enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE",
}

// Event data structures for game state recording
export interface GameEvent {
  type: GameEventType
  frame: number
  timestamp: number
}

export interface UserInputEvent extends GameEvent {
  type: GameEventType.USER_INPUT
  inputType: string
  params: any
}

export interface ObjectUpdateEvent extends GameEvent {
  type: GameEventType.OBJECT_UPDATE
  objectType: string
  objectId: string
  method: string
  params: any
}

export interface GameRecording {
  seed: string
  events: GameEvent[]
  deltaFrames: number[]
  totalFrames: number
  metadata?: {
    createdAt: number
    version?: string
    description?: string
    [key: string]: any
  }
}

export type AnyGameEvent = UserInputEvent | ObjectUpdateEvent
