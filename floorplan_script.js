document.addEventListener('DOMContentLoaded', () => {
    const designerCanvas = document.getElementById('designerCanvas');
    const ctx = designerCanvas.getContext('2d');
    const designerCanvasContainer = document.getElementById('designerCanvasContainer');

    const drawWallToolBtn = document.getElementById('drawWallTool');
    const selectToolBtn = document.getElementById('selectTool');
    const deleteBtn = document.getElementById('deleteBtn');
    const copyBtn = document.getElementById('copyBtn');
    const rotateBtn = document.getElementById('rotateBtn');
    const wallThicknessInput = document.getElementById('wallThickness');
    const coordinatesDisplay = document.getElementById('coordinatesDisplay');
    const statusMessage = document.getElementById('statusMessage');
    const exportToQSCBtn = document.getElementById('exportToQSCBtn');
    const drawnElementsCount = document.getElementById('drawnElementsCount');
    const drawnElementsList = document.getElementById('drawnElementsList');

    // --- Configuration Constants ---
    const PIXELS_PER_METER = 30;
    const GRID_SIZE = 1;
    const SELECT_TOLERANCE_M = 0.5;
    const COPY_OFFSET_M = 1;

    // --- Global State ---
    let currentMode = 'DRAW_WALL';
    let isDrawing = false;
    let isDragging = false;
    let isPanning = false;
    let startPoint = null;
    let endPoint = null;
    let dragStart = null;
    let panStart = null;
    let drawnElements = [];
    let selectedElement = null;

    let view = {
        scale: 1.0,
        offsetX: 0,
        offsetY: 0
    };

    // --- Helper Functions ---
    function getMeterCoords(x, y) {
        const rect = designerCanvas.getBoundingClientRect();
        return {
            x: (x - rect.left - view.offsetX) / (PIXELS_PER_METER * view.scale),
            y: (y - rect.top - view.offsetY) / (PIXELS_PER_METER * view.scale)
        };
    }

    function snapToGrid(x, y) {
        return {
            x: Math.round(x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(y / GRID_SIZE) * GRID_SIZE
        };
    }

    function getDistance(p1, p2) {
        return Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
    }

    // --- Drawing & Rendering Functions ---
    function drawGrid() {
        const rect = designerCanvas.getBoundingClientRect();
        const canvasWidth = rect.width;
        const canvasHeight = rect.height;

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;

        const gridSizePx = GRID_SIZE * PIXELS_PER_METER * view.scale;

        const startX = view.offsetX;
        const startY = view.offsetY;

        for (let y = startY % gridSizePx; y < canvasHeight; y += gridSizePx) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvasWidth, y);
            ctx.stroke();
        }

        for (let x = startX % gridSizePx; x < canvasWidth; x += gridSizePx) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvasHeight);
            ctx.stroke();
        }
    }

    function drawText(text, xPx, yPx, color, font = '14px Arial', align = 'center', baseline = 'middle') {
        ctx.fillStyle = color;
        ctx.font = font;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.fillText(text, xPx, yPx);
    }

    function drawWall(wall, isSelected = false) {
        const wallThicknessPx = wall.thickness * PIXELS_PER_METER;
        const halfThickness = wallThicknessPx / 2;

        const dx = (wall.x2 - wall.x1) * PIXELS_PER_METER;
        const dy = (wall.y2 - wall.y1) * PIXELS_PER_METER;
        const angle = Math.atan2(dy, dx);
        const wallLengthPx = Math.sqrt(dx**2 + dy**2);

        ctx.save();
        ctx.translate(wall.x1 * PIXELS_PER_METER, wall.y1 * PIXELS_PER_METER);
        ctx.rotate(angle);

        ctx.fillStyle = isSelected ? '#3f51b5' : '#444';
        ctx.strokeStyle = isSelected ? '#3f51b5' : '#333';
        ctx.lineWidth = isSelected ? 3 : 1;
        ctx.fillRect(0, -halfThickness, wallLengthPx, wallThicknessPx);
        ctx.strokeRect(0, -halfThickness, wallLengthPx, wallThicknessPx);

        const lengthM = getDistance({x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}).toFixed(2);
        drawText(`${lengthM}m`, wallLengthPx / 2, -halfThickness - 10, isSelected ? '#3f51b5' : '#555');

        ctx.restore();
    }
    
    function isPointInWall(meterX, meterY, wall) {
        const x1 = wall.x1;
        const y1 = wall.y1;
        const x2 = wall.x2;
        const y2 = wall.y2;
        const thickness = wall.thickness;
        const tolerance = thickness / 2 + SELECT_TOLERANCE_M;

        const lineLength = getDistance({x:x1, y:y1}, {x:x2, y:y2});
        if (lineLength === 0) return false;

        const t = ((meterX - x1) * (x2 - x1) + (meterY - y1) * (y2 - y1)) / (lineLength**2);
        const clampedT = Math.max(0, Math.min(1, t));

        const closestPointX = x1 + clampedT * (x2 - x1);
        const closestPointY = y1 + clampedT * (y2 - y1);
        
        const distanceSq = (meterX - closestPointX)**2 + (meterY - closestPointY)**2;
        
        return distanceSq <= tolerance**2;
    }

    function selectElement(meterX, meterY) {
        selectedElement = null;
        for (let i = drawnElements.length - 1; i >= 0; i--) {
            const wall = drawnElements[i];
            if (isPointInWall(meterX, meterY, wall)) {
                selectedElement = wall;
                break;
            }
        }
        updateUIForSelection();
    }

    function updateUIForSelection() {
        if (selectedElement) {
            deleteBtn.style.display = 'block';
            copyBtn.style.display = 'block';
            rotateBtn.style.display = 'block';
            statusMessage.textContent = 'Element selected. Drag to move.';
        } else {
            deleteBtn.style.display = 'none';
            copyBtn.style.display = 'none';
            rotateBtn.style.display = 'none';
            statusMessage.textContent = 'Ready to select/move.';
        }
        updateDrawnElementsList();
        render();
    }

    function updateDrawnElementsList() {
        drawnElementsList.innerHTML = '';
        drawnElementsCount.textContent = drawnElements.length;

        if (drawnElements.length === 0) {
            drawnElementsList.innerHTML = '<p>No elements drawn yet.</p>';
            return;
        }

        drawnElements.forEach(wall => {
            const wallItem = document.createElement('div');
            wallItem.className = `drawn-element-item ${wall === selectedElement ? 'selected' : ''}`;
            const lengthM = getDistance({x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2}).toFixed(2);
            wallItem.textContent = `Wall: ${lengthM}m`;
            drawnElementsList.appendChild(wallItem);
        });
    }

    function render() {
        const rect = designerCanvasContainer.getBoundingClientRect();
        designerCanvas.width = rect.width;
        designerCanvas.height = rect.height;

        ctx.clearRect(0, 0, designerCanvas.width, designerCanvas.height);
        
        ctx.save();
        ctx.translate(view.offsetX, view.offsetY);
        ctx.scale(view.scale, view.scale);

        drawGrid();

        drawnElements.forEach(wall => {
            drawWall(wall, wall === selectedElement);
        });

        if (isDrawing && startPoint && endPoint) {
            const tempWall = {
                x1: startPoint.x,
                y1: startPoint.y,
                x2: endPoint.x,
                y2: endPoint.y,
                thickness: parseFloat(wallThicknessInput.value)
            };
            ctx.globalAlpha = 0.5;
            drawWall(tempWall, true);
            ctx.globalAlpha = 1.0;
        }
        ctx.restore();
    }
    
    // --- NEW: Export Function ---
    function exportToQSC() {
        if (drawnElements.length === 0) {
            statusMessage.textContent = 'Please draw some walls to export.';
            return;
        }

        const exportableData = drawnElements.map(wall => {
            const wallLength = getDistance({x:wall.x1, y:wall.y1}, {x:wall.x2, y:wall.y2});
            const wallThickness = wall.thickness;

            return {
                type: 'bricks',
                wallLength: wallLength,
                wallHeight: 3.0, // Assume a standard 3m wall height
                wallThickness: wallThickness,
                mortarMix: '1:4',
                wasteFactor: 5
            };
        });

        sessionStorage.setItem('exportedPlanData', JSON.stringify(exportableData));
        
        window.location.href = 'qsc.html';
    }


    // --- Event Handlers for Canvas Interactions ---
    designerCanvas.addEventListener('mousedown', (e) => {
        const meterCoords = getMeterCoords(e.clientX, e.clientY);
        const snappedCoords = snapToGrid(meterCoords.x, meterCoords.y);

        if (e.button === 0) {
            if (currentMode === 'DRAW_WALL') {
                isDrawing = true;
                startPoint = snappedCoords;
                endPoint = { ...startPoint };
                render();
            } else if (currentMode === 'SELECT') {
                selectElement(meterCoords.x, meterCoords.y);
                if (selectedElement) {
                    isDragging = true;
                    dragStart = meterCoords;
                    selectedElement.initialCoords = { x1: selectedElement.x1, y1: selectedElement.y1, x2: selectedElement.x2, y2: selectedElement.y2 };
                }
            }
        } else if (e.button === 2) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            designerCanvas.style.cursor = 'grabbing';
        }
    });

    designerCanvas.addEventListener('mousemove', (e) => {
        const meterCoords = getMeterCoords(e.clientX, e.clientY);
        coordinatesDisplay.textContent = `X: ${meterCoords.x.toFixed(2)}m, Y: ${meterCoords.y.toFixed(2)}m`;

        if (currentMode === 'DRAW_WALL' && isDrawing) {
            endPoint = snapToGrid(meterCoords.x, meterCoords.y);
            render();
        } else if (currentMode === 'SELECT' && isDragging && selectedElement) {
            const dragDx = meterCoords.x - dragStart.x;
            const dragDy = meterCoords.y - dragStart.y;
            
            selectedElement.x1 = selectedElement.initialCoords.x1 + dragDx;
            selectedElement.y1 = selectedElement.initialCoords.y1 + dragDy;
            selectedElement.x2 = selectedElement.initialCoords.x2 + dragDx;
            selectedElement.y2 = selectedElement.initialCoords.y2 + dragDy;
            render();
        } else if (isPanning) {
            const panDx = e.clientX - panStart.x;
            const panDy = e.clientY - panStart.y;
            view.offsetX += panDx / view.scale;
            view.offsetY += panDy / view.scale;
            panStart = { x: e.clientX, y: e.clientY };
            render();
        }
    });

    designerCanvas.addEventListener('mouseup', (e) => {
        if (e.button === 0) {
            if (currentMode === 'DRAW_WALL' && isDrawing && startPoint && endPoint) {
                if (getDistance(startPoint, endPoint) > 0.1) {
                    drawnElements.push({
                        x1: startPoint.x,
                        y1: startPoint.y,
                        x2: endPoint.x,
                        y2: endPoint.y,
                        thickness: parseFloat(wallThicknessInput.value)
                    });
                }
                isDrawing = false;
                startPoint = null;
                endPoint = null;
                updateUIForSelection();
            } else if (currentMode === 'SELECT' && isDragging) {
                isDragging = false;
                dragStart = null;
                selectedElement.initialCoords = null;
                render();
            }
        } else if (e.button === 2) {
            if (isPanning) {
                isPanning = false;
                panStart = null;
                designerCanvas.style.cursor = 'grab';
                render();
            }
        }
    });

    designerCanvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    designerCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const oldScale = view.scale;
        
        if (e.deltaY < 0) {
            view.scale += zoomIntensity;
        } else {
            view.scale -= zoomIntensity;
        }

        view.scale = Math.max(0.1, Math.min(view.scale, 5.0));
        
        const scaleChange = view.scale / oldScale;
        view.offsetX = e.offsetX - (e.offsetX - view.offsetX) * scaleChange;
        view.offsetY = e.offsetY - (e.offsetY - view.offsetY) * scaleChange;

        render();
    });

    // --- UI Button Event Listeners ---
    drawWallToolBtn.addEventListener('click', () => {
        currentMode = 'DRAW_WALL';
        statusMessage.textContent = 'Ready to draw walls.';
        drawWallToolBtn.classList.add('active');
        selectToolBtn.classList.remove('active');
        selectElement(null, null);
        designerCanvas.style.cursor = 'crosshair';
    });

    selectToolBtn.addEventListener('click', () => {
        currentMode = 'SELECT';
        statusMessage.textContent = 'Ready to select/move.';
        selectToolBtn.classList.add('active');
        drawWallToolBtn.classList.remove('active');
        selectElement(null, null);
        designerCanvas.style.cursor = 'grab';
    });

    deleteBtn.addEventListener('click', () => {
        if (selectedElement) {
            drawnElements = drawnElements.filter(wall => wall !== selectedElement);
            selectedElement = null;
            statusMessage.textContent = 'Element deleted.';
            updateUIForSelection();
        }
    });

    copyBtn.addEventListener('click', () => {
        if (selectedElement) {
            const copiedWall = { ...selectedElement, x1: selectedElement.x1 + COPY_OFFSET_M, y1: selectedElement.y1 + COPY_OFFSET_M, x2: selectedElement.x2 + COPY_OFFSET_M, y2: selectedElement.y2 + COPY_OFFSET_M };
            drawnElements.push(copiedWall);
            selectedElement = copiedWall;
            statusMessage.textContent = 'Element copied.';
            updateUIForSelection();
        }
    });
    
    rotateBtn.addEventListener('click', () => {
        if (selectedElement) {
            const wall = selectedElement;
            const center = { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
            const angle = Math.PI / 2;
            
            const rotatedX1 = center.x + (wall.x1 - center.x) * Math.cos(angle) - (wall.y1 - center.y) * Math.sin(angle);
            const rotatedY1 = center.y + (wall.x1 - center.x) * Math.sin(angle) + (wall.y1 - center.y) * Math.cos(angle);
            
            const rotatedX2 = center.x + (wall.x2 - center.x) * Math.cos(angle) - (wall.y2 - center.y) * Math.sin(angle);
            const rotatedY2 = center.y + (wall.x2 - center.x) * Math.sin(angle) + (wall.y2 - center.y) * Math.cos(angle);

            wall.x1 = rotatedX1;
            wall.y1 = rotatedY1;
            wall.x2 = rotatedX2;
            wall.y2 = rotatedY2;

            statusMessage.textContent = 'Element rotated by 90 degrees.';
            updateUIForSelection();
        }
    });

    exportToQSCBtn.addEventListener('click', exportToQSC);

    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
            if (entry.target === designerCanvasContainer) {
                render();
            }
        }
    });
    resizeObserver.observe(designerCanvasContainer);

    updateUIForSelection();
    render();
});