import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import {
  DesignGalleryScreen,
  SyntheticOnboardingShell,
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

    expect(screen.getByText(i18n.t('dev.gallery.title'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('dev.gallery.synthetic-badge')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('onboarding.welcome.title')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('more.puppy-profile.screen-title')).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(i18n.t('more.quick-trackers.screen-title-template', { count: 5, max: 5 })).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(i18n.t('tabs.today')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('dev.gallery.today.synthetic-note'))).toBeTruthy();
  });

  it('renders route-shell preview states without production actions', () => {
    render(
      <>
        <SyntheticOnboardingShell />
        <SyntheticPuppyProfileSettingsShell />
        <SyntheticQuickTrackersSettingsShell />
        <SyntheticTodayShell />
      </>,
    );

    expect(screen.getAllByText(i18n.t('dev.gallery.shell-preview')).length).toBe(4);
    expect(screen.getByText(i18n.t('onboarding.tracker-picker.counter', { n: 5 }))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.puppy-profile.hint'))).toBeTruthy();
    expect(screen.getByText(i18n.t('more.quick-trackers.max-reached-hint'))).toBeTruthy();
    expect(screen.getAllByText(i18n.t('today.deferred.synthetic-badge')).length).toBeGreaterThan(0);
    expect(screen.getByText(i18n.t('today.deferred.family-invite'))).toBeTruthy();
    expect(screen.getByText(i18n.t('today.deferred.reminders'))).toBeTruthy();
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
