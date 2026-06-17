import {
  Globe, Server, Database, Boxes, ListTree, Plug, Network, HardDrive, Cloud, Globe2,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleType } from '@/lib/architecture';

export const moduleIcon: Record<ModuleType, LucideIcon> = {
  frontend: Globe,
  api: Network,
  service: Server,
  database: Database,
  cache: Boxes,
  queue: ListTree,
  external_api: Plug,
  cdn: Cloud,
  dns: Globe2,
  storage: HardDrive,
};
