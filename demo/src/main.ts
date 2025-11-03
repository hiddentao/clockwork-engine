import { Game } from "./Game"

// Initialize the game when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game()

  // Expose game instance globally for debugging
  ;(window as any).gameInstance = game

  game.initialize()

  console.log("🎮 Game initialized. For debugging:")
  console.log(
    "  - Set window.clockworkDebug = true before refresh to enable debug mode",
  )
  console.log("  - Or call gameInstance.setDebugMode(true) from console")
})
