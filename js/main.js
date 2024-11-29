// 主程序入口
document.addEventListener('DOMContentLoaded', function() {
    initCanvas();
    initTools();
});

function initTools() {
    const tools = document.querySelectorAll('.tool-btn');
    tools.forEach(tool => {
        tool.addEventListener('click', function() {
            const toolType = this.dataset.tool;
            setActiveTool(toolType);
        });
    });
} 