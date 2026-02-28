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
        this.realWorldCtx.fillStyle = '#0f1115';
        this.realWorldCtx.fillRect(0, 0, this.realWorldCanvas.width, this.realWorldCanvas.height);

        this.slamCtx.fillStyle = '#1e293b';
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
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#60a5fa';
        ctx.stroke();

        // Draw heading indicator
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius + 10, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Draw a ghost robot at the believed position (shown only when drift is active).
     */
    drawBelievedRobot(robot, ctx) {
        if (robot.driftAmount === 0) return;

        const { believedX, believedY, believedTheta, radius } = robot;

        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.translate(believedX, believedY);
        ctx.rotate(believedTheta);

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([4, 4]);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius + 10, 0);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();

        ctx.restore();
    }

    drawEnvironment(env, ctx = this.realWorldCtx) {
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
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
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.stroke();

        // Draw target marker at end
        const target = path[path.length - 1];
        ctx.beginPath();
        ctx.arc(target.x, target.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.restore();
    }

    /**
     * Draw the robot's trajectory trail with a fading effect.
     * @param {Array} trail    - Array of {x, y} points
     * @param {string} color   - CSS color for the trail
     * @param {CanvasRenderingContext2D} ctx
     */
    drawTrail(trail, color, ctx) {
        if (!trail || trail.length < 2) return;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const len = trail.length;
        for (let i = 1; i < len; i++) {
            // Fade: older points are more transparent
            const alpha = (i / len) * 0.7;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawBuildLine(start, end, ctx = this.realWorldCtx) {
        if (!start || !end) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.setLineDash([15, 10]);
        ctx.stroke();
        ctx.restore();
    }

    /**
     * Draw frontier target marker on the SLAM map.
     */
    drawFrontierTarget(target, ctx = this.slamCtx) {
        if (!target) return;
        ctx.save();

        // Pulsing ring effect
        const time = performance.now() / 500;
        const pulseRadius = 10 + Math.sin(time) * 4;

        ctx.beginPath();
        ctx.arc(target.x, target.y, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(target.x, target.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        ctx.restore();
    }

    // ──────────────────────────────────────────
    //  Fog of War
    // ──────────────────────────────────────────

    initFogCanvas(width, height) {
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = width;
        this.fogCanvas.height = height;
        this.fogCtx = this.fogCanvas.getContext('2d');
        this.resetFog();
    }

    resetFog() {
        if (!this.fogCtx) return;
        this.fogCtx.globalCompositeOperation = 'source-over';
        this.fogCtx.fillStyle = 'rgba(10, 12, 18, 1)';
        this.fogCtx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    }

    drawFogOfWar(scanHits, robot) {
        if (!this.fogCtx || scanHits.length === 0) return;

        const ctx = this.fogCtx;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        for (const hit of scanHits) {
            ctx.lineTo(hit.x, hit.y);
        }
        ctx.closePath();

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

    drawFogOverlay(ctx = this.slamCtx) {
        if (!this.fogCanvas) return;
        ctx.drawImage(this.fogCanvas, 0, 0);
    }
}
