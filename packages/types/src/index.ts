export type DependencyHealthState = "up" | "down";

export interface HealthResponse {
  status: "ok";
  service: "api";
  timestamp: string;
}

export interface ReadinessDependencies {
  postgres: DependencyHealthState;
  redis: DependencyHealthState;
  objectStorage: DependencyHealthState;
}

export interface ReadinessResponse {
  status: "ready" | "not_ready";
  dependencies: ReadinessDependencies;
  timestamp: string;
}
