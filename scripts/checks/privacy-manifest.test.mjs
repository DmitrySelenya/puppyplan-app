import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const appConfig = readFileSync('app.config.ts', 'utf8');
const pluginSource = readFileSync('plugins/with-ios-privacy-manifest.js', 'utf8');
const manifest = readFileSync('assets/apple/PrivacyInfo.xcprivacy', 'utf8');

describe('iOS privacy manifest release gate', () => {
  it('keeps a tracked source manifest wired into Expo prebuild', () => {
    assert.match(appConfig, /['"]\.\/plugins\/with-ios-privacy-manifest['"]/u);
    assert.match(pluginSource, /assets['"], ['"]apple['"], ['"]PrivacyInfo\.xcprivacy/u);
    assert.match(pluginSource, /withXcodeProject/u);
    assert.match(pluginSource, /IOSConfig\.XcodeUtils\.getProjectName/u);
    assert.match(pluginSource, /projectName, ['"]PrivacyInfo\.xcprivacy/u);
    assert.match(pluginSource, /addResourceFileToGroup/u);
    assert.match(pluginSource, /isBuildFile: true/u);
    assert.match(pluginSource, /copyFileSync/u);
    assert.doesNotMatch(pluginSource, /withDangerousMod/u);
  });

  it('declares the current native dependency audit surface without tracking domains', () => {
    const expectedFragments = [
      'NSPrivacyAccessedAPITypes',
      'NSPrivacyCollectedDataTypes',
      'NSPrivacyTracking',
      'NSPrivacyTrackingDomains',
      '<false/>',
      'NSPrivacyAccessedAPICategoryDiskSpace',
      '85F4.1',
      'E174.1',
      'NSPrivacyAccessedAPICategoryFileTimestamp',
      '0A2A.1',
      '3B52.1',
      'C617.1',
      'NSPrivacyAccessedAPICategorySystemBootTime',
      '35F9.1',
      'NSPrivacyAccessedAPICategoryUserDefaults',
      'CA92.1',
    ];

    for (const fragment of expectedFragments) {
      assert.match(manifest, new RegExp(fragment.replaceAll('.', '\\.'), 'u'));
    }
  });
});
