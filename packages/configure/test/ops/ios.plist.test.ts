import { copy } from '@ionic/utils-fs';
import { PlistFile } from '@trapezedev/project';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosPlistOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/plist';

describe('op: ios.plist', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should use target and build types ios.plist', async () => {
    const op: IosPlistOperation = {
      value: [
        {
          iosBuild: 'Debug',
          iosTarget: 'My App Clip',
          replace: true,
          entries: [{
            UIApplicationSceneManifest: {
              TestKey: true
            },
          }],
        },
      ],
    };

    await Op(ctx, op as Operation);

    const filename = await ctx.project.ios?.getInfoPlistFilename('My App Clip', 'Debug');

    const file = ctx.project.vfs.get<PlistFile>(
      filename!
    );

    expect(file?.getData()?.getDocument()).toEqual({
      NSAppClip: {
        NSAppClipRequestEphemeralUserNotification: false,
        NSAppClipRequestLocationConfirmation: false
      },
      UIApplicationSceneManifest: {
        TestKey: true
      }
    });
  });

  it('should merge ios.plist', async () => {
    const op: IosPlistOperation = {
      value: [
        {
          file: 'plist-file.plist',
          replace: false,
          entries: [{
            UIApplicationSceneManifest: {
              TestKey: true
            },
          }],
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<PlistFile>(
      join(ctx.project.config.ios?.path ?? '', 'plist-file.plist'),
    );

    expect(file?.getData()?.getDocument()).toEqual({
      NSAppClip: {
        NSAppClipRequestEphemeralUserNotification: false,
        NSAppClipRequestLocationConfirmation: false
      },
      UIApplicationSceneManifest: {
        TestKey: true,
        UIApplicationSupportsMultipleScenes: false,
        UISceneConfigurations: {
          UIWindowSceneSessionRoleApplication: [
            {
              UISceneConfigurationName: "Default Configuration",
              UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
              UISceneStoryboardFile: "Main"
            }
          ]
        }
      }
    });
  });

  it('should support raw xml for ios.plist', async () => {
    const op: IosPlistOperation = {
      value: [
        {
          file: 'plist-file.plist',
          replace: true,
          xml: `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSFoo</key>
  <dict>
    <key>Bar</key>
    <true/>
  </dict>
</dict>
</plist>
          `
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<PlistFile>(
      join(ctx.project.config.ios?.path ?? '', 'plist-file.plist'),
    );

    expect(file?.getData()?.getDocument()).toEqual({
      "NSFoo": {
        "Bar": true
      }
    });
  });
});
