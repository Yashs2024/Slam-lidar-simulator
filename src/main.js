import { Renderer } from './Renderer.js';
import { Environment } from './Environment.js';
import { Robot } from './Robot.js';
import { Lidar } from './Lidar.js';
import { Mapper } from './Mapper.js';
import { AStar } from './AStar.js';
import { ChartManager } from './ChartManager.js';
import { FrontierExplorer } from './FrontierExplorer.js';
import { StatsTracker } from './StatsTracker.js';

// ---- Application State ----
const keys = { w: false, a: false, s: false, d: false };
let currentView = 'realWorld';
let interactionMode = 'drive';
let autoExploreActive = false;
let frontierTarget = null;

// Build Mode State
let isBuilding = false;
let buildStart = null;
let buildCurrent = null;

// ---- Core Components ----
const renderer = new Renderer();
const environment = new Environment(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height);
const robot = new Robot(renderer.realWorldCanvas.width / 2, renderer.realWorldCanvas.height / 2);
const lidar = new Lidar();
const mapper = new Mapper(renderer.realWorldCanvas.width, renderer.realWorldCanvas.height, 10);
const astar = new AStar(mapper);
const chartManager = new ChartManager('lidarChart', lidar.maxRange);
const frontierExplorer = new FrontierExplorer(mapper);
const statsTracker = new StatsTracker();

// Initialise the Fog of War canvas
renderer.initFogCanvas(renderer.slamCanvas.width, renderer.slamCanvas.height);

// Bind stats to DOM
statsTracker.bindDOM();

// ---- UI Bindings ----
const noiseSlider = document.getElementById('noiseSlider');
const noiseValue = document.getElementById('noiseValue');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const rayDensitySlider = document.getElementById('rayDensitySlider');
const rayDensityValue = document.getElementById('rayDensityValue');
const driftSlider = document.getElementById('driftSlider');
const driftValue = document.getElementById('driftValue');

const btnRealWorld = document.getElementById('btnRealWorld');
const btnSlamMap = document.getElementById('btnSlamMap');
const btnDriveMode = document.getElementById('btnDriveMode');
const btnBuildMode = document.getElementById('btnBuildMode');
const btnAutoExplore = document.getElementById('btnAutoExplore');

const btnReset = document.getElementById('btnReset');
const btnClearCustom = document.getElementById('btnClearCustom');

const presetSelect = document.getElementById('presetSelect');
const btnExportMap = document.getElementById('btnExportMap');
const btnImportMap = document.getElementById('btnImportMap');
const importFileInput = document.getElementById('importFileInput');

const instructionsDrive = document.getElementById('instructionsDrive');
const instructionsBuild = document.getElementById('instructionsBuild');

const realWorldCanvas = document.getElementById('realWorldCanvas');
const slamCanvas = document.getElementById('slamCanvas');


function resetSimulation() {
  mapper.clear();
  renderer.resetFog();
  robot.x = renderer.realWorldCanvas.width / 2;
  robot.y = renderer.realWorldCanvas.height / 2;
  robot.theta = 0;
  robot.believedX = robot.x;
  robot.believedY = robot.y;
  robot.believedTheta = 0;
  robot.path = null;
  robot.resetTrails();
  statsTracker.reset();
  frontierTarget = null;
  autoExploreActive = false;
  btnAutoExplore.classList.remove('active');
  btnAutoExplore.textContent = '🧭 Auto Explore';
}


function setupEventListeners() {
  // Keyboard
  window.addEventListener('keydown', (e) => {
    if (interactionMode !== 'drive') return;
    if (keys.hasOwnProperty(e.key.toLowerCase())) {
      keys[e.key.toLowerCase()] = true;
      // Manual input cancels auto-explore
      if (autoExploreActive) {
        autoExploreActive = false;
        btnAutoExplore.classList.remove('active');
        btnAutoExplore.textContent = '🧭 Auto Explore';
        frontierTarget = null;
      }
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

  driftSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    driftValue.textContent = val === 0 ? 'Off' : `${val}`;
    robot.setDrift(val);
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
    robot.path = null;
    robot.forwardSpeed = 0;
    robot.turnSpeed = 0;
    // Cancel auto-explore when entering build mode
    autoExploreActive = false;
    btnAutoExplore.classList.remove('active');
    btnAutoExplore.textContent = '🧭 Auto Explore';
    frontierTarget = null;
    btnRealWorld.click();
  });

  // Auto Explore Toggle
  btnAutoExplore.addEventListener('click', () => {
    autoExploreActive = !autoExploreActive;
    if (autoExploreActive) {
      btnAutoExplore.classList.add('active');
      btnAutoExplore.textContent = '⏹️ Stop Exploring';
      // Switch to SLAM view so user can see the exploration
      btnSlamMap.click();
      interactionMode = 'drive';
      btnDriveMode.classList.add('active');
      btnBuildMode.classList.remove('active');
      instructionsDrive.classList.remove('hidden');
      instructionsBuild.classList.add('hidden');
    } else {
      btnAutoExplore.classList.remove('active');
      btnAutoExplore.textContent = '🧭 Auto Explore';
      robot.path = null;
      robot.forwardSpeed = 0;
      robot.turnSpeed = 0;
      frontierTarget = null;
    }
  });

  // Reset Map
  btnReset.addEventListener('click', () => {
    presetSelect.value = 'random';
    environment.generateRandomMap();
    resetSimulation();
  });

  btnClearCustom.addEventListener('click', () => {
    environment.clearCustomWalls();
    mapper.clear();
  });

  // ── Environment Presets ──
  presetSelect.addEventListener('change', (e) => {
    const preset = e.target.value;
    if (preset === 'random') {
      environment.generateRandomMap();
    } else {
      environment.loadPreset(preset);
    }
    resetSimulation();
  });

  // ── Map Export ──
  btnExportMap.addEventListener('click', () => {
    const json = environment.exportWalls();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slam-map.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // ── Map Import ──
  btnImportMap.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const success = environment.importWalls(evt.target.result);
      if (success) {
        resetSimulation();
        presetSelect.value = 'random'; // Clear preset selection
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-imported
    importFileInput.value = '';
  });

  // Mouse Click for Autonomous Pathfinding
  slamCanvas.addEventListener('mousedown', (e) => {
    if (interactionMode !== 'drive') return;

    const rect = slamCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const path = astar.findPath(robot.x, robot.y, x, y);
    if (path.length > 0) {
      robot.setPath(path);
      // If user manually clicks, cancel auto-explore
      if (autoExploreActive) {
        autoExploreActive = false;
        btnAutoExplore.classList.remove('active');
        btnAutoExplore.textContent = '🧭 Auto Explore';
        frontierTarget = null;
      }
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
    if (Math.sqrt(dx * dx + dy * dy) > 10) {
      environment.addCustomWall(buildStart, buildCurrent);
      mapper.clear();
    }
    buildStart = null;
    buildCurrent = null;
  };

  realWorldCanvas.addEventListener('mouseup', commitWall);
  realWorldCanvas.addEventListener('mouseleave', commitWall);
}


// ---- Frontier Exploration Logic ----
let frontierCooldown = 0;

function handleFrontierExploration() {
  if (!autoExploreActive) return;

  // Only search for a new frontier when robot has no active path
  if (robot.path && robot.pathIndex < robot.path.length) return;

  // Cooldown to prevent rapid re-pathing (wait ~30 frames between searches)
  frontierCooldown++;
  if (frontierCooldown < 30) return;
  frontierCooldown = 0;

  const target = frontierExplorer.findBestFrontier(robot.x, robot.y);
  frontierTarget = target;

  if (target) {
    const path = astar.findPath(robot.x, robot.y, target.x, target.y);
    if (path.length > 0) {
      robot.setPath(path);
    } else {
      // No valid path to this frontier, try again next cycle
      frontierCooldown = 15; // shorter cooldown for retry
    }
  } else {
    // No more frontiers — map fully explored!
    autoExploreActive = false;
    btnAutoExplore.classList.remove('active');
    btnAutoExplore.textContent = '✅ Fully Explored';
  }
}


// ---- Main Game Loop ----
function animate() {
  requestAnimationFrame(animate);

  // 1. Process Input
  robot.applyInput(keys);

  // 2. Update Physics (returns true if wall collision)
  const hitWall = robot.update(environment);

  // 3. Sensor Update (LiDAR Raycasting)
  const scanHits = lidar.scan(robot, environment);

  // 4. SLAM Mapping
  mapper.updateMap(robot, scanHits);

  // 5. Update Live Chart
  chartManager.updateData(scanHits);

  // 6. Update Stats
  statsTracker.update(robot, mapper, hitWall);

  // 7. Frontier Exploration
  handleFrontierExploration();

  // 8. Draw Frame
  renderer.clear();

  if (currentView === 'realWorld') {
    renderer.drawEnvironment(environment, renderer.realWorldCtx);
    lidar.drawRays(scanHits, robot, renderer.realWorldCtx);
    renderer.drawTrail(robot.trueTrail, '#3b82f6', renderer.realWorldCtx);
    renderer.drawPath(robot.path, renderer.realWorldCtx);
    renderer.drawRobot(robot, renderer.realWorldCtx);
    renderer.drawBelievedRobot(robot, renderer.realWorldCtx);

    if (isBuilding && buildStart && buildCurrent) {
      renderer.drawBuildLine(buildStart, buildCurrent, renderer.realWorldCtx);
    }
  } else {
    // 1. Draw the discovered occupancy grid
    mapper.drawMap(renderer.slamCtx);
    // 2. Update fog
    renderer.drawFogOfWar(scanHits, robot);
    // 3. Composite fog
    renderer.drawFogOverlay(renderer.slamCtx);
    // 4. Draw believed trajectory trail
    renderer.drawTrail(robot.believedTrail, '#f59e0b', renderer.slamCtx);
    // 5. Draw path
    renderer.drawPath(robot.path, renderer.slamCtx);
    // 6. Draw frontier target
    if (autoExploreActive) {
      renderer.drawFrontierTarget(frontierTarget, renderer.slamCtx);
    }
    // 7. Draw robot
    renderer.drawRobot(robot, renderer.slamCtx);
    // 8. Draw noisy rays
    lidar.drawRays(scanHits, robot, renderer.slamCtx);
  }
}

// Bootstrap
setupEventListeners();
lidar.setParameters(parseInt(rayDensitySlider.value), parseInt(noiseSlider.value));
robot.setSpeedMultiplier(parseInt(speedSlider.value));
robot.setDrift(parseInt(driftSlider.value));

animate();
