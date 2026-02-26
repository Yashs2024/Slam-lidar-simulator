export class Robot {
    constructor(x, y) {
        // Pose Configuration
        this.x = x;
        this.y = y;
        this.theta = 0; // Standard math coordinate (0 = pointing right)

        // Robot physical characteristics
        this.radius = 20;

        // Control variables
        this.forwardSpeed = 0;
        this.turnSpeed = 0;

        // Tunable Max Values
        this.maxSpeed = 5;
        this.maxTurn = 0.05; // radians per frame
        // Path following state
        this.path = null;
        this.pathIndex = 0;
    }

    setPath(path) {
        this.path = path;
        this.pathIndex = 0;
    }

    autonomousDrive() {
        if (!this.path || this.pathIndex >= this.path.length) {
            this.path = null;
            return;
        }

        const target = this.path[this.pathIndex];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 15) { // Reached waypoint
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.path = null;
                this.forwardSpeed = 0;
                this.turnSpeed = 0;
                return;
            }
        }

        const targetTheta = Math.atan2(dy, dx);

        // Compute shortest angle difference
        let angleDiff = targetTheta - this.theta;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Proportional steering
        this.turnSpeed = Math.max(-this.maxTurn, Math.min(this.maxTurn, angleDiff * 0.1));

        // Speed control: slow down if turning sharply
        if (Math.abs(angleDiff) > 0.5) {
            this.forwardSpeed = 0; // Turn in place
        } else {
            this.forwardSpeed = this.maxSpeed * 0.8; // Drive slightly slower than manual max
        }
    }

    update(environment) {
        if (this.path) {
            this.autonomousDrive();
        }

        // Differential drive kinematic update
        this.theta += this.turnSpeed;

        let nextX = this.x + Math.cos(this.theta) * this.forwardSpeed;
        let nextY = this.y + Math.sin(this.theta) * this.forwardSpeed;

        // Collision Detection: Check if the robot's bounding circle intersects any wall
        let hitWall = false;

        if (environment) {
            for (const wall of environment.getWalls()) {
                if (this.circleLineIntersect(nextX, nextY, this.radius, wall.start, wall.end)) {
                    hitWall = true;
                    break;
                }
            }
        }

        // Only update position if we didn't hit a wall
        if (!hitWall) {
            this.x = nextX;
            this.y = nextY;
        }
    }

    // Helper: Circle-Line segment intersection
    circleLineIntersect(cx, cy, r, p1, p2) {
        // Find the closest point on the line segment to the circle's center
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;

        let lenSq = dx * dx + dy * dy;
        let t = 0;

        if (lenSq !== 0) {
            // Project point onto line segment and clamp to [0, 1]
            t = ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
        }

        // Find the closest point
        let closestX = p1.x + t * dx;
        let closestY = p1.y + t * dy;

        // Check if distance from closest point to circle center is less than radius
        let distX = cx - closestX;
        let distY = cy - closestY;

        return (distX * distX + distY * distY) < (r * r);
    }

    setSpeedMultiplier(mult) {
        this.maxSpeed = mult;
    }

    // Receives input state from Keyboard
    applyInput(keys) {
        const isManual = keys['w'] || keys['s'] || keys['a'] || keys['d'];

        if (isManual) {
            this.path = null; // Override autonomous mode
        }

        if (isManual || !this.path) {
            this.forwardSpeed = 0;
            this.turnSpeed = 0;

            if (keys['w']) this.forwardSpeed = this.maxSpeed;
            if (keys['s']) this.forwardSpeed = -this.maxSpeed;
            if (keys['a']) this.turnSpeed = -this.maxTurn;
            if (keys['d']) this.turnSpeed = this.maxTurn;
        }
    }
}
