// Game state enum - used across engine and UI
export enum GameState {
  READY = "READY",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  ENDED = "ENDED",
}

// Event type enum - used across event system
export enum GameEventType {
  USER_INPUT = "USER_INPUT",
  OBJECT_UPDATE = "OBJECT_UPDATE",
}

// Game event interfaces
export interface GameEvent {
  type: GameEventType
  frame: number
  timestamp: number
}

export interface UserInputEvent extends GameEvent {
  type: GameEventType.USER_INPUT
  inputType: string
  params: any[]
}

export interface ObjectUpdateEvent extends GameEvent {
  type: GameEventType.OBJECT_UPDATE
  objectType: string
  objectId: string
  method: string
  params: any[]
}

export interface GameRecording {
  seed: string
  events: GameEvent[]
  metadata?: {
    createdAt: number
    version?: string
    description?: string
  }
}

export type AnyGameEvent = UserInputEvent | ObjectUpdateEvent
