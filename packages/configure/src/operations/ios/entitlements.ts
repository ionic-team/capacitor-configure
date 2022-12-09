import { Context } from '../../ctx';
import { Operation, OperationMeta } from '../../definitions';
import { logger } from '../../util/log';

export default async function execute(ctx: Context, op: Operation) {
  const entitlements = op.value;

  const build = op.iosBuild;

  let entitlementsList = entitlements;
  let replace = false;

  if (!Array.isArray(entitlements)) {
    entitlementsList = entitlements.entries;

    if (entitlements.replace === true) {
      replace = true;
    }
  }

  for (const entitlement of entitlementsList) {
    try {
      if (build) {
        // If build is specified, apply only to that build
        if (replace) {
          await ctx.project.ios?.setEntitlements(op.iosTarget, build, entitlement);
        } else {
          await ctx.project.ios?.addEntitlements(op.iosTarget, build, entitlement);
        }
      } else {
        // Otherwise, apply to both debug and release builds
        if (replace) {
          await ctx.project.ios?.setEntitlements(op.iosTarget, 'Debug', entitlement);
          await ctx.project.ios?.setEntitlements(op.iosTarget, 'Release', entitlement);
        } else {
          await ctx.project.ios?.addEntitlements(op.iosTarget, 'Debug', entitlement);
          await ctx.project.ios?.addEntitlements(op.iosTarget, 'Release', entitlement);
        }
      }
    } catch (e) {
      logger.warn(`Skipping ${op.id} (${(e as any).message})`);
    }
  }
}

export const OPS: OperationMeta = [
  'ios.entitlements'
]