import { copy, readFile, rm } from '@ionic/utils-fs';
import { temporaryDirectory } from 'tempy';
import { join } from 'path';
import plist from 'plist';

import { loadContext } from '../../src/ctx';
import { runCommand } from '../../src/tasks/run';
import { loadYamlConfig } from '../../src/yaml-config';

describe('task: run', () => {
  it('should process variables operations', async () => {
    const dir = temporaryDirectory();
    await copy('../common/test/fixtures/basic.yml', join(dir, 'basic.yml'));

    const ctx = await loadContext(dir);

    await loadYamlConfig(ctx, join(dir, 'basic.yml'));

    expect(ctx.vars).toMatchObject({
      NUMBER: {
        default: 0,
        value: 0
      },
      BUNDLE_ID: {
        default: 'io.ionic.fixtureTest',
        value: 'io.ionic.fixtureTest',
      },
      PACKAGE_NAME: {
        default: 'io.ionic.fixtureTest',
        value: 'io.ionic.fixtureTest',
      },
      KEYCHAIN_GROUPS: {
        default: [
          '$BUNDLE_ID',
          'com.microsoft.intune.mam',
          'com.microsoft.adalcache',
        ],
        value: [
          '$BUNDLE_ID',
          'com.microsoft.intune.mam',
          'com.microsoft.adalcache',
        ]
      }
    });
  });

  it('should handle JSON-values in variables', async () => {
    const dir = temporaryDirectory();
    await copy('../common/test/fixtures/basic.yml', join(dir, 'basic.yml'));

    const ctx = await loadContext(dir);

    await loadYamlConfig(ctx, join(dir, 'basic.yml'));
  });

  it('should run operations', async () => {
    const dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);
    await copy('../common/test/fixtures/basic.yml', join(dir, 'basic.yml'));

    const ctx = await loadContext(dir);

    ctx.args.y = true;
    ctx.args.quiet = true;
    ctx.args.noCommit = true;

    await runCommand(ctx, '../common/test/fixtures/basic.yml');

    const files = ctx.project.vfs.all();

    expect(files).toEqual({
      [join(dir, 'android/build.gradle')]: expect.anything(),
      [join(dir, 'android/app/build.gradle')]: expect.anything(),
      [join(dir, 'android/google-services.json')]: expect.anything(),
      [join(dir, 'android/app/src/main/AndroidManifest.xml')]: expect.anything(),
      [join(dir, 'android/app/src/main/res/values/strings.xml')]: expect.anything(),
      [join(dir, 'ios/App/App.xcodeproj/project.pbxproj')]: expect.anything(),
      [join(dir, 'ios/App/App/App.entitlements')]: expect.anything(),
      [join(dir, 'ios/App/App/Info.plist')]: expect.anything(),
      [join(dir, 'ios/App/My App Clip/AppClip.plist')]: expect.anything(),
      [join(
        dir,
        'ios/App/My App Clip/My_App_Clip.entitlements',
      )]: expect.anything(),
    });

    await rm(dir, { force: true, recursive: true });
  });

  it('Should support providing the project root as an arg', async () => {
    const dir = temporaryDirectory();

    await copy('../common/test/fixtures/custom-platform-directories', dir);

    process.argv.push('--projectRoot');
    process.argv.push(dir);
    process.argv.push('-y');
    process.argv.push('--quiet');
    process.argv.push('--noCommit');
    const ctx = await loadContext(undefined, 'my-android-app', 'my-ios-app/App');
    ctx.args.quiet = true;

    expect(ctx.args.projectRoot).toBe(dir);

    await runCommand(ctx, '../common/test/fixtures/basic.yml');

    const files = ctx.project.vfs.all();

    expect(files).toEqual({
      [join(dir, 'my-android-app/build.gradle')]: expect.anything(),
      [join(dir, 'my-android-app/google-services.json')]: expect.anything(),
      [join(dir, 'my-android-app/app/build.gradle')]: expect.anything(),
      [join(dir, 'my-android-app/app/src/main/AndroidManifest.xml')]: expect.anything(),
      [join(dir, 'my-android-app/app/src/main/res/values/strings.xml')]: expect.anything(),
      [join(dir, 'my-ios-app/App/App.xcodeproj/project.pbxproj')]: expect.anything(),
      [join(dir, 'my-ios-app/App/App/App.entitlements')]: expect.anything(),
      [join(dir, 'my-ios-app/App/App/Info.plist')]: expect.anything(),
      [join(
        dir,
        'my-ios-app/App/My App Clip/AppClip.plist',
      )]: expect.anything(),
      [join(
        dir,
        'my-ios-app/App/My App Clip/My_App_Clip.entitlements',
      )]: expect.anything(),
    });
  });

  it('should commit operations to filesystem', async () => {
    const dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);
    await copy('../common/test/fixtures/basic.yml', join(dir, 'basic.yml'));

    const ctx = await loadContext(dir);
    ctx.args.y = true;
    ctx.args.quiet = true;
    ctx.args.noCommit = true;

    await runCommand(ctx, join(dir, 'basic.yml'));

    const files = ctx.project.vfs.all();
    expect(files).toEqual({
      [join(dir, 'android/build.gradle')]: expect.anything(),
      [join(dir, 'android/google-services.json')]: expect.anything(),
      [join(dir, 'android/app/build.gradle')]: expect.anything(),
      [join(
        dir,
        'android/app/src/main/AndroidManifest.xml',
      )]: expect.anything(),
      [join(
        dir,
        'android/app/src/main/res/values/strings.xml',
      )]: expect.anything(),
      [join(dir, 'ios/App/App.xcodeproj/project.pbxproj')]: expect.anything(),
      [join(dir, 'ios/App/App/App.entitlements')]: expect.anything(),
      [join(dir, 'ios/App/App/Info.plist')]: expect.anything(),
      [join(dir, 'ios/App/My App Clip/AppClip.plist')]: expect.anything(),
      [join(
        dir,
        'ios/App/My App Clip/My_App_Clip.entitlements',
      )]: expect.anything(),
    });

    await ctx.project.commit();

    const buildGradleContents = await readFile(
      join(dir, 'android/build.gradle'),
      { encoding: 'utf-8' },
    );

    expect(buildGradleContents).toContain('org.javassist');
    expect(buildGradleContents).toContain(
      'files("../node_modules/@ionic-enterprise/intune',
    );
    expect(buildGradleContents).toContain('DuoSDK-Public');

    const appGradleContents = await readFile(
      join(dir, 'android/app/build.gradle'),
      { encoding: 'utf-8' },
    );
    expect(appGradleContents).toContain(
      "apply plugin: 'com.microsoft.intune.mam'",
    );
    expect(appGradleContents).toContain('intunemam {');
    expect(appGradleContents).toContain('versionCode 197');
    expect(appGradleContents).toContain('versionName "5.2.1"');

    const pbxProj = await readFile(
      join(dir, 'ios/App/App.xcodeproj/project.pbxproj'),
      { encoding: 'utf-8' },
    );
    expect(pbxProj).toContain(
      'PRODUCT_BUNDLE_IDENTIFIER = io.ionic.fixtureTest',
    );

    const entitlements = await readFile(
      join(dir, 'ios/App/App/App.entitlements'),
      { encoding: 'utf-8' },
    );
    expect(entitlements).toContain('keychain-access-groups');

    const plist = await readFile(join(dir, 'ios/App/App/Info.plist'), {
      encoding: 'utf-8',
    });
    expect(plist).toContain('msauth.com.microsoft.intunemam');

    // Cleanup temp dir
    await rm(dir, { force: true, recursive: true });
  });

  // TODO: Separate this out into multiple sub-tests
  it('should commit operations to filesystem directly with y', async () => {
    const dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);
    await copy('../common/test/fixtures/basic.yml', join(dir, 'basic.yml'));

    const ctx = await loadContext(dir);
    ctx.args.y = true;
    ctx.args.quiet = true;
    ctx.args.noCommit = false;

    await runCommand(ctx, join(dir, 'basic.yml'));

    const files = ctx.project.vfs.all();
    expect(files).toEqual({
      [join(dir, 'android/build.gradle')]: expect.anything(),
      [join(dir, 'android/app/build.gradle')]: expect.anything(),
      [join(dir, 'android/google-services.json')]: expect.anything(),
      [join(
        dir,
        'android/app/src/main/AndroidManifest.xml',
      )]: expect.anything(),
      [join(
        dir,
        'android/app/src/main/res/values/strings.xml',
      )]: expect.anything(),
      [join(dir, 'ios/App/App.xcodeproj/project.pbxproj')]: expect.anything(),
      [join(dir, 'ios/App/App/App.entitlements')]: expect.anything(),
      [join(dir, 'ios/App/App/Info.plist')]: expect.anything(),
      [join(dir, 'ios/App/My App Clip/AppClip.plist')]: expect.anything(),
      [join(
        dir,
        'ios/App/My App Clip/My_App_Clip.entitlements',
      )]: expect.anything(),
    });

    const buildGradleContents = await readFile(
      join(dir, 'android/build.gradle'),
      { encoding: 'utf-8' },
    );

    expect(buildGradleContents).toContain('org.javassist');
    expect(buildGradleContents).toContain(
      'files("../node_modules/@ionic-enterprise/intune',
    );
    expect(buildGradleContents).toContain('DuoSDK-Public');

    const appGradleContents = await readFile(
      join(dir, 'android/app/build.gradle'),
      { encoding: 'utf-8' },
    );
    expect(appGradleContents).toContain(
      "apply plugin: 'com.microsoft.intune.mam'",
    );
    expect(appGradleContents).toContain('intunemam {');
    expect(appGradleContents).toContain('versionCode 197');
    expect(appGradleContents).toContain('versionName "5.2.1"');
    // This was a replace rather than an insert
    expect(appGradleContents).toContain('minifyEnabled true');
    expect(appGradleContents).toContain("implementation 'test-implementation'");

    const jsonContents = await readFile(
      join(dir, 'android/google-services.json'),
      { encoding: 'utf-8' },
    );

    const pbxProj = await readFile(
      join(dir, 'ios/App/App.xcodeproj/project.pbxproj'),
      { encoding: 'utf-8' },
    );
    expect(pbxProj).toContain(
      'PRODUCT_BUNDLE_IDENTIFIER = io.ionic.fixtureTest',
    );
    expect(pbxProj).toContain('CURRENT_PROJECT_VERSION = 195');

    const entitlements = await ctx.project.ios?.getEntitlements('App');
    expect(entitlements).toMatchObject({
      'keychain-access-groups': [
        'io.ionic.fixtureTest',
        'com.microsoft.intune.mam',
        'com.microsoft.adalcache',
      ],
    });

    const appClipEntitlements = await ctx.project.ios?.getEntitlements(
      'My App Clip',
    );
    expect(appClipEntitlements).toMatchObject({
      'keychain-access-groups': ['app-clip-group'],
    });

    const plistContents = await readFile(join(dir, 'ios/App/App/Info.plist'), {
      encoding: 'utf-8',
    });
    const plistParsed = plist.parse(plistContents) as any;
    expect(plistParsed['UISupportedInterfaceOrientations']).toEqual([
      'UIInterfaceOrientationPortrait',
    ]);
    expect(plistParsed['NSFaceIDUsageDescription']).toBe(
      'Use Face ID to authenticate yourself and login',
    );
    expect(plistContents).toContain('msauth.com.microsoft.intunemam');

    // Cleanup temp dir
    await rm(dir, { force: true, recursive: true });
  });
});
