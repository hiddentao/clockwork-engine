import { Game } from "./Game"

// Initialize the game when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game()

  // Expose game instance globally for debugging
  ;(window as any).gameInstance = game

  game.initialize()
})
