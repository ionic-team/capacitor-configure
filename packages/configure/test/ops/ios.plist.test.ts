import { copy } from '@ionic/utils-fs';
import { join } from 'path';
import tempy from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosPlistOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/plist';

describe('op: ios.plist', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = tempy.directory();

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

    const file = ctx.project.vfs.get(
      filename!
    );

    expect(file?.getData().getDocument()).toEqual({
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

    const file = ctx.project.vfs.get(
      join(ctx.project.config.ios?.path ?? '', 'plist-file.plist'),
    );

    expect(file?.getData().getDocument()).toEqual({
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
});
