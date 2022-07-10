import plist, { PlistObject, PlistValue } from "plist";
import { writeFile } from '@ionic/utils-fs';
import { mergeWith, union } from 'lodash';

import { parsePlist } from "./util/plist";
import { VFS, VFSRef, VFSRefFile, VFSStorable } from "./vfs";

export class PlistFile implements VFSStorable {
  doc: PlistObject | null = null;

  constructor(private path: string, private vfs: VFS) {
  }

  getDocument() {
    return this.doc;
  }

  setDocument(doc: any) {
    this.doc = doc;
  }

  async load() {
    this.doc = await parsePlist(this.path);
    this.vfs.open(this.path, this, this.plistCommitFn);
  }

  private plistCommitFn = async (file: VFSRefFile) => {
    const data = file.getData() as PlistFile;
    const xml = plist.build(data.getDocument() ?? {}, {
      indent: '	', // Tab character
      offset: -1,
      newline: '\n'
    });
    return writeFile(file.getFilename(), xml);
  }

  async set(properties: any): Promise<void> {
    if (!this.doc) {
      return;
    }

    const merged = mergeWith(this.doc, properties, (objValue, srcValue) => {
      // Override the default merge behavior for arrays of objects that have the
      // same sub-key. Otherwise lodash merge doesn't work how we need it to
      if (Array.isArray(objValue)) {
        //if (replace) {
        return srcValue;
        //}

        /*
        const firstObjValue = objValue[0];
        const firstSrcValue = srcValue[0];

        // https://github.com/ionic-team/capacitor-configure/issues/32
        // When merging an array of dicts, like when modifying
        // CFBundleURLTypes, we don't want to union the two arrays because that
        // would result in duplicated array of dicts. Instead, we want to merge as-is.
        // This check makes sure we're not trying to union an array of dicts
        if (typeof firstObjValue !== 'object' && typeof firstSrcValue !== 'object') {
          return union(objValue, srcValue);
        }
        */
      } else if (typeof objValue === 'object' && objValue !== null) {
        //if (replace) {
        return srcValue;
        //}
      }
    });

    Object.assign(this.doc, merged);
  }

  async merge(properties: any): Promise<void> {
    if (!this.doc) {
      return;
    }

    const merged = mergeWith(this.doc, properties, (objValue, srcValue) => {
      if (Array.isArray(objValue)) {
        return union(objValue, srcValue);
      }
    });

    Object.assign(this.doc, merged);
  }

  /**
   * This is confusing but this uses a different set algorithm than the above set and merge.
   * TODO: Get rid of this or make this behavior the default for set or merge
   */
  update(entries: any, replace = false) {
    const merged = mergeWith(this.doc, entries, (objValue, srcValue) => {
      // Override the default merge behavior for arrays of objects that have the
      // same sub-key. Otherwise lodash merge doesn't work how we need it to
      if (Array.isArray(objValue)) {
        if (replace) {
          return srcValue;
        }

        const firstObjValue = objValue[0];
        const firstSrcValue = srcValue[0];

        // https://github.com/ionic-team/capacitor-configure/issues/32
        // When merging an array of dicts, like when modifying
        // CFBundleURLTypes, we don't want to union the two arrays because that
        // would result in duplicated array of dicts. Instead, we want to merge as-is.
        // This check makes sure we're not trying to union an array of dicts
        if (typeof firstObjValue !== 'object' && typeof firstSrcValue !== 'object') {
          return union(objValue, srcValue);
        }
      } else if (typeof objValue === 'object' && objValue !== null) {
        if (replace) {
          return srcValue;
        }
      }
    });

    this.setDocument(merged);
  }
}
