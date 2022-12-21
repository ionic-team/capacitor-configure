import { pathExists, readFile, writeFile } from '@ionic/utils-fs';
import { relative } from 'path';
import { Logger } from './logger';
import { MobileProject } from './project';
import { assertParentDirs } from './util/fs';
import { generateStrings, parseStrings, StringsEntries } from './util/strings';
import { VFS, VFSFile, VFSStorable } from './vfs';

/**
 * iOS .strings files
 */
export class StringsFile extends VFSStorable {
  private doc: StringsEntries = [];
  constructor(public path: string, private vfs: VFS, private project?: MobileProject) {
    super();
  }

  getDocument() {
    return this.doc;
  }

  async setFromJson(jsonFile: any): Promise<void> {
    const json = JSON.parse(await readFile(jsonFile, { encoding: 'utf-8' }));

    this.set(json);
  }

  async set(values: any) {
    if (!this.doc) {
      return;
    }

    Logger.v('strings', 'update', `${this.path}`);

    Object.keys(values).forEach(k => {
      let found = false;
      this.doc = this.doc.map(e => {
        if (e.key === k) {
          found = true;
          return {
            ...e,
            value: values[k]
          }
        }
        return e;
      });

      const lastEntry = this.doc[Math.max(0, this.doc.length - 1)];

      if (!found) {
        if (lastEntry) {
          this.doc.push({
            content: '\n\n',
            startLine: lastEntry ? lastEntry.endLine + 1 : 0,
            startCol: 0,
            endLine: lastEntry ? lastEntry.endLine + 2 : 0,
            endCol: 0
          });
        }
        this.doc.push({
          key: k,
          value: values[k],
          startLine: lastEntry ? lastEntry.endLine + 3 : 0,
          startCol: 0,
          endLine: lastEntry ? lastEntry.endLine + 4 : 0,
          endCol: 0
        });
      }
    });
  }

  async load() {
    if (this.vfs.isOpen(this.path)) {
      return;
    }

    if (!await pathExists(this.path)) {
      this.doc = [];
      // Add the file to the iOS project
      if (this.project) {
        const rel = relative(this.project.config.ios?.path ?? '', this.path);
        this.project?.ios?.addFile(rel);
      }
    } else {
      this.doc = await this.parse(this.path);
    }
    Logger.v('strings', 'load', `at ${this.path}`);
    this.vfs.open(this.path, this, this.commitFn);
  }

  generate() {
    return generateStrings(this.doc);
  }

  private async parse(path: string): Promise<StringsEntries> {
    const contents = await readFile(path, { encoding: 'utf-8' });
    return parseStrings(contents);
  }

  private commitFn = async (file: VFSFile) => {
    const f = file.getData() as StringsFile;
    const src = generateStrings(f.doc);
    await assertParentDirs(file.getFilename());
    return writeFile(file.getFilename(), src);
  }
}