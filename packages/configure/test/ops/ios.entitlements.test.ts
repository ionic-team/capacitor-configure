import { copy } from '@ionic/utils-fs';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosEntitlementsOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/entitlements';

describe('op: ios.entitlements', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should add to entitlements', async () => {
    const op: IosEntitlementsOperation = {
      value: [
        {
          'keychain-access-groups': ['com.microsoft.intune.mam', 'com.microsoft.adalcache']
        },
      ],
    };

    await Op(ctx, op as Operation);

    const entitlements = await ctx.project.ios!.getEntitlements('App');
    expect(entitlements).toMatchObject({
      'keychain-access-groups': ['com.microsoft.intune.mam', 'com.microsoft.adalcache']
    });
  });

  it('should add entitlements with config', async () => {
    let op: IosEntitlementsOperation = {
      value: {
        replace: false,
        entries: [
          {
            'keychain-access-groups': ['com.microsoft.intune.mam', 'com.microsoft.adalcache']
          }
        ]
      },
    };

    await Op(ctx, op as Operation);

    const entitlements = await ctx.project.ios!.getEntitlements('App');
    expect(entitlements).toMatchObject({
      'keychain-access-groups': ['com.microsoft.intune.mam', 'com.microsoft.adalcache']
    });
  });

  it('should set entitlements', async () => {
    let op: IosEntitlementsOperation = {
      value: {
        replace: true,
        entries: [
          {
            'keychain-access-groups': ['com.microsoft.intune.mam', 'com.microsoft.adalcache']
          }
        ]
      },
    };

    await Op(ctx, op as Operation);

    op = {
      value: {
        replace: true,
        entries: [
          {
            'keychain-access-groups': ['com.ionicframework.blah']
          }
        ]
      },
    };

    await Op(ctx, op as Operation);

    const entitlements = await ctx.project.ios!.getEntitlements('App');
    expect(entitlements).toMatchObject({
      'keychain-access-groups': ['com.ionicframework.blah']
    });
  });
});
