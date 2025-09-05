import {
  GameEngineEventType,
  GameRecorder,
  GameState,
  ReplayManager,
  UserInputEventSource,
} from "clockwork"
import * as PIXI from "pixi.js"
import { Renderer } from "./Renderer"
import { UI } from "./UI"
import { DemoGameEngine } from "./engine/DemoGameEngine"
import { Direction } from "./utils/constants"

const REPLAY_MAX_FRAMES_PER_UPDATE = 0.1

export class Game {
  private app!: PIXI.Application
  private playEngine!: DemoGameEngine
  private replayEngine!: DemoGameEngine
  private activeEngine!: DemoGameEngine
  private renderer!: Renderer
  private ui!: UI
  private recorder!: GameRecorder
  private replayManager!: ReplayManager

  // Game state
  private isRecording = false
  private isReplaying = false
  private replaySpeed = 1

  public async initialize(): Promise<void> {
    // Create PIXI application
    const canvas = document.createElement("canvas")
    canvas.id = "game-canvas"

    // Calculate responsive canvas size
    const canvasSize = this.calculateCanvasSize()

    this.app = new PIXI.Application()
    await this.app.init({
      canvas,
      width: canvasSize.width,
      height: canvasSize.height,
      backgroundColor: 0x1a1a2e,
      antialias: false,
    })

    // Initialize engines
    this.playEngine = new DemoGameEngine()
    this.replayEngine = new DemoGameEngine()
    this.activeEngine = this.playEngine // Start with play engine active

    this.playEngine.reset("demo-seed-" + Date.now())

    // Initialize systems
    this.recorder = new GameRecorder()
    this.replayManager = new ReplayManager(this.replayEngine)

    // Replay engine has NO recorder connected - prevents re-recording

    // Listen for state changes to auto-start/stop recording
    this.setupStateChangeListeners()

    // Initialize renderer and UI
    this.renderer = new Renderer(this.app)
    this.ui = new UI(this.onUIAction.bind(this))

    // Add canvas to DOM
    const gameContainer = document.getElementById("game-container")!
    gameContainer.appendChild(canvas)
    gameContainer.appendChild(this.ui.getElement())

    // Setup input handling
    this.setupInput()

    // Setup game loop using PIXI ticker
    this.setupGameLoop()

    // Setup responsive canvas
    this.setupResponsiveCanvas()
  }

  private calculateCanvasSize(): { width: number; height: number } {
    const isMobile = window.innerWidth <= 768
    const isTablet = window.innerWidth <= 1024 && window.innerWidth > 768

    if (isMobile) {
      // Mobile: use most of screen width, square aspect ratio
      const maxWidth = Math.min(window.innerWidth - 20, 400)
      return { width: maxWidth, height: maxWidth }
    } else if (isTablet) {
      // Tablet: larger but still square
      const maxWidth = Math.min(window.innerWidth - 40, 600)
      return { width: maxWidth, height: maxWidth }
    } else {
      // Desktop: fixed size
      return { width: 600, height: 600 }
    }
  }

  private setupResponsiveCanvas(): void {
    const handleResize = () => {
      const newSize = this.calculateCanvasSize()

      // Resize PIXI application
      this.app.renderer.resize(newSize.width, newSize.height)

      // Update canvas element size
      const canvas = this.app.canvas as HTMLCanvasElement
      canvas.style.width = `${newSize.width}px`
      canvas.style.height = `${newSize.height}px`
    }

    // Listen for window resize
    window.addEventListener("resize", handleResize)
  }

  private setupStateChangeListeners(): void {
    this.playEngine.on(
      GameEngineEventType.STATE_CHANGE,
      (newState, oldState) => {
        console.log(`🎮 State changed: ${oldState} → ${newState}`)
        if (newState === GameState.PLAYING) {
          if (!this.isRecording) {
            console.log("📹 Auto-starting recording...")
            this.startRecording()
          }
        }
        if (
          (newState === GameState.ENDED || newState === GameState.READY) &&
          this.isRecording
        ) {
          console.log("🛑 Auto-stopping recording...")
          this.stopRecording()
        }
      },
    )

    // Listen for replay engine state changes
    this.replayEngine.on(
      GameEngineEventType.STATE_CHANGE,
      (newState, oldState) => {
        console.log(`🎬 Replay state changed: ${oldState} → ${newState}`)

        // Auto-stop replay when replay ends
        if (newState === GameState.ENDED && this.isReplaying) {
          console.log("🏁 Replay ended, ready to replay again...")
          this.isReplaying = false
          this.setTickerSpeed(1) // Reset to normal speed
          this.replayManager.stopReplay() // Clear replay manager state
          // Don't switch engines - keep replay engine active
        }
      },
    )
  }

  private setupInput(): void {
    document.addEventListener("keydown", (event) => {
      let direction: Direction | null = null

      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
          direction = Direction.UP
          break
        case "ArrowDown":
        case "KeyS":
          direction = Direction.DOWN
          break
        case "ArrowLeft":
        case "KeyA":
          direction = Direction.LEFT
          break
        case "ArrowRight":
        case "KeyD":
          direction = Direction.RIGHT
          break
        case "Space":
          event.preventDefault()
          this.handlePauseResume()
          return
      }

      // Only process movement input if not replaying
      if (direction !== null && !this.isReplaying) {
        event.preventDefault()
        this.handleDirectionInput(direction)
      }
    })
  }

  private handleDirectionInput(direction: Direction): void {
    console.log(`🎮 Key pressed: ${direction}`)

    // Auto-start game if in READY state
    if (this.activeEngine.getState() === GameState.READY) {
      console.log("🚀 Auto-starting game from movement key...")
      this.activeEngine.start()
    }

    const eventManager = this.activeEngine.getEventManager()
    const eventSource = eventManager.getSource() as UserInputEventSource

    // Queue input event with just the data
    console.log(`📨 Queueing input data:`, { direction })
    eventSource.queueInput({ direction })
  }

  private handlePauseResume(): void {
    const currentState = this.activeEngine.getState()

    if (currentState === GameState.PLAYING) {
      console.log("⏸️  Pausing game/replay...")
      this.activeEngine.pause()
    } else if (currentState === GameState.PAUSED) {
      console.log("▶️  Resuming game/replay...")
      this.activeEngine.resume()
      // Ensure normal speed for gameplay (not replay)
      if (!this.isReplaying) {
        this.setTickerSpeed(1)
      }
    }
  }

  private setupGameLoop(): void {
    this.app.ticker.add((ticker) => {
      const deltaFrames = ticker.deltaTime

      if (this.isReplaying && deltaFrames > REPLAY_MAX_FRAMES_PER_UPDATE) {
        // During replay, split large deltaFrames into smaller chunks
        const numUpdates = Math.ceil(deltaFrames / REPLAY_MAX_FRAMES_PER_UPDATE)
        const fractionPerUpdate = deltaFrames / numUpdates

        for (let i = 0; i < numUpdates; i++) {
          this.activeEngine.update(fractionPerUpdate)
        }
      } else {
        // Normal gameplay or small deltaFrames - pass directly
        this.activeEngine.update(deltaFrames)
      }

      this.renderer.render(this.activeEngine)

      this.ui.updateStatus({
        state: this.activeEngine.getState(),
        frame: this.activeEngine.getTotalFrames(),
        isRecording: this.isRecording,
        isReplaying: this.isReplaying,
        replaySpeed: this.replaySpeed,
      })
    })
  }

  private onUIAction(action: string, data?: any): void {
    console.log(`🔧 UI Action: ${action}`, data)
    const currentState = this.activeEngine.getState()
    console.log(`📊 Current state: ${currentState}`)

    switch (action) {
      case "pause":
        this.handlePauseResume()
        break
      case "reset":
        this.switchToPlayMode()
        break
      case "record":
        this.startRecording()
        break
      case "stopRecord":
        this.stopRecording()
        break
      case "replay":
        this.startReplay()
        break
      case "stopReplay":
        this.stopReplay()
        break
      case "replaySpeed":
        this.replaySpeed = data
        if (this.isReplaying) {
          this.setTickerSpeed(this.replaySpeed)
        }
        break
    }
  }

  private startRecording(): void {
    if (this.isRecording) return
    this.isRecording = true
    const description = `Snake game recorded at ${new Date().toISOString()}`
    this.recorder.startRecording(
      this.playEngine.getEventManager(),
      this.playEngine.getSeed(),
      description,
    )
  }

  private stopRecording(): void {
    if (!this.isRecording) return
    this.isRecording = false
    this.recorder.stopRecording()
  }

  private startReplay(): void {
    if (this.isReplaying) {
      console.log("❌ Cannot start replay - already replaying")
      return
    }

    const recording = this.recorder.getCurrentRecording()
    if (!recording) {
      console.log("❌ Cannot start replay - no recording found")
      return
    }

    console.log("🎬 Starting replay mode...")
    this.isReplaying = true
    this.setTickerSpeed(this.replaySpeed)

    // If already on replay engine (e.g., after a replay ended), just restart
    if (this.activeEngine === this.replayEngine) {
      this.replayEngine.reset(recording.seed)
    } else {
      // Switch to replay engine
      this.activeEngine = this.replayEngine
    }

    // Start replay on the replay engine
    this.replayManager.replay(recording)
  }

  private stopReplay(): void {
    if (!this.isReplaying) return

    console.log("⏹️ Stopping replay mode...")
    this.isReplaying = false
    this.setTickerSpeed(1) // Reset to normal speed
    this.replayManager.stopReplay()

    // Switch back to play engine
    this.switchToPlayMode()
  }

  private switchToPlayMode(): void {
    console.log("🔄 Switching to play mode...")

    // Stop any ongoing recording or replay
    this.stopRecording()
    this.stopReplay()

    // Switch to play engine and reset it
    this.activeEngine = this.playEngine
    this.playEngine.reset("demo-seed-" + Date.now())

    // Reset speed
    this.setTickerSpeed(1)
  }

  private setTickerSpeed(speed: number): void {
    this.app.ticker.speed = speed
  }
}
