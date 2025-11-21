/**
 * Node Helpers
 *
 * Shared utilities for safe node access across rendering layers.
 */

import type { NodeId } from "../types"

/**
 * Execute callback with node state if it exists
 *
 * Helper utility for safe node access with default values.
 * Returns the callback result if node exists, otherwise returns defaultValue.
 */
export function withNode<TNodeState, T>(
  nodes: Map<NodeId, TNodeState>,
  id: NodeId,
  callback: (state: TNodeState) => T,
  defaultValue?: T,
): T | undefined {
  const state = nodes.get(id)
  if (!state) return defaultValue
  return callback(state)
}
