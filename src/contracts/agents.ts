export type AgentAvailability = "AVAILABLE" | "UNAVAILABLE" | "UNKNOWN";

export type AgentCatalogProjection = {
  agentId: string;
  technicalTarget: string;
  displayName: string;
  availability: AgentAvailability;
  active: boolean;
};
