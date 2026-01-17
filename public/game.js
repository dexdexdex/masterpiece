// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.targetCanvas = document.getElementById('targetCanvas');
        this.tCtx = this.targetCanvas.getContext('2d');

        this.pieces = [];
        this.targetParams = [];
        this.dragPiece = null;

        this.UNIT = 50;
        this.SHAPES = {
            SQUARE: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
            RECT_H: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }],
            RECT_V: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 100 }, { x: 0, y: 100 }],
            TRI_TL: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 0, y: 50 }],
            TRI_TR: [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }],
            TRI_BR: [{ x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
            TRI_BL: [{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }]
        };

        this.init();
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Input Handling
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

        // Buttons
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                if (confirm('Start a new game with a new target?')) this.init();
            };
        }

        const refillBtn = document.getElementById('refill-btn');
        if (refillBtn) {
            refillBtn.onclick = () => this.refillInventory();
        }

        // Start Loop
        requestAnimationFrame(() => this.loop());
    }

    init() {
        this.generateLevel();
        this.renderTargetView();
        this.refillInventory();
        this.render(); // Initial render
    }

    generateLevel() {
        // Random Target Generation
        this.targetParams = [];
        const baseShapeKeys = Object.keys(this.SHAPES);

        // Start roughly center
        const startX = 350;
        const startY = 250;
        const count = 3 + Math.floor(Math.random() * 3); // 3 to 5 pieces

        let placed = [];

        for (let i = 0; i < count; i++) {
            const key = baseShapeKeys[Math.floor(Math.random() * baseShapeKeys.length)];
            const points = this.SHAPES[key];

            let tx, ty;
            if (i === 0) {
                tx = startX;
                ty = startY;
            } else {
                // Attach to previous
                const prev = placed[Math.floor(Math.random() * placed.length)];
                const dir = Math.floor(Math.random() * 4);
                tx = prev.x;
                ty = prev.y;
                if (dir === 0) ty -= 50;
                else if (dir === 1) ty += 50;
                else if (dir === 2) tx -= 50;
                else if (dir === 3) tx += 50;
            }

            this.targetParams.push({
                points: points,
                x: tx,
                y: ty,
                color: '#ddd'
            });

            placed.push({ x: tx, y: ty });
        }

        // Reset board pieces
        this.pieces = [];
    }

    refillInventory() {
        const slots = ['p1-slot-1', 'p1-slot-2', 'p1-slot-3', 'p2-slot-1', 'p2-slot-2', 'p2-slot-3'];

        // Keep pieces that are on board
        const existingBoardPieces = this.pieces.filter(p => p.status === 'board');
        this.pieces = existingBoardPieces;

        const baseShapeKeys = Object.keys(this.SHAPES);

        slots.forEach(slot => {
            const key = baseShapeKeys[Math.floor(Math.random() * baseShapeKeys.length)];
            const p = {
                id: 'inv_' + Math.random().toString(36).substr(2, 9),
                points: this.SHAPES[key],
                color: Math.random() > 0.5 ? '#eee' : '#111',
                status: 'inventory',
                inventorySlot: slot,
                x: 0,
                y: 0
            };
            this.pieces.push(p);
            this.renderInventorySlot(slot, p);
        });
    }

    renderInventorySlot(slotId, piece) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        slot.innerHTML = '';

        if (!piece) {
            slot.style.opacity = 0.5;
            slot.style.cursor = 'default';
            slot.onmousedown = null;
            return;
        }

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = 100;
        miniCanvas.height = 100;
        const mCtx = miniCanvas.getContext('2d');

        const xs = piece.points.map(p => p.x);
        const ys = piece.points.map(p => p.y);
        const w = Math.max(...xs) - Math.min(...xs);
        const h = Math.max(...ys) - Math.min(...ys);
        const cx = (100 - w) / 2;
        const cy = (100 - h) / 2;

        mCtx.fillStyle = piece.color;
        mCtx.beginPath();
        mCtx.moveTo(piece.points[0].x + cx, piece.points[0].y + cy);
        for (let i = 1; i < piece.points.length; i++) {
            mCtx.lineTo(piece.points[i].x + cx, piece.points[i].y + cy);
        }
        mCtx.closePath();
        mCtx.fill();

        slot.appendChild(miniCanvas);
        slot.style.opacity = 1;
        slot.style.cursor = 'grab';

        slot.onmousedown = (e) => this.startDragFromInventory(e, piece);
    }

    startDragFromInventory(e, piece) {
        if (this.dragPiece) return;

        const rect = this.canvas.getBoundingClientRect();
        const spawnX = e.clientX - rect.left - 25;
        const spawnY = e.clientY - rect.top - 25;

        piece.status = 'board';
        piece.x = spawnX;
        piece.y = spawnY;

        this.dragPiece = { piece: piece, offsetX: 25, offsetY: 25 };

        this.renderInventorySlot(piece.inventorySlot, null);
    }

    handleMouseDown(e) {
        if (this.dragPiece) return;

        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        const boardPieces = this.pieces.filter(p => p.status === 'board').reverse();
        for (let p of boardPieces) {
            if (this.isPointInPoly(mx, my, p)) {
                this.dragPiece = { piece: p, offsetX: mx - p.x, offsetY: my - p.y };
                break;
            }
        }
    }

    handleMouseMove(e) {
        if (!this.dragPiece) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left - this.dragPiece.offsetX;
        const y = e.clientY - rect.top - this.dragPiece.offsetY;

        this.dragPiece.piece.x = x;
        this.dragPiece.piece.y = y;
    }

    handleMouseUp(e) {
        this.dragPiece = null;
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'rgba(255,255,255,0.02)';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 5, 0, Math.PI * 2);
        this.ctx.fill();

        this.pieces.forEach(p => {
            if (p.status === 'board') {
                this.drawPolygon(p.points, p.x, p.y, p.color, this.ctx);
            }
        });
    }

    renderTargetView() {
        if (!this.tCtx || !this.targetParams.length) return;

        this.tCtx.clearRect(0, 0, this.targetCanvas.width, this.targetCanvas.height);

        const allPoints = this.targetParams.flatMap(t => t.points.map(p => ({ x: p.x + t.x, y: p.y + t.y })));
        if (allPoints.length === 0) return;

        const minX = Math.min(...allPoints.map(p => p.x));
        const maxX = Math.max(...allPoints.map(p => p.x));
        const minY = Math.min(...allPoints.map(p => p.y));
        const maxY = Math.max(...allPoints.map(p => p.y));

        const w = maxX - minX;
        const h = maxY - minY;
        const scale = Math.min((this.targetCanvas.width - 20) / w, (this.targetCanvas.height - 20) / h);
        const cx = this.targetCanvas.width / 2;
        const cy = this.targetCanvas.height / 2;

        this.targetParams.forEach(target => {
            const centerGrpX = minX + w / 2;
            const centerGrpY = minY + h / 2;
            const tPoints = target.points.map(p => ({
                x: (p.x + target.x - centerGrpX) * scale,
                y: (p.y + target.y - centerGrpY) * scale
            }));
            this.drawPolygon(tPoints, cx, cy, target.color, this.tCtx);
        });
    }

    drawPolygon(points, x, y, color, ctx) {
        ctx.beginPath();
        ctx.moveTo(points[0].x + x, points[0].y + y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x + x, points[i].y + y);
        }
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    isPointInPoly(x, y, poly) {
        const points = poly.points.map(pt => ({ x: pt.x + poly.x, y: pt.y + poly.y }));
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i].x, yi = points[i].y;
            const xj = points[j].x, yj = points[j].y;
            const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }
}

window.onload = () => {
    new Game();
};
