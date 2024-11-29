// 画布相关功能
let canvas, ctx;
let gridSize = 20;
let isDrawingLine = false;
let startPoint = null;
let mousePos = { x: 0, y: 0 };
// 添加数组来存储所有线段
let lines = [];
let areas = []; // 存储已计算的面积
let currentArea = null; // 当前显示的面积

// 添加颜色相关变量
let selectedColor = '#ff0000';

function initCanvas() {
    canvas = document.getElementById('mainCanvas');
    ctx = canvas.getContext('2d');
    
    // 设置画布大小
    resizeCanvas();
    // 监听窗口大小变化
    window.addEventListener('resize', resizeCanvas);
    
    // 添加鼠标事件监听
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);
    
    // 绘制网格
    drawAll();
    
    // 添加颜色选择器事件监听
    document.getElementById('fillColor').addEventListener('change', function(e) {
        selectedColor = e.target.value;
    });
}

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    drawAll();
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for(let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // 绘制水平线
    for(let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// 获取最近的网格交点
function snapToGrid(x, y) {
    const snapX = Math.round(x / gridSize) * gridSize;
    const snapY = Math.round(y / gridSize) * gridSize;
    return { x: snapX, y: snapY };
}

// 处理鼠标移动
function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mousePos = snapToGrid(x, y);
    
    // 重绘
    drawAll();
}

// 处理鼠标点击
function handleClick(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const point = snapToGrid(x, y);
    
    if (activeTool === 'line') {
        if (!isDrawingLine) {
            startPoint = point;
            isDrawingLine = true;
        } else {
            lines.push({
                start: { x: startPoint.x, y: startPoint.y },
                end: { x: point.x, y: point.y }
            });
            isDrawingLine = false;
            startPoint = null;
            drawAll();
        }
    } else if (activeTool === 'area') {
        calculateArea(point);
    }
}

// 绘制所有内容
function drawAll() {
    // 1. 绘制网格
    drawGrid();
    
    // 2. 绘制所有已保存的线段
    lines.forEach(line => {
        drawLine(line.start, line.end);
    });
    
    // 3. 绘制所有已计算的面积
    areas.forEach(area => {
        drawArea(area);
    });
    
    // 4. 如果正在画线，绘制预览线
    if (isDrawingLine && startPoint) {
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(mousePos.x, mousePos.y);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // 5. 绘制鼠标位置的点
    if (activeTool === 'line') {
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#666';
        ctx.fill();
    }
}

// 添加面积计算相关函数
function calculateArea(point) {
    // 获取所有包含点击位置的封闭图形
    const shapes = findClosedShapes();
    let smallestShape = null;
    let smallestArea = Infinity;
    
    // 找到包含点击位置的最小封闭图形
    for (let shape of shapes) {
        if (isPointInShape(point, shape)) {
            const area = calculateGridArea(shape);
            if (area < smallestArea) {
                smallestArea = area;
                smallestShape = shape;
            }
        }
    }
    
    if (!smallestShape) return;

    // 检查是否已经计算过这个区域
    const center = calculateCenter(smallestShape);
    const existingArea = areas.find(a => 
        Math.abs(a.position.x - center.x) < gridSize && 
        Math.abs(a.position.y - center.y) < gridSize
    );
    
    if (existingArea) return;

    // 添加新的面积计算结果
    const fillColor = hexToRGBA(selectedColor, 0.2);
    areas.push({
        value: smallestArea,
        position: center,
        shape: smallestShape,
        fillColor: fillColor,
        textColor: selectedColor // 保存文本颜色
    });
    
    drawAll();
}

// 判断点是否在线段内部
function isPointInShape(point, shape) {
    let intersections = 0;
    const ray = {
        start: point,
        end: { x: canvas.width, y: point.y }
    };
    
    // 计算与射线的交点数
    shape.forEach(line => {
        if (linesIntersect(ray, line)) {
            intersections++;
        }
    });
    
    // 奇数个交点表示在内部
    return intersections % 2 === 1;
}

// 查找包含点击位置的封闭图形
function findEnclosingShape(point) {
    // 获取所有可能的封闭图形
    const shapes = findClosedShapes();
    
    // 找到包含点击位置的图形
    for (let shape of shapes) {
        if (isPointInShape(point, shape)) {
            return shape;
        }
    }
    
    return null;
}

// 计算网格面积
function calculateGridArea(shape) {
    let area = 0;
    const bounds = getBoundingBox(shape);
    const stepSize = gridSize / 4; // 使用更小的步长提高精度
    
    for (let x = bounds.minX; x <= bounds.maxX; x += stepSize) {
        for (let y = bounds.minY; y <= bounds.maxY; y += stepSize) {
            const point = {
                x: x + stepSize / 2,
                y: y + stepSize / 2
            };
            
            if (isPointInShape(point, shape)) {
                area += (stepSize * stepSize) / (gridSize * gridSize);
            }
        }
    }
    
    return Math.round(area * 10) / 10; // 保留一位小数
}

// 获取图形的边界框
function getBoundingBox(shape) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    shape.forEach(line => {
        minX = Math.min(minX, line.start.x, line.end.x);
        minY = Math.min(minY, line.start.y, line.end.y);
        maxX = Math.max(maxX, line.start.x, line.end.x);
        maxY = Math.max(maxY, line.start.y, line.end.y);
    });
    
    return { minX, minY, maxX, maxY };
}

// 计算图形中心点
function calculateCenter(shape) {
    const bounds = getBoundingBox(shape);
    return {
        x: (bounds.minX + bounds.maxX) / 2,
        y: (bounds.minY + bounds.maxY) / 2
    };
}

// 绘制面积
function drawArea(area) {
    // 先填充颜色
    if (area.fillColor) {
        ctx.fillStyle = area.fillColor;
        ctx.beginPath();
        const firstPoint = area.shape[0].start;
        ctx.moveTo(firstPoint.x, firstPoint.y);
        area.shape.forEach(line => {
            ctx.lineTo(line.end.x, line.end.y);
        });
        ctx.closePath();
        ctx.fill();
    }
    
    // 绘制面积文本，使用保存的颜色
    ctx.font = '14px Arial';
    ctx.fillStyle = area.textColor; // 使用保存的文本颜色
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(area.value + ' 格', area.position.x, area.position.y);
}

// 判断两条线段是否相交
function linesIntersect(line1, line2) {
    const x1 = line1.start.x, y1 = line1.start.y;
    const x2 = line1.end.x, y2 = line1.end.y;
    const x3 = line2.start.x, y3 = line2.start.y;
    const x4 = line2.end.x, y4 = line2.end.y;
    
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) return false;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
    
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function drawLine(start, end) {
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function findClosedShapes() {
    const shapes = [];
    const usedLines = new Set();
    const epsilon = 0.1; // 提高精度
    
    // 遍历每条线段作为起始线
    for (let i = 0; i < lines.length; i++) {
        if (usedLines.has(i)) continue;
        
        const shape = [];
        let currentLine = lines[i];
        let startPoint = currentLine.start;
        let currentPoint = currentLine.end;
        shape.push(currentLine);
        usedLines.add(i);
        
        while (currentPoint.x !== startPoint.x || currentPoint.y !== startPoint.y) {
            let found = false;
            
            for (let j = 0; j < lines.length; j++) {
                if (usedLines.has(j)) continue;
                
                const line = lines[j];
                
                // 使用更高精度判断点的连接
                if (Math.abs(line.start.x - currentPoint.x) < epsilon && 
                    Math.abs(line.start.y - currentPoint.y) < epsilon) {
                    shape.push(line);
                    usedLines.add(j);
                    currentPoint = line.end;
                    found = true;
                    break;
                }
                
                if (Math.abs(line.end.x - currentPoint.x) < epsilon && 
                    Math.abs(line.end.y - currentPoint.y) < epsilon) {
                    shape.push({
                        start: line.end,
                        end: line.start
                    });
                    usedLines.add(j);
                    currentPoint = line.start;
                    found = true;
                    break;
                }
            }
            
            if (!found) break;
            
            if (Math.abs(currentPoint.x - startPoint.x) < epsilon && 
                Math.abs(currentPoint.y - startPoint.y) < epsilon) {
                shapes.push(shape);
                break;
            }
        }
    }
    
    return shapes;
}

// 添加颜色转换函数
function hexToRGBA(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
} 