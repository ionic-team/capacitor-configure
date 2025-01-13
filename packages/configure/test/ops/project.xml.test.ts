import { copy, readFile } from '@ionic/utils-fs';
import { XmlFile } from '@trapezedev/project';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { XmlOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/project/xml';
import { makeOp } from '../utils';

describe('op: project.xml', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should delete attributes', async () => {
    const op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml.xml',
        target: '//activity',
        deleteAttributes: [
          'android:launchMode'
        ]
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version="1.0" encoding="utf-8" ?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="io.ionic.starter">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <meta-data android:name="com.google.android.geo.API_KEY" android:value="\${MAPS_API_KEY}" />

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="io.ionic.starter.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
    `.trim());
  });

  it('should delete nodes', async () => {
    const op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml.xml',
        delete: '//intent-filter'
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version="1.0" encoding="utf-8" ?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="io.ionic.starter">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme">
        <meta-data android:name="com.google.android.geo.API_KEY" android:value="\${MAPS_API_KEY}" />

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="io.ionic.starter.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
        />

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>
    `.trim());
  });

  it('should delete root and replace', async () => {
    let op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml.xml',
        delete: '/manifest'
      },
    ]);

    await Op(ctx, op as Operation);

    let data = ctx.project.vfs.get<XmlFile>(join(dir, 'project-xml.xml'))!.getData();

    // The document element should be null at this point as we deleted the root node
    expect(data!.getDocumentElement()).toBeNull();

    op = makeOp('project', 'xml', [
      {
        file: 'project-xml.xml',
        target: '/',
        inject: `<tag><thing /></tag>`
      },
    ]);

    await Op(ctx, op as Operation);

    // The document element should be null at this point as we deleted the root node
    expect(data!.getDocumentElement()).not.toBeNull();

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version="1.0" encoding="utf-8" ?>
<tag>
    <thing />
</tag>
    `.trim());
  });


  it('should process multiple replaces', async () => {
    let op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml-strings.xml',
        target: 'resources/string[@name="app_name"]',
        replace: '<string name="app_name">$PRODUCT_NAME</string>'
      },
      {
        file: 'project-xml-strings.xml',
        target: 'resources/string[@name="title_activity_main"]',
        replace: '<string name="title_activity_main">$PRODUCT_NAME</string>'
      },
      {
        file: 'project-xml-strings.xml',
        target: 'resources/string[@name="package_name"]',
        replace: '<string name="package_name">$ANDROID_PACKAGE_NAME</string>'
      },
      {
        file: 'project-xml-strings.xml',
        target: 'resources/string[@name="custom_url_scheme"]',
        replace: '<string name="custom_url_scheme">$ANDROID_PACKAGE_NAME</string>'
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml-strings.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version='1.0' encoding='utf-8' ?>
<resources>
    <string name="app_name">$PRODUCT_NAME</string>
    <string name="title_activity_main">$PRODUCT_NAME</string>
    <string name="package_name">$ANDROID_PACKAGE_NAME</string>
    <string name="custom_url_scheme">$ANDROID_PACKAGE_NAME</string>
</resources>
    `.trim());
  });

  // per https://github.com/ionic-team/trapeze/issues/87
  it('should merge nodes', async () => {
    const op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml-strings.xml',
        target: 'resources',
        merge: `
        <resources>
          <string name="app_name">$PRODUCT_NAME</string>
          <string name="title_activity_main">$PRODUCT_NAME</string>
          <string name="package_name">$ANDROID_PACKAGE_NAME</string>
          <string name="custom_url_scheme">$ANDROID_PACKAGE_NAME</string>
        </resources>
        `
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml-strings.xml'), { encoding: 'utf-8' });
    expect(file.trim()).toBe(`
<?xml version='1.0' encoding='utf-8' ?>
<resources>
    <string name="app_name">$PRODUCT_NAME</string>
    <string name="title_activity_main">$PRODUCT_NAME</string>
    <string name="package_name">$ANDROID_PACKAGE_NAME</string>
    <string name="custom_url_scheme">$ANDROID_PACKAGE_NAME</string>
</resources>
    `.trim());
  });

  it('should replace nodes', async () => {
    const op: XmlOperation = makeOp('project', 'xml', [
      {
        file: 'project-xml-strings.xml',
        target: 'resources/string[@name="app_name"]',
        replace: `
          <string name="app_name">$PRODUCT_NAME</string>
        `
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'project-xml-strings.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version='1.0' encoding='utf-8' ?>
<resources>
    <string name="app_name">$PRODUCT_NAME</string>
    <string name="title_activity_main">capacitor-configure-test</string>
    <string name="package_name">io.ionic.starter</string>
    <string name="custom_url_scheme">io.ionic.starter</string>
</resources>`.trim());
  });
});
