import { copy } from '@ionic/utils-fs';
import { StringsFile } from '@trapezedev/project';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosStringsOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/strings';

describe('op: ios.strings', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should set ios.strings', async () => {
    const op: IosStringsOperation = {
      value: [
        {
          file: 'App/Localizable.strings',
          set: {
            'Insert Element': 'Insert Element 2'
          },
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<StringsFile>(
      join(ctx.project.config.ios?.path ?? '', 'App', 'Localizable.strings'),
    );
    expect(file?.getData()?.generate()).toEqual(`
/* Insert Element menu item */

"Insert Element" = "Insert Element 2";

/* Error string used for unknown error types. */

"ErrorString_1" = "An unknown error occurred.";
`.trim());
  });

  it('should set ios.strings from json', async () => {
    const op: IosStringsOperation = {
      value: [
        {
          file: 'App/Localizable.strings',
          setFromJson: '../common/test/fixtures/strings.json'
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<StringsFile>(
      join(ctx.project.config.ios?.path ?? '', 'App', 'Localizable.strings'),
    );
    expect(file?.getData()?.generate()).toEqual(`
/* Insert Element menu item */

"Insert Element" = "New3";

/* Error string used for unknown error types. */

"ErrorString_1" = "New4";
`.trim());
  });

  it('should create new strings file if one does not exist', async () => {
    const op: IosStringsOperation = {
      value: [
        {
          file: 'App/path/to/New.strings',
          setFromJson: '../common/test/fixtures/strings.json'
        },
      ],
    };

    await Op(ctx, op as Operation);

    const file = ctx.project.vfs.get<StringsFile>(
      join(ctx.project.config.ios?.path ?? '', 'App', 'path', 'to', 'New.strings'),
    );
    const generated = file?.getData()?.generate();
    expect(generated).toEqual(`
"Insert Element" = "New3";

"ErrorString_1" = "New4";
`.trim());
  });
});
