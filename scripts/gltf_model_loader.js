// High-fidelity GLTF model loader for SpaceX Starship Simulator
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * High-fidelity Starship model loader with aerospace-grade accuracy
 */
export class StarshipGLTFLoader {
    constructor() {
        // Initialize GLTF loader with Draco compression support
        this.gltfLoader = new GLTFLoader();
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        
        // Starship specifications (real-world accurate)
        this.STARSHIP_SPECS = {
            totalHeight: 120, // meters
            diameter: 9, // meters
            starshipHeight: 50, // meters
            superHeavyHeight: 69, // meters (updated from 71 for accuracy)
            boosterEngineCount: 33, // Raptor engines
            starshipSeaLevelEngines: 3, // RSL engines
            starshipVacuumEngines: 3, // RVac engines
            // Engine specifications
            raptorSLThrust: 1845000, // N (185 tf per engine)
            raptorVacThrust: 2200000, // N (220 tf per engine)
            raptorIspSL: 330, // seconds
            raptorIspVac: 380, // seconds
            // Mass specifications
            starshipDryMass: 120000, // kg
            starshipPropMass: 1200000, // kg methalox
            superHeavyDryMass: 200000, // kg  
            superHeavyPropMass: 3400000, // kg methalox
            // Propellant flow rates
            methaneDensity: 422.8, // kg/m³ at cryogenic temp
            oxygenDensity: 1141, // kg/m³ liquid oxygen
            mixtureRatio: 3.6 // O/F ratio for methalox
        };
        
        // Model URLs
        this.modelUrls = {
            starship: 'https://fetchcfd.com/threeDViewGltf/4329-spacex-starship-3d-model-in-3D#file-1714648056466.glb',
            // Fallback procedural if GLTF fails
            fallbackMode: true
        };
        
        // Loaded models cache
        this.loadedModels = {};
        this.enginePositions = [];
        this.materialCache = {};
    }

    /**
     * Load high-fidelity Starship model
     * @param {Function} onProgress - Progress callback
     * @param {Function} onComplete - Completion callback
     * @param {Function} onError - Error callback
     */
    async loadStarshipModel(onProgress, onComplete, onError) {
        try {
            console.log('Loading high-fidelity Starship GLTF model...');
            
            // Load the GLTF model
            const gltf = await this.loadGLTF(this.modelUrls.starship, onProgress);
            
            if (gltf && gltf.scene) {
                console.log('GLTF model loaded successfully');
                
                // Process and enhance the model
                const starshipModel = await this.processStarshipModel(gltf.scene);
                
                // Cache the model
                this.loadedModels.starship = starshipModel;
                
                if (onComplete) onComplete(starshipModel);
                return starshipModel;
            } else {
                throw new Error('Failed to load GLTF model');
            }
        } catch (error) {
            console.warn('GLTF model loading failed, falling back to procedural model:', error);
            
            // Fallback to enhanced procedural model
            const fallbackModel = await this.createEnhancedProceduralModel();
            this.loadedModels.starship = fallbackModel;
            
            if (onComplete) onComplete(fallbackModel);
            return fallbackModel;
        }
    }

    /**
     * Load GLTF file with proper error handling
     * @param {string} url - Model URL
     * @param {Function} onProgress - Progress callback
     * @returns {Promise} GLTF model promise
     */
    loadGLTF(url, onProgress) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                url,
                (gltf) => resolve(gltf),
                (progress) => {
                    if (onProgress) {
                        const percentComplete = (progress.loaded / progress.total) * 100;
                        onProgress(percentComplete);
                    }
                },
                (error) => reject(error)
            );
        });
    }

    /**
     * Process and enhance the loaded GLTF model
     * @param {THREE.Object3D} scene - GLTF scene
     * @returns {THREE.Group} Enhanced Starship model
     */
    async processStarshipModel(scene) {
        const starshipGroup = new THREE.Group();
        starshipGroup.name = 'HighFidelityStarship';
        
        // Scale to correct dimensions
        const targetHeight = this.STARSHIP_SPECS.totalHeight;
        const currentHeight = this.getBoundingBoxHeight(scene);
        const scale = targetHeight / currentHeight;
        scene.scale.setScalar(scale);
        
        // Separate components
        const { starshipUpper, superHeavyBooster } = this.separateComponents(scene);
        
        // Enhance materials for realism
        this.enhanceMaterials(starshipUpper);
        this.enhanceMaterials(superHeavyBooster);
        
        // Add engine positions and effects
        this.identifyEnginePositions(starshipUpper, superHeavyBooster);
        
        // Add realistic details
        this.addRealisticDetails(starshipUpper, superHeavyBooster);
        
        // Add heat shield tiles to Starship
        this.addHeatShieldTiles(starshipUpper);
        
        // Add grid fins to Super Heavy
        this.addGridFins(superHeavyBooster);
        
        // Position components correctly
        starshipUpper.position.y = this.STARSHIP_SPECS.superHeavyHeight + this.STARSHIP_SPECS.starshipHeight / 2;
        superHeavyBooster.position.y = this.STARSHIP_SPECS.superHeavyHeight / 2;
        
        starshipGroup.add(starshipUpper);
        starshipGroup.add(superHeavyBooster);
        
        return starshipGroup;
    }

    /**
     * Create enhanced procedural model as fallback
     * @returns {THREE.Group} Enhanced procedural Starship
     */
    async createEnhancedProceduralModel() {
        console.log('Creating enhanced procedural Starship model with aerospace-grade accuracy');
        
        const starshipGroup = new THREE.Group();
        starshipGroup.name = 'EnhancedProceduralStarship';
        
        // Create materials with PBR workflow
        const stainlessSteel = this.createStainlessSteelMaterial();
        const carbonFiber = this.createCarbonFiberMaterial();
        const heatShield = this.createHeatShieldMaterial();
        
        // Create Super Heavy with exact specifications
        const superHeavy = this.createSuperHeavyDetailed(stainlessSteel);
        
        // Create Starship upper stage
        const starshipUpper = this.createStarshipDetailed(stainlessSteel, heatShield);
        
        // Position components
        superHeavy.position.y = this.STARSHIP_SPECS.superHeavyHeight / 2;
        starshipUpper.position.y = this.STARSHIP_SPECS.superHeavyHeight + this.STARSHIP_SPECS.starshipHeight / 2;
        
        starshipGroup.add(superHeavy);
        starshipGroup.add(starshipUpper);
        
        return starshipGroup;
    }

    /**
     * Create photorealistic stainless steel material
     * @returns {THREE.MeshPhysicalMaterial} Stainless steel material
     */
    createStainlessSteelMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0xE8E8E8,
            metalness: 0.95,
            roughness: 0.15,
            clearcoat: 0.8,
            clearcoatRoughness: 0.1,
            reflectivity: 0.9,
            envMapIntensity: 1.2,
            // Add normal map for weld lines and panel details
            normalScale: new THREE.Vector2(0.3, 0.3)
        });
    }

    /**
     * Create heat shield material
     * @returns {THREE.MeshPhysicalMaterial} Heat shield material
     */
    createHeatShieldMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0x222222,
            metalness: 0.1,
            roughness: 0.9,
            emissive: 0x000000,
            envMapIntensity: 0.2
        });
    }

    /**
     * Create carbon fiber material
     * @returns {THREE.MeshPhysicalMaterial} Carbon fiber material
     */
    createCarbonFiberMaterial() {
        return new THREE.MeshPhysicalMaterial({
            color: 0x181818,
            metalness: 0.2,
            roughness: 0.4,
            envMapIntensity: 0.8
        });
    }

    /**
     * Create detailed Super Heavy booster
     * @param {THREE.Material} material - Base material
     * @returns {THREE.Group} Super Heavy model
     */
    createSuperHeavyDetailed(material) {
        const superHeavy = new THREE.Group();
        superHeavy.name = 'SuperHeavyBooster';
        
        // Main body with realistic tapering
        const bodyGeometry = new THREE.CylinderGeometry(
            this.STARSHIP_SPECS.diameter / 2, // top radius
            this.STARSHIP_SPECS.diameter / 2 * 1.02, // slightly wider at bottom
            this.STARSHIP_SPECS.superHeavyHeight,
            64, // high detail
            32,
            false
        );
        
        const body = new THREE.Mesh(bodyGeometry, material);
        superHeavy.add(body);
        
        // Add weld lines
        this.addWeldLines(superHeavy, this.STARSHIP_SPECS.superHeavyHeight);
        
        // Add 33 Raptor engines in realistic configuration
        const engines = this.createRaptorEngineCluster(33);
        engines.position.y = -this.STARSHIP_SPECS.superHeavyHeight / 2;
        superHeavy.add(engines);
        
        // Add grid fins
        const gridFins = this.createGridFins();
        gridFins.position.y = this.STARSHIP_SPECS.superHeavyHeight * 0.3;
        superHeavy.add(gridFins);
        
        // Add landing legs
        const landingLegs = this.createLandingLegs();
        landingLegs.position.y = -this.STARSHIP_SPECS.superHeavyHeight * 0.4;
        superHeavy.add(landingLegs);
        
        // Add details like header tanks, pipes, etc.
        this.addSuperHeavyDetails(superHeavy);
        
        return superHeavy;
    }

    /**
     * Create detailed Starship upper stage
     * @param {THREE.Material} steelMaterial - Steel material
     * @param {THREE.Material} heatShieldMaterial - Heat shield material
     * @returns {THREE.Group} Starship model
     */
    createStarshipDetailed(steelMaterial, heatShieldMaterial) {
        const starship = new THREE.Group();
        starship.name = 'StarshipUpperStage';
        
        // Main body
        const bodyGeometry = new THREE.CylinderGeometry(
            this.STARSHIP_SPECS.diameter / 2,
            this.STARSHIP_SPECS.diameter / 2,
            this.STARSHIP_SPECS.starshipHeight,
            64,
            32,
            false
        );
        
        const body = new THREE.Mesh(bodyGeometry, steelMaterial);
        starship.add(body);
        
        // Nose cone with realistic curve
        const noseCone = this.createRealisticNoseCone(steelMaterial);
        noseCone.position.y = this.STARSHIP_SPECS.starshipHeight / 2 + 8;
        starship.add(noseCone);
        
        // Heat shield on windward side
        const heatShield = this.createHeatShield(heatShieldMaterial);
        starship.add(heatShield);
        
        // Flaps (2 forward, 2 aft)
        const flaps = this.createFlaps(steelMaterial);
        starship.add(flaps);
        
        // 6 Raptor engines (3 SL + 3 Vac)
        const engines = this.createStarshipEngines();
        engines.position.y = -this.STARSHIP_SPECS.starshipHeight / 2;
        starship.add(engines);
        
        // Windows
        const windows = this.createWindows();
        starship.add(windows);
        
        // Header tank
        const headerTank = this.createHeaderTank(steelMaterial);
        headerTank.position.y = this.STARSHIP_SPECS.starshipHeight * 0.3;
        starship.add(headerTank);
        
        return starship;
    }

    /**
     * Create realistic Raptor engine cluster
     * @param {number} engineCount - Number of engines
     * @returns {THREE.Group} Engine cluster
     */
    createRaptorEngineCluster(engineCount) {
        const engineGroup = new THREE.Group();
        engineGroup.name = 'RaptorEngineCluster';
        
        if (engineCount === 33) {
            // Super Heavy configuration
            // Center engine
            const centerEngine = this.createRaptorEngine('center');
            engineGroup.add(centerEngine);
            
            // Inner ring (8 engines)
            this.createEngineRing(8, 1.8, engineGroup, 'inner');
            
            // Middle ring (12 engines) 
            this.createEngineRing(12, 3.0, engineGroup, 'middle');
            
            // Outer ring (12 engines)
            this.createEngineRing(12, 4.2, engineGroup, 'outer');
        } else if (engineCount === 6) {
            // Starship configuration
            // Sea level engines (3)
            this.createEngineRing(3, 2.0, engineGroup, 'sea_level');
            
            // Vacuum engines (3) - larger nozzles
            const vacRing = new THREE.Group();
            this.createEngineRing(3, 2.8, vacRing, 'vacuum');
            vacRing.rotation.y = Math.PI / 3; // Offset rotation
            engineGroup.add(vacRing);
        }
        
        return engineGroup;
    }

    /**
     * Create individual Raptor engine with high detail
     * @param {string} type - Engine type (center, inner, middle, outer, sea_level, vacuum)
     * @returns {THREE.Group} Raptor engine
     */
    createRaptorEngine(type) {
        const engine = new THREE.Group();
        engine.name = `RaptorEngine_${type}`;
        
        // Determine engine specifications based on type
        const isVacuum = type === 'vacuum';
        const nozzleLength = isVacuum ? 3.5 : 2.5;
        const nozzleTopRadius = isVacuum ? 0.6 : 0.5;
        const nozzleBottomRadius = isVacuum ? 1.8 : 1.3;
        
        // Engine housing
        const housingGeometry = new THREE.CylinderGeometry(0.8, 0.9, 2.0, 32);
        const housingMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.9,
            roughness: 0.2
        });
        const housing = new THREE.Mesh(housingGeometry, housingMaterial);
        engine.add(housing);
        
        // Engine nozzle with realistic bell curve
        const nozzleGeometry = new THREE.CylinderGeometry(
            nozzleTopRadius, nozzleBottomRadius, nozzleLength, 32, 16, true
        );
        
        // Apply bell curve to nozzle
        this.applyBellCurve(nozzleGeometry, nozzleLength);
        
        const nozzleMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x666666,
            metalness: 0.95,
            roughness: 0.1,
            emissive: 0x220000,
            emissiveIntensity: 0.1
        });
        
        const nozzle = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
        nozzle.position.y = -nozzleLength / 2 - 1;
        engine.add(nozzle);
        
        // Add cooling channels
        this.addCoolingChannels(engine, nozzleBottomRadius);
        
        // Add gimbal mount
        const gimbalGeometry = new THREE.CylinderGeometry(0.7, 0.6, 0.4, 24);
        const gimbal = new THREE.Mesh(gimbalGeometry, housingMaterial);
        gimbal.position.y = 1.2;
        engine.add(gimbal);
        
        // Store engine position for physics
        this.enginePositions.push({
            type: type,
            position: engine.position.clone(),
            thrust: isVacuum ? this.STARSHIP_SPECS.raptorVacThrust : this.STARSHIP_SPECS.raptorSLThrust,
            isp: isVacuum ? this.STARSHIP_SPECS.raptorIspVac : this.STARSHIP_SPECS.raptorIspSL
        });
        
        return engine;
    }

    /**
     * Apply realistic bell curve to engine nozzle
     * @param {THREE.BufferGeometry} geometry - Nozzle geometry
     * @param {number} length - Nozzle length
     */
    applyBellCurve(geometry, length) {
        const positions = geometry.attributes.position.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            const y = positions[i + 1];
            const normalizedY = (y + length/2) / length; // 0 to 1
            
            if (normalizedY > 0) {
                // Apply contour for optimal expansion ratio
                const radius = Math.sqrt(positions[i] * positions[i] + positions[i + 2] * positions[i + 2]);
                const angle = Math.atan2(positions[i + 2], positions[i]);
                
                // Bell curve formula for supersonic nozzle
                const bellFactor = 1 + Math.pow(normalizedY, 1.8) * 0.4;
                const newRadius = radius * bellFactor;
                
                positions[i] = newRadius * Math.cos(angle);
                positions[i + 2] = newRadius * Math.sin(angle);
            }
        }
        
        geometry.computeVertexNormals();
    }

    /**
     * Add cooling channels to engine
     * @param {THREE.Group} engine - Engine group
     * @param {number} radius - Base radius
     */
    addCoolingChannels(engine, radius) {
        const channelCount = 24;
        const channelMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.3
        });
        
        for (let i = 0; i < channelCount; i++) {
            const angle = (i / channelCount) * Math.PI * 2;
            const channelGeometry = new THREE.TorusGeometry(radius * 0.9, 0.03, 4, 8, Math.PI);
            const channel = new THREE.Mesh(channelGeometry, channelMaterial);
            
            channel.position.x = Math.cos(angle) * radius * 0.9;
            channel.position.z = Math.sin(angle) * radius * 0.9;
            channel.position.y = -0.8;
            channel.rotation.x = Math.PI / 2;
            channel.rotation.y = angle;
            
            engine.add(channel);
        }
    }

    /**
     * Create engine ring at specified radius
     * @param {number} count - Number of engines
     * @param {number} radius - Ring radius
     * @param {THREE.Group} group - Parent group
     * @param {string} type - Engine type
     */
    createEngineRing(count, radius, group, type) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const engine = this.createRaptorEngine(type);
            
            engine.position.x = Math.cos(angle) * radius;
            engine.position.z = Math.sin(angle) * radius;
            
            // Small random variations for realism
            engine.rotation.x = (Math.random() - 0.5) * 0.05;
            engine.rotation.z = (Math.random() - 0.5) * 0.05;
            
            group.add(engine);
        }
    }

    /**
     * Get bounding box height of object
     * @param {THREE.Object3D} object - 3D object
     * @returns {number} Height in units
     */
    getBoundingBoxHeight(object) {
        const box = new THREE.Box3().setFromObject(object);
        return box.max.y - box.min.y;
    }

    /**
     * Separate Starship and Super Heavy components
     * @param {THREE.Object3D} scene - GLTF scene
     * @returns {Object} Separated components
     */
    separateComponents(scene) {
        // This would need to be customized based on the actual GLTF model structure
        const starshipUpper = new THREE.Group();
        const superHeavyBooster = new THREE.Group();
        
        // Traverse and separate based on naming conventions or positions
        scene.traverse((child) => {
            if (child.isMesh) {
                if (child.name.includes('starship') || child.position.y > 50) {
                    starshipUpper.add(child.clone());
                } else {
                    superHeavyBooster.add(child.clone());
                }
            }
        });
        
        return { starshipUpper, superHeavyBooster };
    }

    /**
     * Enhance materials for photorealism
     * @param {THREE.Object3D} object - Object to enhance
     */
    enhanceMaterials(object) {
        object.traverse((child) => {
            if (child.isMesh && child.material) {
                // Convert to PBR material
                const material = child.material;
                
                if (material.isMeshBasicMaterial || material.isMeshLambertMaterial) {
                    const pbrMaterial = new THREE.MeshPhysicalMaterial({
                        color: material.color,
                        metalness: 0.9,
                        roughness: 0.2,
                        clearcoat: 0.5,
                        clearcoatRoughness: 0.1
                    });
                    
                    child.material = pbrMaterial;
                }
            }
        });
    }

    // Additional methods for weld lines, grid fins, flaps, etc. would be implemented here
    // ... (continuing with the pattern above)

    /**
     * Get engine positions for physics simulation
     * @returns {Array} Array of engine position data
     */
    getEnginePositions() {
        return this.enginePositions;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.dracoLoader.dispose();
        
        // Dispose of cached materials
        Object.values(this.materialCache).forEach(material => {
            if (material.dispose) material.dispose();
        });
        
        this.materialCache = {};
        this.loadedModels = {};
        this.enginePositions = [];
    }
}