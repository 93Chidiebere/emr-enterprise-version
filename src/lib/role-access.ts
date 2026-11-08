import { UserAccount } from "@/types/emr";

/**
 * Role policy for the training simulator:
 *  - A STUDENT confirms one station at the start of a class session. It stays fixed until the
 *    teacher starts a new session (then they choose again; the same station or a different one).
 *  - TEACHERS (and visitors in demo preview) can use any station.
 *  - Only teachers (and demo visitors) can open the Master View, which shows every patient.
 */
export function canSwitchRole(user: UserAccount | null): boolean {
  return !user || !!user.isAdmin;
}

export function canUseMasterView(user: UserAccount | null): boolean {
  return !user || !!user.isAdmin || user.assignedRole === "director";
}
