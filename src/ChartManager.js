export class ChartManager {
    constructor(canvasId, maxRange) {
        this.ctx = document.getElementById(canvasId).getContext('2d');
        this.maxRange = maxRange;

        // We will use a Polar Area chart to represent the 360 degree LiDAR scan
        this.chart = new Chart(this.ctx, {
            type: 'polarArea',
            data: {
                labels: [], // Populated dynamically
                datasets: [{
                    label: 'LiDAR Distance',
                    data: [], // Populated dynamically
                    backgroundColor: 'rgba(59, 130, 246, 0.4)', // Tech blue with alpha
                    borderColor: 'rgba(96, 165, 250, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false, // Turn off animation for high-frequency live data
                scales: {
                    r: {
                        min: 0,
                        max: this.maxRange,
                        ticks: {
                            display: false // Hide numbers to keep it clean
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });

        // Throttle updates so we don't overwhelm the browser CPU
        // The game loop runs at 60fps, we only need to update the chart maybe 10-15fps
        this.lastUpdateTime = 0;
        this.updateIntervalMs = 100; // 10 FPS
    }

    updateData(scanHits) {
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateIntervalMs) {
            return; // Skip update to save CPU
        }
        this.lastUpdateTime = now;

        // Downsample the rays if there are too many (Chart.js gets slow > 100 slices)
        const maxSlices = 60;
        let stride = 1;
        if (scanHits.length > maxSlices) {
            stride = Math.ceil(scanHits.length / maxSlices);
        }

        const distances = [];
        const labels = [];

        for (let i = 0; i < scanHits.length; i += stride) {
            distances.push(scanHits[i].distance);
            labels.push(`Angle ${Math.round(scanHits[i].angle * 180 / Math.PI)}°`);
        }

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = distances;

        // Use the fast update mode
        this.chart.update('none');
    }
}
