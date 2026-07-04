export const roleLevels = {
  USER: 10,
  ADMIN: 20,
  OWNER: 30
} as const;

export type MagzRole = keyof typeof roleLevels;

export function roleAtLeast(role: MagzRole, requiredRole: MagzRole) {
  return roleLevels[role] >= roleLevels[requiredRole];
}

export function assertRole(role: string): MagzRole {
  if (role === "OWNER" || role === "ADMIN" || role === "USER") {
    return role;
  }

  return "USER";
}
