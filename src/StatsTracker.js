/**
 * StatsTracker.js
 * 
 * Tracks live performance metrics for the SLAM simulator:
 * - Explored percentage (non-unknown cells / total cells)
 * - Total distance travelled by the robot
 * - Number of wall collisions
 * - Elapsed simulation time
 */
export class StatsTracker {
    constructor() {
        this.totalDistance = 0;
        this.collisions = 0;
        this.wasHittingWall = false; // Edge detection for collisions
        this.startTime = performance.now();
        this.lastX = null;
        this.lastY = null;

        // DOM references (bound after construction)
        this.elExplored = null;
        this.elDistance = null;
        this.elCollisions = null;
        this.elTime = null;

        // Throttle DOM updates
        this.lastDomUpdate = 0;
        this.domUpdateInterval = 200; // ~5 fps
    }

    /**
     * Bind to DOM elements for live display.
     */
    bindDOM() {
        this.elExplored = document.getElementById('statExplored');
        this.elDistance = document.getElementById('statDistance');
        this.elCollisions = document.getElementById('statCollisions');
        this.elTime = document.getElementById('statTime');
    }

    /**
     * Call once per frame from the game loop.
     * @param {Object} robot   - Robot instance (needs .x, .y)
     * @param {Object} mapper  - Mapper instance (needs .grid, .cols, .rows)
     * @param {boolean} hitWall - Whether the robot collided this frame
     */
    update(robot, mapper, hitWall) {
        // Distance tracking
        if (this.lastX !== null) {
            const dx = robot.x - this.lastX;
            const dy = robot.y - this.lastY;
            const step = Math.sqrt(dx * dx + dy * dy);
            if (step > 0.1) { // filter jitter
                this.totalDistance += step;
            }
        }
        this.lastX = robot.x;
        this.lastY = robot.y;

        // Collision tracking (only count rising edges, not every frame)
        if (hitWall && !this.wasHittingWall) this.collisions++;
        this.wasHittingWall = hitWall;

        // Throttled DOM update
        const now = performance.now();
        if (now - this.lastDomUpdate < this.domUpdateInterval) return;
        this.lastDomUpdate = now;

        // Calculate explored %
        const total = mapper.grid.length;
        let known = 0;
        for (let i = 0; i < total; i++) {
            if (mapper.grid[i] !== 0) known++;
        }
        const exploredPct = ((known / total) * 100).toFixed(1);

        // Elapsed time
        const elapsed = (now - this.startTime) / 1000;
        const minutes = Math.floor(elapsed / 60);
        const seconds = Math.floor(elapsed % 60);

        // Update DOM
        if (this.elExplored) this.elExplored.textContent = `${exploredPct}%`;
        if (this.elDistance) this.elDistance.textContent = `${Math.round(this.totalDistance)}px`;
        if (this.elCollisions) this.elCollisions.textContent = `${this.collisions}`;
        if (this.elTime) this.elTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Reset all stats (on map reset).
     */
    reset() {
        this.totalDistance = 0;
        this.collisions = 0;
        this.wasHittingWall = false;
        this.startTime = performance.now();
        this.lastX = null;
        this.lastY = null;
    }
}
