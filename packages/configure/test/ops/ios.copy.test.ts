import { copy, readFile, rm } from '@ionic/utils-fs';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosCopyOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/copy';

import { makeOp } from '../utils';

describe('op: ios.copy', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  afterEach(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it('should copy file', async () => {
    makeOp
    const op: IosCopyOperation = makeOp('ios', 'copy',
      [
        {
          src: 'json-file.json',
          dest: 'json-file2.json',
        },
      ],
    );

    await Op(ctx, op as Operation);
    const src = join(dir, 'ios/App', 'json-file.json');
    const srcContents = await readFile(src);
    const dest = join(dir, 'ios/App', 'json-file2.json');
    const destContents = await readFile(dest);
    expect(srcContents).toEqual(destContents);
  });
});
