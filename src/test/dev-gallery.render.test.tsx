import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import {
  DesignGalleryScreen,
  SyntheticHealthShell,
  SyntheticPaywallStatesShell,
  SyntheticQuickLogDetailsShell,
  SyntheticQuickLogSheetShell,
  SyntheticReminderEditShell,
  SyntheticNotificationPreferencesShell,
  SyntheticOnboardingShell,
  SyntheticMoreSettingsShell,
  SyntheticPuppyProfileSettingsShell,
  SyntheticQuickTrackersSettingsShell,
  SyntheticTodayShell,
} from '@/features/_dev/design-gallery/DesignGalleryScreen';
import { i18n } from '@/lib/i18n';

const repoRoot = process.cwd();

const syntheticRouteFiles = [
  'app/_dev/components.tsx',
  'app/onboarding/index.tsx',
  'app/(modals)/settings/puppy-profile/index.tsx',
  'app/(modals)/settings/quick-trackers/index.tsx',
] as const;

const guardedSourceRoots = [
  'app/_dev',
  'app/onboarding',
  'app/(modals)/settings',
  'src/features/_dev',
] as const;

function readRouteFile(path: string) {
  return readFileSync(join(repoRoot, path), 'utf8');
}

function listSourceFiles(root: string): string[] {
  const rootPath = join(repoRoot, root);

  if (!existsSync(rootPath)) {
    return [];
  }

  return readdirSync(rootPath, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(root, entry.name);
    const absolutePath = join(repoRoot, relativePath);

    if (entry.isDirectory()) {
      return listSourceFiles(relativePath);
    }

    return statSync(absolutePath).isFile() && /\.(ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

describe('development-only design gallery', () => {
  let reduceMotionProbe: jest.SpyInstance;

  beforeEach(async () => {
    reduceMotionProbe = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockReturnValue(new Promise<boolean>(() => {}));
    await i18n.changeLanguage('en');
  });

  afterEach(() => {
    reduceMotionProbe.mockRestore();
  });

  it('renders synthetic gallery sections with typed i18n strings', () => {
    render(<DesignGalleryScreen />);

    expect(screen.getByText(i18n.t('dev.gallery.title'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('dev.gallery.synthetic-badge'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('onboarding.welcome.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('more.puppy-profile.screen-title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(i18n.t('more.quick-trackers.screen-title-template', { n: 5 }), {
        includeHiddenElements: true,
      }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('dev.gallery.states.more-settings'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('dev.gallery.states.quick-log-sheet'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('dev.gallery.states.health-v2'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('tabs.diary'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getByTestId('gallery-swipe-delete', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByTestId('gallery-empty-illustration', {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('dev.gallery.today.synthetic-note'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('dev.gallery.today.day-seven'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('dev.gallery.today.state-fixtures'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('today.states.error.title'), {
      includeHiddenElements: true,
    })).toBeTruthy();
  });

  it('renders route-shell preview states without production actions', () => {
    render(
      <>
        <SyntheticOnboardingShell />
        <SyntheticPuppyProfileSettingsShell />
        <SyntheticQuickTrackersSettingsShell />
        <SyntheticMoreSettingsShell />
        <SyntheticQuickLogSheetShell />
        <SyntheticHealthShell />
        <SyntheticReminderEditShell />
        <SyntheticNotificationPreferencesShell />
        <SyntheticPaywallStatesShell />
        <SyntheticTodayShell />
        <SyntheticQuickLogDetailsShell />
      </>,
    );

    expect(screen.getAllByText(i18n.t('dev.gallery.shell-preview')).length).toBeGreaterThanOrEqual(7);
    expect(screen.getAllByText(i18n.t('onboarding.tracker-picker.counter', { n: 5 })).length)
      .toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('more.puppy-profile.hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.about.version'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.privacy.section-account-removal'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.plus.subtitle'))).toBeTruthy();
    expect(screen.getByText(i18n.t('dev.gallery.states.quick-log-sheet'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.potty-subtype.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.duplicate-warning.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.failed.pill'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('health.rows.parasite-review-title')).length)
      .toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('health.pills.needs-vet-review')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('health.add-record.states.loading.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.states.error.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.add-record.states.permission-denied.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('health.weight-entry.title'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('today.deferred.synthetic-badge')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('today.deferred.family-invite'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.deferred.reminders'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.states.saving.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('quick-log.details.states.error.title'))).toBeTruthy();
    expect(screen.getByText(i18n.t('dev.gallery.states.reminder-edit'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('reminders.form.states.loading.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('reminders.form.states.pending-write.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('reminders.form.states.error.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('reminders.form.states.offline-read.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('dev.gallery.states.notification-preferences'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('more.notifications.states.loading.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('more.notifications.states.pending-write.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('more.notifications.states.error.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('more.notifications.states.offline-read.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('dev.gallery.states.paywall-states'), {
      includeHiddenElements: true,
    })).toBeTruthy();
    expect(screen.getAllByText(i18n.t('paywall.states.loading-products.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('paywall.states.pending-purchase.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('paywall.states.purchase-error.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('paywall.states.offline-read.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('paywall.states.active-subscription.title'), {
      includeHiddenElements: true,
    }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/supabase|production write|token/i)).toBeNull();
  });

  it('adds only synthetic route files for the planned route shells', () => {
    for (const routeFile of syntheticRouteFiles) {
      expect(existsSync(join(repoRoot, routeFile))).toBe(true);
    }
  });

  it('keeps dev gallery and synthetic shells free of Supabase/write imports', () => {
    const forbiddenPatterns = [
      '@supabase/supabase-js',
      '@/lib/supabase',
      'createClient(',
      'insert(',
      'upsert(',
      'update(',
      'delete()',
    ];

    for (const root of guardedSourceRoots) {
      for (const file of listSourceFiles(root)) {
        const source = readRouteFile(file);

        for (const pattern of forbiddenPatterns) {
          expect(source).not.toContain(pattern);
        }
      }
    }
  });
});
