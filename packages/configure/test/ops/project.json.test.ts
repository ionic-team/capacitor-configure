import { copy } from '@ionic/utils-fs';
import { JsonFile } from '@trapezedev/project';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { JsonOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/project/json';

describe('op: project.json', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should set project.json', async () => {
    const op: JsonOperation = {
      value: [
        {
          file: 'project-json.json',
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
      join(dir, 'project-json.json'),
    );
    expect(file?.getData()?.getDocument()).toEqual({
      client: [],
      project_info: {
        project_id: 'my-id',
      },
    });
  });

  it('should merge project.json', async () => {
    const op: JsonOperation = {
      value: [
        {
          file: 'project-json.json',
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
      join(dir, 'project-json.json'),
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
