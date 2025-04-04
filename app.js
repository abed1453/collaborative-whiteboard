document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    
    const clearBtn = document.getElementById('clearBtn');
    const userColorElement = document.getElementById('userColor');
    const lineWidthInput = document.getElementById('lineWidth');
    const lineWidthValue = document.getElementById('lineWidthValue');
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    
    const userColor = getRandomColor();
    let lineWidth = parseInt(lineWidthInput.value);
    
    const drawHistory = [];
    
    userColorElement.style.backgroundColor = userColor;
    
    function resizeCanvas() {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        redrawCanvas();
    }
    
    function drawLine(x0, y0, x1, y1, color, width, emitEvent = true) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        if (emitEvent) {
            const drawEvent = { x0, y0, x1, y1, color, width };
            drawHistory.push(drawEvent);
        }
    }
    
    function clearCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawHistory.length = 0;
    }
    
    function redrawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        drawHistory.forEach(event => {
            drawLine(
                event.x0, 
                event.y0, 
                event.x1, 
                event.y1, 
                event.color, 
                event.width, 
                false
            );
        });
    }
    
    function getRandomColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 70%, 50%)`;
    }
    
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        drawLine(lastX, lastY, e.offsetX, e.offsetY, userColor, lineWidth);
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });
    
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        [lastX, lastY] = [
            touch.clientX - rect.left,
            touch.clientY - rect.top
        ];
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const currentX = touch.clientX - rect.left;
        const currentY = touch.clientY - rect.top;
        
        drawLine(lastX, lastY, currentX, currentY, userColor, lineWidth);
        [lastX, lastY] = [currentX, currentY];
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDrawing = false;
    });
    
    clearBtn.addEventListener('click', clearCanvas);
    
    lineWidthInput.addEventListener('input', (e) => {
        lineWidth = parseInt(e.target.value);
        lineWidthValue.textContent = `${lineWidth}px`;
    });
    
    window.addEventListener('resize', resizeCanvas);
    
    resizeCanvas();
});