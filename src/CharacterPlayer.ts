import * as PIXI from 'pixi.js';
import { CharacterModel } from './types';
import { resolvePose, calculateStates } from './Parser';

export class CharacterPlayer extends PIXI.Container {
  private model: CharacterModel;
  private layerSprites: Map<string, PIXI.Sprite> = new Map();
  private activePoses: Set<string> = new Set();
  // 新增：手动覆盖状态，模拟编辑器的“差分细节调整”
  private manualOverrides: Record<string, boolean> = {};

  constructor(model: CharacterModel) {
    super();
    this.model = model;
    this.sortableChildren = true;
    this.initLayers();
    this.resetToDefault();
  }

  private initLayers() {
    this.model.assets.layers.forEach(layerInfo => {
      const texture = PIXI.Texture.from(layerInfo.path);
      const sprite = new PIXI.Sprite(texture);
      
      sprite.zIndex = layerInfo.order;
      sprite.visible = false;

      // 自动识别混合模式
      const name = layerInfo.name.toLowerCase();
      if (name.includes('overlay')) {
        sprite.blendMode = PIXI.BLEND_MODES.OVERLAY;
      } else if (name.includes('softlight')) {
        sprite.blendMode = PIXI.BLEND_MODES.SOFT_LIGHT;
      } else if (name.includes('multiply')) {
        sprite.blendMode = PIXI.BLEND_MODES.MULTIPLY;
      }
      
      this.layerSprites.set(layerInfo.id, sprite);
      this.addChild(sprite);
    });
    
    if (this.sortChildren) {
      this.sortChildren();
    }
  }

  /**
   * 获取一个姿势所影响的所有组 (Group)
   */
  private getAffectedGroups(poseName: string): Set<string> {
    const groups = new Set<string>();
    const commands = resolvePose(poseName, this.model.controller.poses);
    commands.forEach(cmd => {
      const opMatch = cmd.match(/[+\->]/);
      if (opMatch) {
        groups.add(cmd.substring(0, opMatch.index));
      } else if (cmd.endsWith('-')) {
        groups.add(cmd.slice(0, -1));
      }
    });
    return groups;
  }

  /**
   * 切换姿势/表情 (参数化切换)
   * 自动替换同组冲突的姿势
   */
  public setPose(poseName: string) {
    if (!this.model.controller.poses[poseName]) return;

    const newAffectedGroups = this.getAffectedGroups(poseName);
    const posesToRemove: string[] = [];
    
    this.activePoses.forEach(activePose => {
      const activeAffectedGroups = this.getAffectedGroups(activePose);
      for (const group of newAffectedGroups) {
        if (activeAffectedGroups.has(group)) {
          posesToRemove.push(activePose);
          break;
        }
      }
    });

    posesToRemove.forEach(p => this.activePoses.delete(p));
    this.activePoses.add(poseName);
    this.update();
  }

  /**
   * 叠加一个姿势 (不检查冲突)
   */
  public addPose(poseName: string) {
    if (this.model.controller.poses[poseName]) {
      this.activePoses.add(poseName);
      this.update();
    }
  }

  /**
   * 移除一个姿势
   */
  public removePose(poseName: string) {
    this.activePoses.delete(poseName);
    this.update();
  }

  /**
   * 差分细节调整：手动开关指定图层
   * @param layerId 图层 ID (例如 "Angle01/Facial/Sweat/Sweat01")
   * @param visible 是否可见
   */
  public setLayerVisible(layerId: string, visible: boolean) {
    this.manualOverrides[layerId] = visible;
    this.update();
  }

  /**
   * 清除特定组的所有手动覆盖
   * @param groupName 组名 (例如 "Angle01/Facial/Sweat")
   */
  public clearGroupOverrides(groupName: string) {
    Object.keys(this.manualOverrides).forEach(id => {
      if (id.startsWith(groupName)) {
        delete this.manualOverrides[id];
      }
    });
    this.update();
  }

  /**
   * 重置为默认预设，并清除所有手动细节调整
   */
  public resetToDefault() {
    this.activePoses.clear();
    this.manualOverrides = {};
    if (this.model.controller.defaultPoses) {
      this.model.controller.defaultPoses.forEach(p => this.activePoses.add(p));
    }
    this.update();
  }

  /**
   * 渲染更新逻辑：Base -> Poses -> Manual Overrides
   */
  private update() {
    let finalStates: Record<string, boolean> = {};

    // 1. 应用基础常驻层
    const baseCommands = this.model.controller.baseLayers || [];
    finalStates = calculateStates(baseCommands, this.model.assets.layers, finalStates);

    // 2. 叠加姿势指令
    this.activePoses.forEach(poseName => {
      const commands = resolvePose(poseName, this.model.controller.poses);
      finalStates = calculateStates(commands, this.model.assets.layers, finalStates);
    });

    // 3. 应用手动细节调整 (最高优先级)
    Object.assign(finalStates, this.manualOverrides);

    // 4. 更新 Sprite 显隐
    this.layerSprites.forEach((sprite, id) => {
      sprite.visible = !!finalStates[id];
    });
    
    if (this.sortChildren) {
      this.sortChildren();
    }
  }

  public destroy(options?: any) {
    super.destroy(options);
    this.layerSprites.clear();
    this.activePoses.clear();
    this.manualOverrides = {};
  }
}
