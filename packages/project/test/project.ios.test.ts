import { temporaryDirectory } from 'tempy';
import { join } from 'path';
import { copy, pathExists, readFile, rm } from '@ionic/utils-fs';
import { MobileProject, StringsFile, XCConfigFile, XmlFile } from '../src';
import { MobileProjectConfig } from '../src/config';
import { PlistFile } from '../src/plist';

describe('project - ios standard', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;

  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/ios-and-android', dir);

    config = {
      ios: {
        path: 'ios/App',
      },
      android: {
        path: 'android'
      }
    }

    project = new MobileProject(dir, config);
    await project.load();
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('should load pbx project', async () => {
    expect(project.ios?.getPbxProject()).not.toBe(null);
  });

  it('should load targets', async () => {
    const targets = project.ios?.getTargets();
    expect(targets?.length).toBe(5);
    expect(targets?.every(t => t.buildConfigurations.length > 0)).toBe(true);
  });

  it('should get target by name', async () => {
    const target = project.ios?.getTarget('App');
    expect(target).toBeDefined();
  });

  it('should get main app target', async () => {
    const target = project.ios?.getAppTarget();
    expect(target).toBeDefined();
    expect(target?.productName).toBe('App');
  });

  it('should get target bundle id', async () => {
    expect(project.ios?.getBundleId('App', 'Debug')).toBe('io.ionic.wowzaStarter');
    expect(project.ios?.getBundleId('App')).toBe('io.ionic.wowzaStarter');
    expect(project.ios?.getBundleId('My App Clip', 'Debug')).toBe('io.ionic.wowzaStarter.Clip');
  });

  it('should get target build configurations', async () => {
    const configs = project.ios?.getBuildConfigurations('App');
    expect(configs?.length).toBe(2);
  });

  it('should get target build configuration names', async () => {
    const configs = project.ios?.getBuildConfigurationNames('App');
    expect(configs).toMatchObject(['Debug', 'Release']);
  });

  it('should set target bundle id', async () => {
    project.ios?.setBundleId('App', 'Debug', 'io.ionic.betterBundleId');
    let debugBundleId = project.ios?.getBundleId('App', 'Debug');
    let releaseBundleId = project.ios?.getBundleId('App', 'Release');
    expect(debugBundleId).toBe('io.ionic.betterBundleId');
    expect(releaseBundleId).not.toBe('io.ionic.betterBundleId');

    // Test if passing null as a build sets the value for both release and debug
    project.ios?.setBundleId('App', null, 'io.ionic.betterBundleId');
    debugBundleId = project.ios?.getBundleId('App', 'Debug');
    releaseBundleId = project.ios?.getBundleId('App', 'Release');
    expect(debugBundleId).toBe('io.ionic.betterBundleId');
    expect(releaseBundleId).toBe('io.ionic.betterBundleId');
  });

  it('should get target product name', async () => {
    expect(project.ios?.getProductName('App')).toBe('App');
  });

  it('should get build number', async () => {
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(1);
    expect(await project.ios?.getBuild('App', 'Release')).toBe(1);
    expect(await project.ios?.incrementBuild('App', 'Debug'));
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(2);
    expect(await project.ios?.getBuild('App', 'Release')).toBe(1);
    expect(await project.ios?.incrementBuild('App'));
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(2);
    expect(await project.ios?.getBuild('App', 'Release')).toBe(2);

    // Make sure the info plist is updated to use the CURRENT_PROJECT_VERSION
    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['CFBundleVersion']).toBe('$(CURRENT_PROJECT_VERSION)');
  });

  it('should set build number', async () => {
    await project.ios?.setBuild('App', 'Debug', 42);
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(42);
    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['CFBundleVersion']).toBe('$(CURRENT_PROJECT_VERSION)');
  });

  it('should set string build numbers', async () => {
    await project.ios?.setBuild('App', 'Debug', '1.2.3');
    expect(await project.ios?.getBuild('App', 'Debug')).toBe('1.2.3');
  });

  it('should increment build number', async () => {
    await project.ios?.setBuild('App', 'Debug', 42);
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(42);
    await project.ios?.incrementBuild('App', 'Debug');
    expect(await project.ios?.getBuild('App', 'Debug')).toBe(43);
    await project.ios?.setBuild('App', 'Debug', '1.2.3');
    expect(await project.ios?.getBuild('App', 'Debug')).toBe('1.2.3');
    await project.ios?.incrementBuild('App', 'Debug');
    expect(await project.ios?.getBuild('App', 'Debug')).toBe('1.2.3');
  });

  it('should set project version', async () => {
    await project.ios?.setVersion('App', 'Debug', '1.4.5');
    expect(project.ios?.getVersion('App', 'Debug')).toBe('1.4.5');
    // Make sure the info plist is updated to use the MARKETING_VERSION
    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['CFBundleShortVersionString']).toBe('$(MARKETING_VERSION)');
  });

  it('should update build settings', async () => {
    project.ios?.setBuildProperty('App', 'Debug', 'FAKE_PROPERTY', 'YES');
    expect(project.ios?.getBuildProperty('App', 'Debug', 'FAKE_PROPERTY')).toBe('YES');
    project.ios?.setBuildProperty('App', 'Release', 'FAKE_PROPERTY', 'YES');
    expect(project.ios?.getBuildProperty('App', 'Release', 'FAKE_PROPERTY')).toBe('YES');
    project.ios?.setBuildProperty('App', null, 'THING', 'THIS');
    expect(project.ios?.getBuildProperty('App', 'Debug', 'THING')).toBe('THIS');
    expect(project.ios?.getBuildProperty('App', 'Release', 'THING')).toBe('THIS');
  });

  it('should properly quote pbxproj string values that need to be quoted', async () => {
    project.ios?.setBuildProperty('App', 'Debug', 'FAKE_PROPERTY', 'This Is A Long String');
    var actualValue = project.ios?.getPbxProject()?.getBuildProperty('FAKE_PROPERTY', 'Debug', 'App');

    // Value read back shouldn't have quotes
    expect(project.ios?.getBuildProperty('App', 'Debug', 'FAKE_PROPERTY')).toBe('This Is A Long String');
    // Value from pbx file should have quotes
    expect(actualValue).toBe('\"This Is A Long String\"');
  });

  it('should add frameworks', async () => {
    const fwks = ['ImageIO.framework', 'AudioToolbox.framework'];
    fwks.forEach(f => project.ios?.addFramework('App', f));
    const frameworks = project.ios?.getFrameworks('App');
    expect(fwks.every(f => (frameworks?.indexOf(f) ?? -1) >= 0)).toBe(true);
  });

  it('should add frameworks to non-app targets', async () => {
    const fwks = ['WebKit.framework', 'QuartzCore.framework'];
    fwks.forEach(f => project.ios?.addFramework('My App Clip', f));
    const frameworks = project.ios?.getFrameworks('My App Clip');
    expect(fwks.every(f => (frameworks?.indexOf(f) ?? -1) >= 0)).toBe(true);
  });

  it('should get entitlements file for each target', async () => {
    expect(project.ios?.getEntitlementsFile('App', 'Debug')).toBe('App/App.entitlements');
    expect(project.ios?.getEntitlementsFile('App', 'Release')).toBe('App/App.entitlements');
    expect(project.ios?.getEntitlementsFile('My App Clip', 'Debug')).toBe('My App Clip/My_App_Clip.entitlements');
    expect(project.ios?.getEntitlementsFile('My App Clip', 'Release')).toBe('My App Clip/My_App_Clip.entitlements');
    expect(project.ios?.getEntitlementsFile('My Share Extension', 'Debug')).toBeUndefined();
    expect(project.ios?.getEntitlementsFile('My Share Extension', 'Release')).toBeUndefined();
  });

  it('should add entitlements to file', async () => {
    await project.ios?.addEntitlements('App', 'Debug', {
      'keychain-access-groups': [
        'group1', 'group2'
      ]
    });

    let entitlements = await project.ios?.getEntitlements('App', 'Debug');
    expect(entitlements).toEqual({
      'keychain-access-groups': [
        'group1', 'group2'
      ]
    });

    await project.ios?.addEntitlements('App', null, {
      'keychain-access-groups': [
        'group3', 'group4'
      ]
    });

    entitlements = await project.ios?.getEntitlements('App');
    expect(entitlements).toEqual({
      'keychain-access-groups': [
        'group1', 'group2', 'group3', 'group4'
      ]
    });
  });

  it('should set entitlements to file', async () => {
    await project.ios?.setEntitlements('App', 'Debug', {
      'keychain-access-groups': [
        'group1', 'group2'
      ]
    });

    let entitlements = await project.ios?.getEntitlements('App', 'Debug');
    expect(entitlements).toEqual({
      'keychain-access-groups': [
        'group1', 'group2'
      ]
    });

    await project.ios?.setEntitlements('App', null, {
      'keychain-access-groups': [
        'group3', 'group4'
      ]
    });

    entitlements = await project.ios?.getEntitlements('App');
    expect(entitlements).toEqual({
      'keychain-access-groups': [
        'group3', 'group4'
      ]
    });
  });

  it('should create new entitlements file if one does not exist', async () => {
    await project.ios?.addEntitlements('My Share Extension', 'Debug', {
      'keychain-access-groups': [
        'group1', 'group2'
      ]
    });
    expect(project.ios?.getEntitlementsFile('My Share Extension', 'Debug')).toBe('My Share Extension/My_Share_Extension.entitlements');
  });

  it('should get info.plist for each target', async () => {
    expect(await project.ios?.getInfoPlist('App', 'Debug')).toBe('App/Info.plist');
    expect(await project.ios?.getInfoPlist('App', 'Release')).toBe('App/Info.plist');
    expect(await project.ios?.getInfoPlist('App')).toBe('App/Info.plist');
    expect(await project.ios?.getInfoPlist('My App Clip', 'Debug')).toBe('My App Clip/AppClip.plist');
    expect(await project.ios?.getInfoPlist('My App Clip', 'Release')).toBe('My App Clip/AppClip.plist');
    expect(await project.ios?.getInfoPlist('My Share Extension', 'Debug')).toBe('My Share Extension/Info.plist');
    expect(await project.ios?.getInfoPlist('My Share Extension', 'Release')).toBe('My Share Extension/Info.plist');
  });

  it('should set display name for target', async () => {
    await project.ios?.setDisplayName('App', 'Debug', 'Super Duper App');
    expect(await project.ios?.getDisplayName('App', 'Debug')).toBe('Super Duper App');
    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['CFBundleDisplayName']).toBe('Super Duper App');
  });

  it('should update plist with entries', async () => {
    await project.ios?.updateInfoPlist('App', 'Debug', {
      NSFaceIDUsageDescription: 'The better to see you with'
    });

    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['NSFaceIDUsageDescription']).toBe('The better to see you with');
  });

  it('should overwrite existing keys in plist', async () => {
    // https://github.com/ionic-team/capacitor-configure/issues/14
    await project.ios?.updateInfoPlist('App', 'Debug', {
      NSFaceIDUsageDescription: 'The better to see you with'
    });
    await project.ios?.updateInfoPlist('App', 'Debug', {
      NSFaceIDUsageDescription: 'This is new'
    });

    const filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    const updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['NSFaceIDUsageDescription']).toBe('This is new');
  });

  it('should support replacing items to arrays in plist', async () => {
    await project.ios?.updateInfoPlist('App', 'Debug', {
      UISupportedInterfaceOrientations: [
        'AppendThis'
      ]
    });
    let filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    let updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['UISupportedInterfaceOrientations']).toEqual([
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
      'AppendThis'
    ]);

    await project.ios?.updateInfoPlist('App', 'Debug', {
      UISupportedInterfaceOrientations: [
        'UIInterfaceOrientationPortrait'
      ]
    }, {
      replace: true
    });
    filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['UISupportedInterfaceOrientations']).toEqual(['UIInterfaceOrientationPortrait']);
  });

  it('should support merging objects in plist', async () => {
    await project.ios?.updateInfoPlist('App', 'Debug', {
      TestDict: {
        'AppendThis': false
      }
    });
    let filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    let updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['TestDict']).toEqual({
      'Item1': 'String1',
      'Item2': true,
      'AppendThis': false
    });

    await project.ios?.updateInfoPlist('App', 'Debug', {
      TestDict: {
        'AppendThis': false
      }
    }, {
      replace: true
    });
    filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['TestDict']).toEqual({
      'AppendThis': false
    });
  });

  it('should not add duplicates to plist when applied multiple times', async () => {
    await project.ios?.updateInfoPlist('App', 'Debug', {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'MyApp'
          ]
        }
      ]
    });
    await project.ios?.updateInfoPlist('App', 'Debug', {
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            'MyApp'
          ]
        }
      ]
    });
    let filename = await project.ios?.getInfoPlistFilename('App', 'Debug');
    let updated = project.vfs.get<PlistFile>(filename!)?.getData();
    expect(updated?.getDocument()?.['CFBundleURLTypes']).toEqual([
      {
        CFBundleURLSchemes: [
          'MyApp'
        ]
      }
    ]);

  });

  it('should gracefully error when targets not found in project', async () => {
    expect.assertions(1);

    try {
      await project.ios?.setDisplayName('Invalid Target', 'Invalid Build', 'Nothing');
    } catch (e) {
      expect((e as any).message).toBe(`Target 'Invalid Target' not found in project`);
    }
  });

  it('should copy file', async () => {
    await project.ios?.copyFile('json-file.json', 'json-file2.json');
    const src = join(dir, 'ios/App', 'json-file.json');
    const srcContents = await readFile(src);
    const dest = join(dir, 'ios/App', 'json-file2.json');
    const destContents = await readFile(dest);
    expect(srcContents).toEqual(destContents);
  });

  it('should copy URL', async () => {
    await project.ios?.copyFile('https://via.placeholder.com/150C', 'placeholder.png');
    const dest = join(dir, 'ios/App', 'placeholder.png');
    const destContents = await readFile(dest);
    expect(destContents.length).toBeGreaterThan(0);
  });

  it('should add source files when committing', async () => {
    const stringsFile = project.ios?.getProjectFile<StringsFile>(
        "App/NewStrings.strings",
        (filename: string) => new StringsFile(filename, project.vfs, project)
      );
    await stringsFile?.load();

    const xcconfigFile = project.ios?.getProjectFile<XCConfigFile>(
        "NewConfig.xcconfig",
        (filename: string) => new XCConfigFile(filename, project.vfs, project)
      );
    await xcconfigFile?.load();

    const plistFile = project.ios?.getProjectFile<PlistFile>(
        "NewPlist.plist",
        (filename: string) => new PlistFile(filename, project.vfs, project)
      );
    await plistFile?.load();

    const pbx = project.ios?.getPbxProject();
    /*
    const xmlFile = project.ios?.getProjectFile<XmlFile>(
        "NewXml.xml",
        (filename: string) => new XmlFile(filename, project.vfs)
      );
    await xmlFile?.load();
    */
    await project.commit();


    expect(!!pbx?.hasFile('NewStrings.strings')).toBe(true);
    expect(!!pbx?.hasFile('NewConfig.xcconfig')).toBe(true);
    expect(!!pbx?.hasFile('NewPlist.plist')).toBe(true);

    const pbxOnDisk = await readFile(join(dir, 'ios/App/App.xcodeproj/project.pbxproj'), { encoding: 'utf-8' });

    // console.log(pbx?.writeSync());
    expect(pbxOnDisk.indexOf('NewStrings.strings')).toBeGreaterThanOrEqual(0);
    // expect(!!pbx?.hasFile('NewXml.xml')).toBe(true);
  });

});

describe('ios - no info plist case', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;
  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/ios-no-info-plist', dir);

    config = {
      ios: {
        path: 'ios/App'
      }
    }

    project = new MobileProject(dir, config);
    await project.load();
  });

  it('should create info plist when updating', async () => {
    const plistName = await project.ios?.getInfoPlist('App');
    const plistPath = join(project.config.ios?.path!, plistName!);
    expect(await pathExists(plistPath)).toBe(false);
    await project.ios?.updateInfoPlist('App', 'Debug', {
      NSFaceIDUsageDescription: 'The better to see you with'
    });
    await project.commit();
    expect(await pathExists(plistPath)).toBe(true);
    const plistContents = await readFile(plistPath, { encoding: 'utf-8' });
    expect(plistContents.indexOf('NSFaceIDUsageDescription') >= 0);
  });
});

describe('ios - empty template case', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;
  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/ios-no-current-project-version', dir);

    config = {
      ios: {
        path: 'ios/App'
      },
      android: {
        path: 'android'
      }
    }

    project = new MobileProject(dir, config);
    await project.load();
  });

  it('should get build number when CURRENT_PROJECT_VERSION missing', async () => {
    expect(await project.ios?.getBuild(null)).toBe("1");
  });
});

https://github.com/ionic-team/trapeze/pull/83
describe('ios - issue #83', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;
  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/ios-cfbundleversion-pbx-83', dir);

    config = {
      ios: {
        path: 'ios/App'
      },
      android: {
        path: 'android'
      }
    }

    project = new MobileProject(dir, config);
    await project.load();
  });

  it('should increment build with empty target', async () => {
    expect(await project.ios?.getBuild(null)).toBe("${CURRENT_PROJECT_VERSION}");
    await project.ios!.incrementBuild();
    expect(await project.ios?.getBuild(null)).toBe(1);
    await project.ios!.incrementBuild();
    expect(await project.ios?.getBuild(null)).toBe(2);
  });
});
