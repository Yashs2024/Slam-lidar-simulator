import { Renderer } from './Renderer.js';
import { Environment } from './Environment.js';
import { Robot } from './Robot.js';
import { Lidar } from './Lidar.js';
import { Mapper } from './Mapper.js';
import { AStar } from './AStar.js';
import { ChartManager } from './ChartManager.js';

// ---- Application State ----
const keys = { w: false, a: false, s: false, d: false };
let currentView = 'realWorld'; // 'realWorld' or 'slam'
let interactionMode = 'drive'; // 'drive' or 'build'

// Build Mode State
let isBuilding = false;
let buildStart = null;
let buildCurrent = null;

// ---- Core Components ----
const renderer = new Renderer();
const environment = new Environment(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
// Start robot in the center
const robot = new Robot(renderer.realWorldCanvas.width / 2, renderer.realWorldCanvas.height / 2);
const lidar = new Lidar();
const mapper = new Mapper(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height, 10);
const astar = new AStar(mapper);
const chartManager = new ChartManager('lidarChart', lidar.maxRange);

// Initialise the Fog of War canvas after all DOM/canvas sizes are set
renderer.initFogCanvas(renderer.slamCanvas.width, renderer.slamCanvas.height);

// ---- UI Bindings ----
const noiseSlider = document.getElementById('noiseSlider');
const noiseValue = document.getElementById('noiseValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const rayDensitySlider = document.getElementById('rayDensitySlider');
const rayDensityValue = document.getElementById('rayDensityValue');

const btnRealWorld = document.getElementById('btnRealWorld');
const btnSlamMap = document.getElementById('btnSlamMap');
const btnDriveMode = document.getElementById('btnDriveMode');
const btnBuildMode = document.getElementById('btnBuildMode');

const btnReset = document.getElementById('btnReset');
const btnClearCustom = document.getElementById('btnClearCustom');

const instructionsDrive = document.getElementById('instructionsDrive');
const instructionsBuild = document.getElementById('instructionsBuild');

const realWorldCanvas = document.getElementById('realWorldCanvas');
const slamCanvas = document.getElementById('slamCanvas');


function setupEventListeners() {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (interactionMode !== 'drive') return;
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key.toLowerCase()] = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key.toLowerCase()] = false;
    }
  });

  // Sliders
  noiseSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    noiseValue.textContent = `${val}%`;
    lidar.setParameters(lidar.numRays, val);
  });

  speedSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    speedValue.textContent = `${val}x`;
    robot.setSpeedMultiplier(val);
  });

  rayDensitySlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    rayDensityValue.textContent = `${val} Rays`;
    lidar.setParameters(val, lidar.noisePercent);
  });

  // View Toggles
  btnRealWorld.addEventListener('click', () => {
    currentView = 'realWorld';
    btnRealWorld.classList.add('active');
    btnSlamMap.classList.remove('active');
    realWorldCanvas.classList.remove('hidden');
    slamCanvas.classList.add('hidden');
  });

  btnSlamMap.addEventListener('click', () => {
    currentView = 'slam';
    btnSlamMap.classList.add('active');
    btnRealWorld.classList.remove('active');
    slamCanvas.classList.remove('hidden');
    realWorldCanvas.classList.add('hidden');
  });

  btnDriveMode.addEventListener('click', () => {
    interactionMode = 'drive';
    btnDriveMode.classList.add('active');
    btnBuildMode.classList.remove('active');
    instructionsDrive.classList.remove('hidden');
    instructionsBuild.classList.add('hidden');
  });

  btnBuildMode.addEventListener('click', () => {
    interactionMode = 'build';
    btnBuildMode.classList.add('active');
    btnDriveMode.classList.remove('active');
    instructionsBuild.classList.remove('hidden');
    instructionsDrive.classList.add('hidden');
    // Stop robot when entering build mode
    robot.path = null;
    robot.forwardSpeed = 0;
    robot.turnSpeed = 0;
    // Force switch to real world view to build
    btnRealWorld.click();
  });

  // Reset Map/Environment
  btnReset.addEventListener('click', () => {
    environment.generateRandomMap();
    mapper.clear();
    renderer.resetFog(); // Reset the fog of war when the map resets
    robot.x = renderer.realWorldCanvas.width / 2;
    robot.y = renderer.realWorldCanvas.height / 2;
    robot.theta = 0;
    robot.path = null;
  });

  btnClearCustom.addEventListener('click', () => {
    environment.clearCustomWalls();
    mapper.clear(); // Clear memory to force re-exploration
  });

  // Mouse Click for Autonomous Pathfinding
  slamCanvas.addEventListener('mousedown', (e) => {
    if (interactionMode !== 'drive') return;

    // Get mouse coordinates relative to the canvas
    const rect = slamCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const path = astar.findPath(robot.x, robot.y, x, y);
    if (path.length > 0) {
      robot.setPath(path);
    }
  });

  // Mouse Drag for Building Custom Walls
  realWorldCanvas.addEventListener('mousedown', (e) => {
    if (interactionMode !== 'build') return;
    isBuilding = true;
    const rect = realWorldCanvas.getBoundingClientRect();
    buildStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    buildCurrent = { ...buildStart };
  });

  realWorldCanvas.addEventListener('mousemove', (e) => {
    if (!isBuilding || interactionMode !== 'build') return;
    const rect = realWorldCanvas.getBoundingClientRect();
    buildCurrent = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  });

  const commitWall = () => {
    if (!isBuilding) return;
    isBuilding = false;

    const dx = buildCurrent.x - buildStart.x;
    const dy = buildCurrent.y - buildStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 10) { // minimum length of 10px
      environment.addCustomWall(buildStart, buildCurrent);
      mapper.clear(); // Invalidate map so new raycasts update the occupancy grid
    }
    buildStart = null;
    buildCurrent = null;
  };

  realWorldCanvas.addEventListener('mouseup', commitWall);
  realWorldCanvas.addEventListener('mouseleave', commitWall);
}


// ---- Main Game Loop ----
function animate() {
  requestAnimationFrame(animate);

  // 1. Process Input
  robot.applyInput(keys);

  // 2. Update Physics with collision detection
  robot.update(environment);

  // 3. Sensor Update (LiDAR Raycasting)
  const scanHits = lidar.scan(robot, environment);

  // 4. SLAM Mapping (Update Occupancy Grid)
  mapper.updateMap(robot, scanHits);

  // 5. Update Live Chart
  chartManager.updateData(scanHits);

  // 6. Draw Frame
  renderer.clear();

  // Always calculate both views, but visually render the active one logic
  if (currentView === 'realWorld') {
    renderer.drawEnvironment(environment, renderer.realWorldCtx);
    lidar.drawRays(scanHits, robot, renderer.realWorldCtx);
    renderer.drawPath(robot.path, renderer.realWorldCtx);
    renderer.drawRobot(robot, renderer.realWorldCtx);

    if (isBuilding && buildStart && buildCurrent) {
      renderer.drawBuildLine(buildStart, buildCurrent, renderer.realWorldCtx);
    }
  } else {
    // 1. Draw the discovered occupancy grid
    mapper.drawMap(renderer.slamCtx);
    // 2. Update the fog using this frame's LiDAR hits (erases fog where the robot has looked)
    renderer.drawFogOfWar(scanHits, robot);
    // 3. Composite the persistent fog layer over the grid (dark = unexplored)
    renderer.drawFogOverlay(renderer.slamCtx);
    // 4. Draw the intended path on top of the fog
    renderer.drawPath(robot.path, renderer.slamCtx);
    // 5. Draw the robot on top
    renderer.drawRobot(robot, renderer.slamCtx);
    // 6. Draw noisy rays so users see what generates the grey noise
    lidar.drawRays(scanHits, robot, renderer.slamCtx);
  }
}

// Bootstrap
setupEventListeners();
// Set initial slider values programmatically to match defaults
lidar.setParameters(parseInt(rayDensitySlider.value), parseInt(noiseSlider.value));
robot.setSpeedMultiplier(parseInt(speedSlider.value));

animate();
