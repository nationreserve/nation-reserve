import type { DependencyHealthState } from "@nation-reserve/types";

export interface ManagedDependency {
  connect(): Promise<void>;
  check(): Promise<DependencyHealthState>;
  close(): Promise<void>;
}

export interface ReadinessDependencies {
  postgres: Pick<ManagedDependency, "check">;
  redis: Pick<ManagedDependency, "check">;
  objectStorage: Pick<ManagedDependency, "check">;
}
