export class Environment {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.baseWalls = [];
        this.customWalls = [];
        this.dynamicWalls = []; // Set each frame by DynamicObstacles
        this.generateRandomMap();
    }

    setDynamicWalls(walls) {
        this.dynamicWalls = walls;
    }

    generateRandomMap() {
        this.baseWalls = [];
        const inset = 50;

        // Outer boundary walls
        this._addBoundary(inset);

        // Inner random walls (obstacles)
        const numObstacles = 8;
        for (let i = 0; i < numObstacles; i++) {
            const x1 = inset + Math.random() * (this.width - 2 * inset);
            const y1 = inset + Math.random() * (this.height - 2 * inset);
            const angle = Math.random() * Math.PI * 2;
            const length = 100 + Math.random() * 200;
            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;

            if (x2 > inset && x2 < this.width - inset && y2 > inset && y2 < this.height - inset) {
                this.baseWalls.push({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 } });
            }
        }
    }

    // ──────────────────────────────────────────
    //  Preset Maps
    // ──────────────────────────────────────────

    loadPreset(name) {
        this.baseWalls = [];
        this.customWalls = [];
        const inset = 50;
        this._addBoundary(inset);

        switch (name) {
            case 'maze':
                this._buildMaze(inset);
                break;
            case 'warehouse':
                this._buildWarehouse(inset);
                break;
            case 'office':
                this._buildOffice(inset);
                break;
            case 'lshape':
                this._buildLShape(inset);
                break;
            case 'open':
                // Just the boundary — nothing else
                break;
            default:
                this.generateRandomMap();
        }
    }

    _addBoundary(inset) {
        this.baseWalls.push({ start: { x: inset, y: inset }, end: { x: this.width - inset, y: inset } });
        this.baseWalls.push({ start: { x: this.width - inset, y: inset }, end: { x: this.width - inset, y: this.height - inset } });
        this.baseWalls.push({ start: { x: this.width - inset, y: this.height - inset }, end: { x: inset, y: this.height - inset } });
        this.baseWalls.push({ start: { x: inset, y: this.height - inset }, end: { x: inset, y: inset } });
    }

    _buildMaze(inset) {
        const w = this.width - 2 * inset;
        const h = this.height - 2 * inset;
        const ox = inset;
        const oy = inset;

        // Horizontal walls with gaps
        const rows = 5;
        const rowSpacing = h / (rows + 1);
        for (let r = 1; r <= rows; r++) {
            const y = oy + r * rowSpacing;
            // Alternate gap position for maze feel
            const gapStart = (r % 2 === 0) ? 0.1 : 0.6;
            const gapEnd = gapStart + 0.2;

            // Left segment
            this.baseWalls.push({
                start: { x: ox, y },
                end: { x: ox + w * gapStart, y }
            });
            // Right segment
            this.baseWalls.push({
                start: { x: ox + w * gapEnd, y },
                end: { x: ox + w, y }
            });
        }

        // A couple of vertical dividers
        this.baseWalls.push({
            start: { x: ox + w * 0.4, y: oy },
            end: { x: ox + w * 0.4, y: oy + h * 0.35 }
        });
        this.baseWalls.push({
            start: { x: ox + w * 0.7, y: oy + h * 0.5 },
            end: { x: ox + w * 0.7, y: oy + h }
        });
    }

    _buildWarehouse(inset) {
        const w = this.width - 2 * inset;
        const h = this.height - 2 * inset;
        const ox = inset;
        const oy = inset;

        // Rows of shelves (horizontal lines with aisles)
        const shelfRows = 6;
        const shelfSpacing = h / (shelfRows + 1);
        const shelfWidth = w * 0.55;

        for (let r = 1; r <= shelfRows; r++) {
            const y = oy + r * shelfSpacing;
            const xStart = (r % 2 === 0) ? ox + w * 0.1 : ox + w * 0.35;

            this.baseWalls.push({
                start: { x: xStart, y },
                end: { x: xStart + shelfWidth, y }
            });
        }

        // Vertical divider in the middle
        this.baseWalls.push({
            start: { x: ox + w * 0.5, y: oy + h * 0.15 },
            end: { x: ox + w * 0.5, y: oy + h * 0.85 }
        });
    }

    _buildOffice(inset) {
        const w = this.width - 2 * inset;
        const h = this.height - 2 * inset;
        const ox = inset;
        const oy = inset;

        // Main corridor (horizontal)
        this.baseWalls.push({
            start: { x: ox, y: oy + h * 0.45 },
            end: { x: ox + w, y: oy + h * 0.45 }
        });
        this.baseWalls.push({
            start: { x: ox, y: oy + h * 0.55 },
            end: { x: ox + w, y: oy + h * 0.55 }
        });

        // Doors (gaps) in the corridor walls
        // Top wall doors
        for (const pos of [0.2, 0.5, 0.8]) {
            const gx = ox + w * pos;
            // Clear a gap by overriding the top corridor wall with two segments
            this.baseWalls.push({
                start: { x: gx, y: oy + h * 0.45 },
                end: { x: gx + 40, y: oy + h * 0.45 }
            });
        }

        // Room dividers (top rooms)
        this.baseWalls.push({
            start: { x: ox + w * 0.33, y: oy },
            end: { x: ox + w * 0.33, y: oy + h * 0.35 }
        });
        this.baseWalls.push({
            start: { x: ox + w * 0.66, y: oy },
            end: { x: ox + w * 0.66, y: oy + h * 0.35 }
        });

        // Room dividers (bottom rooms)
        this.baseWalls.push({
            start: { x: ox + w * 0.5, y: oy + h * 0.65 },
            end: { x: ox + w * 0.5, y: oy + h }
        });
    }

    _buildLShape(inset) {
        const w = this.width - 2 * inset;
        const h = this.height - 2 * inset;
        const ox = inset;
        const oy = inset;

        // Inner L-shape walls
        // Horizontal segment
        this.baseWalls.push({
            start: { x: ox + w * 0.45, y: oy + h * 0.45 },
            end: { x: ox + w, y: oy + h * 0.45 }
        });
        // Vertical segment
        this.baseWalls.push({
            start: { x: ox + w * 0.45, y: oy },
            end: { x: ox + w * 0.45, y: oy + h * 0.45 }
        });

        // Additional internal walls for complexity
        this.baseWalls.push({
            start: { x: ox, y: oy + h * 0.7 },
            end: { x: ox + w * 0.3, y: oy + h * 0.7 }
        });
        this.baseWalls.push({
            start: { x: ox + w * 0.7, y: oy + h * 0.6 },
            end: { x: ox + w * 0.7, y: oy + h }
        });
        this.baseWalls.push({
            start: { x: ox + w * 0.2, y: oy + h * 0.2 },
            end: { x: ox + w * 0.2, y: oy + h * 0.4 }
        });
    }

    // ──────────────────────────────────────────
    //  Export / Import
    // ──────────────────────────────────────────

    exportWalls() {
        return JSON.stringify({
            width: this.width,
            height: this.height,
            baseWalls: this.baseWalls,
            customWalls: this.customWalls
        }, null, 2);
    }

    importWalls(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.baseWalls) this.baseWalls = data.baseWalls;
            if (data.customWalls) this.customWalls = data.customWalls;
            return true;
        } catch (e) {
            console.error('Failed to import map:', e);
            return false;
        }
    }

    addCustomWall(start, end) {
        this.customWalls.push({ start, end });
    }

    clearCustomWalls() {
        this.customWalls = [];
    }

    getWalls() {
        return this.baseWalls.concat(this.customWalls, this.dynamicWalls);
    }
}
