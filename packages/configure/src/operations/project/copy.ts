import { Context } from '../../ctx';
import { CopyOperation, Operation, OperationMeta } from '../../definitions';
import { logger } from '../../util/log';

export default async function execute(ctx: Context, op: Operation) {
  const copyOp = op as CopyOperation;

  for (let c of copyOp.value) {
    try {
      const { src, dest } = c;
      await ctx.project.copyFile(src, dest);
    } catch (e) {
      logger.warn(`Unable to copy file: ${(e as any).message}`);
    }
  }

  return [];
}

export const OPS: OperationMeta = [
  'project.copy'
]