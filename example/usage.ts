import * as PIXI from 'pixi.js';
import { CharacterPlayer } from '../src';

/**
 * webgal_mano 示例：动态还原编辑器所有功能
 */
async function initExample() {
  const app = new PIXI.Application({
    width: 800,
    height: 1000,
    backgroundColor: 0x1a1a1a, // 深色背景
  });
  document.body.appendChild(app.view as HTMLCanvasElement);

  // 获取控制面板容器
  const controls = document.getElementById('controls');
  if (controls) {
    controls.style.backgroundColor = '#252525';
    controls.style.color = '#eee';
    controls.style.padding = '20px';
    controls.style.fontFamily = 'sans-serif';
    controls.style.maxHeight = '90vh';
    controls.style.overflowY = 'auto';
  }

  const MODEL_JSON_URL = '/assets/Sherry/model.char.json';
  const response = await fetch(MODEL_JSON_URL);
  if (!response.ok) {
    throw new Error(`Failed to load model: ${response.status} ${response.statusText}`);
  }
  const modelData = await response.json();

  // 1. 加载所有图片资源
  modelData.assets.layers.forEach((layer: any) => {
    app.loader.add(layer.id, '/assets/Sherry/' + layer.path);
  });

  app.loader.load(() => {
    const player = new CharacterPlayer(modelData);
    player.x = 400; // 居中
    player.y = 1000; // 底部
    player.pivot.set(512, 2048); // 设置原点在底部中心
    player.scale.set(0.45); 
    app.stage.addChild(player);

    if (controls) {
      controls.innerHTML = ''; // 清空加载中提示

      // --- 顶部操作 ---
      const header = document.createElement('div');
      header.style.marginBottom = '20px';
      header.innerHTML = '<h2 style="margin-top:0">webgal_mano 动态演示</h2>';
      
      const resetBtn = document.createElement('button');
      resetBtn.innerText = '🔄 全局重置 (回到默认状态)';
      resetBtn.style.width = '100%';
      resetBtn.style.padding = '10px';
      resetBtn.style.backgroundColor = '#007bff';
      resetBtn.style.color = 'white';
      resetBtn.style.border = 'none';
      resetBtn.style.borderRadius = '4px';
      resetBtn.style.cursor = 'pointer';
      resetBtn.onclick = () => {
        player.resetToDefault();
        updateButtonStates();
      };
      header.appendChild(resetBtn);
      controls.appendChild(header);

      // --- 姿势预设区 ---
      const poses = modelData.controller.poses;
      const poseNames = Object.keys(poses).sort();
      
      // 按前缀分组 (例如 ArmL, ArmR, Facial 等)
      const poseGroups: Record<string, string[]> = {};
      poseNames.forEach(name => {
        let group = '其他';
        if (name.startsWith('ArmL')) group = '左手 (ArmL)';
        else if (name.startsWith('ArmR')) group = '右手 (ArmR)';
        else if (['Smile', 'Angry', 'Normal', 'Surprised', 'Fearful', 'Pensive', 'Cry', 'Flushed'].some(p => name.startsWith(p))) group = '表情 (Facial)';
        else if (name.startsWith('Pale') || name.startsWith('Sweat') || name.startsWith('Cheeks')) group = '脸部细节';
        
        if (!poseGroups[group]) poseGroups[group] = [];
        poseGroups[group].push(name);
      });

      const poseSection = document.createElement('div');
      poseSection.innerHTML = '<h3>姿势预设 (setPose)</h3>';
      
      Object.entries(poseGroups).forEach(([groupName, names]) => {
        const groupEl = document.createElement('details');
        groupEl.open = groupName === '表情 (Facial)';
        groupEl.style.marginBottom = '10px';
        groupEl.innerHTML = `<summary style="cursor:pointer; padding:5px; background:#333; border-radius:4px">${groupName}</summary>`;
        
        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'grid';
        btnContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
        btnContainer.style.gap = '5px';
        btnContainer.style.padding = '10px 0';

        names.forEach(name => {
          const btn = document.createElement('button');
          btn.innerText = name;
          btn.className = 'pose-btn';
          btn.dataset.pose = name;
          btn.style.padding = '6px';
          btn.style.fontSize = '12px';
          btn.style.backgroundColor = '#444';
          btn.style.color = '#fff';
          btn.style.border = '1px solid #555';
          btn.style.borderRadius = '3px';
          btn.style.cursor = 'pointer';
          btn.onclick = () => {
            player.setPose(name);
            updateButtonStates();
          };
          btnContainer.appendChild(btn);
        });
        groupEl.appendChild(btnContainer);
        poseSection.appendChild(groupEl);
      });
      controls.appendChild(poseSection);

      // --- 差分细节手动调整区 ---
      const layerGroups = [...new Set(modelData.assets.layers.map((l: any) => l.group))].sort();
      
      const layerSection = document.createElement('div');
      layerSection.style.marginTop = '20px';
      layerSection.innerHTML = '<h3>差分细节调整 (setLayerVisible)</h3>';

      layerGroups.forEach((groupName: any) => {
        const layers = modelData.assets.layers.filter((l: any) => l.group === groupName);
        if (layers.length <= 1 && groupName === 'Angle01') return; // 跳过 Body 等基础图层

        const groupEl = document.createElement('details');
        groupEl.style.marginBottom = '10px';
        
        const summary = document.createElement('summary');
        summary.style.cursor = 'pointer';
        summary.style.padding = '5px';
        summary.style.background = '#333';
        summary.style.borderRadius = '4px';
        summary.style.display = 'flex';
        summary.style.justifyContent = 'space-between';
        summary.style.alignItems = 'center';
        summary.innerHTML = `<span>${groupName}</span>`;
        
        const clearBtn = document.createElement('button');
        clearBtn.innerText = '重置组';
        clearBtn.style.fontSize = '10px';
        clearBtn.style.padding = '2px 5px';
        clearBtn.style.backgroundColor = '#555';
        clearBtn.style.color = '#eee';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '2px';
        clearBtn.onclick = (e) => {
            e.preventDefault();
            player.clearGroupOverrides(groupName);
            updateButtonStates();
        };
        summary.appendChild(clearBtn);
        groupEl.appendChild(summary);

        const btnContainer = document.createElement('div');
        btnContainer.style.display = 'grid';
        btnContainer.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
        btnContainer.style.gap = '5px';
        btnContainer.style.padding = '10px 0';

        layers.forEach((layer: any) => {
          const btn = document.createElement('button');
          btn.innerText = layer.name;
          btn.className = 'layer-btn';
          btn.dataset.id = layer.id;
          btn.style.padding = '4px';
          btn.style.fontSize = '11px';
          btn.style.backgroundColor = '#444';
          btn.style.color = '#fff';
          btn.style.border = '1px solid #555';
          btn.style.borderRadius = '3px';
          btn.style.cursor = 'pointer';
          
          btn.onclick = () => {
            // 切换逻辑
            const isVisible = btn.style.backgroundColor === 'rgb(0, 123, 255)'; // #007bff
            player.setLayerVisible(layer.id, !isVisible);
            updateButtonStates();
          };
          btnContainer.appendChild(btn);
        });
        groupEl.appendChild(btnContainer);
        layerSection.appendChild(groupEl);
      });
      controls.appendChild(layerSection);

      // 更新按钮状态的辅助函数
      const updateButtonStates = () => {
        // 更新姿势按钮状态 (如果想做更复杂的，可以检查 activePoses)
        // 这里简单处理：点击哪个姿势哪个就变亮，或者每次 update 后获取当前状态
        // 实际上由于叠层关系，很多姿势可能同时活跃，这里暂不处理高亮，仅保证功能
      };

      updateButtonStates();
    }

    player.resetToDefault();
  });
}

initExample().catch(console.error);
