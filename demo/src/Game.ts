import {
  GameEngineEventType,
  GameRecorder,
  GameState,
  ReplayManager,
  UserInputEventSource,
} from "@hiddentao/clockwork-engine"
import { SnakeGameCanvas } from "./SnakeGameCanvas"
import { UI } from "./UI"
import { DemoGameEngine } from "./engine/DemoGameEngine"
import { DemoLoader } from "./loader/DemoLoader"
import { Direction, GAME_CONFIG } from "./utils/constants"

export class Game {
  private canvas!: SnakeGameCanvas
  private playEngine!: DemoGameEngine
  private replayEngine!: DemoGameEngine
  private activeEngine!: DemoGameEngine
  private ui!: UI
  private recorder!: GameRecorder
  private replayManager!: ReplayManager
  private loader!: DemoLoader

  // Game state
  private isRecording = false
  private isReplaying = false
  private replaySpeed = 1

  public async initialize(): Promise<void> {
    // Calculate responsive canvas size
    const canvasSize = this.calculateCanvasSize()

    // Initialize loader
    this.loader = new DemoLoader()
    console.log("🔧 DemoLoader initialized")

    // Initialize engines with loader
    this.playEngine = new DemoGameEngine(this.loader)
    this.replayEngine = new DemoGameEngine(this.loader)
    this.activeEngine = this.playEngine // Start with play engine active

    this.playEngine.reset("demo-seed-" + Date.now())

    // Demonstrate loader usage
    await this.demonstrateLoaderCapabilities()

    // Initialize systems
    this.recorder = new GameRecorder()
    this.replayManager = new ReplayManager(this.replayEngine)

    // Listen for state changes to auto-start/stop recording
    this.setupStateChangeListeners()

    // Create GameCanvas
    const gameContainer = document.getElementById("game-container")!
    const canvasContainer = document.createElement("div")
    canvasContainer.id = "game-canvas"

    this.canvas = await SnakeGameCanvas.create(canvasContainer, {
      width: canvasSize.width,
      height: canvasSize.height,
      worldWidth: GAME_CONFIG.GRID_SIZE * GAME_CONFIG.CELL_SIZE,
      worldHeight: GAME_CONFIG.GRID_SIZE * GAME_CONFIG.CELL_SIZE,
      backgroundColor: GAME_CONFIG.COLORS.BACKGROUND,
      antialias: false,
      enableDrag: false,
      enablePinch: false,
      enableWheel: false,
      enableDecelerate: false,
      minZoom: 1.0,
      maxZoom: 1.0,
      initialZoom: 1.0,
    })

    // Associate the game engine with the canvas
    this.canvas.setGameEngine(this.activeEngine)

    // Initialize UI
    this.ui = new UI(this.onUIAction.bind(this))

    // Add elements to DOM
    gameContainer.appendChild(canvasContainer)
    gameContainer.appendChild(this.ui.getElement())

    // Setup input handling
    this.setupInput()

    // Setup game loop for UI updates and replay handling
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

      // Resize GameCanvas
      this.canvas.resize(newSize.width, newSize.height)
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

        // Auto-stop replay when replay ends (but keep replay engine active)
        if (newState === GameState.ENDED && this.isReplaying) {
          console.log("🏁 Replay ended, ready to replay again...")
          this.stopReplay(false) // Don't switch to play mode
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

    // Queue input event with inputType and data
    console.log(`📨 Queueing input data:`, {
      inputType: "direction",
      direction,
    })
    eventSource.queueInput("direction", { direction })
  }

  private handlePauseResume(): void {
    const currentState = this.activeEngine.getState()

    if (currentState === GameState.PLAYING) {
      console.log("⏸️  Pausing game/replay...")
      this.activeEngine.pause()
    } else if (currentState === GameState.PAUSED) {
      console.log("▶️  Resuming game/replay...")
      this.activeEngine.resume()
    }
  }

  private setupGameLoop(): void {
    const ticker = this.canvas.getApp().ticker
    ticker.add(() => {
      this.ui.updateStatus({
        state: this.activeEngine.getState(),
        frame: this.isReplaying
          ? this.replayManager.getCurrentFrame()
          : this.activeEngine.getTotalFrames(),
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
          this.canvas.getApp().ticker.speed = this.replaySpeed
        }
        break
    }
  }

  private startRecording(): void {
    if (this.isRecording) return
    this.isRecording = true
    const description = `Snake game recorded at ${new Date().toISOString()}`

    // Set recorder on engine (this will also set it on the event manager)
    this.playEngine.setGameRecorder(this.recorder)

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

    // Clear recorder from engine
    this.playEngine.setGameRecorder(undefined)
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
    } else {
      // output recording data size in KB/MB
      const sizeInBytes = JSON.stringify(recording).length * 2
      const sizeInKB = sizeInBytes / 1024
      const sizeInMB = sizeInKB / 1024
      console.log(
        "📊 Recording data size:",
        sizeInBytes,
        "bytes",
        sizeInKB,
        "KB",
        sizeInMB,
        "MB",
      )
    }

    console.log("🎬 Starting replay mode...")
    this.isReplaying = true

    // Set ticker speed for replay
    this.canvas.getApp().ticker.speed = this.replaySpeed

    // If already on replay engine (e.g., after a replay ended), just restart
    if (this.activeEngine === this.replayManager.getReplayEngine()) {
      this.replayEngine.reset(recording.seed)
    } else {
      // Switch to replay proxy engine
      this.activeEngine = this.replayManager.getReplayEngine() as DemoGameEngine
    }

    this.canvas.setGameEngine(this.activeEngine)

    // Start replay on the replay engine (this will control the engine internally)
    this.replayManager.replay(recording)
  }

  private stopReplay(switchToPlay: boolean = true): void {
    if (!this.isReplaying) return

    console.log("⏹️ Stopping replay mode...")
    this.isReplaying = false

    // Reset ticker speed
    this.canvas.getApp().ticker.speed = 1

    this.replayManager.stopReplay()

    // Switch back to play engine only if requested
    if (switchToPlay) {
      this.switchToPlayMode()
    } else {
      // If staying in replay mode, restore canvas connection to replay engine for rendering
      this.canvas.setGameEngine(this.activeEngine)
    }
  }

  private switchToPlayMode(): void {
    console.log("🔄 Switching to play mode...")

    // Stop any ongoing recording or replay
    this.stopRecording()
    this.stopReplay()

    // Switch to play engine and reset it
    this.activeEngine = this.playEngine
    // Restore GameCanvas engine connection for normal play mode
    this.canvas.setGameEngine(this.activeEngine)
    this.playEngine.reset("demo-seed-" + Date.now())
  }

  /**
   * Demonstrate loader capabilities during initialization
   */
  private async demonstrateLoaderCapabilities(): Promise<void> {
    console.log("🔄 Demonstrating loader capabilities...")

    try {
      // Check what data is available
      const allKeys = await this.loader.listDataKeys()
      console.log("📋 Available data keys:", allKeys)

      // List data by type
      const configKeys = await this.loader.listDataKeys("config")
      const levelKeys = await this.loader.listDataKeys("level")
      const assetKeys = await this.loader.listDataKeys("asset")

      console.log("🔧 Config keys:", configKeys)
      console.log("🎮 Level keys:", levelKeys)
      console.log("🎨 Asset keys:", assetKeys)

      // Load sample data
      const gameConfig = await this.loader.fetchData("game", { type: "config" })
      console.log("⚙️ Game config:", JSON.parse(gameConfig))

      const easyLevel = await this.loader.fetchData("easy", { type: "level" })
      console.log("🎯 Easy level:", JSON.parse(easyLevel))

      // Test data storage
      const userPrefs = {
        soundEnabled: true,
        difficulty: "medium",
        lastPlayed: new Date().toISOString(),
      }
      await this.loader.storeData("preferences", JSON.stringify(userPrefs), {
        type: "user",
      })
      console.log("💾 Stored user preferences")

      // Verify storage
      const storedPrefs = await this.loader.fetchData("preferences", {
        type: "user",
      })
      console.log("✅ Retrieved user preferences:", JSON.parse(storedPrefs))
    } catch (error) {
      console.error("❌ Loader demonstration failed:", error)
    }
  }

  /**
   * Get the loader instance for external access
   */
  public getLoader(): DemoLoader {
    return this.loader
  }
}
