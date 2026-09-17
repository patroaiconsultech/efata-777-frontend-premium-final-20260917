export type CanonicalAgentProjection = {
  agentId: string;
  displayName: string;
};

/**
 * Frontend projection only.
 * Authorization, resolution, turn ownership and effective capabilities remain backend authority.
 */
export type RequestedTarget = {
  agentId: string;
  technicalTarget: string;
};
