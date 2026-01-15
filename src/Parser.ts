import { ParsedLayerString, CharacterLayer } from './types';

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

