import { CapacitorConfig } from '@capacitor/cli';
import { join } from 'path';
import { MobileProject, MobileProjectConfig } from '@trapezedev/project';

import { loadExtConfig } from './capacitor';

export async function loadProject(projectRootPath?: string): Promise<MobileProject> {
  const config = await loadCapacitorConfig(projectRootPath) as MobileProjectConfig;
  const project = new MobileProject(projectRootPath ?? "", config);
  await project.load();
  return project;
}

async function loadCapacitorConfig(projectRootPath?: string): Promise<CapacitorConfig> {
  let extConfig: CapacitorConfig | null = null;

  try {
    extConfig = await loadExtConfig(projectRootPath ?? '');
    if (extConfig?.android?.path) {
      extConfig.android.path = join(projectRootPath ?? '', extConfig.android.path);
    } else {
      extConfig = {
        ...extConfig,
        android: {
          path: projectRootPath ? join(projectRootPath, 'android') : 'android'
        }
      }
    }

    if (extConfig?.ios?.path) {
      extConfig.ios.path = join(projectRootPath ?? '', extConfig.ios.path);
    } else {
      extConfig = {
        ...extConfig,
        ios: {
          path: projectRootPath ? join(projectRootPath, 'ios') : 'ios'
        }
      }
    }
  } catch (e) {
    console.warn('Unable to load external Capacitor config', e);
  }

  return extConfig || {
    ios: {
      path: projectRootPath ? join(projectRootPath, 'ios') : 'ios'
    },
    android: {
      path: projectRootPath ? join(projectRootPath, 'android') : 'android'
    }
  }
}