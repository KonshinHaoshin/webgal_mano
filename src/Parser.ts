import { ParsedLayerString, CharacterLayer, CharacterModel } from './types';

export function parseLayerString(layerStr: string): ParsedLayerString {
  const opMatch = layerStr.match(/[+\->]/);
  if (!opMatch) {
    if (layerStr.endsWith('-')) {
      const group = layerStr.slice(0, -1);
      return { group, name: '', op: '-' };
    }
    return { group: '', name: '', op: '+' };
  }

  const op = opMatch[0] as '+' | '-' | '>';
  const opIndex = opMatch.index!;
  const group = layerStr.substring(0, opIndex);
  const name = layerStr.substring(opIndex + 1);
  return { group, name, op };
}

/**
 * 解析图层的完整 URL
 * @param model 模型数据
 * @param layerIdOrPath 图层 ID 或 路径
 */
export function resolveLayerUrl(model: CharacterModel, layerIdOrPath: string): string {
  const base = String(model.settings?.basePath ?? '');
  const layers = model.assets.layers;

  // 1. 优先尝试作为 ID 查找
  const layer = layers.find(l => l.id === layerIdOrPath);
  const relPath = layer ? layer.path : layerIdOrPath;

  // 2. 如果已经是绝对路径或 data URL，直接返回
  if (/^(https?:)?\/\//.test(relPath) || relPath.startsWith('data:')) {
    return relPath;
  }

  // 3. 拼接 basePath
  if (base) {
    // 确保 base 以 / 结尾，或者使用 URL 拼接
    try {
      // 如果 base 是相对路径，这里会报错，所以我们简单处理
      if (base.startsWith('.') || !base.includes('://')) {
        const joined = (base.endsWith('/') ? base : base + '/') + relPath;
        return joined;
      }
      return new URL(relPath, base).href;
    } catch (e) {
      return (base.endsWith('/') ? base : base + '/') + relPath;
    }
  }

  return relPath;
}

export function resolvePose(
  poseName: string,
  poses: Record<string, string[]>,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(poseName)) return [];
  visited.add(poseName);

  const pose = poses[poseName];
  if (!pose) return [];

  let allCommands: string[] = [];
  pose.forEach(item => {
    if (poses[item]) {
      allCommands = allCommands.concat(resolvePose(item, poses, visited));
    } else {
      allCommands.push(item);
    }
  });
  return allCommands;
}

export function calculateStates(
  commands: string[],
  layers: CharacterLayer[],
  initialStates: Record<string, boolean> = {}
): Record<string, boolean> {
  const states = { ...initialStates };

  commands.forEach(cmd => {
    const { group, name, op } = parseLayerString(cmd);
    if (!group) return;

    if (op === '-' && !name) {
      layers.filter(l => l.group === group).forEach(l => {
        states[l.id] = false;
      });
      return;
    }

    const layerId = `${group}/${name}`;

    if (op === '+') {
      states[layerId] = true;
    } else if (op === '-') {
      states[layerId] = false;
    } else if (op === '>') {
      layers.filter(l => l.group === group).forEach(l => {
        states[l.id] = (l.name === name);
      });
    }
  });

  return states;
}

