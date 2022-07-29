import yaml from 'yaml';

import { clone, each } from 'lodash';

import { readFile } from '@ionic/utils-fs';

import { logPrompt } from './util/cli';
import { Context, str } from './ctx';
import c from './colors';
import { initVarsFromEnv } from './ctx';
import { warn } from './util/log';

export type YamlFile = any;

export async function loadYamlConfig(
  ctx: Context,
  filename: string,
): Promise<YamlFile> {
  const contents = await readFile(filename, { encoding: 'utf-8' });
  const parsed = yaml.parse(contents, {
    prettyErrors: true,
  });

  if (!parsed) {
    warn('Empty config file, exiting...');
    process.exit(0);
  }

  await initVarsFromEnv(ctx, parsed.vars);

  await ensureVars(ctx, parsed);

  const resolved = interpolateVars(ctx, parsed);

  return resolved;
}

async function ensureVars(ctx: Context, yaml: YamlFile) {
  const { vars } = yaml;

  for (const v in vars) {
    const vk = vars[v] || {};

    if (!vk || (!ctx.vars[v] && !vk.default)) {
      const answers = await logPrompt(
        `Required variable: ${c.strong(v)}\n` +
          (vk.description
            ? `${c.strong('Description:')} ${vk.description}`
            : ''),
        {
          type: 'text',
          name: 'value',
          message: `${v} =`,
          validate: (input: any) => !!input,
        },
      );

      if (answers.value) {
        ctx.vars[v] = {
          value: answers.value,
        };
      }
    }
  }
}

function interpolateVars(ctx: Context, yaml: YamlFile) {
  const { vars } = yaml;

  for (let k in vars) {
    const v = vars[k];

    if (v && v.default) {
      v.value = v.default;
    }
  }

  ctx.vars = {
    ...vars,
    ...ctx.vars,
  };

  return interpolateVarsInTree(ctx, yaml);
}

function interpolateVarsInTree(ctx: Context, yaml: YamlFile) {
  const newObject = clone(yaml);

  each(yaml, (val, key) => {
    if (typeof val === 'string') {
      const interped = str(ctx, val);
      if (typeof interped === 'object') {
        // Recur into the new object value to interp any sub-fields
        newObject[key] = interpolateVarsInTree(ctx, interped);
      } else {
        newObject[key] = interped;
      }
    } else if (typeof val === 'object' || Array.isArray(val)) {
      newObject[key] = interpolateVarsInTree(ctx, val);
    }
  });

  return newObject;
}
