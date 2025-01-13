import { copy } from '@ionic/utils-fs';
import { JsonFile } from '@trapezedev/project';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosJsonOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/json';

describe('op: ios.json', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should set ios.json', async () => {
    const op: IosJsonOperation = {
      value: [
        {
          file: 'json-file.json',
          set: {
            project_info: {
              project_id: 'my-id',
            },
          },
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<JsonFile>(
      join(ctx.project.config.ios?.path ?? '', 'json-file.json'),
    );
    expect(file?.getData()?.getDocument()).toEqual({
      client: [],
      project_info: {
        project_id: 'my-id',
      },
    });
  });

  it('should merge ios.json', async () => {
    const op: IosJsonOperation = {
      value: [
        {
          file: 'json-file.json',
          merge: {
            project_info: {
              project_id: 'my-id',
            },
          },
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<JsonFile>(
      join(ctx.project.config.ios?.path ?? '', 'json-file.json'),
    );
    expect(file?.getData()?.getDocument()).toEqual({
      client: [],
      project_info: {
        firebase_url: '',
        name: '1234',
        project_id: 'my-id',
        project_number: '1234',
      },
    });
  });
});
