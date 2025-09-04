import { Game } from "./Game"

// Initialize the game when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const game = new Game()
  game.initialize()
})
