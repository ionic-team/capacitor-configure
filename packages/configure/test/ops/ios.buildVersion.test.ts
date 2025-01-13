import { copy, readFile, rm } from '@ionic/utils-fs';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosCopyOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/buildVersion';

import { makeOp } from '../utils';

describe('op: ios.buildVersion', () => {
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

  it('shouldn\'t break build when updating empty buildNumber', async () => {
    const op: IosCopyOperation = makeOp('ios', 'buildNumber', '');

    await Op(ctx, op as Operation);

    expect(ctx.project.ios?.getBuildProperty(null, null, 'CURRENT_PROJECT_VERSION')).toBe(1);
  });

  it('shouldn\'t update buildNumber', async () => {
    const op: IosCopyOperation = makeOp('ios', 'buildNumber', 1337);

    await Op(ctx, op as Operation);

    expect(ctx.project.ios?.getBuildProperty(null, null, 'CURRENT_PROJECT_VERSION')).toBe(1337);
  });
});
