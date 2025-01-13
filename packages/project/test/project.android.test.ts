import { temporaryDirectory } from 'tempy';

import { MobileProject, XmlFile } from '../src';

import { join } from 'path';
import { copy, pathExists, readFile, rm, stat } from '@ionic/utils-fs';
import { formatXml, serializeXml } from "../src/util/xml";
import { MobileProjectConfig } from '../src/config';
import { GradleFile } from '../src/android/gradle-file';

describe('project - android', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;
  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/ios-and-android', dir);

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

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('should load project', async () => {
    expect(project.android?.getAndroidManifest()).not.toBe(null);
    expect(project.android?.getBuildGradle()).not.toBe(null);
    expect(project.android?.getAppBuildGradle()).not.toBe(null);
  });

  it('should get main activity filename', async () => {
    expect(project.android?.getMainActivityFilename()).toBe('MainActivity.java');
  });

  it('should get gradle plugin version', async () => {
    expect(await project.android?.getGradlePluginVersion()).toBe('4.2.1');
  });

  it('should get package name', async () => {
    expect(await project.android?.getPackageName()).toBe('io.ionic.starter');
  });

  it('should set package name', async () => {
    await project.android?.setPackageName('com.ionicframework.awesome');
    expect(await project.android?.getPackageName()).toBe('com.ionicframework.awesome');
    expect(await project.android?.getAppBuildGradle()?.getApplicationId()).toBe('com.ionicframework.awesome');
    expect(await project.android?.getAppBuildGradle()?.getNamespace()).toBe('com.ionicframework.awesome');
    const newSource = await readFile(join(project.config.android?.path!, 'app/src/main/java/com/ionicframework/awesome/MainActivity.java'), { encoding: 'utf-8' });
    expect(newSource.indexOf('package com.ionicframework.awesome;')).toBe(0);
    expect(!(await pathExists(join(project.config.android?.path!, 'app/src/main/java/io')))).toBe(true);
    const activity = project.android?.getAndroidManifest().find('manifest/application/activity');
    expect(activity?.[0].getAttribute('android:name')).toBe('com.ionicframework.awesome.MainActivity');
  });

  it('should not error setting same package name', async () => {
    const packageName = await project.android?.getPackageName();
    await project.android?.setPackageName(packageName!);
    expect(await project.android?.getPackageName()).toBe(packageName);
  });

  it('should set package name longer than current package', async () => {
    await project.android?.setPackageName('com.ionicframework.awesome.long');
    expect(await project.android?.getPackageName()).toBe('com.ionicframework.awesome.long');
    expect(await project.android?.getAppBuildGradle()?.getApplicationId()).toBe('com.ionicframework.awesome.long');
    const newSource = await readFile(join(project.config.android?.path!, 'app/src/main/java/com/ionicframework/awesome/long/MainActivity.java'), { encoding: 'utf-8' });
    expect(newSource.indexOf('package com.ionicframework.awesome.long;')).toBe(0);
    expect(!(await pathExists(join(project.config.android?.path!, 'app/src/main/java/io')))).toBe(true);
    const activity = project.android?.getAndroidManifest().find('manifest/application/activity');
    expect(activity?.[0].getAttribute('android:name')).toBe('com.ionicframework.awesome.long.MainActivity');
  });

  it('should set package name shorter than current package', async () => {
    await project.android?.setPackageName('com.super');
    expect(await project.android?.getPackageName()).toBe('com.super');
    expect(await project.android?.getAppBuildGradle()?.getApplicationId()).toBe('com.super');
    const newSource = await readFile(join(project.config.android?.path!, 'app/src/main/java/com/super/MainActivity.java'), { encoding: 'utf-8' });
    expect(newSource.indexOf('package com.super;')).toBe(0);
    expect(!(await pathExists(join(project.config.android?.path!, 'app/src/main/java/io')))).toBe(true);
    const activity = project.android?.getAndroidManifest().find('manifest/application/activity');
    expect(activity?.[0].getAttribute('android:name')).toBe('com.super.MainActivity');
  });

  it('should add an attribute on a manifest node', async () => {
    project.android?.getAndroidManifest().setAttrs('manifest/application', {
      'android:name': 'com.ionicframework.test.CoolApplication'
    });

    const applicationNode = project.android?.getAndroidManifest().find('manifest/application')?.[0];
    expect(applicationNode!.getAttribute('android:name')).toBe('com.ionicframework.test.CoolApplication');

    project.android?.getAndroidManifest().setAttrs("/manifest/application/meta-data[@*='com.google.android.geo.API_KEY']",
      {
        'android:value': '---API-KEY---',
      }
    );

    const metadataNode = project.android?.getAndroidManifest().find("/manifest/application/meta-data[@*='com.google.android.geo.API_KEY']")?.[0];
    expect(metadataNode!.getAttribute('android:value')).toBe('---API-KEY---');

    const manifestFile = project.vfs.get<XmlFile>((project.android as any).getAndroidManifestPath());
    expect(manifestFile).not.toBeNull();

    // Make sure the updated file hasn't been destroyed
    expect(serializeXml(manifestFile?.getData()?.getDocumentElement())).toContain('<manifest');
  });

  it('should inject an XML fragment', async () => {
    project.android?.getAndroidManifest().injectFragment('manifest', `
    <queries>
      <package />
      <intent>
      </intent>
    </queries>
    `);

    const queriesNode = project.android?.getAndroidManifest().find('manifest/queries')?.[0];
    expect(queriesNode).toBeDefined();
    expect(queriesNode!.nodeName).toBe('queries');
    const intentNode = project.android?.getAndroidManifest().find('manifest/queries/intent')?.[0];
    expect(intentNode).toBeDefined();
    expect(intentNode!.nodeName).toBe('intent');

    const manifestFile = project.vfs.get((project.android as any).getAndroidManifestPath());
    expect(manifestFile).not.toBeNull();
  });

  it('should merge inject an XML fragment', async () => {
    project.android?.getAndroidManifest().mergeFragment('manifest/application/activity', `
    <activity>
      <intent-filter>
        <action android:name="android.intent.action.VIEW"/>
        <category android:name="android.intent.category.DEFAULT"/>
        <category android:name="android.intent.category.BROWSABLE"/>
        <data android:scheme="@string/custom_url_scheme"/>
      </intent-filter>
    </activity>
    `);

    const node = project.android?.getAndroidManifest().find('manifest/application/activity/intent-filter')?.[0];
    expect(node).toBeDefined();
    const elements = Object.values(node!.childNodes as any).filter((n: any) => n.nodeType === 1);

    const manifestFile = project.vfs.get((project.android as any).getAndroidManifestPath());
    expect(manifestFile).not.toBeNull();

    expect(elements.length).toBe(6);
  });

  it('should inject an XML fragment without single parent', async () => {
    project.android?.getAndroidManifest().injectFragment('manifest/application/activity[1]', `
      <thing1 />
      <thing2 />
      <thing3 />
    `);

    const node = project.android?.getAndroidManifest().find('manifest/application/activity')?.[0];
    expect(node).toBeDefined();
    const elements = Object.values(node!.childNodes as any).filter((n: any) => n.nodeName?.indexOf('thing') == 0);

    const manifestFile = project.vfs.get((project.android as any).getAndroidManifestPath());
    expect(manifestFile).not.toBeNull();

    expect(elements.length).toBe(3);
  });

  it('should support replacing in arbitrary xml files', async () => {
    const xml = await project.android?.getXmlFile('app/src/main/res/values/strings.xml');
    await xml!.load();
    
    xml!.replaceFragment('resources/string[@name="app_name"]', `
      <string name="app_name">Awesome App</string>
    `);

    const serialized = serializeXml(xml!.getDocumentElement());
    const node = xml!.find('resources/string[@name="app_name"]')?.[0];
    expect(node).toBeDefined();
    expect(node!.textContent).toBe('Awesome App');
    expect(serialized).toBe(`
<resources>
    <string name="app_name">Awesome App</string>
    <string name="title_activity_main">capacitor-configure-test</string>
    <string name="package_name">io.ionic.starter</string>
    <string name="custom_url_scheme">io.ionic.starter</string>
</resources>
    `.trim());
  });

  it('should support deleting nodes in xml', async () => {
    const xml = await project.android?.getXmlFile('app/src/main/res/values/strings.xml');
    await xml!.load();

    const node = xml!.find('resources/string[@name="app_name"]')?.[0];
    node!.parentNode!.removeChild(node!);
    const serialized = serializeXml(xml!.getDocumentElement());
    expect(serialized).toBe(`
<resources>
    
    <string name="title_activity_main">capacitor-configure-test</string>
    <string name="package_name">io.ionic.starter</string>
    <string name="custom_url_scheme">io.ionic.starter</string>
</resources>
    `.trim());
  });

  it('should set version', async () => {
    await project.android?.setVersionName('5.0.2');
    expect(await project.android?.getVersionName()).toBe('5.0.2');

    await project.android?.setVersionNameSuffix('beta');
    expect(await project.android?.getVersionNameSuffix()).toBe('beta');

    await project.android?.setVersionCode(123);
    expect(await project.android?.getVersionCode()).toBe(123);
    expect(await project.android?.getVersionName()).toBe('5.0.2');

    await project.android?.incrementVersionCode();
    expect(await project.android?.getVersionCode()).toBe(124);
    expect(await project.android?.getVersionName()).toBe('5.0.2');

    const appBuildGradle = project.android?.getAppBuildGradle();
    expect(appBuildGradle).not.toBe(null);
    const appBuildGradleSource = project.vfs.get<GradleFile>(appBuildGradle?.filename!);
    expect(appBuildGradleSource).not.toBe(null);
    expect(appBuildGradleSource!.getData()?.getDocument()).toBe(`apply plugin: 'com.android.application'

android {
    namespace "io.ionic.starter"
    compileSdkVersion rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "io.ionic.starter"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 124
        versionName "5.0.2"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             // Default: https://android.googlesource.com/platform/frameworks/base/+/282e181b58cf72b6ca770dc7ca5f91f135444502/tools/aapt/AaptAssets.cpp#61
            ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
        versionNameSuffix "beta"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    flatDir{
        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
    }
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation project(':capacitor-android')
    testImplementation "junit:junit:$junitVersion"
    androidTestImplementation "androidx.test.ext:junit:$androidxJunitVersion"
    androidTestImplementation "androidx.test.espresso:espresso-core:$androidxEspressoCoreVersion"
    implementation project(':capacitor-cordova-android-plugins')
}

apply from: 'capacitor.build.gradle'

try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.warn("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}
`);
  });

  it('should set android app label', async () => {
    await project.android?.setAppName('Test Label');
    const resPath = project.android?.getResourcesPath();
    console.log(project.vfs);
    const strings = project.vfs.get<XmlFile>(join(dir, 'android', resPath!, 'values/strings.xml'))?.getData();
    console.log(join(dir, 'android', resPath!, 'values/strings.xml'));
    const appName = strings!.find('resources/string[@name="app_name"]');
    expect(appName![0].textContent).toBe('Test Label');
  });

  it('should add resources file', async () => {
    await project.android?.addResource('raw', 'test.json', `{
      "thing": "cool"
    }`);

    const found = await project.android?.getResource('raw', 'test.json');
    expect(found).toEqual(`{
      "thing": "cool"
    }`);
  });

  it('should copy resources file', async () => {
    const src = join('../', 'common', 'test', 'fixtures', 'icon.png');
    const srcContents = await readFile(src);
    await project.android?.copyToResources('drawable', 'icon.png', src);
    const destContents = await project.android?.getResource('drawable', 'icon.png', null) as Buffer;

    expect(Buffer.compare(srcContents, destContents)).toBe(0);
  });

  it('should copy resources file from url', async () => {
    await project.android?.copyToResources('drawable', 'icon.png', 'https://via.placeholder.com/150C');
    const destContents = await project.android?.getResource('drawable', 'icon.png', null) as Buffer;

    expect(destContents.length).toBeGreaterThan(0);
  });

  it('should load properties file', async () => {
    const props = project.android?.getPropertiesFile('gradle.properties');
    await props?.load();
    expect(props?.getProperties()).toMatchObject({
      'org.gradle.jvmargs': '-Xmx1536m',
      'android.useAndroidX': true,
      'android.enableJetifier': true
    });
  });

  it('should copy file', async () => {
    await project.android?.copyFile('variables.gradle', 'variables2.gradle');
    const src = join(dir, 'android', 'variables.gradle');
    const srcContents = await readFile(src);
    const dest = join(dir, 'android', 'variables2.gradle');
    const destContents = await readFile(dest);
    expect(srcContents).toEqual(destContents);
  });

  it('should copy URL', async () => {
    await project.android?.copyFile('https://via.placeholder.com/150C', 'placeholder.png');
    const dest = join(dir, 'android', 'placeholder.png');
    const destContents = await readFile(dest);
    expect(destContents.length).toBeGreaterThan(0);
  });
});

describe('project - android - capacitor v5', () => {
  let config: MobileProjectConfig;
  let project: MobileProject;
  let dir: string;
  beforeEach(async () => {
    dir = temporaryDirectory();
    await copy('../common/test/fixtures/cap-v5', dir);

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

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('should detect new android activity location', async () => {
    const filename = await project.android?.getMainActivityPath();
    expect(filename).toBe(join('app', 'src', 'main', 'java', 'io', 'ionic', 'starter', 'MainActivity.java'));
  });

  it('should get package name', async () => {
    expect(await project.android?.getPackageName()).toBe('io.ionic.starter');
  });

  it('should set package name', async () => {
    await project.android?.setPackageName('com.ionicframework.awesome');
    expect(await project.android?.getPackageName()).toBe('com.ionicframework.awesome');
    expect(await project.android?.getAppBuildGradle()?.getApplicationId()).toBe('com.ionicframework.awesome');
    expect(await project.android?.getAppBuildGradle()?.getNamespace()).toBe('com.ionicframework.awesome');
    const newSource = await readFile(join(project.config.android?.path!, 'app/src/main/java/com/ionicframework/awesome/MainActivity.java'), { encoding: 'utf-8' });
    expect(newSource.indexOf('package com.ionicframework.awesome;')).toBe(0);
    expect(!(await pathExists(join(project.config.android?.path!, 'app/src/main/java/io')))).toBe(true);
    const activity = project.android?.getAndroidManifest().find('manifest/application/activity');
    expect(activity?.[0].getAttribute('android:name')).toBe('.MainActivity');
  });
});
