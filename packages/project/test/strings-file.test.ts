import { StringsFile } from '../src';
import { generateStrings } from '../src/util/strings';
import { VFS } from '../src/vfs';

describe('strings file', () => {
  let vfs: VFS;
  let file: StringsFile;

  beforeEach(async () => {
    vfs = new VFS();
    file = new StringsFile('../common/test/fixtures/strings.strings', vfs);
    await file.load();
  });

  it('Should load strings file', async () => {
    expect(file.getDocument()).toMatchObject([
      {
        comment: ' Insert Element menu item ',
        key: 'Insert Element',
        value: 'Insert Element',
        startLine: 3,
        startCol: 1,
        endLine: 3,
        endCol: 36
      },
      {
        comment: ' Error string used for unknown error types. ',
        key: 'ErrorString_1',
        value: 'An unknown error occurred.',
        startLine: 7,
        startCol: 1,
        endLine: 7,
        endCol: 47
      },
      {
        comment: '',
        key: 'KeyWithoutComment',
        value: 'This key has no comment',
        startLine: 9,
        startCol: 1,
        endLine: 9,
        endCol: 54
      },
      {
        comment: '**',
        key: 'This is a key',
        value: 'This is a value',
        startLine: 13,
        startCol: 4,
        endLine: 13,
        endCol: 39
      }
   ]);
  });

  it('Should generate strings file', async () => {
    expect(generateStrings(file.getDocument())).toBe(`
/* Insert Element menu item */

"Insert Element" = "Insert Element";

/* Error string used for unknown error types. */

"ErrorString_1" = "An unknown error occurred.";

"KeyWithoutComment"    =   "This key has no comment" ;

/****/

   "This is a key"  ="This is a value";
    `);
  });
});