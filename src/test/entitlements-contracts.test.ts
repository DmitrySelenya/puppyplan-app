import {
  canPerformEntitlementAction,
  canWriteForEntitlementState,
  type EntitlementAction,
} from '@/contracts/entitlements';

describe('entitlement soft-lock action contract', () => {
  it('AC-ENT-1 allows writes for active subscriptions and the 30-day trial', () => {
    expect(canWriteForEntitlementState('active')).toBe(true);
    expect(canWriteForEntitlementState('trial')).toBe(true);
    expect(canPerformEntitlementAction('active', 'create_log')).toBe(true);
    expect(canPerformEntitlementAction('trial', 'create_reminder')).toBe(true);
  });

  it('AC-ENT-2 blocks new writes while soft-locked', () => {
    const gatedActions = [
      'create_log',
      'create_routine',
      'create_reminder',
      'edit_existing_entry',
      'create_share_invite',
    ] as const satisfies readonly EntitlementAction[];

    expect(canWriteForEntitlementState('soft_locked')).toBe(false);
    for (const action of gatedActions) {
      expect(canPerformEntitlementAction('soft_locked', action)).toBe(false);
    }
  });

  it('AC-ENT-3 keeps data ownership, privacy, restore, and sign-out actions available', () => {
    const alwaysAllowedActions = [
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
    ] as const satisfies readonly EntitlementAction[];

    for (const action of alwaysAllowedActions) {
      expect(canPerformEntitlementAction('soft_locked', action)).toBe(true);
    }
  });

  it('AC-ENT-4 keeps existing trainer share viewing live while soft-locked', () => {
    expect(canPerformEntitlementAction('soft_locked', 'view_existing_trainer_share')).toBe(true);
    expect(canPerformEntitlementAction('loading', 'view_existing_trainer_share')).toBe(true);
  });
});
