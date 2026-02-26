export class Mapper {
    constructor(canvasWidth, canvasHeight, cellSize = 10) {
        this.cellSize = cellSize;
        this.cols = Math.ceil(canvasWidth / cellSize);
        this.rows = Math.ceil(canvasHeight / cellSize);

        // Grid states: 0 = Unknown, 1 = Free, -1 = Occupied
        this.grid = new Array(this.cols * this.rows).fill(0);
    }

    clear() {
        this.grid.fill(0);
    }

    // Core SLAM Concept: Update Grid Beliefs based on Sensor Reading
    updateMap(robot, scanHits) {
        scanHits.forEach(hit => {
            // Ray travels through free space until it hits the endpoint or max range
            const dx = hit.x - robot.x;
            const dy = hit.y - robot.y;
            const steps = Math.max(Math.abs(dx), Math.abs(dy)) / (this.cellSize / 2); // Step resolution

            if (steps === 0) return;

            const xInc = dx / steps;
            const yInc = dy / steps;

            let currX = robot.x;
            let currY = robot.y;

            // Process the beam tracing "Free Space"
            for (let i = 0; i < steps; i++) {
                // Stop tracing free space right before the obstacle
                if (hit.hit && i > steps - 2) break;
                this.markCell(currX, currY, 1); // Mark as free
                currX += xInc;
                currY += yInc;
            }

            // Process the Obstacle Hit
            if (hit.hit) {
                // To prevent robot from driving over walls and clearing them, don't mark if it's too close to robot body
                if (hit.distance > robot.radius) {
                    this.markCell(hit.x, hit.y, -1); // Mark as occupied wall
                }
            }
        });
    }

    markCell(x, y, state) {
        // Convert real-world coordinates to grid indices
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);

        // Bounds check
        if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
            const index = col + row * this.cols;

            // "Belief" logic: Once marked as a wall (-1), keep it a wall. 
            // (A real SLAM system uses probability log-odds, e.g., Bayes theorem)
            // For education, we use simple state machine, but walls override free space.
            if (this.grid[index] !== -1 || state === -1) {
                this.grid[index] = state;
            }
        }
    }

    drawMap(ctx) {
        ctx.save();
        // Only iterate over known cells
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const state = this.grid[c + r * this.cols];
                if (state !== 0) {
                    ctx.fillStyle = state === 1 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)'; // White for Free, Black for occupied
                    ctx.fillRect(c * this.cellSize, r * this.cellSize, this.cellSize, this.cellSize);
                }
            }
        }
        ctx.restore();
    }
}
