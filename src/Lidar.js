export class Lidar {
    constructor() {
        this.numRays = 90;
        this.maxRange = 600; // Simulated sensor range (pixels)
        this.noisePercent = 2; // e.g. 2% error
    }

    // Set from UI Sliders
    setParameters(numRays, noisePercent) {
        this.numRays = numRays;
        this.noisePercent = noisePercent;
    }

    scan(robot, environment) {
        const hits = [];
        const angleStep = (Math.PI * 2) / this.numRays;

        for (let i = 0; i < this.numRays; i++) {
            const rayAngle = robot.theta + (i * angleStep);

            // Ray start and max end point
            const p1 = { x: robot.x, y: robot.y };
            const p2 = {
                x: robot.x + Math.cos(rayAngle) * this.maxRange,
                y: robot.y + Math.sin(rayAngle) * this.maxRange
            };

            let closestIntersection = null;
            let minDistance = this.maxRange;

            // Check intersection with all walls
            environment.getWalls().forEach(wall => {
                const intersection = this.getLineIntersection(p1, p2, wall.start, wall.end);
                if (intersection) {
                    const dist = this.distance(p1, intersection);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestIntersection = { x: intersection.x, y: intersection.y, distance: dist, angle: rayAngle, hit: true };
                    }
                }
            });

            // If no hit, we return the max range
            if (!closestIntersection) {
                closestIntersection = { x: p2.x, y: p2.y, distance: this.maxRange, angle: rayAngle, hit: false };
            } else {
                // Apply Gaussian-like Noise to the distance measurement if it hit something
                if (this.noisePercent > 0) {
                    const noiseMagnitude = (this.noisePercent / 100) * this.maxRange;
                    const error = (Math.random() * 2 - 1) * noiseMagnitude; // Uniform noise for simplicity
                    closestIntersection.distance += error;
                    // Recompute endpoint with noisy distance
                    closestIntersection.x = p1.x + Math.cos(rayAngle) * closestIntersection.distance;
                    closestIntersection.y = p1.y + Math.sin(rayAngle) * closestIntersection.distance;
                }
            }

            hits.push(closestIntersection);
        }

        return hits;
    }

    drawRays(hits, robot, ctx) {
        ctx.save();
        ctx.lineWidth = 1;

        hits.forEach(hit => {
            ctx.beginPath();
            ctx.moveTo(robot.x, robot.y);
            ctx.lineTo(hit.x, hit.y);

            if (hit.hit) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)'; // Red for hit
            } else {
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)'; // Green for max range pass
            }
            ctx.stroke();

            // Draw little dot where it hits
            if (hit.hit) {
                ctx.beginPath();
                ctx.arc(hit.x, hit.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
            }
        });
        ctx.restore();
    }

    // Math helper for Line-Line Intersection (Ray against Wall)
    // Derived from standard computational geometry
    getLineIntersection(p1, p2, p3, p4) {
        const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
        // Lines are parallel
        if (denom === 0) return null;

        const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom;
        const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom;

        // Intersect is inside the line segments
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
            };
        }
        return null;
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    }
}
