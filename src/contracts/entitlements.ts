export const appEntitlementStates = ['active', 'trial', 'soft_locked', 'loading'] as const;

export const entitlementActions = [
  'create_log',
  'create_routine',
  'create_reminder',
  'edit_existing_entry',
  'create_share_invite',
  'read_own_data',
  'export_own_data',
  'delete_own_data',
  'delete_account',
  'privacy_account_settings',
  'revoke_existing_share',
  'restore_subscription',
  'manage_subscription',
  'notification_opt_out',
  'sign_out',
  'view_existing_trainer_share',
] as const;

export type AppEntitlementState = (typeof appEntitlementStates)[number];
export type EntitlementAction = (typeof entitlementActions)[number];

export const entitlementWriteActions = [
  'create_log',
  'create_routine',
  'create_reminder',
  'edit_existing_entry',
  'create_share_invite',
] as const satisfies readonly EntitlementAction[];

export const softLockedAllowedActions = [
  'read_own_data',
  'export_own_data',
  'delete_own_data',
  'delete_account',
  'privacy_account_settings',
  'revoke_existing_share',
  'restore_subscription',
  'manage_subscription',
  'notification_opt_out',
  'sign_out',
  'view_existing_trainer_share',
] as const satisfies readonly EntitlementAction[];

export function canWriteForEntitlementState(state: AppEntitlementState): boolean {
  return state === 'active' || state === 'trial';
}

export function canPerformEntitlementAction(
  state: AppEntitlementState,
  action: EntitlementAction,
): boolean {
  if (canWriteForEntitlementState(state)) {
    return true;
  }

  if (state === 'soft_locked' || state === 'loading') {
    return softLockedAllowedActionSet.has(action);
  }

  return false;
}

const softLockedAllowedActionSet = new Set<EntitlementAction>(softLockedAllowedActions);
