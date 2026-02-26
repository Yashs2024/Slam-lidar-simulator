export class Renderer {
    constructor() {
        this.realWorldCanvas = document.getElementById('realWorldCanvas');
        this.slamCanvas = document.getElementById('slamCanvas');

        // Setting up 2D drawing contexts
        this.realWorldCtx = this.realWorldCanvas.getContext('2d');
        this.slamCtx = this.slamCanvas.getContext('2d');

        // Fog of war canvas — initialised on first call
        this.fogCanvas = null;
        this.fogCtx = null;

        // Handle high-dpi displays and resizing
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.realWorldCanvas.width = width;
        this.realWorldCanvas.height = height;
        this.slamCanvas.width = width;
        this.slamCanvas.height = height;

        // Re-init fog if already created
        if (this.fogCanvas) {
            this.initFogCanvas(width, height);
        }
    }

    clear() {
        this.realWorldCtx.fillStyle = '#0f1115'; // Dark background
        this.realWorldCtx.fillRect(0, 0, this.realWorldCanvas.width, this.realWorldCanvas.height);

        // SLAM canvas uses a grey "unknown" background initially
        this.slamCtx.fillStyle = '#1e293b'; // Slate grey for unknown
        this.slamCtx.fillRect(0, 0, this.slamCanvas.width, this.slamCanvas.height);
    }

    drawRobot(robot, ctx = this.realWorldCtx) {
        const { x, y, theta, radius } = robot;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(theta);

        // Draw robot body
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6'; // Tech Blue
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#60a5fa';
        ctx.stroke();

        // Draw heading indicator (a line pointing forward)
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius + 10, 0);
        ctx.strokeStyle = '#ef4444'; // Red heading line
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    drawEnvironment(env, ctx = this.realWorldCtx) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0'; // White border color
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        env.getWalls().forEach(wall => {
            ctx.beginPath();
            ctx.moveTo(wall.start.x, wall.start.y);
            ctx.lineTo(wall.end.x, wall.end.y);
            ctx.stroke();
        });

        ctx.restore();
    }

    drawPath(path, ctx = this.slamCtx) {
        if (!path || path.length === 0) return;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.strokeStyle = '#10b981'; // Success Green for the path
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]); // Dashed line
        ctx.stroke();

        // Draw target marker at end
        const target = path[path.length - 1];
        ctx.beginPath();
        ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.restore();
    }

    drawBuildLine(start, end, ctx = this.realWorldCtx) {
        if (!start || !end) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = '#f59e0b'; // Amber color for drawing mode
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.setLineDash([15, 10]);
        ctx.stroke();
        ctx.restore();
    }

    // ──────────────────────────────────────────
    //  Fog of War
    // ──────────────────────────────────────────

    /**
     * Lazily create (or recreate) the persistent off-screen fog canvas.
     * Must be called once after the slam canvas has its final dimensions.
     */
    initFogCanvas(width, height) {
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = width;
        this.fogCanvas.height = height;
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.resetFog();
    }

    /** Fill fog canvas completely opaque (call on map reset). */
    resetFog() {
        if (!this.fogCtx) return;
        this.fogCtx.globalCompositeOperation = 'source-over';
        this.fogCtx.fillStyle = 'rgba(10, 12, 18, 1)';
        this.fogCtx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    }

    /**
     * Permanently punch through the fog where the LiDAR swept this frame.
     * Uses destination-out compositing so erased pixels stay erased.
     */
    drawFogOfWar(scanHits, robot) {
        if (!this.fogCtx || scanHits.length === 0) return;

        const ctx = this.fogCtx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        // Build the visibility polygon: robot centre → each hit point
        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        for (const hit of scanHits) {
            ctx.lineTo(hit.x, hit.y);
        }
        ctx.closePath();

        // Soft radial gradient so the boundary melts away rather than hard-clipping
        const maxRange = 600;
        const gradient = ctx.createRadialGradient(
            robot.x, robot.y, 0,
            robot.x, robot.y, maxRange
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(0.80, 'rgba(0,0,0,0.95)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Composite the persistent fog layer on top of whatever is on the SLAM canvas.
     * Call this AFTER drawing the occupancy grid and path, but BEFORE drawing the robot.
     */
    drawFogOverlay(ctx = this.slamCtx) {
        if (!this.fogCanvas) return;
        ctx.drawImage(this.fogCanvas, 0, 0);
    }
}
