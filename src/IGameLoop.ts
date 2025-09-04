export interface IGameLoop {
  /**
   * Update the game state for the current frame
   * @param deltaFrames Number of frames since the last update
   * @param totalFrames Total number of frames processed since start
   */
  update(deltaFrames: number, totalFrames: number): void | Promise<void>
}
