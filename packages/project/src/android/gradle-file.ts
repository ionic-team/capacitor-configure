import { dirname, join } from 'path';
import os from 'os';
import { temporaryFile } from 'tempy';
import { pathExists, readFile, writeFile } from '@ionic/utils-fs';
import { spawnCommand } from '../util/subprocess';
import { indent } from '../util/text';
import { VFS, VFSFile, VFSStorable, VFSDiff } from '../vfs';
import detectIndent from '../util/detect-indent';
import { AndroidGradleInjectType } from '../definitions';
import { Logger } from '../logger';
import { assertParentDirs } from '../util/fs';

export type GradleAST = any;
export interface GradleASTNode {
  type: string;
  name: string;
  children?: GradleASTNode[];
  source: {
    line: number;
    column: number;
    lastLine: number;
    lastColumn: number;
  };
}

export class GradleFile extends VFSStorable {
  private source: string | null = null;
  private parsed: GradleAST | null = null;
  private tempFile: string | null = null;

  constructor(public filename: string, private vfs: VFS) {
    super();
  }

  getDocument() {
    return this.source;
  }

  /**
   * Replace the given properties at the specified point in the Gradle file or insert
   * if the replacement doesn't exist
   * 
   * exact specifies whether the pathObject should be exact from the root of the document or
   * if it can match on a sub-object
   **/
  async replaceProperties(pathObject: any, toReplace: any, exact = false): Promise<void> {
    await this.parse();

    if (!this.parsed) {
      throw new Error('Call parse() first to load Gradle file');
    }

    const found = this.find(pathObject, exact);

    if (!found.length) {
      // Create a parent selector object since we're going to insert instead
      const parent = this._makeReplacePathObject(
        pathObject,
        Object.keys(toReplace)[0],
      );
      const foundParent = this.find(parent, exact);

      if (foundParent.length) {
        this.insertIntoGradleFile([toReplace], foundParent[0], AndroidGradleInjectType.Infer);
        return;
      } else {
        throw new Error(
          'Unable to find target in Gradle file to replace or insert',
        );
      }
    }

    const target = found[0];

    return this.replaceInGradleFile(toReplace, target);
  }

  // Build a new pathObject that is the path to the parent rather than
  // the path in pathObject
  _makeReplacePathObject(pathObject: any, injectKey: string) {
    let x: any = {};
    let y = x;

    let a = pathObject;
    while (a) {
      const keys = Object.keys(a);

      if (keys[0] === injectKey || !keys.length) {
        return y;
      }

      const o = {};
      x[keys[0]] = o;
      x = o;

      a = a[keys[0]];
    }

    return y;
  }

  /**
   * Replace an entry in the gradle file.
   */
  // This is a beast, sorry. Hey, at least there's tests
  // In the future, this could be moved to the Java `gradle-parse` package provided in this monorepo
  // along with modifying the AST to inject our script but this works fine for now
  private async replaceInGradleFile(
    toInject: any,
    targetNode: { node: GradleASTNode; depth: number },
  ) {
    // These values are 1-indexed not 0-indexed
    //let { line, column, lastLine, lastColumn } = targetNode.node.source;
    let { line, column, lastLine, lastColumn } = targetNode.node.source;

    const source = (await this.getGradleSource()) ?? '';
    const sourceLines = source.split(/\r?\n/);

    if (line == -1) {
      // Set to first line (remember, 1-indexed)
      line = 1;
    }
    if (lastLine === -1) {
      // Set to last line (remember, 1-indexed)
      lastLine = sourceLines.length + 1;
    }

    const detectedIndent = detectIndent(source);

    let lines: string[] = [];

    this.createGradleSource(
      [toInject],
      lines /* out */,
      detectedIndent.indent,
      undefined,
      targetNode.node,
      AndroidGradleInjectType.Infer
    );

    const resolvedLastLine = lastLine < 0 ? sourceLines.length : lastLine;

    const formatted = lines.join('\n');

    const indentAmount = targetNode.depth;

    const indented = indent(formatted, detectedIndent.indent, indentAmount - 1);

    // Replace the target lines with our new source line
    const newSource =
      sourceLines.slice(0, Math.max(0, line - 1)).join('\n') +
      '\n' +
      indented +
      '\n' +
      sourceLines
        .slice(Math.max(0, resolvedLastLine), sourceLines.length)
        .join('\n');

    this.source = newSource;
  }

  /**
   * Insert the given properties at the specified point in the Gradle file.
   * exact specifies whether the pathObject should be exact from the root of the document or
   * if it can match on a sub-object
   **/
  async insertProperties(pathObject: any, toInject: any[], type: AndroidGradleInjectType = AndroidGradleInjectType.Method, exact: boolean = false): Promise<void> {
    await this.parse();

    if (!this.parsed) {
      throw new Error('Call parse() first to load Gradle file');
    }

    const found = this.find(pathObject, exact);
    if (!found.length) {
      throw new Error('Unable to find method in Gradle file to inject');
    }

    const target = found[0];

    return this.insertIntoGradleFile(toInject, target, type);
  }

  /**
   * Inject the given properties at the specified point in the Gradle file.
   * exact specifies whether the pathObject should be exact from the root of the document or
   * if it can match on a sub-object
   **/
  async insertFragment(pathObject: any, toInject: string, exact = false): Promise<void> {
    await this.parse();

    if (!this.parsed) {
      throw new Error('Call parse() first to load Gradle file');
    }

    const found = this.find(pathObject, exact);
    if (!found.length) {
      throw new Error('Unable to find method in Gradle file to inject');
    }

    const target = found[0];

    return this.insertIntoGradleFile(toInject, target, AndroidGradleInjectType.Infer);
  }

  /**
   * Parse the underlying Gradle file and build the AST. Note: this calls out to
   * a Java process which incurs some overhead and requires java to be installed
   * This is because Gradle is actually a DSL for the Groovy language, which is
   * a JVM language. Additionally, the Groovy parser is based on a modified version
   * of the Antlr project that is tightly bound to the JVM. Ultimatley, this means
   * the only safe, accurate way to feasibly build a Gradle AST is to use the Groovy
   * parser API which this uses under the hood.
   */
  async parse() {
    if (!(await pathExists(this.filename))) {
      throw new Error(`Unable to locate file at ${this.filename}`);
    }

    const vfsRef = this.vfs.get<GradleFile>(this.filename);

    // We keep a temp file updated with the latest source so the parser can operate
    // on the current state of the file so we can handle multiple modifications to it
    // in sequence
    if (!this.tempFile) {
      // If the temp file doesn't exist yet, create it and write the current file source to it
      const gradleContents = await this.getGradleSource();
      this.tempFile = temporaryFile({ extension: 'gradle' });
      await writeFile(this.tempFile, gradleContents);
    } else if (vfsRef) {
      // Otherwise if it already exists then write the current vfs data to it
      if (vfsRef?.getData()?.getDocument()) {
        await writeFile(this.tempFile, vfsRef?.getData()?.getDocument());
      }
    }

    const parserRoot = this.getGradleParserPath();
    const java = await this.getJava();

    if (!java) {
      throw new Error(this.gradleParseError());
    }

    Logger.v('gradle', 'parse', `running Gradle parse with Java path ${java}`);
    Logger.v('gradle', 'parse', `read gradle file at ${this.filename}`);

    try {
      let json: string | null = null;

      if (os.platform() === 'win32') {
        json = await spawnCommand(
          java,
          [
            '-cp',
            'lib/groovy-3.0.9.jar;lib/json-20210307.jar;capacitor-gradle-parse.jar;.',
            'com.capacitorjs.gradle.Parse',
            this.tempFile,
          ],
          {
            cwd: parserRoot,
            stdio: 'pipe',
          },
        );
      } else {
        json = await spawnCommand(
          java,
          [
            '-cp',
            'lib/*:capacitor-gradle-parse.jar:.',
            'com.capacitorjs.gradle.Parse',
            this.tempFile,
          ],
          {
            cwd: parserRoot,
            stdio: 'pipe',
          },
        );
      }

      this.parsed = JSON.parse(json || '{}');

      return this.parsed;
    } catch (e: any) {
      throw new Error(`Unable to load or parse gradle file: ${e}`);
    }
  }

  /**
   * Inject a modification into the gradle file.
   */
  // This is a beast, sorry. Hey, at least there's tests
  // In the future, this could be moved to the Java `gradle-parse` package provided in this monorepo
  // along with modifying the AST to inject our script but this works fine forn ow
  private async insertIntoGradleFile(
    toInject: any[] | string,
    targetNode: { node: GradleASTNode; depth: number },
    type: AndroidGradleInjectType
  ) {
    // These values are 1-indexed not 0-indexed
    let { line, column, lastLine, lastColumn } = targetNode.node.source;

    const source = (await this.getGradleSource()) ?? '';
    const sourceLines = source.split(/\r?\n/);

    if (line == -1) {
      // Set to first line (remember, 1-indexed)
      line = 1;
    }
    if (lastLine === -1) {
      // Set to last line (remember, 1-indexed)
      lastLine = sourceLines.length + 1;
    }

    const detectedIndent = detectIndent(source);

    let lines: string[] = [];

    if (Array.isArray(toInject)) {
      this.createGradleSource(
        toInject,
        lines /* out */,
        detectedIndent.indent,
        undefined,
        targetNode.node,
        type
      );
    } else {
      lines = toInject.split(/\r?\n/);
    }

    const resolvedLastLine = lastLine < 0 ? sourceLines.length : lastLine;

    const formatted = lines.join('\n');

    const indentAmount = targetNode.depth;

    let newSource: string | null = null;

    if (line === lastLine) {
      // Block is empty, like dependencies {}

      const indented = indent(formatted, detectedIndent.indent, indentAmount);
      const sourceLine = sourceLines[line - 1];

      // The new line is the slice from the start of the line to one character before the end (remember,
      // the lines and columns are 1-indexed so lastColumn - 2 is one character before the end
      const newLine =
        sourceLine.slice(0, Math.max(0, lastColumn - 2)) +
        '\n' +
        indented +
        '\n' +
        indent(
          sourceLine.slice(Math.max(0, lastColumn - 2)).trim(),
          detectedIndent.indent,
          Math.max(0, indentAmount - 1),
        );

      newSource =
        sourceLines.slice(0, Math.max(0, resolvedLastLine - 1)).join('\n') +
        '\n' +
        newLine +
        '\n' +
        sourceLines
          .slice(Math.max(0, resolvedLastLine), sourceLines.length)
          .join('\n');
    } else {
      const indented = indent(formatted, detectedIndent.indent, indentAmount);
      newSource =
        sourceLines.slice(0, Math.max(0, resolvedLastLine - 1)).join('\n') +
        '\n' +
        indented +
        '\n' +
        sourceLines
          .slice(Math.max(0, resolvedLastLine - 1), sourceLines.length)
          .join('\n');
    }

    this.source = newSource;
  }

  find(pathObject: any | null, exact = false): { node: GradleASTNode; depth: number }[] {
    if (!this.parsed) {
      throw new Error('Call parse() first to load Gradle file');
    }

    // Null or empty object means the root node
    if (!pathObject || !Object.keys(pathObject).length) {
      const firstChild = this.parsed.children?.[0];
      if (firstChild) {
        return [{ node: firstChild, depth: 0 }];
      }
      return [];
    }

    const found: { node: GradleASTNode; depth: number }[] = [];
    this._find(pathObject, this.parsed, pathObject, exact, [], found);
    return found;
  }

  private _find(
    pathObject: any,
    node: GradleASTNode,
    pathNode: any,
    exact: boolean,
    pathToNode: any[],
    found: any[],
    depth = 0,
  ) {
    if (!pathNode) {
      return;
    }

    const targetKey = Object.keys(pathNode)?.[0];
    if (!targetKey) {
      return;
    }

    for (const c of (node.children ?? [])) {
      if (this.isTargetNode(c) && c.name === targetKey) {
        pathNode = pathNode[targetKey];
        if (!pathNode || Object.keys(pathNode).length == 0) {
          // We've run out of path nodes to match
          if (!exact) {
            found.push({ node: c, depth });
          } else if (exact && this.matchesExact(pathObject, c, [...pathToNode, c])) {
            found.push({ node: c, depth });
          }

        }
      }
      const newPathToNode = this.isTargetNode(node) ? [...pathToNode, node] : pathToNode;
      this._find(
        pathObject,
        c,
        pathNode,
        exact,
        newPathToNode,
        found,
        c.type === 'block' ? depth + 1 : depth,
      );
    }
  }

  getSource(node: GradleASTNode) {
    if (!this.parsed || !this.source) {
      throw new Error('Call parse() first to load Gradle file');
    }

    const lines = this.source.split(/\r?\n/);

    const sourceLines = lines.slice(node.source.line - 1, node.source.lastLine);

    const firstLine = sourceLines[0].slice(Math.max(0, node.source.column - 1));
    const lastLine = sourceLines[sourceLines.length - 1].slice(0, node.source.lastColumn);

    if (sourceLines.length > 2) {
      return [firstLine, ...sourceLines.slice(1, sourceLines.length - 1), lastLine].join('\n');
    } else if (sourceLines.length == 2) {
      return [firstLine, lastLine].join('\n');
    } else {
      return firstLine;
    }
  }

  private getDepth(pathObject: any) {
    let depth = 0;
    let n = pathObject;
    while (n) {
      const keys = Object.keys(n);
      if (keys.length > 0) {
        depth++;
        n = n[keys[0]];
      } else {
        break;
      }
    }
    return depth;
  }

  // When doing an exact match, need to check the path to the node
  // and verify the hierarchy matches
  private matchesExact(pathObject: any, node: GradleASTNode, pathToNode: any[]) {
    const targetDepth = this.getDepth(pathObject);
    const currentDepth = pathToNode.length;
    if (currentDepth != targetDepth) {
      return false;
    }

    let n = pathObject;
    let m = pathToNode;
    while (n && m) {
      const key = Object.keys(n)[0];
      if (key && key !== m[0]?.name) {
        return false;
      }
      n = n[key];
      m = m.slice(1);
    }

    return true;
  }

  private isTargetNode(node: any) {
    return node.type === 'method' || node.type === 'variable';
  }

  async getJava(): Promise<string | null> {
    try {
      if (process.env.JAVA_HOME) {
        return join(process.env.JAVA_HOME, 'bin', 'java');
      }
      const v = await spawnCommand('java', ['-version'], {
        stdio: 'pipe',
        combineStreams: true
      });
      if (!v) {
        throw new Error('Unable to find java on PATH');
      }
      return 'java';
    } catch(e) {
    }
    return null;
  }

  getGradleParserPath() {
    return dirname(require.resolve('@trapezedev/gradle-parse'));
  }

  async setApplicationId(applicationId: string) {
    const source = await this.getGradleSource();

    if (source) {
      this.source = source.replace(
        /(applicationId\s+)["'][^"']+["']/,
        `$1"${applicationId}"`,
      );
    }
  }

  async getApplicationId(): Promise<string | null> {
    const source = await this.getGradleSource();

    if (source) {
      const applicationId = source.match(/applicationId\s+["']([^"']+)["']/);

      if (!applicationId) {
        return null;
      }

      return applicationId[1];
    }
    return null;
  }

  async setVersionCode(versionCode: number) {
    const source = await this.getGradleSource();

    if (source) {
      Logger.v('gradle', 'setVersionCode', `to ${versionCode} in ${this.filename}`);
      return this.replaceProperties({
        android: {
          defaultConfig: {
            versionCode: {}
          }
        }
      }, {
        versionCode
      });
    }
  }

  async getVersionCode(): Promise<number | null> {
    const source = await this.getGradleSource();

    if (source) {
      const versionCode = source.match(/versionCode\s+(\w+)/);
      if (!versionCode) {
        return null;
      }
      return parseInt(versionCode[1]);
    }
    return null;
  }

  async incrementVersionCode() {
    const source = await this.getGradleSource();

    if (source) {
      const versionCode = source.match(/versionCode\s+(\w+)/);
      if (!versionCode) {
        return;
      }
      const num = parseInt(versionCode[1]);
      if (!isNaN(num)) {
        Logger.v('gradle', 'incrementVersionCode', `to ${num} in ${this.filename}`);
        return this.setVersionCode(num + 1);
      }
    }
  }

  async setVersionName(versionName: string) {
    const source = await this.getGradleSource();

    if (source) {
      Logger.v('gradle', 'setVersionName', `to ${versionName} in ${this.filename}`);
      return this.replaceProperties({
        android: {
          defaultConfig: {
            versionName: {}
          }
        }
      }, {
        versionName: `"${versionName}"`
      });
    }
  }

  async getVersionName(): Promise<string | null> {
    const source = await this.getGradleSource();

    if (source) {
      const versionName =
        source.match(/versionName\s+["']([^"']+)["']/) || null;
      if (!versionName) {
        return null;
      }
      return versionName[1];
    }

    return null;
  }

  async setVersionNameSuffix(versionNameSuffix: string) {
    const source = await this.getGradleSource();

    if (source) {
      Logger.v('gradle', 'setVersionNameSuffix', `to ${versionNameSuffix} in ${this.filename}`);

      return this.replaceProperties({
        android: {
          defaultConfig: {
            versionNameSuffix: {}
          }
        }
      }, {
        versionNameSuffix: `"${versionNameSuffix}"`
      });
    }
  }

  async getVersionNameSuffix(): Promise<string | null> {
    const source = await this.getGradleSource();

    if (source) {
      const versionName =
        source.match(/versionNameSuffix\s+["']([^"']+)["']/) || null;
      if (!versionName) {
        return null;
      }
      return versionName[1];
    }

    return null;
  }

  async getNamespace(): Promise<string | null> {
    const source = await this.getGradleSource();

    if (source) {
      const namespace = source.match(/namespace\s+["']([^"']+)["']/);

      if (!namespace) {
        return null;
      }

      return namespace[1];
    }
    return null;
  }

  async setNamespace(namespace: string) {
    const source = await this.getGradleSource();

    if (source) {
      Logger.v('gradle', 'setNamespace', `to ${namespace} in ${this.filename}`);

      return this.replaceProperties({
        android: {
          namespace: {}
        }
      }, {
        namespace: `"${namespace}"`
      });
    }
  }


  /*
  Generate a fragment of Gradle/Groovy code given the inject object

  A gradle edit will be of the form:

  [
    {
      maven: [{
        url: 'https://pkgs.dev.azure.com/MicrosoftDeviceSDK/DuoSDK-Public/_packaging/Duo-SDK-Feed/maven/v1',
        name: 'Duo-SDK-Feed'
      }]
    }
  ]
  */
  private createGradleSource(
    injectObj: any[],
    lines: string[],
    indentation: string,
    depth = 0,
    targetNode: GradleASTNode,
    type: AndroidGradleInjectType
  ) {
    for (const entry of injectObj) {
      const keys = Object.keys(entry);

      for (const key of keys) {
        const editEntry = entry[key];

        if (Array.isArray(editEntry)) {
          if (typeof editEntry[0] === 'object') {
            lines.push(`${key} {`);
            this.createGradleSource(
              editEntry,
              lines,
              indentation,
              depth + 1,
              targetNode,
              type
            );
            lines.push('}');
          } else {
            // Create a variable entry if the target node type is a variable or 
            // the provided type is a variable
            if (targetNode.type === 'variable' || type === AndroidGradleInjectType.Variable) {
              lines.push(`${key} = ${JSON.stringify(editEntry)}`);
            } else {
              lines.push(`${key} ${editEntry}`);
            }
          }
        } else if (
          typeof editEntry === 'string' ||
          typeof editEntry === 'number' ||
          typeof editEntry === 'boolean'
        ) {
          if (targetNode.type === 'variable' || type === AndroidGradleInjectType.Variable) {
            lines.push(indent(`${key} = ${editEntry}`, indentation, depth));
          } else {
            lines.push(indent(`${key} ${editEntry}`, indentation, depth));
          }
        } else {
          const fields = Object.keys(editEntry);

          for (const fieldKey of fields) {
            const fieldEntry = editEntry[fieldKey];

            if (typeof fieldEntry === 'string') {
              lines.push(
                indent(`${fieldKey} ${fieldEntry}`, indentation, depth),
              );
            } else if (Array.isArray(fieldEntry)) {
              lines.push('{');
              this.createGradleSource(
                fieldEntry,
                lines,
                indentation,
                depth + 1,
                targetNode,
                type
              );
              lines.push('}');
            }
          }
        }
      }
    }
  }

  private async getGradleSource(): Promise<string | null> {
    const ref = this.vfs.get<GradleFile>(this.filename);
    if (ref) {
      return ref.getData()?.getDocument() ?? '';
    }
    const contents = await readFile(this.filename, { encoding: 'utf-8' });
    this.source = contents;
    this.vfs.open(this.filename, this, this.gradleCommitFn, this.gradleDiffFn);
    return contents;
  }

  private gradleParseError() {
    return `java not found on path and JAVA_HOME not set. Please set JAVA_HOME to the root of your Java installation.\n\nGradle parse functionality depends on a local Java install for accurate Gradle file modification.`;
  }

  private gradleCommitFn = async (file: VFSFile) => {
    await assertParentDirs(file.getFilename());
    return writeFile(
      file.getFilename(),
      (file.getData() as GradleFile).getDocument(),
    );
  };

  private gradleDiffFn = async (file: VFSFile): Promise<VFSDiff> => {
    let old = '';
    try {
      old = await readFile(file.getFilename(), { encoding: 'utf-8' });
    } catch (e) {}

    return {
      old,
      new: this.source ?? '',
    };
  };
}
