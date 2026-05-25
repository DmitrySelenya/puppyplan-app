const { copyFileSync, existsSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { createRunOncePlugin, IOSConfig, withXcodeProject } = require('@expo/config-plugins');
const pkg = require('../package.json');

const manifestSource = join(__dirname, '..', 'assets', 'apple', 'PrivacyInfo.xcprivacy');

const withIosPrivacyManifest = (config) =>
  withXcodeProject(config, (modConfig) => {
    if (!existsSync(manifestSource)) {
      throw new Error(`Missing iOS privacy manifest source at ${manifestSource}`);
    }

    const { platformProjectRoot, projectRoot } = modConfig.modRequest;
    const projectName = IOSConfig.XcodeUtils.getProjectName(projectRoot);
    const manifestTargetRelativePath = join(projectName, 'PrivacyInfo.xcprivacy');
    const manifestTargetPath = join(platformProjectRoot, manifestTargetRelativePath);

    mkdirSync(join(platformProjectRoot, projectName), { recursive: true });
    copyFileSync(manifestSource, manifestTargetPath);

    if (!modConfig.modResults.hasFile(manifestTargetRelativePath)) {
      modConfig.modResults = IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: manifestTargetRelativePath,
        groupName: projectName,
        isBuildFile: true,
        project: modConfig.modResults,
      });
    }

    return modConfig;
  });

module.exports = createRunOncePlugin(
  withIosPrivacyManifest,
  `${pkg.name}-ios-privacy-manifest`,
  pkg.version,
);
