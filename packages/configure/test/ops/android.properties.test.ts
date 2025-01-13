import { copy } from '@ionic/utils-fs';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { AndroidJsonOperation, AndroidPropertiesOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/android/properties';

describe('op: android.properties', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should set android.properties', async () => {
    const op: AndroidPropertiesOperation = {
      value: [
        {
          file: 'gradle.properties',
          entries: {
            'org.gradle.jvmargs': 'test',
          },
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get(join(dir, 'android/gradle.properties'));
    expect(file?.getData()).toMatchObject({
      'android.enableJetifier': true,
      'android.useAndroidX': true,
      'org.gradle.jvmargs': 'test'
    });
  });

});
