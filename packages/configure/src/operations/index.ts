import executeAndroidPackageName from './android/packageName';
import executeAndroidGradle from './android/gradle';
import executeAndroidRes from './android/res';
import executeAndroidManifest from './android/manifest';
import executeAndroidVersion from './android/version';
import executeAndroidXml from './android/xml';
import executeAndroidJson from './android/json';

import executeIosProject from './ios/project';
import executeIosFrameworks from './ios/frameworks';
import executeIosEntitlements from './ios/entitlements';
import executeIosPlist from './ios/plist';
import executeIosLegacyPlist from './ios/infoPlist';
import executeIosBuildVersion from './ios/buildVersion';
import executeIosBuildSettings from './ios/buildSettings';
import executeIosXml from './ios/xml';
import executeIosJson from './ios/json';

import { Context } from '../ctx';
import { Operation } from '../definitions';

type OperationHandler = (ctx: Context, op: Operation) => Promise<any>;

interface OperationHandlers {
  [id: string]: OperationHandler;
}

const operations: OperationHandlers = {
  'ios.plist': executeIosPlist,
  'ios.infoPlist': executeIosLegacyPlist,
  'ios.bundleId': executeIosProject,
  'ios.displayName': executeIosProject,
  'ios.productName': executeIosProject,
  'ios.version': executeIosBuildVersion,
  'ios.buildNumber': executeIosBuildVersion,
  'ios.incrementBuild': executeIosBuildVersion,
  'ios.buildSettings': executeIosBuildSettings,
  'ios.frameworks': executeIosFrameworks,
  'ios.entitlements': executeIosEntitlements,
  'ios.build.gradle': executeAndroidGradle,
  'ios.xml': executeIosXml,
  'ios.json': executeIosJson,
  'android.manifest': executeAndroidManifest,
  'android.res': executeAndroidRes,
  'android.gradle': executeAndroidGradle,
  'android.packageName': executeAndroidPackageName,
  'android.versionName': executeAndroidVersion,
  'android.versionCode': executeAndroidVersion,
  'android.incrementVersionCode': executeAndroidVersion,
  'android.json': executeAndroidJson,
  'android.xml': executeAndroidXml,
};

const enabled: string[] | null = null; //['ios.plist'];

export function runOperation(ctx: Context, op: Operation) {
  const handler = operations[op.id];

  if (enabled !== null && !enabled.find((e: string) => e === op.id)) {
    return Promise.resolve();
  }

  if (handler) {
    return handler(ctx, op);
  } else {
    return Promise.reject(`No handler for operation ${op.id}`);
  }
}

export function hasHandler(op: Operation) {
  return !!operations[op.id];
}
