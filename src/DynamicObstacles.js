/**
 * DynamicObstacles.js
 *
 * Manages moving obstacles in the environment — sliding doors, patrolling walls,
 * and orbiting objects. Each obstacle type follows a defined motion pattern
 * and is updated every frame.
 */
export class DynamicObstacles {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.obstacles = [];
        this.enabled = false;
    }

    /**
     * Enable/disable dynamic obstacles.
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.obstacles = [];
        }
    }

    /**
     * Generate a set of dynamic obstacles for the current map.
     * Call after loading a preset or generating a map.
     */
    generate() {
        this.obstacles = [];
        if (!this.enabled) return;

        const inset = 80;
        const w = this.width - 2 * inset;
        const h = this.height - 2 * inset;

        // 1. Sliding door — horizontal wall that slides back and forth
        this.obstacles.push({
            type: 'slider',
            // The wall slides between two x positions
            startX: inset + w * 0.2,
            endX: inset + w * 0.5,
            y: inset + h * 0.3,
            wallLength: 80,
            speed: 0.8,
            progress: 0,       // 0..1 along the slide path
            direction: 1,      // +1 or -1
        });

        // 2. Patrolling wall — vertical wall that moves up and down
        this.obstacles.push({
            type: 'patrol',
            x: inset + w * 0.7,
            startY: inset + h * 0.2,
            endY: inset + h * 0.7,
            wallLength: 60,
            speed: 0.6,
            progress: 0,
            direction: 1,
        });

        // 3. Orbiting obstacle — a short wall that orbits around a center point
        this.obstacles.push({
            type: 'orbit',
            centerX: inset + w * 0.5,
            centerY: inset + h * 0.65,
            orbitRadius: 80,
            wallLength: 50,
            angle: 0,
            angularSpeed: 0.012,
        });
    }

    /**
     * Update all obstacle positions. Call once per frame.
     */
    update() {
        if (!this.enabled) return;

        for (const obs of this.obstacles) {
            switch (obs.type) {
                case 'slider':
                    obs.progress += obs.speed * obs.direction * 0.005;
                    if (obs.progress >= 1) { obs.progress = 1; obs.direction = -1; }
                    if (obs.progress <= 0) { obs.progress = 0; obs.direction = 1; }
                    break;

                case 'patrol':
                    obs.progress += obs.speed * obs.direction * 0.005;
                    if (obs.progress >= 1) { obs.progress = 1; obs.direction = -1; }
                    if (obs.progress <= 0) { obs.progress = 0; obs.direction = 1; }
                    break;

                case 'orbit':
                    obs.angle += obs.angularSpeed;
                    if (obs.angle > Math.PI * 2) obs.angle -= Math.PI * 2;
                    break;
            }
        }
    }

    /**
     * Get the current wall segments for all dynamic obstacles.
     * @returns {Array<{start:{x,y}, end:{x,y}}>}
     */
    getWalls() {
        if (!this.enabled) return [];

        const walls = [];

        for (const obs of this.obstacles) {
            switch (obs.type) {
                case 'slider': {
                    const currentX = obs.startX + (obs.endX - obs.startX) * obs.progress;
                    walls.push({
                        start: { x: currentX, y: obs.y },
                        end: { x: currentX + obs.wallLength, y: obs.y }
                    });
                    break;
                }

                case 'patrol': {
                    const currentY = obs.startY + (obs.endY - obs.startY) * obs.progress;
                    walls.push({
                        start: { x: obs.x, y: currentY },
                        end: { x: obs.x, y: currentY + obs.wallLength }
                    });
                    break;
                }

                case 'orbit': {
                    const cx = obs.centerX + Math.cos(obs.angle) * obs.orbitRadius;
                    const cy = obs.centerY + Math.sin(obs.angle) * obs.orbitRadius;
                    // Wall is tangent to the orbit (perpendicular to the radius)
                    const perpAngle = obs.angle + Math.PI / 2;
                    const halfLen = obs.wallLength / 2;
                    walls.push({
                        start: {
                            x: cx - Math.cos(perpAngle) * halfLen,
                            y: cy - Math.sin(perpAngle) * halfLen
                        },
                        end: {
                            x: cx + Math.cos(perpAngle) * halfLen,
                            y: cy + Math.sin(perpAngle) * halfLen
                        }
                    });
                    break;
                }
            }
        }

        return walls;
    }
}
