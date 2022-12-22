import { AndroidGradleInjectType } from '@trapezedev/project';

export type OperationMeta = string[];
export interface Operation {
  id: string;
  platform: 'ios' | 'android' | 'web' | 'windows' | string;
  name: string;
  value: any;
  displayText: string;
  iosTarget: string | null;
  iosBuild: string | null;
}

/*
export interface IosBundleIdOperationValue extends OperationValueObject {
  bundleId: string;
}
export interface IosVersionOperationValue extends OperationValueObject {
  version: string;
}
*/

export interface AndroidAppNameOperation extends Operation {
  value: string;
}

export interface CopyOperation {
  value: {
    src: string;
    dest: any;
  }[];
}
export interface AndroidCopyOperation extends CopyOperation {
}

export interface IosCopyOperation extends CopyOperation {
}

export interface AndroidGradleOperation extends Operation {
  value: {
    file: string;
    target: any;
    insert?: string | any[];
    replace?: string | any;
    insertType?: AndroidGradleInjectType;
    exact?: boolean;
  }[];
}

export interface AndroidPropertiesOperation {
  value: {
    file: string;
    entries: any;
  }[];
}

export interface XmlOperation extends Operation {
  value: XmlOperationValue[];
}

export interface XmlOperationValue {
  file?: string;
  target?: any;
  attrs?: any;
  inject?: string;
  merge?: string;
  replace?: string;
  delete?: string;
  deleteAttributes?: string[];
}

export interface AndroidXmlOperationValue extends XmlOperationValue {
  file?: string;
  resFile?: string;
}
export interface IosXmlOperationValue extends XmlOperationValue {
  file: string;
}
export interface AndroidManifestOperation extends XmlOperation {
  value: AndroidXmlOperationValue[];
}
export interface AndroidXmlOperation extends XmlOperation {
  value: AndroidXmlOperationValue[];
}
export interface IosXmlOperation extends XmlOperation {
  value: IosXmlOperationValue[];
}

export interface JsonOperation {
  value: JsonOperationValue[];
}
export interface JsonOperationValue {
  file?: string;
  set?: any;
  merge?: any;
}
export interface AndroidJsonOperation extends JsonOperation {
  value: AndroidJsonOperationValue[];
}
export interface AndroidJsonOperationValue extends JsonOperationValue {
  file?: string;
  resFile?: string;
}
export interface IosJsonOperation extends JsonOperation {
  value: IosJsonOperationValue[];
}
export interface IosJsonOperationValue extends JsonOperationValue {}

export type IosEntitlementsOperationValue = {
  entries: any[]
  replace?: boolean
} | any[] ;
export interface IosEntitlementsOperation {
  value: IosEntitlementsOperationValue;
}


// New plist format
export interface IosPlistOperation {
  value: IosPlistOperationValue | IosPlistOperationValue[];
}
export type IosPlistOperationValue = {
  file?: string;
  replace?: boolean;
  iosTarget?: string;
  iosBuild?: string;
  xml?: string;
  entries?: any[];
};

export interface IosStringsOperation {
  value: IosStringsOperationValue[];
}
export type IosStringsOperationValue = {
  file?: string;
  set?: any;
  setFromJson?: any;
}

export interface IosXCConfigOperation {
  value: IosXCConfigOperationValue[];
}
export type IosXCConfigOperationValue = {
  file?: string;
  set?: any;
}
