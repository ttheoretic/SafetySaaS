import type { Role } from '../store/store.module';

/** Granular permissions checked by the RBAC guard. */
export type Permission =
  | 'project:read'
  | 'project:write'
  | 'scan:run'
  | 'connection:write'
  | 'member:manage'
  | 'billing:manage'
  | 'org:manage';

const MEMBER: Permission[] = ['project:read', 'project:write', 'scan:run', 'connection:write'];
const ADMIN: Permission[] = [...MEMBER, 'member:manage', 'billing:manage'];
const OWNER: Permission[] = [...ADMIN, 'org:manage'];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: ['project:read'],
  member: MEMBER,
  admin: ADMIN,
  owner: OWNER,
};

export function roleHasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Ordering for "can this role manage that role" checks. */
export const ROLE_RANK: Record<Role, number> = {
  viewer: 1,
  member: 2,
  admin: 3,
  owner: 4,
};
