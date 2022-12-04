import { pathExists, readFile, writeFile } from '@ionic/utils-fs';
import { Logger } from './logger';
import { VFS, VFSFile, VFSStorable } from './vfs';

/**
 * iOS .strings files
 */
export class XCConfigFile extends VFSStorable {
  private doc: string = "";
  // Match key = value pairs that are terminated
  // by newlines or by the start of comments
  private keyValueRegex = /^\s*([^ \/]+)\s*=[^\S\r\n]*(([^\n;](?!\/\/))*)/gm;
  constructor(public path: string, private vfs: VFS) {
    super();
  }

  getDocument() {
    return this.doc;
  }

  getPairs() {
    const found = this.doc.matchAll(this.keyValueRegex);
    const pairs: any = {};
    for (const group of found) {
      pairs[group[1]] = group[2].trimEnd() ?? '';
    }
    return pairs;
  }

  async set(values: any) {
    if (!this.doc) {
      return;
    }

    Logger.v('xcconfig', 'update', `${this.path}`);
    const foundKeys: string[] = [];

    function replace(match: string, key: string, value: string) {
      // Return the new key/value pair
      if (key in values) {
        foundKeys.push(key);
        const newValue = values[key] ?? '';
        return `${key} = ${newValue}`;
      }
      return match;
    }


    this.doc = this.doc.replace(this.keyValueRegex, replace);

    const newKeys = Object.keys(values).filter(k => !!!foundKeys.find(fk => fk === k));

    for (const key of newKeys) {
      this.doc += `\n${key} = ${values[key]}`;
    }
  }

  async load() {
    if (this.vfs.isOpen(this.path)) {
      return;
    }

    if (!await pathExists(this.path)) {
      this.doc = "";
    } else {
      this.doc = await this.parse(this.path);
    }
    Logger.v('xcconfig', 'load', `at ${this.path}`);
    this.vfs.open(this.path, this, this.commitFn);
  }

  generate() {
    return "";
    // return generateXCConfig(this.doc);
  }

  private async parse(path: string): Promise<string> {
    const contents = await readFile(path, { encoding: 'utf-8' });
    return contents;
  }

  private commitFn = async (file: VFSFile) => {
    const entries = file.getData() as string;
    const src = this.generate();
    return writeFile(file.getFilename(), src);
  }
}