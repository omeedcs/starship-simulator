// Starship and Super Heavy Booster 3D model creation script
// Based on technical specifications from SpaceX documentation

import * as THREE from 'three';
import { loadTextures } from './texture_loader.js';

// Constants based on technical specifications
const STARSHIP_HEIGHT = 50; // meters
const SUPER_HEAVY_HEIGHT = 71; // meters
const DIAMETER = 9; // meters for both Starship and Super Heavy
const GRID_FIN_WIDTH = 3; // meters (approximate)
const GRID_FIN_HEIGHT = 4; // meters (approximate)
const FLAP_WIDTH = 8; // meters (approximate)
const FLAP_HEIGHT = 12; // meters (approximate)

// Load textures
let textures;

// Initialize materials with default values
let STARSHIP_MATERIAL, SUPER_HEAVY_MATERIAL, HEAT_SHIELD_MATERIAL;
let GRID_FIN_MATERIAL, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL;

// Initialize materials with textures
function initMaterials() {
  // Load textures if not already loaded
  if (!textures) {
    textures = loadTextures();
  }
  
  // Enhanced Starship material with detailed texturing
  STARSHIP_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0xE8E8E8, // Enhanced stainless steel color
    metalness: 0.95,
    roughness: 0.15,
    envMapIntensity: 1.2,
    map: textures.starship || null,
    normalMap: textures.starshipNormal || null,
    metalnessMap: textures.starshipMetalness || null,
    roughnessMap: textures.starshipRoughness || null,
  });

  // Enhanced Super Heavy material
  SUPER_HEAVY_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0xE0E0E0, // Slightly different stainless steel color
    metalness: 0.92,
    roughness: 0.18,
    envMapIntensity: 1.0,
    map: textures.starship || null, // Use starship texture for super heavy too
    normalMap: textures.starshipNormal || null,
    metalnessMap: textures.starshipMetalness || null,
    roughnessMap: textures.starshipRoughness || null,
  });

  // Enhanced heat shield material
  HEAT_SHIELD_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x222222, // Dark heat shield tiles
    metalness: 0.2,
    roughness: 0.8,
  });

  // Enhanced grid fin material
  GRID_FIN_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x909090, // Enhanced titanium color
    metalness: 0.8,
    roughness: 0.3,
  });

  // Enhanced engine material
  ENGINE_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x333333, // Dark metal for engine housing
    metalness: 0.85,
    roughness: 0.2,
  });

  // Enhanced engine nozzle material
  ENGINE_NOZZLE_MATERIAL = new THREE.MeshStandardMaterial({
    color: 0x777777, // Lighter metal for nozzles
    metalness: 0.9,
    roughness: 0.1,
    emissive: 0x330000,
    emissiveIntensity: 0.1,
  });
}

// Create environment cubemap for reflections
const createEnvMap = () => {
  const reflectionCube = new THREE.CubeTextureLoader().load([
    'https://threejs.org/examples/textures/cube/pisa/px.png',
    'https://threejs.org/examples/textures/cube/pisa/nx.png',
    'https://threejs.org/examples/textures/cube/pisa/py.png',
    'https://threejs.org/examples/textures/cube/pisa/ny.png',
    'https://threejs.org/examples/textures/cube/pisa/pz.png',
    'https://threejs.org/examples/textures/cube/pisa/nz.png',
  ]);
  
  // Apply envmap to all materials
  STARSHIP_MATERIAL.envMap = reflectionCube;
  SUPER_HEAVY_MATERIAL.envMap = reflectionCube;
  GRID_FIN_MATERIAL.envMap = reflectionCube;
  ENGINE_MATERIAL.envMap = reflectionCube;
  ENGINE_NOZZLE_MATERIAL.envMap = reflectionCube;
};

// Try to create the environment map, but don't fail if it doesn't work
try {
  createEnvMap();
} catch (error) {
  console.warn('Could not load environment map for reflections:', error);
}

/**
 * Creates a panel texture for the metallic surface of Starship and Super Heavy
 * @returns {THREE.Texture|null} Normal map texture for panels
 */
function createPanelTexture() {
  try {
    // Create a canvas for the panel texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    // Fill with a dark gray background
    context.fillStyle = '#444444';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw panel outlines
    context.strokeStyle = '#666666';
    context.lineWidth = 2;
    
    // Horizontal panels
    const panelHeight = 40;
    for (let y = 0; y < canvas.height; y += panelHeight) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }
    
    // Vertical panels with some variation
    const panelWidth = 60;
    for (let x = 0; x < canvas.width; x += panelWidth) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();
    }
    
    // Create the texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 8); // Adjust based on the model scale
    
    return texture;
  } catch (error) {
    console.warn('Could not create panel texture:', error);
    return null;
  }
}

/**
 * Creates additional surface details for the Super Heavy booster
 * @returns {THREE.Group} Group containing detail meshes
 */
/**
 * Creates a tile pattern texture for the Starship heat shield
 * @returns {THREE.Texture|null} Normal map texture for heat shield tiles
 */
function createTilePattern() {
  try {
    // Create a canvas for the tile pattern
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    // Fill with a dark background
    context.fillStyle = '#111111';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw hexagonal tile pattern for heat shield
    context.strokeStyle = '#333333';
    context.lineWidth = 3;
    
    const tileSize = 30;
    const rows = Math.ceil(canvas.height / tileSize);
    const cols = Math.ceil(canvas.width / tileSize);
    
    // Draw hexagonal grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * tileSize * 1.5;
        const y = row * tileSize * Math.sqrt(3);
        const offset = (row % 2) ? tileSize * 0.75 : 0;
        
        context.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 3 * i;
          const px = x + offset + tileSize * 0.5 * Math.cos(angle);
          const py = y + tileSize * 0.5 * Math.sin(angle);
          
          if (i === 0) {
            context.moveTo(px, py);
          } else {
            context.lineTo(px, py);
          }
        }
        context.closePath();
        context.stroke();
      }
    }
    
    // Create the texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4); // Adjust based on the model scale
    
    return texture;
  } catch (error) {
    console.warn('Could not create tile pattern texture:', error);
    return null;
  }
}

/**
 * Creates additional surface details for the Super Heavy booster
 * @returns {THREE.Group} Group containing detail meshes
 */
function createBoosterDetails() {
  const detailsGroup = new THREE.Group();
  
  // Material for details
  const detailMaterial = new THREE.MeshStandardMaterial({
    color: 0xcccccc,
    metalness: 0.8,
    roughness: 0.3,
  });
  
  // Create pipe details running along the body
  for (let i = 0; i < 8; i++) {
    const pipeGeometry = new THREE.CylinderGeometry(
      0.15, // radius
      0.15,
      SUPER_HEAVY_HEIGHT * 0.8, // length
      8, // segments
      1
    );
    
    const pipe = new THREE.Mesh(pipeGeometry, detailMaterial);
    const angle = (i / 8) * Math.PI * 2;
    const radius = DIAMETER / 2 * 0.95; // Slightly inset from surface
    
    pipe.position.x = Math.cos(angle) * radius;
    pipe.position.z = Math.sin(angle) * radius;
    pipe.position.y = 0; // Centered vertically
    
    detailsGroup.add(pipe);
  }
  
  // Add some thruster ports near the top
  for (let i = 0; i < 4; i++) {
    const thrusterGeometry = new THREE.CylinderGeometry(
      0.3, // radius
      0.3,
      0.5, // length
      12, // segments
      1
    );
    
    const thruster = new THREE.Mesh(thrusterGeometry, ENGINE_MATERIAL);
    const angle = (i / 4) * Math.PI * 2;
    const radius = DIAMETER / 2;
    
    thruster.position.x = Math.cos(angle) * radius;
    thruster.position.z = Math.sin(angle) * radius;
    thruster.position.y = SUPER_HEAVY_HEIGHT * 0.35; // Near the top
    
    // Rotate to point outward
    thruster.rotation.z = Math.PI / 2;
    thruster.rotation.y = angle;
    
    detailsGroup.add(thruster);
  }
  
  return detailsGroup;
}

/**
 * Creates a group of windows for the Starship
 * @returns {THREE.Group} Group containing window meshes
 */
function createWindowsGroup() {
  const windowsGroup = new THREE.Group();
  
  // Window material - slightly transparent blue
  const windowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8CAADB,
    metalness: 0.2,
    roughness: 0.1,
    transmission: 0.9, // Glass-like transparency
    transparent: true,
    opacity: 0.7,
    envMapIntensity: 1.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });
  
  // Create a vertical row of round windows
  const windowGeometry = new THREE.CircleGeometry(0.5, 16);
  
  // Create 5 windows in a vertical arrangement
  for (let i = 0; i < 5; i++) {
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.z = DIAMETER / 2 * 0.99; // Position on the surface
    window.position.y = i * 4 - 8; // Spaced vertically
    window.rotation.y = Math.PI / 2; // Face outward
    windowsGroup.add(window);
  }
  
  // Add second row of windows, slightly offset
  for (let i = 0; i < 4; i++) {
    const window = new THREE.Mesh(windowGeometry, windowMaterial);
    window.position.z = DIAMETER / 2 * 0.99;
    window.position.y = i * 4 - 6; // Offset from first row
    window.position.x = 2; // Side offset
    window.rotation.y = Math.PI / 2;
    windowsGroup.add(window);
  }
  
  return windowsGroup;
}

/**
 * Creates a detailed 3D model of the Starship upper stage with enhanced metallic appearance
 * @returns {THREE.Group} The Starship 3D model
 */
export function createStarshipModel() {
  // Initialize materials if not already done
  if (!STARSHIP_MATERIAL) {
    initMaterials();
  }
  
  // Create environment map for reflective materials
  const envMap = createEnvMap();
  STARSHIP_MATERIAL.envMap = envMap;
  HEAT_SHIELD_MATERIAL.envMap = envMap;
  
  // Create main Starship group
  const starship = new THREE.Group();
  
  // Main body cylinder
  const bodyGeometry = new THREE.CylinderGeometry(
    DIAMETER / 2, // top radius
    DIAMETER / 2, // bottom radius
    STARSHIP_HEIGHT, // height
    32, // radial segments
    16, // height segments
    false // open ended
  );
  
  // Apply enhanced textures to Starship body
  const bodyMaterial = STARSHIP_MATERIAL.clone();
  
  // If textures aren't available, create procedural ones
  if (!textures || !textures.starshipDiffuse) {
    bodyMaterial.map = createPanelTexture(1024, 2048, 0xE8E8E8, 0xD0D0D0, 20, 40);
  }
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  starship.add(body);
  
  // Add nose cone with improved geometry for better shape
  const noseHeight = STARSHIP_HEIGHT / 6;
  const noseGeometry = new THREE.CylinderGeometry(
    0.1, // top radius (nearly pointed)
    DIAMETER / 2, // bottom radius
    noseHeight, // height
    32, // radial segments
    12, // increased height segments for smoother curve
    false // open ended
  );
  
  // Apply custom vertex displacement for more realistic nose shape
  const nosePositions = noseGeometry.attributes.position.array;
  for (let i = 0; i < nosePositions.length; i += 3) {
    const vertex = new THREE.Vector3(nosePositions[i], nosePositions[i+1], nosePositions[i+2]);
    
    // Calculate normalized height within the nose cone (0 at bottom, 1 at top)
    const normalizedHeight = (vertex.y - (-noseHeight/2)) / noseHeight;
    
    // Apply curve function for more realistic nose shape
    if (normalizedHeight > 0) {
      const scale = 1.0 - Math.pow(normalizedHeight, 0.7) * 0.15;
      vertex.x *= scale;
      vertex.z *= scale;
    }
    
    nosePositions[i] = vertex.x;
    nosePositions[i+1] = vertex.y;
    nosePositions[i+2] = vertex.z;
  }
  noseGeometry.computeVertexNormals();
  
  const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
  nose.position.y = STARSHIP_HEIGHT / 2 + noseHeight / 2 - 0.5; // Position at top of body
  starship.add(nose);
  
  // Add heat shield (black side) with improved detail
  const heatShieldGeometry = new THREE.CylinderGeometry(
    DIAMETER / 2 + 0.05, // slightly larger than body
    DIAMETER / 2 + 0.05,
    STARSHIP_HEIGHT / 2,
    48, // increased segments for better detail
    8,  // increased height segments
    true, // open ended
    Math.PI / 2, // start angle
    Math.PI // angle length (half cylinder)
  );
  
  // Add tile pattern to heat shield geometry
  if (!textures || !textures.heatShield) {
    const tileUvs = heatShieldGeometry.attributes.uv.array;
    for (let i = 0; i < tileUvs.length; i += 2) {
      tileUvs[i] *= 20; // Horizontal tile count
      tileUvs[i+1] *= 40; // Vertical tile count
    }
  }
  
  const heatShield = new THREE.Mesh(heatShieldGeometry, HEAT_SHIELD_MATERIAL);
  heatShield.position.z = -0.05; // Slight offset to prevent z-fighting
  heatShield.position.y = -STARSHIP_HEIGHT / 4; // Lower half of the ship
  
  // Forward flaps with more aerodynamic shape (2)
  // Use a custom shape for more aerodynamic flaps
  const forwardFlapShape = new THREE.Shape();
  forwardFlapShape.moveTo(0, 0);
  forwardFlapShape.lineTo(FLAP_WIDTH, 0);
  forwardFlapShape.bezierCurveTo(
    FLAP_WIDTH, FLAP_HEIGHT * 0.4,
    FLAP_WIDTH * 0.7, FLAP_HEIGHT * 0.7,
    FLAP_WIDTH * 0.3, FLAP_HEIGHT * 0.7
  );
  forwardFlapShape.lineTo(0, 0);
  
  const forwardFlapExtrudeSettings = {
    steps: 1,
    depth: 0.3,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3
  };
  
  const forwardFlapGeometry = new THREE.ExtrudeGeometry(
    forwardFlapShape,
    forwardFlapExtrudeSettings
  );
  
  const forwardFlapLeft = new THREE.Mesh(forwardFlapGeometry, STARSHIP_MATERIAL);
  forwardFlapLeft.position.set(-DIAMETER / 2 - FLAP_WIDTH, STARSHIP_HEIGHT * 0.3, -0.15);
  forwardFlapLeft.rotation.z = Math.PI * 0.1; // slight angle
  
  const forwardFlapRight = new THREE.Mesh(forwardFlapGeometry, STARSHIP_MATERIAL);
  forwardFlapRight.position.set(DIAMETER / 2, STARSHIP_HEIGHT * 0.3, -0.15);
  forwardFlapRight.rotation.z = -Math.PI * 0.1; // slight angle in opposite direction
  forwardFlapRight.rotation.y = Math.PI; // flip horizontally
  
  // Aft flaps with more aerodynamic shape (2)
  const aftFlapShape = new THREE.Shape();
  aftFlapShape.moveTo(0, 0);
  aftFlapShape.lineTo(FLAP_WIDTH, 0);
  aftFlapShape.bezierCurveTo(
    FLAP_WIDTH, FLAP_HEIGHT * 0.6,
    FLAP_WIDTH * 0.7, FLAP_HEIGHT,
    FLAP_WIDTH * 0.2, FLAP_HEIGHT
  );
  aftFlapShape.lineTo(0, 0);
  
  const aftFlapExtrudeSettings = {
    steps: 1,
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3
  };
  
  const aftFlapGeometry = new THREE.ExtrudeGeometry(
    aftFlapShape,
    aftFlapExtrudeSettings
  );
  
  const aftFlapLeft = new THREE.Mesh(aftFlapGeometry, STARSHIP_MATERIAL);
  aftFlapLeft.position.set(-DIAMETER / 2 - FLAP_WIDTH, -STARSHIP_HEIGHT * 0.3 - FLAP_HEIGHT, -0.2);
  aftFlapLeft.rotation.z = Math.PI * 2; // No rotation
  
  const aftFlapRight = new THREE.Mesh(aftFlapGeometry, STARSHIP_MATERIAL);
  aftFlapRight.position.set(DIAMETER / 2 + FLAP_WIDTH, -STARSHIP_HEIGHT * 0.3 - FLAP_HEIGHT, -0.2);
  aftFlapRight.rotation.z = Math.PI; // flip
  
  // Enhanced Engines (6 Raptor engines at the base)
  const engineGroup = createRaptorEngineCircle(6, DIAMETER / 2 * 0.8);
  engineGroup.position.y = -STARSHIP_HEIGHT / 2;
  
  // Add windows on the non-heat shield side
  const windowGroup = createWindowsGroup();
  windowGroup.position.y = STARSHIP_HEIGHT * 0.1;
  windowGroup.rotation.y = Math.PI * 0.3; // Position opposite the heat shield
  
  // Add docking port at the top
  const dockingPortGeometry = new THREE.CylinderGeometry(DIAMETER / 6, DIAMETER / 6, 0.5, 32);
  const dockingPort = new THREE.Mesh(dockingPortGeometry, ENGINE_MATERIAL);
  dockingPort.position.y = STARSHIP_HEIGHT / 2 + noseHeight * 0.5 + 0.25;
  
  // Add interstage connector at the bottom - this will help fix the gap
  const interstageGeometry = new THREE.CylinderGeometry(
    DIAMETER / 2 * 1.02, // slightly wider at top
    DIAMETER / 2 * 0.98, // slightly narrower at bottom
    1.5, // short height
    48,
    1
  );
  const interstage = new THREE.Mesh(interstageGeometry, STARSHIP_MATERIAL);
  interstage.position.y = -STARSHIP_HEIGHT / 2 - 0.75; // Position below the starship
  
  // Assemble the Starship
  starship.add(body);
  starship.add(nose); // Add the nose cone we created earlier
  starship.add(heatShield);
  starship.add(windowGroup);
  starship.add(forwardFlapLeft);
  starship.add(forwardFlapRight);
  starship.add(aftFlapLeft);
  starship.add(aftFlapRight);
  starship.add(engineGroup);
  starship.add(dockingPort);
  starship.add(interstage); // Add the interstage to fix gap
  
  // Center the model at origin
  starship.position.y = STARSHIP_HEIGHT / 2;
  
  return starship;
}

/**
 * Creates a detailed 3D model of the Super Heavy Booster
 * @returns {THREE.Group} The Super Heavy Booster 3D model
 */
export function createSuperHeavyModel() {
  // Initialize materials if not already done
  if (!SUPER_HEAVY_MATERIAL) {
    initMaterials();
  }
  
  const superHeavy = new THREE.Group();
  
  // Create environment map for reflective materials
  const envMap = createEnvMap();
  SUPER_HEAVY_MATERIAL.envMap = envMap;
  GRID_FIN_MATERIAL.envMap = envMap;
  
  // Main body cylinder with more segments for better detail
  const bodyGeometry = new THREE.CylinderGeometry(
    DIAMETER / 2, // top radius
    DIAMETER / 2 * 1.05, // bottom radius - slightly wider at bottom
    SUPER_HEAVY_HEIGHT, // height
    48, // radial segments - increased for smoother curve
    20, // height segments - increased for better detail
    false // open-ended
  );
  
  // Apply enhanced textures to Super Heavy body
  const bodyMaterial = SUPER_HEAVY_MATERIAL.clone();
  
  // If textures aren't available, create procedural ones
  if (!textures || !textures.superHeavyDiffuse) {
    bodyMaterial.map = createPanelTexture(1024, 2048, 0xE0E0E0, 0xC8C8C8, 24, 48);
  }
  
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  
  // Add interstage connector at the top - this will help fix the gap with Starship
  const interstageGeometry = new THREE.CylinderGeometry(
    DIAMETER / 2 * 0.98, // slightly narrower at top to fit with Starship interstage
    DIAMETER / 2 * 1.02, // slightly wider at bottom
    1.5, // short height
    48,
    1
  );
  const interstage = new THREE.Mesh(interstageGeometry, SUPER_HEAVY_MATERIAL);
  interstage.position.y = SUPER_HEAVY_HEIGHT / 2 + 0.75; // Position at the top
  
  // Grid fins - improved with metallic appearance
  const gridFins = createGridFins();
  gridFins.position.y = SUPER_HEAVY_HEIGHT * 0.4;
  
  // Engines (33 Raptor engines at the base, arranged in concentric rings)
  // Center engine
  const centerEngine = createRaptorEngine(ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  centerEngine.position.y = -SUPER_HEAVY_HEIGHT / 2;
  superHeavy.add(centerEngine);
  
  // Inner ring - 8 engines
  const innerRingRadius = DIAMETER / 2 * 0.4;
  const innerEngineGroup = new THREE.Group();
  createEngineRing(8, innerRingRadius, innerEngineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  innerEngineGroup.position.y = -SUPER_HEAVY_HEIGHT / 2;
  superHeavy.add(innerEngineGroup);
  
  // Middle ring - 16 engines
  const middleRingRadius = DIAMETER / 2 * 0.65;
  const middleEngineGroup = new THREE.Group();
  createEngineRing(16, middleRingRadius, middleEngineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  middleEngineGroup.position.y = -SUPER_HEAVY_HEIGHT / 2;
  superHeavy.add(middleEngineGroup);
  
  // Outer ring - 8 engines (less than real but keeps performance reasonable)
  const outerRingRadius = DIAMETER / 2 * 0.85;
  const outerEngineGroup = new THREE.Group();
  createEngineRing(8, outerRingRadius, outerEngineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  outerEngineGroup.position.y = -SUPER_HEAVY_HEIGHT / 2;
  superHeavy.add(outerEngineGroup);
  
  // Add more surface detail
  const detailsGroup = createBoosterDetails();
  
  // Assemble Super Heavy
  superHeavy.add(body);
  superHeavy.add(interstage);
  superHeavy.add(gridFins);
  superHeavy.add(detailsGroup);
  
  // Add catch points (for Mechazilla)
  const catchPointsGroup = createCatchPoints();
  catchPointsGroup.position.y = SUPER_HEAVY_HEIGHT * 0.3; // Position near the top
  superHeavy.add(catchPointsGroup);
  
  // Center the model at origin
  superHeavy.position.y = SUPER_HEAVY_HEIGHT / 2;
  
  return superHeavy;
}

/**
 * Creates the grid fins for the Super Heavy Booster with enhanced detail
 * @returns {THREE.Group} The grid fins group
 */
function createGridFins() {
  const gridFinGroup = new THREE.Group();
  
  // Create 4 grid fins positioned around the booster
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI / 2); // Evenly space around cylinder
    
    // Create a more detailed grid fin with beveled edges
    const gridFinGeometry = new THREE.BoxGeometry(
      GRID_FIN_WIDTH, 
      0.3, 
      GRID_FIN_HEIGHT,
      8, // More width segments for better detail
      2, // Height segments
      8  // More depth segments for better detail
    );
    
    // Create a custom material for each fin to allow rotation of textures
    const gridFinMaterial = GRID_FIN_MATERIAL.clone();
    
    // If textures are available, use them with proper rotation for each fin
    if (textures && textures.gridFin) {
      gridFinMaterial.map = textures.gridFin.clone();
      gridFinMaterial.normalMap = textures.gridFinNormal.clone();
      
      // Rotate UVs based on fin position
      gridFinMaterial.map.rotation = angle;
      gridFinMaterial.normalMap.rotation = angle;
    }
    
    const gridFin = new THREE.Mesh(gridFinGeometry, gridFinMaterial);
    
    // Position the grid fin on the side of the booster
    gridFin.position.x = Math.cos(angle) * (DIAMETER / 2 + GRID_FIN_WIDTH / 2);
    gridFin.position.z = Math.sin(angle) * (DIAMETER / 2 + GRID_FIN_WIDTH / 2);
    
    // Rotate to face outward
    gridFin.rotation.y = angle + Math.PI / 2;
    
    // Add internal grid structure with enhanced detail
    const gridStructure = createGridStructure(GRID_FIN_WIDTH, GRID_FIN_HEIGHT);
    gridFin.add(gridStructure);
    
    // Add hydraulic actuator (simplified)
    const actuator = createHydraulicActuator();
    actuator.position.y = -0.5;
    actuator.position.x = -GRID_FIN_WIDTH / 4;
    gridFin.add(actuator);
    
    gridFinGroup.add(gridFin);
  }
  
  return gridFinGroup;
}

/**
 * Creates a hydraulic actuator for the grid fins
 * @returns {THREE.Group} The hydraulic actuator
 */
function createHydraulicActuator() {
  const actuatorGroup = new THREE.Group();
  
  // Main cylinder
  const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 12, 1);
  const cylinder = new THREE.Mesh(cylinderGeometry, ENGINE_MATERIAL);
  cylinder.rotation.x = Math.PI / 2;
  actuatorGroup.add(cylinder);
  
  // Piston
  const pistonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8, 1);
  const piston = new THREE.Mesh(pistonGeometry, ENGINE_NOZZLE_MATERIAL);
  piston.position.z = 0.8;
  piston.rotation.x = Math.PI / 2;
  actuatorGroup.add(piston);
  
  return actuatorGroup;
}

/**
 * Creates a simplified grid structure for the grid fins
 * @param {number} width Width of the grid fin
 * @param {number} height Height of the grid fin
 * @returns {THREE.Group} The grid structure
 */
function createGridStructure(width, height) {
  const gridStructure = new THREE.Group();
  const gridMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.7,
    roughness: 0.4,
  });
  
  // Create horizontal and vertical grid lines
  const gridLineThickness = 0.05;
  const gridSpacing = 0.4;
  
  // Horizontal grid lines
  for (let y = -height / 2 + gridSpacing; y < height / 2; y += gridSpacing) {
    const horizontalLine = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.2, gridLineThickness, gridLineThickness),
      gridMaterial
    );
    horizontalLine.position.y = 0;
    horizontalLine.position.z = y;
    gridStructure.add(horizontalLine);
  }
  
  // Vertical grid lines
  for (let x = -width / 2 + gridSpacing; x < width / 2; x += gridSpacing) {
    const verticalLine = new THREE.Mesh(
      new THREE.BoxGeometry(gridLineThickness, gridLineThickness, height - 0.2),
      gridMaterial
    );
    verticalLine.position.x = x;
    verticalLine.position.y = 0;
    gridStructure.add(verticalLine);
  }
  
  return gridStructure;
}

/**
 * Creates the catch points for Mechazilla
 * @returns {THREE.Group} The catch points group
 */
function createCatchPoints() {
  const catchPointsGroup = new THREE.Group();
  const catchPointMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.9,
    roughness: 0.2,
  });
  
  // Create 2 catch points on opposite sides
  for (let i = 0; i < 2; i++) {
    const angle = i * Math.PI; // 0 and 180 degrees
    
    const catchPointGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
    const catchPoint = new THREE.Mesh(catchPointGeometry, catchPointMaterial);
    
    // Position the catch point on the side of the booster
    catchPoint.position.x = Math.cos(angle) * (DIAMETER / 2);
    catchPoint.position.z = Math.sin(angle) * (DIAMETER / 2);
    
    // Rotate to point outward
    catchPoint.rotation.z = Math.PI / 2;
    catchPoint.rotation.y = angle;
    
    catchPointsGroup.add(catchPoint);
  }
  
  return catchPointsGroup;
}

/**
 * Creates a group of Raptor engines
 * @param {number} count Number of engines
 * @param {number} radius Radius of the engine arrangement
 * @returns {THREE.Group} The engine group
 */
function createRaptorEngines(count, radius) {
  const engineGroup = new THREE.Group();
  const engineMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.3,
  });
  const nozzleMaterial = new THREE.MeshStandardMaterial({
    color: 0x777777,
    metalness: 0.9,
    roughness: 0.2,
  });
  
  // For Super Heavy (33 engines), create a specific pattern
  if (count === 33) {
    // Inner ring (3 engines)
    createEngineRing(3, radius * 0.2, engineGroup, engineMaterial, nozzleMaterial);
    
    // Middle ring (10 engines)
    createEngineRing(10, radius * 0.5, engineGroup, engineMaterial, nozzleMaterial);
    
    // Outer ring (20 engines)
    createEngineRing(20, radius * 0.85, engineGroup, engineMaterial, nozzleMaterial);
  } 
  // For Starship (6 engines)
  else if (count === 6) {
    // Outer ring (3 sea-level engines)
    createEngineRing(3, radius * 0.7, engineGroup, engineMaterial, nozzleMaterial);
    
    // Inner ring (3 vacuum-optimized engines with larger nozzles)
    const vacuumEngines = new THREE.Group();
    createEngineRing(3, radius * 0.4, vacuumEngines, engineMaterial, nozzleMaterial, true);
    // Rotate to offset from sea-level engines
    vacuumEngines.rotation.y = Math.PI / 3;
    engineGroup.add(vacuumEngines);
  }
  
  return engineGroup;
}

/**
 * Creates a ring of Raptor engines
 * @param {number} count Number of engines in the ring
 * @param {number} radius Radius of the ring
 * @param {THREE.Group} group Group to add engines to
 * @param {THREE.Material} housingMaterial Material for engine housing
 * @param {THREE.Material} nozzleMaterial Material for engine nozzle
 */
function createEngineRing(count, radius, group, housingMaterial, nozzleMaterial) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    
    const engine = createRaptorEngine(housingMaterial, nozzleMaterial);
    engine.position.set(x, 0, z);
    engine.rotation.x = Math.random() * 0.05; // Slight random offset for realism
    engine.rotation.z = Math.random() * 0.05;
    group.add(engine);
  }
}

/**
 * Creates a set of Raptor engines arranged in a circular pattern
 * @param {number} count Number of engines to create
 * @param {number} radius Radius of the circular pattern
 * @returns {THREE.Group} The engine group
 */
function createRaptorEngineCircle(count, radius) {
  const engineGroup = new THREE.Group();
  
  // If we have a large number of engines, arrange them in concentric rings
  if (count > 20) {
    // Central engine
    const centerEngine = createRaptorEngine();
    engineGroup.add(centerEngine);
    
    // Inner ring - 8 engines
    const innerCount = 8;
    const innerRadius = radius * 0.4;
    createEngineRing(innerCount, innerRadius, engineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
    
    // Middle ring - 8 engines
    const middleCount = 8;
    const middleRadius = radius * 0.7;
    createEngineRing(middleCount, middleRadius, engineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
    
    // Outer ring - remaining engines
    const outerCount = Math.min(count - 1 - innerCount - middleCount, 16); // Cap at 16 for performance
    createEngineRing(outerCount, radius, engineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  } else {
    // For smaller engine counts, just create a single ring
    createEngineRing(count, radius, engineGroup, ENGINE_MATERIAL, ENGINE_NOZZLE_MATERIAL);
  }
  
  return engineGroup;
}

/**
 * Create a single Raptor engine with enhanced detail and texturing
 * @param {THREE.Material} bodyMaterial - Material for the engine body
 * @param {THREE.Material} nozzleMaterial - Material for the engine nozzle
 * @returns {THREE.Group} The engine group
 */
function createRaptorEngine(bodyMaterial = ENGINE_MATERIAL, nozzleMaterial = ENGINE_NOZZLE_MATERIAL) {
  // Initialize materials if not already done
  if (!ENGINE_MATERIAL) {
    initMaterials();
    bodyMaterial = ENGINE_MATERIAL;
    nozzleMaterial = ENGINE_NOZZLE_MATERIAL;
  }
  
  const engine = new THREE.Group();
  engine.name = 'raptorEngine';
  
  // Engine housing - more detailed with segments
  const housingGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 32, 6);
  
  // Apply custom materials with textures if available
  const housingMaterial = bodyMaterial.clone();
  if (textures && textures.engine) {
    housingMaterial.map = textures.engine;
    housingMaterial.normalMap = textures.engineNormal;
  }
  
  const housing = new THREE.Mesh(housingGeometry, housingMaterial);
  
  // Engine nozzle - bell shaped with more detail and improved geometry
  const nozzleGeometry = new THREE.CylinderGeometry(0.5, 1.1, 1.5, 32, 8, true);
  
  // Apply custom curve to nozzle for more realistic bell shape
  const nozzlePositions = nozzleGeometry.attributes.position.array;
  for (let i = 0; i < nozzlePositions.length; i += 3) {
    const vertex = new THREE.Vector3(nozzlePositions[i], nozzlePositions[i+1], nozzlePositions[i+2]);
    
    // Skip vertices at the top of the cylinder
    if (vertex.y < 0) {
      // Calculate normalized height within the nozzle (0 at top, 1 at bottom)
      const normalizedHeight = Math.abs(vertex.y) / 1.5;
      
      // Apply bell curve function
      const bellFactor = Math.pow(normalizedHeight, 1.5) * 0.2;
      const radius = Math.sqrt(vertex.x * vertex.x + vertex.z * vertex.z);
      const angle = Math.atan2(vertex.z, vertex.x);
      
      // Adjust radius based on bell curve
      const newRadius = radius * (1 + bellFactor);
      vertex.x = newRadius * Math.cos(angle);
      vertex.z = newRadius * Math.sin(angle);
    }
    
    nozzlePositions[i] = vertex.x;
    nozzlePositions[i+1] = vertex.y;
    nozzlePositions[i+2] = vertex.z;
  }
  nozzleGeometry.computeVertexNormals();
  
  // Apply custom materials with textures if available
  const nozzleMat = nozzleMaterial.clone();
  if (textures && textures.engineNozzle) {
    nozzleMat.map = textures.engineNozzle;
    nozzleMat.normalMap = textures.engineNozzleNormal;
    nozzleMat.metalnessMap = textures.engineNozzleMetalness;
  }
  
  const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMat);
  nozzle.position.y = -1.5;
  
  // Add cooling tubes around the nozzle with improved detail
  const tubeRadius = 0.05;
  const tubeCount = 16; // Increased tube count
  
  for (let i = 0; i < tubeCount; i++) {
    const angle = (i / tubeCount) * Math.PI * 2;
    const tubeGeometry = new THREE.TorusGeometry(0.8, tubeRadius, 8, 16, Math.PI);
    const tube = new THREE.Mesh(tubeGeometry, housingMaterial);
    
    tube.position.y = -0.8;
    tube.rotation.x = Math.PI / 2;
    tube.rotation.y = angle;
    engine.add(tube);
  }
  
  // Add detailed fuel and oxygen inlets
  const inletCount = 4;
  for (let i = 0; i < inletCount; i++) {
    const angle = (i / inletCount) * Math.PI * 2;
    
    // Main inlet pipe
    const inletGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8, 1);
    const inlet = new THREE.Mesh(inletGeometry, housingMaterial);
    
    // Position and rotate the inlet
    inlet.position.x = Math.cos(angle) * 0.5;
    inlet.position.z = Math.sin(angle) * 0.5;
    inlet.position.y = 0.4;
    inlet.rotation.z = Math.PI / 2;
    inlet.rotation.y = angle;
    
    engine.add(inlet);
  }
  
  // Add gimbal mount at top with more detail
  const gimbalGeometry = new THREE.CylinderGeometry(0.7, 0.6, 0.3, 24, 2);
  const gimbal = new THREE.Mesh(gimbalGeometry, housingMaterial);
  gimbal.position.y = 0.9;
  
  // Inner nozzle glow for active engines with improved visual effect
  const glowGeometry = new THREE.CylinderGeometry(0.3, 0.5, 0.1, 24);
  const glowMaterial = new THREE.MeshStandardMaterial({
    color: 0xff3300,
    emissive: 0xff2200,
    emissiveIntensity: 1.5, // Increased intensity
    transparent: true,
    opacity: 0.9
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  glow.position.y = -2.2;
  
  // Add inner throat detail
  const throatGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 24, 2);
  const throat = new THREE.Mesh(throatGeometry, housingMaterial);
  throat.position.y = -1.2;
  
  engine.add(housing);
  engine.add(nozzle);
  engine.add(gimbal);
  engine.add(glow);
  engine.add(throat);
  
  return engine;
}

/**
 * Creates a detailed 3D model of the Mechazilla tower and catch system
 * @returns {THREE.Group} The Mechazilla 3D model
 */
export function createMechazillaModel() {
  const mechazilla = new THREE.Group();
  
  // Tower height (approximately twice the height of Super Heavy)
  const TOWER_HEIGHT = SUPER_HEAVY_HEIGHT * 2;
  const TOWER_WIDTH = DIAMETER * 1.5;
  
  // Tower base material
  const towerMaterial = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.6,
    roughness: 0.4,
  });
  
  // Main tower structure
  const towerGeometry = new THREE.BoxGeometry(TOWER_WIDTH, TOWER_HEIGHT, TOWER_WIDTH);
  const tower = new THREE.Mesh(towerGeometry, towerMaterial);
  tower.position.y = TOWER_HEIGHT / 2;
  
  // Add tower framework (simplified)
  const framework = createTowerFramework(TOWER_WIDTH, TOWER_HEIGHT);
  
  // Mechazilla arms ("chopsticks")
  const armsMaterial = new THREE.MeshStandardMaterial({
    color: 0x666666,
    metalness: 0.7,
    roughness: 0.3,
  });
  
  const armsGroup = new THREE.Group();
  
  // Left arm
  const leftArmGeometry = new THREE.BoxGeometry(TOWER_WIDTH * 1.2, 2, 1);
  const leftArm = new THREE.Mesh(leftArmGeometry, armsMaterial);
  leftArm.position.set(-TOWER_WIDTH * 0.6, TOWER_HEIGHT * 0.7, 0);
  
  // Right arm
  const rightArmGeometry = new THREE.BoxGeometry(TOWER_WIDTH * 1.2, 2, 1);
  const rightArm = new THREE.Mesh(rightArmGeometry, armsMaterial);
  rightArm.position.set(TOWER_WIDTH * 0.6, TOWER_HEIGHT * 0.7, 0);
  
  // Arm connection mechanisms
  const connectionMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.8,
    roughness: 0.2,
  });
  
  const leftConnection = new THREE.Mesh(
    new THREE.BoxGeometry(3, 5, 3),
    connectionMaterial
  );
  leftConnection.position.set(-TOWER_WIDTH / 2, TOWER_HEIGHT * 0.7, 0);
  
  const rightConnection = new THREE.Mesh(
    new THREE.BoxGeometry(3, 5, 3),
    connectionMaterial
  );
  rightConnection.position.set(TOWER_WIDTH / 2, TOWER_HEIGHT * 0.7, 0);
  
  // Assemble arms
  armsGroup.add(leftArm);
  armsGroup.add(rightArm);
  armsGroup.add(leftConnection);
  armsGroup.add(rightConnection);
  
  // Assemble Mechazilla
  mechazilla.add(tower);
  mechazilla.add(framework);
  mechazilla.add(armsGroup);
  
  return mechazilla;
}

/**
 * Creates a simplified tower framework
 * @param {number} width Width of the tower
 * @param {number} height Height of the tower
 * @returns {THREE.Group} The tower framework
 */
function createTowerFramework(width, height) {
  const framework = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x555555,
    metalness: 0.7,
    roughness: 0.3,
  });
  
  const beamThickness = 0.5;
  const spacing = 10;
  
  // Vertical beams at corners
  for (let x = -1; x <= 1; x += 2) {
    for (let z = -1; z <= 1; z += 2) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(beamThickness, height, beamThickness),
        frameMaterial
      );
      beam.position.set(
        x * (width / 2 - beamThickness),
        height / 2,
        z * (width / 2 - beamThickness)
      );
      framework.add(beam);
    }
  }
  
  // Horizontal cross beams
  for (let y = spacing; y < height; y += spacing) {
    // X-direction beams
    for (let z = -1; z <= 1; z += 2) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(width, beamThickness, beamThickness),
        frameMaterial
      );
      beam.position.set(0, y, z * (width / 2 - beamThickness));
      framework.add(beam);
    }
    
    // Z-direction beams
    for (let x = -1; x <= 1; x += 2) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(beamThickness, beamThickness, width),
        frameMaterial
      );
      beam.position.set(x * (width / 2 - beamThickness), y, 0);
      framework.add(beam);
    }
  }
  
  // Diagonal cross braces (simplified)
  for (let y = spacing; y < height - spacing; y += spacing * 2) {
    for (let face = 0; face < 4; face++) {
      const brace = new THREE.Mesh(
        new THREE.BoxGeometry(beamThickness, spacing * Math.SQRT2, beamThickness),
        frameMaterial
      );
      
      // Position and rotate based on which face
      if (face === 0) {
        brace.position.set(0, y + spacing / 2, width / 2 - beamThickness);
        brace.rotation.z = Math.PI / 4;
      } else if (face === 1) {
        brace.position.set(width / 2 - beamThickness, y + spacing / 2, 0);
        brace.rotation.x = Math.PI / 2;
        brace.rotation.y = Math.PI / 4;
      } else if (face === 2) {
        brace.position.set(0, y + spacing / 2, -width / 2 + beamThickness);
        brace.rotation.z = Math.PI / 4;
      } else {
        brace.position.set(-width / 2 + beamThickness, y + spacing / 2, 0);
        brace.rotation.x = Math.PI / 2;
        brace.rotation.y = Math.PI / 4;
      }
      
      framework.add(brace);
    }
  }
  
  return framework;
}
