import { GameState } from "clockwork"

export interface UIStatus {
  state: GameState
  frame: number
  isRecording: boolean
  isReplaying: boolean
  replaySpeed: number
}

export class UI {
  private element: HTMLDivElement
  private onAction: (action: string, data?: any) => void
  private isMobileMenuOpen: boolean = false

  // UI elements
  private statusDiv!: HTMLDivElement
  private gameControls!: HTMLDivElement
  private replayControls!: HTMLDivElement
  private mobileMenuButton!: HTMLButtonElement
  private controlsContainer!: HTMLDivElement

  constructor(onAction: (action: string, data?: any) => void) {
    this.onAction = onAction
    this.element = this.createElement()
    this.setupEventListeners()
  }

  public getElement(): HTMLDivElement {
    return this.element
  }

  private createElement(): HTMLDivElement {
    const container = document.createElement("div")
    container.id = "ui-container"
    container.style.cssText = `
      font-family: monospace;
      color: #eee;
      position: relative;
    `

    // Create mobile menu button
    this.mobileMenuButton = document.createElement("button")
    this.mobileMenuButton.id = "mobile-menu-btn"
    this.mobileMenuButton.innerHTML = "☰ Menu"
    this.mobileMenuButton.style.cssText = `
      display: none;
      width: 100%;
      padding: 12px;
      background: #4a4a7e;
      color: #eee;
      border: none;
      border-radius: 8px;
      font-family: monospace;
      font-size: 16px;
      cursor: pointer;
      margin-bottom: 10px;
    `
    container.appendChild(this.mobileMenuButton)

    // Create controls container
    this.controlsContainer = document.createElement("div")
    this.controlsContainer.id = "controls-container"
    this.controlsContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 20px;
    `

    // Status display - make it prominent
    this.statusDiv = document.createElement("div")
    this.statusDiv.id = "status"
    this.statusDiv.style.cssText = `
      background: #2a2a4e;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border: 2px solid #4a4a7e;
    `
    this.controlsContainer.appendChild(this.statusDiv)

    // Game controls
    this.gameControls = document.createElement("div")
    this.gameControls.style.cssText = `margin-bottom: 20px;`
    this.gameControls.innerHTML = `
      <h3>Game Controls</h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
        <button id="pause-btn">Pause</button>
        <button id="reset-btn">Reset</button>
      </div>
      <div style="margin-top: 10px; padding: 8px; background: #1a1a3e; border-radius: 4px;">
        <small>🎮 Use WASD or Arrow Keys to move the snake</small>
      </div>
    `
    this.controlsContainer.appendChild(this.gameControls)

    // Replay controls
    this.replayControls = document.createElement("div")
    this.replayControls.innerHTML = `
      <h3>Replay</h3>
      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
        <button id="replay-btn">▶️ Start</button>
        <button id="pause-replay-btn" disabled>⏸️ Pause</button>
        <button id="stop-replay-btn" disabled>⏹️ Stop</button>
      </div>
      <div style="margin-top: 10px;">
        <label>Speed: </label>
        <input type="range" id="replay-speed" 
               min="0.1" max="10" step="0.1" value="1"
               style="width: 150px; vertical-align: middle;">
        <span id="replay-speed-value">1.0x</span>
      </div>
    `
    this.controlsContainer.appendChild(this.replayControls)

    container.appendChild(this.controlsContainer)

    // Add responsive styles
    const style = document.createElement("style")
    style.textContent = `
      #ui-container button {
        background: #4a4a7e;
        color: #eee;
        border: 1px solid #6a6aae;
        padding: 10px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-family: monospace;
        font-size: 14px;
        min-height: 44px;
        transition: background 0.2s;
      }
      #ui-container button:hover:not(:disabled) {
        background: #5a5a8e;
      }
      #ui-container button:disabled {
        background: #2a2a4e;
        color: #999;
        cursor: not-allowed;
      }
      #ui-container h3 {
        color: #fff;
        margin: 0 0 15px 0;
        font-size: 18px;
      }
      #ui-container select {
        background: #4a4a7e;
        color: #eee;
        border: 1px solid #6a6aae;
        padding: 8px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 14px;
      }
      
      /* Mobile styles */
      @media (max-width: 768px) {
        #mobile-menu-btn {
          display: block !important;
        }
        
        #controls-container {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(26, 26, 46, 0.95);
          z-index: 1000;
          padding: 20px;
          overflow-y: auto;
          backdrop-filter: blur(5px);
        }
        
        #controls-container.open {
          display: block !important;
        }
        
        #controls-container > div {
          margin-bottom: 25px;
        }
        
        #ui-container button {
          min-height: 48px;
          font-size: 16px;
          flex: 1;
        }
      }
      
      /* Desktop styles */
      @media (min-width: 769px) {
        #controls-container {
          display: flex !important;
          flex-direction: row;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        #controls-container > div {
          flex: 1;
          min-width: 250px;
        }
      }
    `
    document.head.appendChild(style)

    return container
  }

  private setupEventListeners(): void {
    // Mobile menu toggle
    this.mobileMenuButton.addEventListener("click", () => {
      this.toggleMobileMenu()
    })

    // Close mobile menu when clicking outside (on overlay)
    this.controlsContainer.addEventListener("click", (e) => {
      if (e.target === this.controlsContainer && this.isMobileMenuOpen) {
        this.toggleMobileMenu()
      }
    })

    // Game controls
    this.element.querySelector("#pause-btn")?.addEventListener("click", () => {
      this.onAction("pause")
      this.closeMobileMenuIfOpen()
    })

    this.element.querySelector("#reset-btn")?.addEventListener("click", () => {
      this.onAction("reset")
      this.closeMobileMenuIfOpen()
    })

    // Replay controls
    this.element.querySelector("#replay-btn")?.addEventListener("click", () => {
      this.onAction("replay")
      this.closeMobileMenuIfOpen()
    })

    this.element
      .querySelector("#pause-replay-btn")
      ?.addEventListener("click", () => {
        this.onAction("pause")
        this.closeMobileMenuIfOpen()
      })

    this.element
      .querySelector("#stop-replay-btn")
      ?.addEventListener("click", () => {
        this.onAction("stopReplay")
        this.closeMobileMenuIfOpen()
      })

    this.element
      .querySelector("#replay-speed")
      ?.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement
        const speed = parseFloat(target.value)
        const displayElement = this.element.querySelector("#replay-speed-value")
        if (displayElement) {
          displayElement.textContent = `${speed.toFixed(1)}x`
        }
        this.onAction("replaySpeed", speed)
      })
  }

  public updateStatus(status: UIStatus): void {
    const stateText = this.getStateText(status.state)
    const stateColor = this.getStateColor(status.state)
    const recordingText = status.isRecording ? "🔴 RECORDING" : ""
    const replayText = status.isReplaying
      ? `▶️ REPLAYING (${status.replaySpeed}x)`
      : ""

    this.statusDiv.innerHTML = `
      <div style="margin-bottom: 8px;">
        <strong>Game State:</strong> 
        <span style="color: ${stateColor}; font-weight: bold; font-size: 1.1em;">
          ${stateText}
        </span>
      </div>
      <div><strong>Frame:</strong> ${status.frame}</div>
      <div><strong>FPS:</strong> ~${Math.round(60)} (target)</div>
      ${recordingText ? `<div style="color: #ff4444; font-weight: bold; margin-top: 8px;">${recordingText}</div>` : ""}
      ${replayText ? `<div style="color: #44ff44; font-weight: bold; margin-top: 8px;">${replayText}</div>` : ""}
      <div style="margin-top: 8px; font-size: 0.9em; color: #aaa;">
        ${this.getStateInstructions(status.state)}
      </div>
    `

    // Update button states
    this.updateButtonStates(status)
  }

  private getStateColor(state: GameState): string {
    switch (state) {
      case GameState.READY:
        return "#ffaa00"
      case GameState.PLAYING:
        return "#00ff00"
      case GameState.PAUSED:
        return "#0088ff"
      case GameState.ENDED:
        return "#ff4444"
      default:
        return "#ffffff"
    }
  }

  private getStateInstructions(state: GameState): string {
    switch (state) {
      case GameState.READY:
        return "Move the snake to begin playing"
      case GameState.PLAYING:
        return "Use WASD or arrows to move snake"
      case GameState.PAUSED:
        return "Game is paused"
      case GameState.ENDED:
        return "Game over - click Reset to play again"
      default:
        return ""
    }
  }

  private updateButtonStates(status: UIStatus): void {
    const pauseBtn = this.element.querySelector(
      "#pause-btn",
    ) as HTMLButtonElement
    const replayBtn = this.element.querySelector(
      "#replay-btn",
    ) as HTMLButtonElement
    const pauseReplayBtn = this.element.querySelector(
      "#pause-replay-btn",
    ) as HTMLButtonElement
    const stopReplayBtn = this.element.querySelector(
      "#stop-replay-btn",
    ) as HTMLButtonElement

    // Game controls
    pauseBtn.disabled =
      (status.state !== GameState.PLAYING &&
        status.state !== GameState.PAUSED) ||
      status.isReplaying
    pauseBtn.textContent =
      status.state === GameState.PLAYING ? "Pause" : "Resume"

    // Replay controls
    replayBtn.disabled = status.isReplaying || status.isRecording
    pauseReplayBtn.disabled = !status.isReplaying
    pauseReplayBtn.textContent =
      status.state === GameState.PLAYING && status.isReplaying
        ? "⏸️ Pause"
        : "▶️ Resume"
    stopReplayBtn.disabled = !status.isReplaying
  }

  private getStateText(state: GameState): string {
    switch (state) {
      case GameState.READY:
        return "Ready"
      case GameState.PLAYING:
        return "Playing"
      case GameState.PAUSED:
        return "Paused"
      case GameState.ENDED:
        return "Game Over"
      default:
        return "Unknown"
    }
  }

  private toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen

    if (this.isMobileMenuOpen) {
      this.controlsContainer.classList.add("open")
      this.mobileMenuButton.innerHTML = "✕ Close Menu"
      document.body.style.overflow = "hidden"
    } else {
      this.controlsContainer.classList.remove("open")
      this.mobileMenuButton.innerHTML = "☰ Menu"
      document.body.style.overflow = ""
    }
  }

  private closeMobileMenuIfOpen(): void {
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu()
    }
  }
}
