export interface CharacterLayer {
  id: string;
  group: string;
  name: string;
  order: number;
  path: string;
}

export interface CharacterModel {
  version: string;
  metadata: {
    name: string;
    exportedAt?: string;
    author?: string;
    description?: string;
  };
  settings: {
    basePath: string;
  };
  assets: {
    layers: CharacterLayer[];
  };
  controller: {
    baseLayers: string[]; // 默认开启的基础图层
    defaultPoses: string[]; // 默认开启的预设姿势
    poses: Record<string, string[]>;
  };
}

export interface ParsedLayerString {
  group: string;
  name: string;
  op: '+' | '-' | '>';
}
