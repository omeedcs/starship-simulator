// Main entry point for the SpaceX Starship Simulator
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createStarshipModel, createSuperHeavyModel, createMechazillaModel } from './starship_model.js';
import { ImprovedPhysicsEngine } from './improved_physics.js';
import { AerospacePhysicsEngine } from './aerospace_physics.js';
import { StarshipGLTFLoader } from './gltf_model_loader.js';
import { ISRUSystem } from './isru_system.js';
import { createMars, updateMars } from './planets.js';
import { createEngineEffects } from './engine_effects.js';
import { loadTextures } from './texture_loader.js';
import { CameraController } from './camera_controller.js';
import { MechazillaCatchSimulation } from './mechazilla_catch.js';

// Global variables
let scene, camera, renderer, controls, cameraController;
let starship, superHeavy, mechazilla, mars;
let physicsEngine, aerospacePhysics;
let gltfLoader;
let isruSystem;
let clock = new THREE.Clock();
let simulationSpeed = 1.0;
let missionTime = 0;
let animationFrameId;
let isSimulationRunning = false;
let mechazillaCatch;
let useHighFidelityModel = true;

// Engine effects
let starshipEngineEffects, superHeavyEngineEffects;

// Textures
let textures;

// Camera positions
const CAMERA_POSITIONS = {
    external: { position: new THREE.Vector3(200, 100, 200), target: new THREE.Vector3(0, 50, 0) },
    booster: { position: new THREE.Vector3(80, 50, 80), target: new THREE.Vector3(0, 0, 0) },
    starship: { position: new THREE.Vector3(80, 120, 80), target: new THREE.Vector3(0, 80, 0) },
    tower: { position: new THREE.Vector3(-200, 150, 200), target: new THREE.Vector3(0, 50, 0) },
    tracking: { position: new THREE.Vector3(150, 100, 150), target: new THREE.Vector3(0, 0, 0) }
};

// Mission phases
const MISSION_PHASES = {
    READY: 'ready',
    LAUNCH: 'launch',
    ASCENT: 'ascent',
    STAGE_SEPARATION: 'stage_separation',
    BOOSTER_RETURN: 'booster_return',
    STARSHIP_ASCENT: 'starship_ascent',
    BOOSTER_LANDING: 'booster_landing',
    MECHAZILLA_CATCH: 'mechazilla_catch',
    MISSION_COMPLETE: 'mission_complete'
};

let currentPhase = MISSION_PHASES.READY;
let starshipAscending = false;

// Initialize the simulator
async function init() {
    try {
        // Initialize ISRU system
        isruSystem = new ISRUSystem();
        console.log('Initializing aerospace-grade Starship simulator...');
        
        // Create scene
        scene = new THREE.Scene();
        console.log('Scene created successfully');
        
        // Initialize high-fidelity model loader (with fallback)
        try {
            gltfLoader = new StarshipGLTFLoader();
            console.log('GLTF loader initialized');
        } catch (error) {
            console.warn('GLTF loader failed to initialize, will use procedural models:', error);
            useHighFidelityModel = false;
        }
        
        // Load textures
        console.log('Loading textures...');
        textures = loadTextures();
        console.log('Textures loaded successfully');
    
    // Set background to stars texture
    const starsTexture = textures.stars;
    const starsGeometry = new THREE.SphereGeometry(5000, 32, 32);
    const starsMaterial = new THREE.MeshBasicMaterial({
        map: starsTexture,
        side: THREE.BackSide
    });
    const starsSphere = new THREE.Mesh(starsGeometry, starsMaterial);
    scene.add(starsSphere);
    
    // Add fog for atmospheric effect
    scene.fog = new THREE.FogExp2(0x000000, 0.00005);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(
        75, // Field of view
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near clipping plane
        10000 // Far clipping plane
    );
    
    // Create renderer with improved settings
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('simulator-canvas'),
        antialias: true,
        logarithmicDepthBuffer: true // Improves z-fighting issues
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Improved color rendering
    renderer.toneMappingExposure = 1.0;
    
    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 2000;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 1.2;
    
    // Initialize camera controller
    cameraController = new CameraController(camera, controls);
    
    // Set initial camera position
    cameraController.setMode('external', CAMERA_POSITIONS);
    
    // Add lighting
    addLights();
    
    // Add environment
    createEnvironment();
    
    // Create models (will load high-fidelity GLTF or fallback to procedural)
    await createModels();
    
    // Initialize dual physics engines
    physicsEngine = new ImprovedPhysicsEngine();
    aerospacePhysics = new AerospacePhysicsEngine();
    
    // Reset physics engines
    physicsEngine.reset();
    aerospacePhysics.reset();
    
    // Set landing target to mechazilla position
    physicsEngine.setLandingTarget(new THREE.Vector3(-120, 0, 0));
    
    // Add event listeners
    addEventListeners();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
    }, 2000);
    
    // Start animation loop
    animate();
    } catch (error) {
        console.error('Error during initialization:', error);
        document.getElementById('loading-screen').style.display = 'flex';
        document.querySelector('.loading-text').textContent = 'Error loading simulation: ' + error.message;
    }
}

// Add lights to the scene
function addLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 1);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;
    
    // Configure shadow properties
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    
    scene.add(sunLight);
    
    // Hemisphere light (sky and ground)
    const hemisphereLight = new THREE.HemisphereLight(0x0088ff, 0x00ff88, 0.3);
    scene.add(hemisphereLight);
}

// Create environment (Mars, stars, etc.)
function createEnvironment() {
    // Make sure textures are loaded
    if (!textures) {
        textures = loadTextures();
    }
    
    // Create Mars with improved texture - positioned closer to be visible
    mars = createMars(3000, 20000, textures.mars);
    scene.add(mars);
    
    // Add a button to view Mars
    const marsButton = document.createElement('button');
    marsButton.innerText = 'View Mars';
    marsButton.className = 'control-button';
    marsButton.style.position = 'absolute';
    marsButton.style.bottom = '50px';
    marsButton.style.right = '20px';
    marsButton.style.zIndex = '100';
    
    marsButton.addEventListener('click', () => {
        // Set camera to view Mars
        const marsPosition = new THREE.Vector3().copy(mars.position);
        camera.position.set(
            marsPosition.x - 6000,
            marsPosition.y + 3000,
            marsPosition.z - 6000
        );
        controls.target.copy(marsPosition);
        controls.update();
    });
    
    document.body.appendChild(marsButton);
    
    // Create launch pad with improved texture
    const padGeometry = new THREE.CylinderGeometry(30, 30, 2, 32);
    const padMaterial = new THREE.MeshStandardMaterial({
        roughness: 0.8,
        metalness: 0.2
    });
    
    // Add textures if available
    if (textures.launchpad) {
        padMaterial.map = textures.launchpad;
    }
    
    if (textures.launchpadNormal) {
        padMaterial.normalMap = textures.launchpadNormal;
    }
    
    const launchPad = new THREE.Mesh(padGeometry, padMaterial);
    launchPad.position.y = -1; // Half height
    launchPad.receiveShadow = true;
    scene.add(launchPad);
    
    // Create ground plane with Mars texture
    const groundGeometry = new THREE.PlaneGeometry(2000, 2000, 128, 128);
    const groundMaterial = new THREE.MeshStandardMaterial({
        roughness: 1.0,
        metalness: 0.0,
        color: 0xbb5533  // Mars-like reddish color as fallback
    });
    
    // Use Mars texture for the ground
    if (textures.mars) {
        groundMaterial.map = textures.mars.clone();
        groundMaterial.map.repeat.set(5, 5); // Larger pattern for Mars surface
        groundMaterial.map.wrapS = THREE.RepeatWrapping;
        groundMaterial.map.wrapT = THREE.RepeatWrapping;
    }
    
    // Add normal and displacement maps if available
    if (textures.marsNormal) {
        groundMaterial.normalMap = textures.marsNormal.clone();
        groundMaterial.normalMap.repeat.set(5, 5);
        groundMaterial.normalMap.wrapS = THREE.RepeatWrapping;
        groundMaterial.normalMap.wrapT = THREE.RepeatWrapping;
    }
    
    if (textures.marsDisplacement) {
        groundMaterial.displacementMap = textures.marsDisplacement.clone();
        groundMaterial.displacementScale = 10; // More pronounced for Mars terrain
        groundMaterial.displacementMap.repeat.set(5, 5);
        groundMaterial.displacementMap.wrapS = THREE.RepeatWrapping;
        groundMaterial.displacementMap.wrapT = THREE.RepeatWrapping;
    }
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -1.1; // Just below the launch pad
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add mountains with improved geometry and materials
    createMountainRange();
    
    // Add atmospheric fog for distance effect
    scene.fog = new THREE.FogExp2(0x000000, 0.0005);
}

// Create a more realistic mountain range
function createMountainRange() {
    const mountainCount = 50;
    const mountainRadius = 800;
    
    // Use a group to organize mountains
    const mountainGroup = new THREE.Group();
    
    for (let i = 0; i < mountainCount; i++) {
        const angle = (i / mountainCount) * Math.PI * 2;
        const radius = mountainRadius + Math.random() * 200;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const height = 50 + Math.random() * 150;
        
        // Create a cone for each mountain
        const mountainGeometry = new THREE.ConeGeometry(
            30 + Math.random() * 50, // radius
            height,                   // height
            8 + Math.floor(Math.random() * 6), // segments
            1,                       // heightSegments
            false                    // openEnded
        );
        
        // Create noise-based displacement for more natural look
        const positions = mountainGeometry.attributes.position.array;
        for (let j = 0; j < positions.length; j += 3) {
            const vertex = new THREE.Vector3(positions[j], positions[j+1], positions[j+2]);
            const distance = vertex.length();
            
            // Add noise based on position
            const noise = Math.sin(vertex.x * 0.1) * Math.cos(vertex.z * 0.1) * 5;
            vertex.normalize().multiplyScalar(distance + noise);
            
            positions[j] = vertex.x;
            positions[j+1] = vertex.y;
            positions[j+2] = vertex.z;
        }
        
        mountainGeometry.computeVertexNormals();
        
        // Create material with slight color variation
        const hue = 0.05 + Math.random() * 0.05; // Reddish-brown
        const saturation = 0.4 + Math.random() * 0.2;
        const lightness = 0.2 + Math.random() * 0.1;
        
        const mountainMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(hue, saturation, lightness),
            roughness: 0.9 + Math.random() * 0.1,
            metalness: 0.0,
            flatShading: true
        });
        
        const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
        
        // Position the mountain
        mountain.position.set(x, 0, z);
        
        // Random rotation for variety
        mountain.rotation.y = Math.random() * Math.PI * 2;
        
        // Add to group
        mountainGroup.add(mountain);
    }
    
    scene.add(mountainGroup);
}

// Create 3D models with high-fidelity option
async function createModels() {
    try {
        console.log('Creating high-fidelity Starship models...');
        
        if (useHighFidelityModel && gltfLoader) {
            // Try to load high-fidelity GLTF model
            try {
                console.log('Loading GLTF Starship model...');
                const starshipModel = await gltfLoader.loadStarshipModel(
                    (progress) => {
                        console.log('Loading progress:', progress.toFixed(1) + '%');
                        // Update loading screen progress if needed
                        const progressBar = document.querySelector('.progress-bar');
                        if (progressBar) {
                            progressBar.style.width = progress + '%';
                        }
                    },
                    (model) => {
                        console.log('High-fidelity Starship model loaded successfully');
                    },
                    (error) => {
                        console.warn('GLTF loading failed:', error);
                    }
                );
                
                // Extract components from the high-fidelity model
                const starshipComponent = starshipModel.getObjectByName('StarshipUpperStage');
                const superHeavyComponent = starshipModel.getObjectByName('SuperHeavyBooster');
                
                if (starshipComponent && superHeavyComponent) {
                    starship = starshipComponent;
                    superHeavy = superHeavyComponent;
                    console.log('Using high-fidelity GLTF models');
                } else {
                    throw new Error('Could not extract components from GLTF model');
                }
                
            } catch (error) {
                console.warn('High-fidelity model loading failed, using enhanced procedural models:', error);
                useHighFidelityModel = false;
            }
        }
        
        // Fallback to enhanced procedural models
        if (!useHighFidelityModel) {
            console.log('Creating enhanced procedural models...');
            superHeavy = createSuperHeavyModel();
            starship = createStarshipModel();
        }
        
        // Position models correctly
        superHeavy.position.y = 34.5; // Super Heavy center height (69m / 2)
        starship.position.y = 69 + 25; // Super Heavy height + Starship center height
        
        // Enable shadows
        superHeavy.castShadow = true;
        superHeavy.receiveShadow = true;
        starship.castShadow = true;
        starship.receiveShadow = true;
        
        // Add to scene
        scene.add(superHeavy);
        scene.add(starship);
        
        console.log('Creating Mechazilla model...');
        // Create Mechazilla tower
        mechazilla = createMechazillaModel();
        mechazilla.position.set(-120, 0, 0);
        mechazilla.castShadow = true;
        mechazilla.receiveShadow = true;
        scene.add(mechazilla);
        
        // Create Mars in the distance
        console.log('Creating Mars planet...');
        mars = createMars(3000, 100000);
        scene.add(mars);
        
        // Set up enhanced engine effects
        console.log('Setting up aerospace-grade engine effects...');
        const starshipEngines = [];
        const superHeavyEngines = [];
        
        // Find all Raptor engines in both models
        starship.traverse(child => {
            if (child.name && (child.name.includes('raptor') || child.name.includes('engine'))) {
                starshipEngines.push(child);
            }
        });
        
        superHeavy.traverse(child => {
            if (child.name && (child.name.includes('raptor') || child.name.includes('engine'))) {
                superHeavyEngines.push(child);
            }
        });
        
        // Create enhanced engine effects
        starshipEngineEffects = createEngineEffects(starshipEngines);
        superHeavyEngineEffects = createEngineEffects(superHeavyEngines);
        
        // Initialize physics engines
        initPhysics();
        
        console.log('All aerospace-grade models created successfully');
        console.log('Starship engines found:', starshipEngines.length);
        console.log('Super Heavy engines found:', superHeavyEngines.length);
        
    } catch (error) {
        console.error('Error creating models:', error);
        throw new Error('Failed to create 3D models: ' + error.message);
    }
}

// Initialize physics engine
function initPhysics() {
    try {
        console.log('Initializing physics engine...');
        
        // Ensure physics engine is created
        if (!physicsEngine) {
            physicsEngine = new ImprovedPhysicsEngine();
        }
        
        // Set Earth gravity instead of Mars for testing
        physicsEngine.gravity = 9.81;
        
        // Increase thrust on Super Heavy for better liftoff
        physicsEngine.vehicles.superHeavy.maxThrust = 45000000; // Increased thrust
        
        // Reduce mass for testing to ensure successful liftoff
        physicsEngine.vehicles.superHeavy.mass = 200000;
        physicsEngine.vehicles.superHeavy.fuel = 3400000;
        
        // Reset the physics state
        physicsEngine.reset(); // Ensure we start with a clean state
        
        console.log('Physics engine initialized with:', {
            gravity: physicsEngine.gravity,
            superHeavyThrust: physicsEngine.vehicles.superHeavy.maxThrust,
            superHeavyMass: physicsEngine.vehicles.superHeavy.mass + physicsEngine.vehicles.superHeavy.fuel
        });
    } catch (error) {
        console.error('Error initializing physics engine:', error);
    }
}

// Set camera position based on view mode
function setCameraPosition(viewMode) {
    if (!CAMERA_POSITIONS[viewMode]) {
        console.warn(`Unknown camera position: ${viewMode}`);
        return;
    }
    
    // Use camera controller for smooth transitions
    cameraController.setMode(viewMode, CAMERA_POSITIONS);
    
    // Update UI to show current view
    document.querySelectorAll('.camera-button').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeButton = document.querySelector(`.camera-button[data-view="${viewMode}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

// Update engine effects based on current mission phase
function updateEngineEffects(delta) {
    if (!starshipEngineEffects || !superHeavyEngineEffects) return;
    
    let starshipPower = 0;
    let superHeavyPower = 0;
    
    // Set engine power based on mission phase
    switch (currentPhase) {
        case MISSION_PHASES.READY:
            // Engines off
            break;
            
        case MISSION_PHASES.LAUNCH:
            // All engines at full power
            starshipPower = 0; // Starship engines off during launch
            superHeavyPower = Math.min(1.0, missionTime / 3); // Ramp up over 3 seconds
            break;
            
        case MISSION_PHASES.ASCENT:
            // All booster engines at full power
            starshipPower = 0;
            superHeavyPower = 1.0;
            break;
            
        case MISSION_PHASES.STAGE_SEPARATION:
            // Engines transitioning
            superHeavyPower = Math.max(0, 1.0 - (missionTime - physicsEngine.stageSeparationTime) * 2);
            starshipPower = Math.min(1.0, (missionTime - physicsEngine.stageSeparationTime) * 2);
            break;
            
        case MISSION_PHASES.BOOSTER_RETURN:
            // Booster using engines for controlled descent
            superHeavyPower = 0.3 + Math.sin(missionTime * 0.5) * 0.2; // Varying for control
            starshipPower = 1.0; // Starship continuing ascent
            break;
            
        case MISSION_PHASES.STARSHIP_ASCENT:
            // Starship engines at full power
            starshipPower = 1.0;
            superHeavyPower = 0.3 + Math.sin(missionTime * 0.5) * 0.2; // Control burns
            break;
            
        case MISSION_PHASES.BOOSTER_LANDING:
            // Booster landing burn
            superHeavyPower = 0.7; // Landing burn
            starshipPower = 0; // Starship in orbit or beyond view
            break;
            
        case MISSION_PHASES.MECHAZILLA_CATCH:
            // Final landing adjustment
            superHeavyPower = 0.3;
            starshipPower = 0;
            break;
            
        case MISSION_PHASES.MISSION_COMPLETE:
            // All engines off
            superHeavyPower = 0;
            starshipPower = 0;
            break;
    }
    
    // Update the engine effects
    starshipEngineEffects.update(delta, starshipPower);
    superHeavyEngineEffects.update(delta, superHeavyPower);
}

// Add event listeners
function addEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
    
    // Camera controls
    document.getElementById('btn-camera-external').addEventListener('click', () => setCameraPosition('external'));
    document.getElementById('btn-camera-booster').addEventListener('click', () => setCameraPosition('booster'));
    document.getElementById('btn-camera-starship').addEventListener('click', () => setCameraPosition('starship'));
    document.getElementById('btn-camera-tower').addEventListener('click', () => setCameraPosition('tower'));
    
    // Simulation controls
    document.getElementById('btn-launch').addEventListener('click', startLaunch);
    document.getElementById('btn-stage').addEventListener('click', triggerStageSeparation);
    document.getElementById('btn-landing').addEventListener('click', startLandingSequence);
    document.getElementById('btn-catch').addEventListener('click', startMechazillaCatch);
    
    // Simulation speed
    const speedSlider = document.getElementById('simulation-speed');
    const speedValue = document.getElementById('speed-value');
    
    speedSlider.addEventListener('input', () => {
        simulationSpeed = parseFloat(speedSlider.value);
        speedValue.textContent = `${simulationSpeed.toFixed(1)}x`;
    });
}

// Start launch sequence
function startLaunch() {
    if (currentPhase !== MISSION_PHASES.READY) return;
    
    console.log('Starting launch sequence...');
    
    // Ensure physics engine is ready
    if (!physicsEngine) {
        console.error('Physics engine not initialized - cannot start launch');
        return;
    }
    
    // Reset clock and mission time
    clock.start();
    missionTime = 0;
    
    // Reset physics engine to ensure clean state
    physicsEngine.reset();
    starshipAscending = false; // Reset starship ascent flag
    
    // Position vehicles properly in physics engine
    physicsEngine.vehicles.superHeavy.position.copy(superHeavy.position);
    physicsEngine.vehicles.starship.position.copy(starship.position);
    
    // Set to launch phase and start simulation
    currentPhase = MISSION_PHASES.LAUNCH;
    isSimulationRunning = true;
    
    // Reset clock to ensure smooth animation
    clock.start();
    
    // Enable stage separation button
    document.getElementById('btn-stage').disabled = false;
    
    // Set initial throttle
    if (physicsEngine) {
        physicsEngine.vehicles.superHeavy.throttle = 1.0;
    }
    
    console.log('Launch sequence initiated');
    updateMissionStatus('Launch sequence initiated');
    
    // Disable launch button
    document.getElementById('btn-launch').disabled = true;
}

// Trigger stage separation
function triggerStageSeparation() {
    if (currentPhase !== MISSION_PHASES.ASCENT) return;
    
    console.log('Manual stage separation triggered by user');
    
    // Set explicit positions for both vehicles before separation
    // This ensures they're in the right positions relative to each other
    if (starship && superHeavy) {
        // Calculate the proper offset for Starship (on top of Super Heavy)
        const starshipOffset = new THREE.Vector3(0, (71/2) + (50/2) + 0.5, 0);
        
        // Position Starship explicitly on top of Super Heavy
        starship.position.copy(superHeavy.position).add(starshipOffset);
        starship.quaternion.copy(superHeavy.quaternion);
        
        // Update physics engine positions to match
        physicsEngine.vehicles.superHeavy.position.copy(superHeavy.position);
        physicsEngine.vehicles.starship.position.copy(starship.position);
        
        // Set physics engine velocities to be the same before separation
        const currentVelocity = physicsEngine.vehicles.superHeavy.velocity.clone();
        physicsEngine.vehicles.starship.velocity.copy(currentVelocity);
    }
    
    // Now change phase to STAGE_SEPARATION
    currentPhase = MISSION_PHASES.STAGE_SEPARATION;
    updateMissionStatus('Stage separation in progress');
    
    // Enable landing button
    document.getElementById('btn-landing').disabled = false;
    
    // Disable stage separation button
    document.getElementById('btn-stage').disabled = true;
}

// Start landing sequence
function startLandingSequence() {
    if (currentPhase !== MISSION_PHASES.BOOSTER_RETURN) {
        console.warn('Cannot start landing sequence - not in booster return phase');
        return;
    }
    
    console.log('Starting booster landing sequence');
    
    try {
        // Ensure the physics engine initiates landing
        if (physicsEngine && physicsEngine.vehicles && physicsEngine.vehicles.superHeavy) {
            // Initialize the landing target (landing pad location)
            if (!physicsEngine.landingTarget) {
                physicsEngine.landingTarget = new THREE.Vector3(0, 0, 0);
            }
            
            // Set necessary landing parameters if not already set
            if (!physicsEngine.landingStartAltitude) {
                physicsEngine.landingStartAltitude = 5000; // Meters
                physicsEngine.hoverAltitude = 50;         // Meters
                physicsEngine.touchdownSpeed = 2;         // Meters per second
            }
            
            // Adjust booster for landing
            physicsEngine.vehicles.superHeavy.throttle = 0.3; // Initial throttle for descent
            
            // Start the physics engine landing sequence
            // Instead of calling startLandingSequence (which doesn't exist), set the landing phase directly
            physicsEngine.landingPhase = 'coast';
            physicsEngine.landingParams.phaseStartTime = missionTime;
            physicsEngine.landingParams.currentPhaseTime = 0;
            console.log('Landing sequence initialized with phase:', physicsEngine.landingPhase);
            
            // Switch camera to booster view for landing
            setCameraPosition('booster');
            
            // Update UI
            currentPhase = MISSION_PHASES.BOOSTER_LANDING;
            updateMissionStatus('Booster landing sequence initiated');
            
            // Enable catch button
            document.getElementById('btn-catch').disabled = false;
            
            // Disable landing button
            document.getElementById('btn-landing').disabled = true;
        } else {
            console.error('Cannot start landing - physics engine or booster not available');
        }
    } catch (error) {
        console.error('Error starting landing sequence:', error);
    }
}

// Start Mechazilla catch
function startMechazillaCatch() {
    if (currentPhase !== MISSION_PHASES.BOOSTER_LANDING) {
        console.warn('Cannot start Mechazilla catch - not in booster landing phase');
        return;
    }
    
    console.log('Starting Mechazilla catch sequence');
    
    try {
        // Initialize Mechazilla catch if needed
        if (!mechazillaCatch) {
            mechazillaCatch = new MechazillaCatchSimulation();
            console.log('Mechazilla catch simulation initialized');
        }
        
        // Reset and prepare the catch system
        mechazillaCatch.reset();
        mechazillaCatch.initialize();
        
        // Set up catch parameters
        if (physicsEngine && physicsEngine.vehicles && physicsEngine.vehicles.superHeavy) {
            const booster = physicsEngine.vehicles.superHeavy;
            
            // Initialize tracking
            mechazillaCatch.startTracking(booster.position, booster.velocity);
            mechazillaCatch.prepareForCatch();
            
            console.log('Mechazilla catch sequence prepared');
            
            // Switch to tower camera view for better catch visibility
            setCameraPosition('tower');
            
            // Update phase and UI
            currentPhase = MISSION_PHASES.MECHAZILLA_CATCH;
            updateMissionStatus('Mechazilla catch sequence initiated');
            
            // Disable catch button
            document.getElementById('btn-catch').disabled = true;
        } else {
            console.error('Cannot start Mechazilla catch - booster not available');
        }
    } catch (error) {
        console.error('Error starting Mechazilla catch:', error);
    }
}

// Update mission status display
function updateMissionStatus(status) {
    document.getElementById('mission-status').textContent = status;
}

// Update telemetry display
function updateTelemetry(data) {
    document.getElementById('altitude').textContent = `${data.altitude.toFixed(2)} km`;
    document.getElementById('velocity').textContent = `${data.velocity.toFixed(2)} m/s`;
    document.getElementById('acceleration').textContent = `${data.acceleration.toFixed(2)} m/s²`;
    document.getElementById('attitude').textContent = `${data.attitude.toFixed(2)}°`;
}

// Update mission timer
function updateMissionTimer() {
    const hours = Math.floor(missionTime / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((missionTime % 3600) / 60).toString().padStart(2, '0');
    const seconds = Math.floor(missionTime % 60).toString().padStart(2, '0');
    
    document.getElementById('mission-timer').textContent = `T+ ${hours}:${minutes}:${seconds}`;
}

// Animation loop
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta() * simulationSpeed;
    
    // Update physics and models
    if (isSimulationRunning) {
        updateSimulation(delta);
        missionTime += delta;
        updateMissionTimer();
    }
    
    // Update camera
    if (cameraController) {
        cameraController.update(delta);
    }
    
    // Update engine effects
    updateEngineEffects(delta);
    
    // Update controls
    if (controls) {
        controls.update();
    }
    
    // Independent Starship ascent update if applicable
    if (starshipAscending && physicsEngine) {
        const starshipState = physicsEngine.updateStarshipAscent(delta);
        if (starship && starshipState && starshipState.position) {
            starship.position.copy(starshipState.position);
            if (starshipState.quaternion) {
                starship.quaternion.copy(starshipState.quaternion);
            }

            // Basic telemetry for Starship (can be expanded)
            // console.log(`Starship Ascent: Alt: ${starshipState.position.y.toFixed(0)}m, Vel: ${starshipState.velocity.length().toFixed(1)}m/s, Fuel: ${starshipState.fuel.toFixed(0)}kg`);

            // Update Starship engine effects
            if (starshipEngineEffects && starshipState.thrust > 0) {
                starshipEngineEffects.update(delta, starshipState.throttle);
            }

            if (starshipState.orbitReached) {
                starshipAscending = false;
                updateMissionStatus('Starship orbit reached!');
                console.log("Starship orbit reached, starshipAscending set to false.");
                // Potentially set a new phase or stop Starship updates
            } else if (starshipState.fuel <= 0) {
                starshipAscending = false;
                updateMissionStatus('Starship out of fuel.');
                console.log("Starship out of fuel, starshipAscending set to false.");
            }
        }
    }

    // Render scene
    renderer.render(scene, camera);
    
    // Debug info (reduced frequency)
    if (isSimulationRunning && currentPhase !== MISSION_PHASES.READY && Math.random() < 0.001) {
        console.log(`Animation frame: Rocket Y position: ${superHeavy.position.y.toFixed(1)}m`);
    }
}

// Update simulation based on current phase
function updateSimulation(delta) {
    // Update Mars rotation
    if (mars) {
        updateMars(mars, delta);
    }
    
    // Update engine effects
    updateEngineEffects(delta);
    
    // Skip updates if simulation is paused or physics not ready
    if (!isSimulationRunning && currentPhase !== MISSION_PHASES.READY) {
        return;
    }
    
    // Ensure physics engine is ready
    if (!physicsEngine) {
        console.warn('Physics engine not initialized yet');
        return;
    }
    
    // Apply simulation speed multiplier
    delta *= simulationSpeed;
    
    // Update mission timer
    if (currentPhase !== MISSION_PHASES.READY) {
        missionTime += delta;
        updateMissionTimer();
    }
    
    // Use improved physics engine for all vehicle dynamics
    let physicsState = {
        position: superHeavy ? superHeavy.position : new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        acceleration: new THREE.Vector3(),
        quaternion: superHeavy ? superHeavy.quaternion : new THREE.Quaternion(),
        eulerAngles: { x: 0, y: 0, z: 0 }
    };
    
    // Update based on current mission phase
    switch (currentPhase) {
        case MISSION_PHASES.READY:
            // Nothing to update in ready state
            break;
            
        case MISSION_PHASES.LAUNCH:
            // Use physics engine for launch
            physicsState = physicsEngine.updateLaunch(delta);
            
            // Validate physics state
            if (!physicsState || !physicsState.position) {
                console.warn('Invalid physics state returned from updateLaunch');
                break;
            }
            
            // Apply physics to vehicle
            superHeavy.position.copy(physicsState.position);
            if (physicsState.quaternion) {
                superHeavy.quaternion.copy(physicsState.quaternion);
            }
            
            // Apply proper positioning to starship during launch (attached to booster)
            if (starship) {
                // Position starship on top of Super Heavy
                const starshipOffset = new THREE.Vector3(0, (71/2) + (50/2) + 0.5, 0);
                starship.position.copy(superHeavy.position).add(starshipOffset);
                starship.quaternion.copy(superHeavy.quaternion);
            }
            
            // Log current rocket position for debugging (less frequently)
            if (Math.random() < 0.01) {
                console.log(`UpdateSimulation: Rocket Y position: ${superHeavy.position.y.toFixed(1)}m, Velocity: ${physicsState.velocity.y.toFixed(1)}m/s`);
            }
            
            // Update camera to track rocket during launch
            if (cameraController.currentMode === 'tracking') {
                cameraController.trackObject(superHeavy, delta);
                
                // Add slight camera shake based on thrust
                const shakeIntensity = Math.min(physicsState.thrust / 100, 0.5);
                cameraController.addShake(shakeIntensity * delta);
            }
            
            // Update telemetry with null checks
            updateTelemetry({
                altitude: (physicsState.position ? physicsState.position.y : 0) / 1000, // km
                velocity: physicsState.velocity ? physicsState.velocity.length() : 0,
                acceleration: physicsState.acceleration ? physicsState.acceleration.length() : 0,
                attitude: (physicsState.eulerAngles && physicsState.eulerAngles.z !== undefined) ? 
                         (90 - physicsState.eulerAngles.z * (180/Math.PI)) : 0 // degrees
            });
            
            // Transition to ascent phase after reaching certain height
            if (physicsState.position.y > 30) { // Keep this for initial ascent transition, separation is in ASCENT phase

                currentPhase = MISSION_PHASES.ASCENT;
                updateMissionStatus('Ascent phase');
                
                // Switch to tracking camera if not already
                if (cameraController.currentMode !== 'tracking') {
                    setCameraPosition('tracking');
                }
            }
            break;
            
        case MISSION_PHASES.ASCENT:
            // Continue ascent with physics engine
            physicsState = physicsEngine.updateAscent(delta);
            
            // Validate physics state
            if (!physicsState || !physicsState.position) {
                console.warn('Invalid physics state returned from updateAscent');
                break;
            }
            
            // Apply physics to vehicle
            superHeavy.position.copy(physicsState.position);
            if (physicsState.quaternion) {
                superHeavy.quaternion.copy(physicsState.quaternion);
            }
            
            // Apply proper positioning to starship during ascent (attached to booster)
            if (starship) {
                // Position starship on top of Super Heavy (same as in launch phase)
                const starshipOffset = new THREE.Vector3(0, (71/2) + (50/2) + 0.5, 0);
                starship.position.copy(superHeavy.position).add(starshipOffset);
                starship.quaternion.copy(superHeavy.quaternion);
            }
            
            // Update camera tracking
            if (cameraController.currentMode === 'tracking') {
                cameraController.trackObject(superHeavy, delta);
                
                // Reduce camera shake as altitude increases
                const shakeIntensity = Math.min(physicsState.thrust / 200, 0.3);
                cameraController.addShake(shakeIntensity * delta);
            }
            
            // Update telemetry with physics data
            updateTelemetry({
                altitude: physicsState.position.y / 1000, // km
                velocity: physicsState.velocity.length(),
                acceleration: physicsState.acceleration.length(),
                attitude: (90 - physicsState.eulerAngles.z * (180/Math.PI)) // degrees
            });
            
            // No automatic separation - only triggered by button press
            // Ascent continues until user triggers stage separation
            break;
            
        case MISSION_PHASES.STAGE_SEPARATION:
            // Use physics for separation
            physicsState = physicsEngine.updateStageSeparation(delta);
            
            // Validate physics state
            if (!physicsState || physicsState.error) {
                console.warn('Invalid physics state returned from updateStageSeparation');
                break;
            }
            
            // Apply physics to both vehicles if state is valid
            if (physicsState.boosterPosition && superHeavy) {
                superHeavy.position.copy(physicsState.boosterPosition);
                if (physicsState.boosterQuaternion) {
                    superHeavy.quaternion.copy(physicsState.boosterQuaternion);
                }
            }
            
            if (physicsState.starshipPosition && starship) {
                starship.position.copy(physicsState.starshipPosition);
                if (physicsState.starshipQuaternion) {
                    starship.quaternion.copy(physicsState.starshipQuaternion);
                }
            }
            
            // Update camera to show separation
            if (cameraController.currentMode === 'tracking') {
                // Create a midpoint between the two vehicles to track
                const midpoint = new THREE.Vector3().addVectors(
                    physicsState.boosterPosition,
                    physicsState.starshipPosition
                ).multiplyScalar(0.5);
                
                // Create a dummy object with all required properties for camera tracking
                const dummyObj = { 
                    position: midpoint,
                    quaternion: new THREE.Quaternion()
                };
                
                // Track with a wider field of view to see both vehicles
                // Updated to match new trackObject signature (object, deltaTime, distance, height, offset)
                cameraController.trackObject(dummyObj, delta, 150, 100, new THREE.Vector3(0, 0, 0));
                
                // Log camera status for debugging
                console.log('Camera tracking separation, midpoint:', midpoint);
            }
            
            // Update telemetry for Starship
            updateTelemetry({
                altitude: physicsState.starshipPosition.y / 1000, // km
                velocity: physicsState.starshipVelocity.length(),
                acceleration: 2,
                attitude: (90 - physicsState.starshipEulerAngles.z * (180/Math.PI)) // degrees
            });
            
            // Transition to next phases after separation complete
            if (physicsState.separationComplete) {
                updateMissionStatus('Separation complete. Booster returning, Starship ascending.');
                console.log('Separation complete detected in main.js, transitioning phases');

                // Disable stage separation button (already done in triggerStageSeparation)
                document.getElementById('btn-stage').disabled = true;
                
                // Enable landing button
                document.getElementById('btn-landing').disabled = false;
                
                // Set main phase to booster return (Starship will need independent updates)
                currentPhase = MISSION_PHASES.BOOSTER_RETURN; 
                starshipAscending = true; // Starship begins its independent ascent
                
                // Switch camera to track booster
                setCameraPosition('booster');
                
                console.log('Transition to BOOSTER_RETURN complete');
            }
            break;
            
        case MISSION_PHASES.STARSHIP_ASCENT:
            // Starship continues to orbit with physics
            physicsState = physicsEngine.updateStarshipAscent(delta);
            
            // Apply physics to Starship
            starship.position.copy(physicsState.position);
            starship.quaternion.copy(physicsState.quaternion);
            
            // Update telemetry with null checks
            updateTelemetry({
                altitude: (physicsState.position ? physicsState.position.y : 0) / 1000, // km
                velocity: physicsState.velocity ? physicsState.velocity.length() : 0,
                acceleration: physicsState.acceleration ? physicsState.acceleration.length() : 0,
                attitude: (physicsState.eulerAngles && physicsState.eulerAngles.z !== undefined) ? 
                         (90 - physicsState.eulerAngles.z * (180/Math.PI)) : 0 // degrees
            });
            break;
            
        case MISSION_PHASES.BOOSTER_RETURN:
            // Booster returns with physics
            physicsState = physicsEngine.updateBoosterReturn(delta);
            
            // Apply physics to booster
            superHeavy.position.copy(physicsState.position);
            superHeavy.quaternion.copy(physicsState.quaternion);
            
            // Update camera tracking if in booster view
            if (cameraController && cameraController.currentMode === 'booster') {
                cameraController.trackObject(superHeavy, delta);
            }
            
            // Update telemetry with null checks
            updateTelemetry({
                altitude: (physicsState.position ? physicsState.position.y : 0) / 1000, // km
                velocity: physicsState.velocity ? physicsState.velocity.length() : 0,
                acceleration: physicsState.acceleration ? physicsState.acceleration.length() : 0,
                attitude: (physicsState.eulerAngles && physicsState.eulerAngles.z !== undefined) ? 
                         (90 - physicsState.eulerAngles.z * (180/Math.PI)) : 0 // degrees
            });
            
            // Allow manual transition to landing phase when altitude is low
            // Automatic transition removed to give user control
            break;
            
        case MISSION_PHASES.BOOSTER_LANDING:
            // Use improved physics for smooth landing
            physicsState = physicsEngine.updateBoosterLanding(delta);
            
            // Validate physics state
            if (!physicsState || !physicsState.position) {
                console.warn('Invalid physics state returned from updateBoosterLanding');
                break;
            }
            
            // Apply physics to booster
            superHeavy.position.copy(physicsState.position);
            if (physicsState.quaternion) {
                superHeavy.quaternion.copy(physicsState.quaternion);
            }
            
            // Update camera for dramatic landing view
            if (cameraController && (cameraController.currentMode === 'booster' || cameraController.currentMode === 'tracking')) {
                cameraController.trackObject(superHeavy, delta);
                
                // Add subtle camera shake based on engine throttle
                const shakeIntensity = Math.min(physicsState.throttle / 20, 0.2);
                cameraController.addShake(shakeIntensity * delta);
            }
            
            // Update telemetry with null checks
            updateTelemetry({
                altitude: (physicsState.position ? physicsState.position.y : 0) / 1000, // km
                velocity: physicsState.velocity ? physicsState.velocity.length() : 0,
                acceleration: physicsState.acceleration ? physicsState.acceleration.length() : 0,
                attitude: (physicsState.eulerAngles && physicsState.eulerAngles.z !== undefined) ? 
                         (90 - physicsState.eulerAngles.z * (180/Math.PI)) : 0 // degrees
            });
            
            // Landing complete - user can manually start Mechazilla catch
            // Automatic transition removed to give user control
            break;
            
        case MISSION_PHASES.MECHAZILLA_CATCH:
            // Final approach with precision physics
            physicsState = physicsEngine.updateMechazillaCatch(delta);
            
            // Validate physics state and apply if valid
            if (physicsState && physicsState.position && superHeavy) {
                superHeavy.position.copy(physicsState.position);
                if (physicsState.quaternion) {
                    superHeavy.quaternion.copy(physicsState.quaternion);
                }
            }
            break;
    }

    // Independent Starship ascent update if applicable
    if (starshipAscending && physicsEngine) {
        const starshipState = physicsEngine.updateStarshipAscent(delta);
        if (starship && starshipState && starshipState.position) {
            starship.position.copy(starshipState.position);
            if (starshipState.quaternion) {
                starship.quaternion.copy(starshipState.quaternion);
            }

            // Basic telemetry for Starship (can be expanded)
            // console.log(`Starship Ascent: Alt: ${starshipState.position.y.toFixed(0)}m, Vel: ${starshipState.velocity.length().toFixed(1)}m/s, Fuel: ${starshipState.fuel.toFixed(0)}kg`);

            // Update Starship engine effects
            if (starshipEngineEffects && starshipState.thrust > 0 && starshipState.throttle > 0) {
                starshipEngineEffects.update(delta, starshipState.throttle);
            }

            if (starshipState.orbitReached) {
                starshipAscending = false;
                updateMissionStatus('Starship orbit reached!');
                console.log("Starship orbit reached, starshipAscending set to false.");
            } else if (starshipState.fuel <= 0) {
                starshipAscending = false;
                updateMissionStatus('Starship out of fuel.');
                console.log("Starship out of fuel, starshipAscending set to false.");
            }
        }
    }
}

// Initialize the simulator when the page loads
window.addEventListener('load', () => {
    // Simulate loading progress
    const progressBar = document.querySelector('.progress-bar');
    const loadingText = document.querySelector('.loading-text');
    let progress = 0;
    
    try {
        const progressInterval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(progressInterval);
                loadingText.textContent = 'Starting simulation...';
                
                // Delay initialization slightly to ensure UI updates
                setTimeout(async () => {
                    try {
                        console.log('Initializing aerospace-grade simulator...');
                        await init();
                        console.log('Simulator initialized successfully');
                    } catch (error) {
                        console.error('Error during initialization:', error);
                        loadingText.textContent = 'Error loading simulation: ' + error.message;
                        document.getElementById('loading-screen').style.backgroundColor = 'rgba(150, 0, 0, 0.9)';
                    }
                }, 500);
            }
        }, 100);
    } catch (error) {
        console.error('Error in loading sequence:', error);
        loadingText.textContent = 'Error loading simulation: ' + error.message;
        document.getElementById('loading-screen').style.backgroundColor = 'rgba(150, 0, 0, 0.9)';
    }
});

// PhysicsEngine is imported from physics_engine.js

// Export functions for testing
export { init, animate, updateSimulation };
