export class Environment {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.baseWalls = [];
        this.customWalls = [];
        this.generateRandomMap();
    }

    generateRandomMap() {
        this.baseWalls = [];
        // Outer boundary walls
        const inset = 50;
        this.baseWalls.push({ start: { x: inset, y: inset }, end: { x: this.width - inset, y: inset } });
        this.baseWalls.push({ start: { x: this.width - inset, y: inset }, end: { x: this.width - inset, y: this.height - inset } });
        this.baseWalls.push({ start: { x: this.width - inset, y: this.height - inset }, end: { x: inset, y: this.height - inset } });
        this.baseWalls.push({ start: { x: inset, y: this.height - inset }, end: { x: inset, y: inset } });

        // Inner random walls (obstacles)
        const numObstacles = 8;
        for (let i = 0; i < numObstacles; i++) {
            // Random start point inside map
            const x1 = inset + Math.random() * (this.width - 2 * inset);
            const y1 = inset + Math.random() * (this.height - 2 * inset);

            // Random angle & length for the wall
            const angle = Math.random() * Math.PI * 2;
            const length = 100 + Math.random() * 200;

            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;

            // Keep it reasonably inside
            if (x2 > inset && x2 < this.width - inset && y2 > inset && y2 < this.height - inset) {
                this.baseWalls.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
            }
        }
    }

    addCustomWall(start, end) {
        this.customWalls.push({ start, end });
    }

    clearCustomWalls() {
        this.customWalls = [];
    }

    getWalls() {
        return this.baseWalls.concat(this.customWalls);
    }
}
