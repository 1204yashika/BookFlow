// The actions in BookFlow that need authorization
export type Permission =
  | "service:create"
  | "service:update"
  | "service:delete"
  | "staff:manage"
  | "booking:create"
  | "booking:cancelAny"   // cancel anyone's booking (owner/staff)
  | "booking:viewAll";    // see the whole org's bookings

// What each role is allowed to do
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  OWNER: [
    "service:create", "service:update", "service:delete",
    "staff:manage", "booking:create", "booking:cancelAny", "booking:viewAll",
  ],
  STAFF: [
    "booking:create", "booking:cancelAny", "booking:viewAll",
  ],
  CUSTOMER: [
    "booking:create",   // customers can only book
  ],
};

export function can(role: string | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}