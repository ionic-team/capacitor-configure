import { copy } from '@ionic/utils-fs';
import { XCConfigFile } from '@trapezedev/project/src';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosXCConfigOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/xcconfig';

describe('op: ios.strings', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should set ios.xcconfig', async () => {
    const op: IosXCConfigOperation = {
      value: [
        {
          file: 'App/Config.xcconfig',
          set: {
            'PRODUCT_NAME': 'prod',
            'FOO[sdk=macosx*][arch=i386]': 'bar'
          },
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<XCConfigFile>(
      join(ctx.project.config.ios?.path ?? '', 'App', 'Config.xcconfig'),
    );
    expect(file?.getData()?.generate().trim()).toEqual(`
PRODUCT_NAME = prod
FOO[sdk=macosx*][arch=i386] = bar
`.trim());
  });
});
