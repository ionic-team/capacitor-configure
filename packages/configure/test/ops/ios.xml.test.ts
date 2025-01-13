import { copy, readFile } from '@ionic/utils-fs';
import { join } from 'path';
import { temporaryDirectory } from 'tempy';

import { Context, loadContext } from '../../src/ctx';
import { IosXmlOperation, Operation } from '../../src/definitions';
import Op from '../../src/operations/ios/xml';
import { makeOp } from '../utils';

describe('op: ios.xml', () => {
  let dir: string;
  let ctx: Context;

  beforeEach(async () => {
    dir = temporaryDirectory();

    await copy('../common/test/fixtures/ios-and-android', dir);

    ctx = await loadContext(dir);
    ctx.args.quiet = true;
  });

  it('should delete attributes', async () => {
    const op: IosXmlOperation = makeOp('ios', 'xml', [
      {
        file: 'xml-file.xml',
        target: '//plist',
        deleteAttributes: [
          'version'
        ]
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'ios', 'App', 'xml-file.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist>
    <dict>
        <key>com.apple.developer.parent-application-identifiers</key>
        <array>
            <string>$(AppIdentifierPrefix)io.ionic.wowzaStarter</string>
        </array>
    </dict>
</plist>
    `.trim());
  });

  it('should delete nodes', async () => {
    const op: IosXmlOperation = makeOp('ios', 'xml', [
      {
        file: 'xml-file.xml',
        delete: '//array'
      },
    ]);

    await Op(ctx, op as Operation);

    await ctx.project.commit();

    const file = await readFile(join(dir, 'ios', 'App', 'xml-file.xml'), { encoding: 'utf-8' });
    //console.log(file);
    expect(file.trim()).toBe(`
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
    <dict>
        <key>com.apple.developer.parent-application-identifiers</key>
    </dict>
</plist>
    `.trim());
  });

});
