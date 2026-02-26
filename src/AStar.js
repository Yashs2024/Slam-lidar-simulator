export class AStar {
    constructor(mapper) {
        this.mapper = mapper;
    }

    heuristic(node, goal) {
        let dx = Math.abs(node.col - goal.col);
        let dy = Math.abs(node.row - goal.row);
        return Math.sqrt(dx * dx + dy * dy);
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { c: 0, r: -1 }, // Up
            { c: 0, r: 1 },  // Down
            { c: -1, r: 0 }, // Left
            { c: 1, r: 0 },  // Right
            { c: -1, r: -1 }, // Top-Left
            { c: 1, r: -1 },  // Top-Right
            { c: -1, r: 1 },  // Bottom-Left
            { c: 1, r: 1 },   // Bottom-Right
        ];

        for (const dir of directions) {
            const nextCol = node.col + dir.c;
            const nextRow = node.row + dir.r;

            if (nextCol >= 0 && nextCol < this.mapper.cols && nextRow >= 0 && nextRow < this.mapper.rows) {
                const index = nextCol + nextRow * this.mapper.cols;

                if (this.mapper.grid[index] !== -1) {
                    if (Math.abs(dir.c) === 1 && Math.abs(dir.r) === 1) {
                        const idxHorizontal = (node.col + dir.c) + node.row * this.mapper.cols;
                        const idxVertical = node.col + (node.row + dir.r) * this.mapper.cols;
                        if (this.mapper.grid[idxHorizontal] === -1 || this.mapper.grid[idxVertical] === -1) {
                            continue;
                        }
                    }

                    const penalty = this.getWallProximityPenalty(nextCol, nextRow);
                    neighbors.push({ col: nextCol, row: nextRow, penalty });
                }
            }
        }
        return neighbors;
    }

    getWallProximityPenalty(col, row) {
        let penalty = 0;
        const checkRange = 2;
        for (let r = -checkRange; r <= checkRange; r++) {
            for (let c = -checkRange; c <= checkRange; c++) {
                const nextCol = col + c;
                const nextRow = row + r;
                if (nextCol >= 0 && nextCol < this.mapper.cols && nextRow >= 0 && nextRow < this.mapper.rows) {
                    const index = nextCol + nextRow * this.mapper.cols;
                    if (this.mapper.grid[index] === -1) {
                        penalty += 5;
                    }
                }
            }
        }
        return penalty;
    }

    findPath(startX, startY, endX, endY) {
        const startCol = Math.floor(startX / this.mapper.cellSize);
        const startRow = Math.floor(startY / this.mapper.cellSize);
        const goalCol = Math.floor(endX / this.mapper.cellSize);
        const goalRow = Math.floor(endY / this.mapper.cellSize);

        if (goalCol < 0 || goalCol >= this.mapper.cols || goalRow < 0 || goalRow >= this.mapper.rows) return [];
        if (this.mapper.grid[goalCol + goalRow * this.mapper.cols] === -1) return [];

        const startNode = { col: startCol, row: startRow, gScore: 0, fScore: 0 };
        startNode.fScore = this.heuristic(startNode, { col: goalCol, row: goalRow });

        const openSet = [startNode];
        const numNodes = this.mapper.cols * this.mapper.rows;

        // High performance 1D arrays matching grid index to avoid any object or string allocation overhead
        const closedSet = new Uint8Array(numNodes);
        const inOpenSet = new Uint8Array(numNodes);
        const gScores = new Float32Array(numNodes).fill(Infinity);
        const cameFrom = new Array(numNodes);

        const startIndex = startCol + startRow * this.mapper.cols;
        gScores[startIndex] = 0;
        inOpenSet[startIndex] = 1;

        while (openSet.length > 0) {
            let lowestIndex = 0;
            let current = openSet[0];
            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].fScore < current.fScore) {
                    current = openSet[i];
                    lowestIndex = i;
                }
            }

            if (current.col === goalCol && current.row === goalRow) {
                return this.reconstructPath(cameFrom, current);
            }

            openSet.splice(lowestIndex, 1);
            const currIndex = current.col + current.row * this.mapper.cols;
            inOpenSet[currIndex] = 0;
            closedSet[currIndex] = 1;

            const neighbors = this.getNeighbors(current);
            for (const neighbor of neighbors) {
                const neighborIndex = neighbor.col + neighbor.row * this.mapper.cols;
                if (closedSet[neighborIndex]) continue;

                const distanceCost = (Math.abs(neighbor.col - current.col) + Math.abs(neighbor.row - current.row) === 2) ? Math.SQRT2 : 1;
                const tentativeGScore = gScores[currIndex] + distanceCost + neighbor.penalty;

                if (tentativeGScore < gScores[neighborIndex]) {
                    cameFrom[neighborIndex] = current;
                    gScores[neighborIndex] = tentativeGScore;
                    neighbor.gScore = tentativeGScore;
                    neighbor.fScore = tentativeGScore + this.heuristic(neighbor, { col: goalCol, row: goalRow });

                    if (!inOpenSet[neighborIndex]) {
                        openSet.push(neighbor);
                        inOpenSet[neighborIndex] = 1;
                    } else {
                        for (let i = 0; i < openSet.length; i++) {
                            if (openSet[i].col === neighbor.col && openSet[i].row === neighbor.row) {
                                openSet[i].gScore = neighbor.gScore;
                                openSet[i].fScore = neighbor.fScore;
                                break;
                            }
                        }
                    }
                }
            }
        }
        return [];
    }

    reconstructPath(cameFrom, current) {
        const path = [];
        while (current) {
            path.push({
                x: current.col * this.mapper.cellSize + (this.mapper.cellSize / 2),
                y: current.row * this.mapper.cellSize + (this.mapper.cellSize / 2)
            });
            const index = current.col + current.row * this.mapper.cols;
            current = cameFrom[index];
        }
        return path.reverse();
    }
}
