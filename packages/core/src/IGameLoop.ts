export interface IGameLoop {
  /**
   * Update the game state for the current tick
   * @param deltaTicks Number of ticks since the last update
   * @param totalTicks Total number of ticks processed since start
   */
  update(deltaTicks: number, totalTicks: number): void | Promise<void>
}
