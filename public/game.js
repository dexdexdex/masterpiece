// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.targetCanvas = document.getElementById('targetCanvas');
        this.tCtx = this.targetCanvas.getContext('2d');

        // State
        this.splats = []; // {x, y, radius, color, rotation}
        this.targetShapes = [];
        this.isPainting = false;

        // Tools: 'shooter', 'roller', 'bucket'
        this.currentTool = 'shooter';
        this.inkColor = '#ff007f'; // Neon Pink (Splatoon-ish)

        // Setup
        this.init();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Input Handling
        this.canvas.addEventListener('mousedown', (e) => this.startPaint(e));
        window.addEventListener('mousemove', (e) => this.paint(e));
        window.addEventListener('mouseup', () => this.stopPaint());

        // UI Bindings
        this.bindUI();

        // Start Loop
        requestAnimationFrame(() => this.loop());
    }

    init() {
        this.splats = [];
        this.generateTarget();
        this.setupTools();
        this.renderTargetView();
    }

    bindUI() {
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.textContent = "NEW MATCH";
            resetBtn.onclick = () => {
                if (confirm('Start a new match?')) this.init();
            };
        }

        // Remove refill btn if exists, or re-purpose? Let's hide it for now.
        const refillBtn = document.getElementById('refill-btn');
        if (refillBtn) refillBtn.style.display = 'none';

        const statusMsg = document.getElementById('status-message');
        if (statusMsg) statusMsg.textContent = "PAINT THE TARGET!";
    }

    setupTools() {
        // Define our tools and bind them to slots
        const tools = [
            { id: 'shooter', name: 'Splat Shooter', iconColor: '#ff007f', type: 'rapid' },
            { id: 'roller', name: 'Splat Roller', iconColor: '#00e5ff', type: 'continuous' }, // Cyan
            { id: 'bucket', name: 'Slosher', iconColor: '#76ff03', type: 'burst' }, // Green
        ];

        const slots = ['p1-slot-1', 'p1-slot-2', 'p1-slot-3'];

        // Clear slots
        ['p1-slot-1', 'p1-slot-2', 'p1-slot-3', 'p2-slot-1', 'p2-slot-2', 'p2-slot-3'].forEach(id => {
            document.getElementById(id).innerHTML = '';
            document.getElementById(id).style.border = '1px solid rgba(255,255,255,0.1)';
        });

        tools.forEach((tool, index) => {
            const slot = document.getElementById(slots[index]);
            if (!slot) return;

            // Render Tool Icon
            slot.innerHTML = `<div style="font-size:10px; color:#fff; text-align:center; padding-top:40px; font-weight:bold;">${tool.name}</div>`;
            slot.style.background = `radial-gradient(circle, ${tool.iconColor} 0%, rgba(0,0,0,0) 70%)`;
            slot.style.cursor = 'pointer';

            slot.onclick = () => {
                this.currentTool = tool.id;
                this.inkColor = tool.iconColor;
                // Visual feedback for selection
                document.querySelectorAll('.piece-slot').forEach(s => s.style.border = '1px solid rgba(255,255,255,0.1)');
                slot.style.border = '2px solid white';
            };

            // Auto-select first
            if (index === 0) slot.click();
        });
    }

    generateTarget() {
        // Generate a random geometric blob as the target
        this.targetShapes = [];
        const count = 4 + Math.floor(Math.random() * 3);
        const cx = 400; // Center logic coordinates (0-800)
        const cy = 300;

        for (let i = 0; i < count; i++) {
            this.targetShapes.push({
                x: cx + (Math.random() - 0.5) * 200,
                y: cy + (Math.random() - 0.5) * 150,
                w: 50 + Math.random() * 100,
                h: 50 + Math.random() * 100,
                rotation: Math.random() * Math.PI
            });
        }
    }

    startPaint(e) {
        this.isPainting = true;
        this.paint(e); // Trigger immediately for click
    }

    stopPaint() {
        this.isPainting = false;
        this.lastPaintTime = 0;
    }

    paint(e) {
        if (!this.isPainting) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const now = Date.now();

        // Tool Logic
        if (this.currentTool === 'shooter') {
            // Rapid fire: Limit rate
            if (!this.lastPaintTime || now - this.lastPaintTime > 50) {
                // Add jitter
                const jx = x + (Math.random() - 0.5) * 20;
                const jy = y + (Math.random() - 0.5) * 20;
                this.addSplat(jx, jy, 15 + Math.random() * 10);
                this.lastPaintTime = now;
            }
        } else if (this.currentTool === 'roller') {
            // Continuous heavy
            this.addSplat(x, y, 40); // Big consistent path
        } else if (this.currentTool === 'bucket') {
            // Only on click (handled by initial startPaint call mainly, but let's debounce)
            // Actually, we want one big burst per click?
            // Simple logic: If just started < 100ms? 
            if (!this.lastPaintTime) {
                // Splash multiple
                for (let i = 0; i < 8; i++) {
                    const jx = x + (Math.random() - 0.5) * 100;
                    const jy = y + (Math.random() - 0.5) * 100;
                    this.addSplat(jx, jy, 20 + Math.random() * 20);
                }
                this.lastPaintTime = now;
            }
        }
    }

    addSplat(x, y, radius) {
        this.splats.push({
            x: x,
            y: y,
            radius: radius,
            color: this.inkColor,
            rotation: Math.random() * Math.PI * 2,
            roughness: Math.random() // Used for variation in draw
        });
    }

    resizeCanvas() {
        const container = document.getElementById('canvas-container');
        if (container) {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
        }
    }

    loop() {
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    render() {
        // Clear background
        this.ctx.fillStyle = '#222'; // Dark floor
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Splats
        this.splats.forEach(s => {
            this.drawSplat(this.ctx, s.x, s.y, s.radius, s.color, s.rotation);
        });
    }

    drawSplat(ctx, x, y, radius, color, rotation) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = color;
        ctx.beginPath();
        // Draw a "blob" not a circle
        // 8 points
        ctx.moveTo(radius, 0);
        for (let i = 1; i <= 8; i++) {
            const angle = i * Math.PI * 2 / 8;
            const r = radius * (0.8 + Math.random() * 0.4); // This random causes "jitter" every frame which is bad.
            // We need stored wobble or just use circle for performace 
            // actually standard circle for now for performance, maybe overlapping circles
        }
        // Simplified:
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderTargetView() {
        if (!this.tCtx) return;
        // Make target fit
        this.tCtx.fillStyle = '#111';
        this.tCtx.fillRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);

        // Find bounds of target shapes
        // Just centering for now roughly
        // Scale down to fit 150x120
        const scale = 0.15;
        const cx = this.targetCanvas.width / 2;
        const cy = this.targetCanvas.height / 2;

        this.tCtx.fillStyle = this.inkColor; // Target is the color we want? Or just white?
        // Let's make target always P1 color for now, or white "Ghost"
        this.tCtx.fillStyle = '#ffffff';

        this.targetShapes.forEach(shape => {
            // We need to map world coords (400,300) to target canvas coords
            const tx = (shape.x - 400) * scale + cx;
            const ty = (shape.y - 300) * scale + cy;

            this.tCtx.save();
            this.tCtx.translate(tx, ty);
            this.tCtx.rotate(shape.rotation);
            this.tCtx.fillRect(-shape.w * scale / 2, -shape.h * scale / 2, shape.w * scale, shape.h * scale);
            this.tCtx.restore();
        });
    }
}

window.onload = () => {
    new Game();
};
