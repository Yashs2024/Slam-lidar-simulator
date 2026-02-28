export class Robot {
    constructor(x, y) {
        // True Pose (ground truth)
        this.x = x;
        this.y = y;
        this.theta = 0;

        // Believed Pose (with odometry drift)
        this.believedX = x;
        this.believedY = y;
        this.believedTheta = 0;

        // Robot physical characteristics
        this.radius = 20;

        // Control variables
        this.forwardSpeed = 0;
        this.turnSpeed = 0;

        // Tunable Max Values
        this.maxSpeed = 5;
        this.maxTurn = 0.05;

        // Path following state
        this.path = null;
        this.pathIndex = 0;

        // Odometry drift amount (0 = perfect, higher = more drift)
        this.driftAmount = 0;

        // Trajectory trail history
        this.trueTrail = [];
        this.believedTrail = [];
        this.maxTrailLength = 800;
        this._trailCounter = 0;
    }

    setDrift(amount) {
        this.driftAmount = amount;
    }

    resetTrails() {
        this.trueTrail = [];
        this.believedTrail = [];
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

        if (distance < 15) {
            this.pathIndex++;
            if (this.pathIndex >= this.path.length) {
                this.path = null;
                this.forwardSpeed = 0;
                this.turnSpeed = 0;
                return;
            }
        }

        const targetTheta = Math.atan2(dy, dx);

        let angleDiff = targetTheta - this.theta;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        this.turnSpeed = Math.max(-this.maxTurn, Math.min(this.maxTurn, angleDiff * 0.1));

        if (Math.abs(angleDiff) > 0.5) {
            this.forwardSpeed = 0;
        } else {
            this.forwardSpeed = this.maxSpeed * 0.8;
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

        // Collision Detection
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

        // Update believed pose with drift
        this._updateBelievedPose(hitWall);

        // Record trail (every 3 frames to save memory)
        this._trailCounter++;
        if (this._trailCounter % 3 === 0) {
            this.trueTrail.push({ x: this.x, y: this.y });
            this.believedTrail.push({ x: this.believedX, y: this.believedY });

            if (this.trueTrail.length > this.maxTrailLength) {
                this.trueTrail.shift();
                this.believedTrail.shift();
            }
        }

        return hitWall;
    }

    _updateBelievedPose(hitWall) {
        if (this.driftAmount === 0) {
            // Perfect odometry
            this.believedX = this.x;
            this.believedY = this.y;
            this.believedTheta = this.theta;
            return;
        }

        // Apply the same motion with added noise
        const driftScale = this.driftAmount * 0.002;

        // Noisy turn
        const turnNoise = (Math.random() - 0.5) * driftScale * 2;
        this.believedTheta += this.turnSpeed + turnNoise;

        // Noisy forward movement
        const speedNoise = (Math.random() - 0.5) * driftScale * this.forwardSpeed * 3;
        const angleNoise = (Math.random() - 0.5) * driftScale * 0.5;

        if (!hitWall) {
            this.believedX += Math.cos(this.believedTheta + angleNoise) * (this.forwardSpeed + speedNoise);
            this.believedY += Math.sin(this.believedTheta + angleNoise) * (this.forwardSpeed + speedNoise);
        }
    }

    // Helper: Circle-Line segment intersection
    circleLineIntersect(cx, cy, r, p1, p2) {
        let dx = p2.x - p1.x;
        let dy = p2.y - p1.y;

        let lenSq = dx * dx + dy * dy;
        let t = 0;

        if (lenSq !== 0) {
            t = ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq;
            t = Math.max(0, Math.min(1, t));
        }

        let closestX = p1.x + t * dx;
        let closestY = p1.y + t * dy;

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
            this.path = null;
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
