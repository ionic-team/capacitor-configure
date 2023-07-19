import { Context } from "../../ctx";
import { AndroidGradleOperation, Operation, OperationMeta } from "../../definitions";
import { logger } from "../../util/log";

export default async function execute(ctx: Context, op: Operation) {
  const entries = (op as AndroidGradleOperation).value;
  const gradleFiles = new Map()
  for (let entry of entries) {
    if(!gradleFiles.has(entry.file)) {
      const file = await ctx.project.android?.getGradleFile(entry.file);
      gradleFiles.set(entry.file, file)
    }
    const gradleFile = gradleFiles.get(entry.file)
    if (!gradleFile) {
      logger.warn(`Skipping ${op.id} - can't locate Gradle file ${entry.file}`);
      continue;
    }

    if (entry.replace) {
      await gradleFile.replaceProperties(entry.target, entry.replace, entry.exact);
    } else if (typeof entry.insert === 'string') {
      await gradleFile.insertFragment(entry.target, entry.insert, entry.exact);
    } else if (Array.isArray(entry.insert)) {
      await gradleFile.insertProperties(entry.target, entry.insert, entry.insertType, entry.exact);
    } else {
      throw new Error(`Invalid \'insert\' type for gradle operation. Must be a string or array of objects: ${JSON.stringify(entry.insert, null, 2)}`);
    }
  }
}

export const OPS: OperationMeta = [
  'android.gradle'
]
