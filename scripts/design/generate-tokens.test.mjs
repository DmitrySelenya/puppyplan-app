import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  buildTokenPayload,
  checkTokenDrift,
  renderTokensCss,
  writeGeneratedTokens,
} from './generate-tokens.mjs';

const sourceTokens = {
  color: {
    primary: {
      900: { $value: '#083344' },
    },
    surface: {
      base: { $value: '#FBFAF7' },
      raised: { $value: '#FFFFFF' },
    },
    text: {
      primary: { $value: '#1C1F1B' },
      tertiary: { $value: '#72756A' },
    },
  },
  elevation: {
    0: { $value: { shadow: 'none', border: '1px solid #E2DDD2' } },
    1: {
      $value: {
        androidElevation: 2,
        blur: 8,
        color: '#1C1F1B',
        opacity: 0.06,
        x: 0,
        y: 2,
      },
    },
    2: {
      $value: {
        androidElevation: 6,
        blur: 16,
        color: '#1C1F1B',
        opacity: 0.1,
        x: 0,
        y: -4,
      },
    },
    3: {
      $value: {
        androidElevation: 12,
        blur: 24,
        color: '#1C1F1B',
        opacity: 0.14,
        x: 0,
        y: 8,
      },
    },
  },
  typography: {
    fontFamily: {
      ios: { $value: 'SF Pro Text' },
      android: { $value: 'Roboto' },
      mono: { $value: ['SF Mono', 'Roboto Mono', 'monospace'] },
    },
    fontWeight: {
      regular: { $value: 400 },
      semibold: { $value: 600 },
    },
    scale: {
      body: {
        $value: {
          dynamicType: 'body',
          fontSize: '17pt',
          fontWeight: 400,
          lineHeight: '24pt',
        },
      },
    },
  },
  space: {
    4: { $value: '16pt' },
    10: { $value: '40pt' },
  },
  radius: {
    full: { $value: '999pt' },
  },
  motion: {
    duration: {
      fast: { $value: '160ms' },
    },
    easing: {
      decel: { $value: 'cubic-bezier(0.0, 0, 0.2, 1)' },
    },
  },
  haptic: {
    warning: {
      android: 'REJECT',
      ios: 'notificationWarning',
      trigger: 'Duplicate detected (60-second window)',
    },
  },
  contract: {
    'accidental-double-tap-window-seconds': 3,
    'duplicate-warning-window-seconds': 60,
    'no-streaks-days': 14,
    'quick-log-position': 'persistent bottom action / FAB, NOT a tab',
    'quick-log-trackers-max': 5,
    tabs: ['today', 'health', 'more'],
    'today-daily-cards-max': 5,
  },
};

const sourceTokensWithV2Foundation = {
  ...sourceTokens,
  color: {
    ...sourceTokens.color,
    status: {
      info: { $value: '#6E5862' },
      'info-tint': { $value: '#ECE4E6' },
    },
  },
  layout: {
    'bottom-inset-fab': { $value: '120pt' },
  },
  typography: {
    ...sourceTokens.typography,
    fontFamily: {
      ...sourceTokens.typography.fontFamily,
      display: { $value: 'Lora' },
      text: { $value: 'Nunito' },
    },
  },
};

function withTempRepo(fn) {
  const repoRoot = mkdtempSync(join(tmpdir(), 'puppyplan-tokens-'));

  try {
    writeFileSync(join(repoRoot, 'design-tokens.json'), `${JSON.stringify(sourceTokens, null, 2)}\n`);
    fn(repoRoot);
  } finally {
    rmSync(repoRoot, { force: true, recursive: true });
  }
}

test('buildTokenPayload normalizes design-token values for native runtime use', () => {
  const payload = buildTokenPayload(sourceTokens);

  assert.equal(payload.color.text.tertiary, '#72756A');
  assert.equal(payload.space[4], 16);
  assert.equal(payload.space[10], 40);
  assert.equal(payload.radius.full, 999);
  assert.equal(payload.typography.scale.body.letterSpacing, 0);
  assert.equal(payload.elevation[2].androidElevation, 6);
  assert.equal(payload.elevation[2].color, '#1C1F1B');
  assert.equal(payload.elevation[2].opacity, 0.1);
  assert.equal(payload.motion.duration.fast, 160);
  assert.equal(payload.haptic.warning.android, 'REJECT');
  assert.deepEqual(payload.business.timing, {
    accidentalDoubleTapWindowSeconds: 3,
    duplicateCareWarningWindowSeconds: 60,
  });
});

test('buildTokenPayload exposes V2 foundation font and FAB inset tokens', () => {
  const payload = buildTokenPayload(sourceTokensWithV2Foundation);

  assert.equal(payload.color.status.info, '#6E5862');
  assert.equal(payload.color.status.infoTint, '#ECE4E6');
  assert.equal(payload.layout.bottomInsetFab, 120);
  assert.equal(payload.typography.fontFamily.display, 'Lora');
  assert.equal(payload.typography.fontFamily.text, 'Nunito');
});

test('buildTokenPayload preserves explicit typography letterSpacing values', () => {
  const payload = buildTokenPayload({
    ...sourceTokens,
    typography: {
      ...sourceTokens.typography,
      scale: {
        ...sourceTokens.typography.scale,
        body: {
          ...sourceTokens.typography.scale.body,
          $value: {
            ...sourceTokens.typography.scale.body.$value,
            letterSpacing: 0.25,
          },
        },
      },
    },
  });

  assert.equal(payload.typography.scale.body.letterSpacing, 0.25);
});

test('buildTokenPayload rejects missing numeric contract keys', () => {
  const { 'quick-log-trackers-max': _omitted, ...contract } = sourceTokens.contract;

  assert.throws(
    () => buildTokenPayload({ ...sourceTokens, contract }),
    /contract\.quick-log-trackers-max must be a number/,
  );
});

test('checkTokenDrift passes generated TypeScript and matching CSS output', () => {
  withTempRepo((repoRoot) => {
    const { payload } = writeGeneratedTokens({ repoRoot });
    writeFileSync(join(repoRoot, 'tokens.css'), renderTokensCss(payload));

    assert.doesNotThrow(() => checkTokenDrift({ repoRoot }));
  });
});

test('checkTokenDrift fails when generated TypeScript drifts from JSON', () => {
  withTempRepo((repoRoot) => {
    writeGeneratedTokens({ repoRoot });
    const generatedPath = join(repoRoot, 'src/design/tokens.ts');
    const generated = readFileSync(generatedPath, 'utf8');
    writeFileSync(generatedPath, generated.replace('#72756A', '#767970'));

    assert.throws(
      () => checkTokenDrift({ repoRoot }),
      /src\/design\/tokens\.ts drift/,
    );
  });
});

test('checkTokenDrift ignores LF versus CRLF line ending differences', () => {
  withTempRepo((repoRoot) => {
    const { output, payload } = writeGeneratedTokens({ repoRoot });
    writeFileSync(join(repoRoot, 'src/design/tokens.ts'), output.replaceAll('\n', '\r\n'));
    writeFileSync(join(repoRoot, 'tokens.css'), renderTokensCss(payload).replaceAll('\n', '\r\n'));

    assert.doesNotThrow(() => checkTokenDrift({ repoRoot }));
  });
});

test('checkTokenDrift fails when present CSS drifts from JSON', () => {
  withTempRepo((repoRoot) => {
    const { payload } = writeGeneratedTokens({ repoRoot });
    writeFileSync(
      join(repoRoot, 'tokens.css'),
      renderTokensCss(payload).replace(
        '--pp-color-text-tertiary: #72756A;',
        '--pp-color-text-tertiary: #767970;',
      ),
    );

    assert.throws(
      () => checkTokenDrift({ repoRoot }),
      /tokens\.css drift/,
    );
  });
});

test('checkTokenDrift checks the raw design CSS mirror when present', () => {
  withTempRepo((repoRoot) => {
    writeGeneratedTokens({ repoRoot });
    mkdirSync(join(repoRoot, 'docs/design/v1/raw'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'docs/design/v1/raw/tokens.css'),
      [
        ':root {',
        '  --pp-r-full: 999px;',
        '  --pp-s-4: 16px;',
        '  --pp-s-10: 40px;',
        '  --pp-primary-900: #083344;',
        '  --pp-surface-base: #FBFAF7;',
        '  --pp-surface-raised: #FFFFFF;',
        '  --pp-text-primary: #1C1F1B;',
        '  --pp-text-tertiary: #72756A;',
        '  --pp-elev-0: 0 0 0 1px var(--pp-stroke);',
        '  --pp-elev-1: 0 2px 8px rgba(28, 31, 27, 0.06), 0 0 0 1px var(--pp-stroke);',
        '  --pp-elev-2: 0 -4px 16px rgba(28, 31, 27, 0.10);',
        '  --pp-elev-3: 0 8px 24px rgba(28, 31, 27, 0.14);',
        '  --pp-font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Roboto", sans-serif;',
        '  --pp-font-mono: "SF Mono", "Roboto Mono", ui-monospace, Menlo, monospace;',
        '}',
        '',
      ].join('\n'),
    );

    const result = checkTokenDrift({ repoRoot });

    assert.deepEqual(result.checkedCss, ['docs/design/v1/raw/tokens.css']);
  });
});

test('checkTokenDrift checks the V2 foundation CSS and patch when present', () => {
  withTempRepo((repoRoot) => {
    writeFileSync(
      join(repoRoot, 'design-tokens.json'),
      `${JSON.stringify(sourceTokensWithV2Foundation, null, 2)}\n`,
    );
    writeGeneratedTokens({ repoRoot });
    mkdirSync(join(repoRoot, 'docs/design/v2/raw'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'docs/design/v2/raw/tokens.css'),
      [
        ':root {',
        '  --pp-info: #6E5862;',
        '  --pp-info-tint: #ECE4E6;',
        '  --pp-bottom-inset-fab: 120px;',
        '}',
        '',
      ].join('\n'),
    );
    writeFileSync(
      join(repoRoot, 'docs/design/v2/raw/puppy-tokens-patch.css'),
      [
        '/* previous value: --pp-info: #5B6E7A; */',
        ':root {',
        '  --pp-info: #6E5862;',
        '  --pp-info-tint: #ECE4E6;',
        '  --pp-font-display: "Lora", Georgia, serif;',
        '}',
        '',
      ].join('\n'),
    );

    const result = checkTokenDrift({ repoRoot });

    assert.deepEqual(result.checkedCss, [
      'docs/design/v2/raw/tokens.css',
      'docs/design/v2/raw/puppy-tokens-patch.css',
    ]);
  });
});

test('checkTokenDrift fails when the V2 foundation patch drifts from JSON', () => {
  withTempRepo((repoRoot) => {
    writeFileSync(
      join(repoRoot, 'design-tokens.json'),
      `${JSON.stringify(sourceTokensWithV2Foundation, null, 2)}\n`,
    );
    writeGeneratedTokens({ repoRoot });
    mkdirSync(join(repoRoot, 'docs/design/v2/raw'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'docs/design/v2/raw/tokens.css'),
      ':root {\n  --pp-info: #6E5862;\n  --pp-info-tint: #ECE4E6;\n  --pp-bottom-inset-fab: 120px;\n}\n',
    );
    writeFileSync(
      join(repoRoot, 'docs/design/v2/raw/puppy-tokens-patch.css'),
      ':root {\n  --pp-font-display: "Quicksand", Georgia, serif;\n}\n',
    );

    assert.throws(
      () => checkTokenDrift({ repoRoot }),
      /docs\/design\/v2\/raw\/puppy-tokens-patch\.css drift/,
    );
  });
});

test('checkTokenDrift fails when the raw design CSS mirror drifts from JSON', () => {
  withTempRepo((repoRoot) => {
    writeGeneratedTokens({ repoRoot });
    mkdirSync(join(repoRoot, 'docs/design/v1/raw'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'docs/design/v1/raw/tokens.css'),
      ':root {\n  --pp-text-tertiary: #767970;\n}\n',
    );

    assert.throws(
      () => checkTokenDrift({ repoRoot }),
      /docs\/design\/v1\/raw\/tokens\.css drift/,
    );
  });
});

test('checkTokenDrift fails when the raw design CSS mirror omits covered tokens', () => {
  withTempRepo((repoRoot) => {
    writeGeneratedTokens({ repoRoot });
    mkdirSync(join(repoRoot, 'docs/design/v1/raw'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'docs/design/v1/raw/tokens.css'),
      [
        ':root {',
        '  --pp-r-full: 999px;',
        '  --pp-s-4: 16px;',
        '  --pp-s-10: 40px;',
        '  --pp-surface-base: #FBFAF7;',
        '  --pp-surface-raised: #FFFFFF;',
        '  --pp-text-primary: #1C1F1B;',
        '  --pp-text-tertiary: #72756A;',
        '}',
        '',
      ].join('\n'),
    );

    assert.throws(
      () => checkTokenDrift({ repoRoot }),
      /--pp-primary-900 is missing|--pp-elev-0 is missing|--pp-font is missing/,
    );
  });
});
