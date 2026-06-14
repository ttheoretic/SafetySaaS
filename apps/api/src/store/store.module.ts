import { Global, Injectable, Module } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

/**
 * In-memory data store for the runnable scaffold.
 *
 * In production this is replaced by the Prisma/PostgreSQL repository layer
 * described in prisma/schema.prisma and docs/DATABASE.md. The interface is
 * intentionally narrow so swapping the implementation is mechanical.
 */
export interface ProjectRecord {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  environment: string;
  createdAt: string;
}

export interface ScanRecord {
  id: string;
  orgId: string;
  projectId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed';
  graph?: unknown;
  reliabilityScore?: number;
  findings?: unknown[];
  recommendations?: unknown[];
  createdAt: string;
  finishedAt?: string;
}

export interface ConnectionRecord {
  id: string;
  orgId: string;
  projectId: string;
  provider: string;
  status: 'active' | 'error' | 'revoked';
  /** Non-secret provider config: repos to scan, regions, etc. */
  metadata: Record<string, unknown>;
  createdAt: string;
}

@Injectable()
export class Store {
  private projects = new Map<string, ProjectRecord>();
  private scans = new Map<string, ScanRecord>();
  private connections = new Map<string, ConnectionRecord>();

  createProject(input: Omit<ProjectRecord, 'id' | 'createdAt'>): ProjectRecord {
    const record: ProjectRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.projects.set(record.id, record);
    return record;
  }

  listProjects(orgId: string): ProjectRecord[] {
    return [...this.projects.values()].filter((p) => p.orgId === orgId);
  }

  getProject(id: string): ProjectRecord | undefined {
    return this.projects.get(id);
  }

  createScan(input: Omit<ScanRecord, 'id' | 'createdAt'>): ScanRecord {
    const record: ScanRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.scans.set(record.id, record);
    return record;
  }

  updateScan(id: string, patch: Partial<ScanRecord>): ScanRecord | undefined {
    const existing = this.scans.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.scans.set(id, updated);
    return updated;
  }

  getScan(id: string): ScanRecord | undefined {
    return this.scans.get(id);
  }

  listScans(projectId: string): ScanRecord[] {
    return [...this.scans.values()]
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  createConnection(
    input: Omit<ConnectionRecord, 'id' | 'createdAt'>,
  ): ConnectionRecord {
    const record: ConnectionRecord = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    this.connections.set(record.id, record);
    return record;
  }

  listConnections(projectId: string): ConnectionRecord[] {
    return [...this.connections.values()].filter(
      (c) => c.projectId === projectId,
    );
  }
}

@Global()
@Module({ providers: [Store], exports: [Store] })
export class StoreModule {}
