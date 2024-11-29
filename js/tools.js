// 工具相关功能
let activeTool = null;

function setActiveTool(toolType) {
    activeTool = toolType;
    isDrawingLine = false; // 重置绘制状态
    startPoint = null;
    
    // 清除所有工具按钮的活动状态
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 设置当前工具按钮的活动状态
    const activeBtn = document.querySelector(`[data-tool="${toolType}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // 更新鼠标样式
    if (toolType === 'line') {
        canvas.style.cursor = 'crosshair';
    } else {
        canvas.style.cursor = 'default';
    }
} 