// Aerospace-grade physics engine for SpaceX Starship Simulator
import * as THREE from 'three';

/**
 * High-fidelity aerospace physics engine
 * Implements real-world rocket dynamics, propulsion, and atmospheric effects
 */
export class AerospacePhysicsEngine {
    constructor() {
        // Physical constants
        this.EARTH_GRAVITY = 9.80665; // m/s² (standard gravity)
        this.EARTH_RADIUS = 6371000; // m
        this.EARTH_MASS = 5.972e24; // kg
        this.G = 6.67430e-11; // m³/kg/s² (gravitational constant)
        this.STANDARD_ATMOSPHERE = 101325; // Pa
        this.GAS_CONSTANT_AIR = 287.05; // J/(kg·K)
        
        // Atmospheric model constants
        this.SCALE_HEIGHT = 8400; // m
        this.SEA_LEVEL_DENSITY = 1.225; // kg/m³
        this.SEA_LEVEL_TEMP = 288.15; // K
        this.LAPSE_RATE = 0.0065; // K/m
        
        // Starship specifications (real-world accurate)
        this.vehicleSpecs = {
            starship: {
                dryMass: 120000, // kg
                propellantMass: 1200000, // kg (methalox)
                length: 50, // m
                diameter: 9, // m
                crossSectionalArea: Math.PI * Math.pow(4.5, 2), // m²
                dragCoefficient: 0.82, // during ascent
                reentryDragCoefficient: 1.4, // during reentry
                flaps: {
                    area: 32, // m² (4 flaps total)
                    maxDeflection: 70, // degrees
                    effectiveness: 0.8
                },
                engines: {
                    seaLevel: {
                        count: 3,
                        thrust: 1845000, // N per engine (185 tf)
                        isp: 330, // seconds
                        throttleRange: [0.4, 1.0]
                    },
                    vacuum: {
                        count: 3,
                        thrust: 2200000, // N per engine (220 tf)
                        isp: 380, // seconds
                        throttleRange: [0.4, 1.0]
                    }
                }
            },
            superHeavy: {
                dryMass: 200000, // kg
                propellantMass: 3400000, // kg (methalox)
                length: 69, // m
                diameter: 9, // m
                crossSectionalArea: Math.PI * Math.pow(4.5, 2), // m²
                dragCoefficient: 0.6,
                gridFins: {
                    area: 16, // m² (4 fins total)
                    maxDeflection: 45, // degrees
                    effectiveness: 1.2
                },
                engines: {
                    outer: {
                        count: 20,
                        thrust: 1845000, // N per engine
                        isp: 330, // seconds
                        throttleRange: [0.4, 1.0],
                        gimbaled: true,
                        gimbalRange: 15 // degrees
                    },
                    inner: {
                        count: 13,
                        thrust: 1845000, // N per engine
                        isp: 330, // seconds
                        throttleRange: [0.4, 1.0],
                        gimbaled: false
                    }
                }
            }
        };
        
        // Propellant properties (Methalox)
        this.propellant = {
            methane: {
                density: 422.8, // kg/m³ at cryogenic temp
                heatOfCombustion: 50.0e6 // J/kg
            },
            oxygen: {
                density: 1141, // kg/m³ liquid
                heatOfCombustion: 0 // oxidizer
            },
            mixtureRatio: 3.6, // O/F ratio
            combustionEfficiency: 0.95
        };
        
        // Vehicle state
        this.vehicles = {
            starship: this.initializeVehicle('starship'),
            superHeavy: this.initializeVehicle('superHeavy')
        };
        
        // Mission state
        this.missionTime = 0;
        this.atmosphericConditions = {
            temperature: this.SEA_LEVEL_TEMP,
            pressure: this.STANDARD_ATMOSPHERE,
            density: this.SEA_LEVEL_DENSITY,
            windSpeed: 0,
            windDirection: 0
        };
        
        // Flight phases
        this.flightPhase = 'prelaunch';
        this.separationTimer = null;
        this.landingParams = this.initializeLandingParams();
        
        // Control systems
        this.autopilot = {
            enabled: true,
            targetAltitude: 0,
            targetVelocity: new THREE.Vector3(),
            pidControllers: this.initializePIDControllers()
        };
    }

    /**
     * Initialize vehicle state
     * @param {string} vehicleType - 'starship' or 'superHeavy'
     * @returns {Object} Vehicle state object
     */
    initializeVehicle(vehicleType) {
        const specs = this.vehicleSpecs[vehicleType];
        
        return {
            // Physical state
            position: new THREE.Vector3(0, vehicleType === 'starship' ? 69 + 25 : 34.5, 0),
            velocity: new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            orientation: new THREE.Euler(0, 0, 0), // pitch, yaw, roll
            angularVelocity: new THREE.Vector3(0, 0, 0),
            angularAcceleration: new THREE.Vector3(0, 0, 0),
            
            // Mass properties
            dryMass: specs.dryMass,
            propellantMass: specs.propellantMass,
            currentMass: specs.dryMass + specs.propellantMass,
            centerOfMass: new THREE.Vector3(0, 0, 0),
            momentOfInertia: this.calculateMomentOfInertia(specs),
            
            // Engine state
            engines: this.initializeEngines(specs.engines),
            
            // Aerodynamic state
            angleOfAttack: 0,
            sideslipAngle: 0,
            dynamicPressure: 0,
            
            // Control surfaces
            controlSurfaces: this.initializeControlSurfaces(vehicleType),
            
            // Systems state
            systems: {
                propulsion: true,
                guidance: true,
                telemetry: true,
                thermalProtection: true
            },
            
            // Performance metrics
            maxQ: 0, // maximum dynamic pressure experienced
            maxAcceleration: 0,
            maxHeatingRate: 0,
            
            // Active flags
            active: false,
            engines_lit: false
        };
    }

    /**
     * Initialize engine configuration
     * @param {Object} engineSpecs - Engine specifications
     * @returns {Array} Engine array
     */
    initializeEngines(engineSpecs) {
        const engines = [];
        
        Object.entries(engineSpecs).forEach(([type, specs]) => {
            for (let i = 0; i < specs.count; i++) {
                engines.push({
                    type: type,
                    id: `${type}_${i}`,
                    thrust: specs.thrust,
                    isp: specs.isp,
                    throttle: 0,
                    throttleRange: specs.throttleRange,
                    gimbal: specs.gimbaled ? new THREE.Vector2(0, 0) : null,
                    gimbalRange: specs.gimbalRange || 0,
                    lit: false,
                    startupTime: 0.8, // seconds
                    shutdownTime: 0.4, // seconds
                    restartCapable: type === 'outer' || type === 'seaLevel',
                    fuelFlow: 0, // kg/s
                    oxidFlow: 0, // kg/s
                    chamberPressure: 0, // Pa
                    nozzleExpansionRatio: type === 'vacuum' ? 80 : 40,
                    position: this.calculateEnginePosition(type, i, specs.count),
                    health: 1.0 // 0-1 health factor
                });
            }
        });
        
        return engines;
    }

    /**
     * Calculate engine position based on type and index
     * @param {string} type - Engine type
     * @param {number} index - Engine index
     * @param {number} total - Total engines of this type
     * @returns {THREE.Vector3} Engine position
     */
    calculateEnginePosition(type, index, total) {
        if (type === 'center') {
            return new THREE.Vector3(0, 0, 0);
        }
        
        // Calculate ring position
        let radius;
        switch (type) {
            case 'inner':
                radius = 1.8;
                break;
            case 'outer':
                radius = 3.6;
                break;
            case 'seaLevel':
                radius = 2.2;
                break;
            case 'vacuum':
                radius = 3.0;
                break;
            default:
                radius = 2.5;
        }
        
        const angle = (index / total) * Math.PI * 2;
        return new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        );
    }

    /**
     * Calculate moment of inertia tensor
     * @param {Object} specs - Vehicle specifications
     * @returns {THREE.Matrix3} Inertia tensor
     */
    calculateMomentOfInertia(specs) {
        // Simplified as cylinder with fuel distribution
        const radius = specs.diameter / 2;
        const length = specs.length;
        const mass = specs.dryMass + specs.propellantMass;
        
        // Principal moments of inertia for cylinder
        const Ixx = mass * (3 * radius * radius + length * length) / 12;
        const Iyy = Ixx; // Same for cylinder
        const Izz = mass * radius * radius / 2;
        
        return new THREE.Matrix3().set(
            Ixx, 0, 0,
            0, Iyy, 0,
            0, 0, Izz
        );
    }

    /**
     * Initialize control surfaces
     * @param {string} vehicleType - Vehicle type
     * @returns {Object} Control surfaces configuration
     */
    initializeControlSurfaces(vehicleType) {
        if (vehicleType === 'starship') {
            return {
                flaps: {
                    forward: { left: 0, right: 0 }, // deflection angles in radians
                    aft: { left: 0, right: 0 }
                },
                bodyFlap: 0
            };
        } else {
            return {
                gridFins: {
                    positions: ['top', 'bottom', 'left', 'right'],
                    deflections: [0, 0, 0, 0] // radians
                }
            };
        }
    }

    /**
     * Initialize PID controllers for autopilot
     * @returns {Object} PID controller configuration
     */
    initializePIDControllers() {
        return {
            altitude: { kP: 0.5, kI: 0.1, kD: 0.2, integral: 0, prevError: 0 },
            velocity: { kP: 0.3, kI: 0.05, kD: 0.15, integral: 0, prevError: 0 },
            attitude: { kP: 2.0, kI: 0.2, kD: 0.8, integral: new THREE.Vector3(), prevError: new THREE.Vector3() }
        };
    }

    /**
     * Initialize landing parameters
     * @returns {Object} Landing parameters
     */
    initializeLandingParams() {
        return {
            target: new THREE.Vector3(0, 0, 0),
            phase: 'none',
            approachAltitude: 2000, // m
            hoverAltitude: 50, // m
            touchdownVelocity: 1.5, // m/s
            landingBurnAltitude: 1000, // m
            suicideBurnAltitude: 500 // m
        };
    }

    /**
     * Update physics simulation
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current state
     */
    update(deltaTime) {
        // Cap deltaTime for stability
        const dt = Math.min(deltaTime, 0.02);
        this.missionTime += dt;
        
        // Update atmospheric conditions
        this.updateAtmosphericConditions();
        
        // Update each active vehicle
        for (const [vehicleId, vehicle] of Object.entries(this.vehicles)) {
            if (vehicle.active) {
                this.updateVehiclePhysics(vehicle, dt);
            }
        }
        
        // Update mission phase logic
        this.updateMissionPhase(dt);
        
        return this.getState();
    }

    /**
     * Update atmospheric conditions based on altitude
     */
    updateAtmosphericConditions() {
        // Use the highest vehicle altitude for atmospheric reference
        const maxAltitude = Math.max(
            this.vehicles.starship.position.y,
            this.vehicles.superHeavy.position.y
        );
        
        // Standard atmosphere model
        if (maxAltitude < 11000) {
            // Troposphere
            this.atmosphericConditions.temperature = this.SEA_LEVEL_TEMP - this.LAPSE_RATE * maxAltitude;
            this.atmosphericConditions.pressure = this.STANDARD_ATMOSPHERE * 
                Math.pow(this.atmosphericConditions.temperature / this.SEA_LEVEL_TEMP, 5.2561);
        } else if (maxAltitude < 50000) {
            // Stratosphere (simplified)
            this.atmosphericConditions.temperature = 216.65;
            this.atmosphericConditions.pressure = 22632 * Math.exp(-0.0001577 * (maxAltitude - 11000));
        } else {
            // Upper atmosphere
            this.atmosphericConditions.temperature = Math.max(180, 500 - maxAltitude * 0.008);
            this.atmosphericConditions.pressure = Math.max(0.001, 
                this.STANDARD_ATMOSPHERE * Math.exp(-maxAltitude / this.SCALE_HEIGHT));
        }
        
        // Calculate air density
        this.atmosphericConditions.density = this.atmosphericConditions.pressure / 
            (this.GAS_CONSTANT_AIR * this.atmosphericConditions.temperature);
    }

    /**
     * Update vehicle physics
     * @param {Object} vehicle - Vehicle object
     * @param {number} dt - Time step
     */
    updateVehiclePhysics(vehicle, dt) {
        // Update mass based on propellant consumption
        this.updateMass(vehicle, dt);
        
        // Calculate all forces
        const forces = this.calculateForces(vehicle);
        
        // Calculate all moments
        const moments = this.calculateMoments(vehicle);
        
        // Update linear motion
        vehicle.acceleration.copy(forces).divideScalar(vehicle.currentMass);
        vehicle.velocity.addScaledVector(vehicle.acceleration, dt);
        vehicle.position.addScaledVector(vehicle.velocity, dt);
        
        // Update rotational motion
        const invInertia = vehicle.momentOfInertia.clone().invert();
        vehicle.angularAcceleration.copy(moments).applyMatrix3(invInertia);
        vehicle.angularVelocity.addScaledVector(vehicle.angularAcceleration, dt);
        
        // Update orientation
        vehicle.orientation.x += vehicle.angularVelocity.x * dt;
        vehicle.orientation.y += vehicle.angularVelocity.y * dt;
        vehicle.orientation.z += vehicle.angularVelocity.z * dt;
        
        // Calculate performance metrics
        this.updatePerformanceMetrics(vehicle);
        
        // Ground collision
        if (vehicle.position.y < 0) {
            vehicle.position.y = 0;
            vehicle.velocity.set(0, 0, 0);
            vehicle.angularVelocity.set(0, 0, 0);
        }
    }

    /**
     * Calculate all forces acting on vehicle
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Total force vector
     */
    calculateForces(vehicle) {
        const totalForce = new THREE.Vector3();
        
        // Gravitational force
        const gravity = this.calculateGravity(vehicle.position.y);
        totalForce.add(new THREE.Vector3(0, -gravity * vehicle.currentMass, 0));
        
        // Thrust forces
        const thrust = this.calculateThrust(vehicle);
        totalForce.add(thrust);
        
        // Aerodynamic forces
        const aero = this.calculateAerodynamicForces(vehicle);
        totalForce.add(aero);
        
        return totalForce;
    }

    /**
     * Calculate thrust from all engines
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Thrust vector
     */
    calculateThrust(vehicle) {
        const totalThrust = new THREE.Vector3();
        
        vehicle.engines.forEach(engine => {
            if (engine.lit && engine.throttle > 0) {
                // Calculate effective thrust based on atmospheric pressure
                const atmosphericThrust = this.calculateAtmosphericThrust(engine, vehicle.position.y);
                
                // Thrust direction (accounting for gimbal)
                let thrustDirection = new THREE.Vector3(0, 1, 0); // Default upward
                
                if (engine.gimbal) {
                    // Apply gimbal deflection
                    thrustDirection.x = Math.sin(engine.gimbal.x);
                    thrustDirection.z = Math.sin(engine.gimbal.y);
                    thrustDirection.normalize();
                }
                
                // Apply vehicle orientation
                thrustDirection.applyEuler(vehicle.orientation);
                
                // Scale by throttle and add to total
                const engineThrust = thrustDirection.clone().multiplyScalar(
                    atmosphericThrust * engine.throttle
                );
                
                totalThrust.add(engineThrust);
                
                // Update fuel flow
                this.updateFuelFlow(engine, vehicle.position.y);
            }
        });
        
        return totalThrust;
    }

    /**
     * Calculate atmospheric effects on thrust
     * @param {Object} engine - Engine object
     * @param {number} altitude - Current altitude
     * @returns {number} Effective thrust
     */
    calculateAtmosphericThrust(engine, altitude) {
        const seaLevelPressure = this.STANDARD_ATMOSPHERE;
        const currentPressure = this.atmosphericConditions.pressure;
        
        // Nozzle expansion calculations
        const expansionRatio = engine.nozzleExpansionRatio;
        const exitPressure = currentPressure / expansionRatio;
        
        // Thrust coefficient based on pressure ratio
        const pressureRatio = currentPressure / seaLevelPressure;
        const thrustCoefficient = Math.min(1.1, 1.0 + (1.0 - pressureRatio) * 0.2);
        
        return engine.thrust * thrustCoefficient;
    }

    /**
     * Update fuel flow for engine
     * @param {Object} engine - Engine object
     * @param {number} altitude - Current altitude
     */
    updateFuelFlow(engine, altitude) {
        if (engine.lit && engine.throttle > 0) {
            // Calculate mass flow rate based on thrust and Isp
            const effectiveIsp = this.calculateEffectiveIsp(engine, altitude);
            const massFlowRate = (engine.thrust * engine.throttle) / (effectiveIsp * this.EARTH_GRAVITY);
            
            // Split into fuel and oxidizer based on mixture ratio
            const totalFlow = massFlowRate;
            engine.oxidFlow = totalFlow * (this.propellant.mixtureRatio / (1 + this.propellant.mixtureRatio));
            engine.fuelFlow = totalFlow - engine.oxidFlow;
        } else {
            engine.fuelFlow = 0;
            engine.oxidFlow = 0;
        }
    }

    /**
     * Calculate effective specific impulse
     * @param {Object} engine - Engine object
     * @param {number} altitude - Current altitude
     * @returns {number} Effective Isp in seconds
     */
    calculateEffectiveIsp(engine, altitude) {
        const pressureRatio = this.atmosphericConditions.pressure / this.STANDARD_ATMOSPHERE;
        const vacuumIsp = engine.isp + (engine.type === 'vacuum' ? 50 : 30);
        
        // Linear interpolation between sea level and vacuum Isp
        return engine.isp + (vacuumIsp - engine.isp) * (1 - pressureRatio);
    }

    /**
     * Calculate aerodynamic forces
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Aerodynamic force vector
     */
    calculateAerodynamicForces(vehicle) {
        const aeroForces = new THREE.Vector3();
        
        const airDensity = this.atmosphericConditions.density;
        const velocity = vehicle.velocity.length();
        
        if (velocity < 1 || airDensity < 0.001) return aeroForces;
        
        // Dynamic pressure
        vehicle.dynamicPressure = 0.5 * airDensity * velocity * velocity;
        
        // Determine reference area and drag coefficient
        const specs = this.vehicleSpecs[vehicle === this.vehicles.starship ? 'starship' : 'superHeavy'];
        let dragCoeff = specs.dragCoefficient;
        let referenceArea = specs.crossSectionalArea;
        
        // Adjust drag based on flight phase and attitude
        const velocityDirection = vehicle.velocity.clone().normalize();
        const vehicleUp = new THREE.Vector3(0, 1, 0).applyEuler(vehicle.orientation);
        
        vehicle.angleOfAttack = Math.acos(Math.abs(velocityDirection.dot(vehicleUp)));
        
        // Increase drag at high angles of attack
        dragCoeff *= (1 + Math.pow(Math.sin(vehicle.angleOfAttack), 2) * 2);
        
        // Calculate drag force
        const dragMagnitude = vehicle.dynamicPressure * dragCoeff * referenceArea;
        const dragForce = vehicle.velocity.clone().normalize().multiplyScalar(-dragMagnitude);
        
        aeroForces.add(dragForce);
        
        // Add lift forces for control surfaces
        if (vehicle === this.vehicles.starship) {
            const liftForces = this.calculateLiftForces(vehicle);
            aeroForces.add(liftForces);
        }
        
        return aeroForces;
    }

    /**
     * Calculate lift forces from control surfaces
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Lift force vector
     */
    calculateLiftForces(vehicle) {
        const liftForces = new THREE.Vector3();
        
        // Flap contributions
        const flapArea = this.vehicleSpecs.starship.flaps.area;
        const flapEffectiveness = this.vehicleSpecs.starship.flaps.effectiveness;
        
        // Calculate flap forces based on deflections and dynamic pressure
        Object.values(vehicle.controlSurfaces.flaps).forEach(flapPair => {
            Object.values(flapPair).forEach(deflection => {
                if (Math.abs(deflection) > 0.01) {
                    const flapLift = vehicle.dynamicPressure * flapArea * 
                        Math.sin(deflection) * flapEffectiveness / 4; // Divide by 4 flaps
                    
                    // Apply force perpendicular to velocity
                    const liftDirection = new THREE.Vector3(0, 0, 1)
                        .applyEuler(vehicle.orientation)
                        .cross(vehicle.velocity.clone().normalize())
                        .normalize();
                    
                    liftForces.addScaledVector(liftDirection, flapLift);
                }
            });
        });
        
        return liftForces;
    }

    /**
     * Calculate all moments (torques) acting on vehicle
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Total moment vector
     */
    calculateMoments(vehicle) {
        const totalMoment = new THREE.Vector3();
        
        // Engine gimbal moments
        vehicle.engines.forEach(engine => {
            if (engine.lit && engine.throttle > 0 && engine.gimbal) {
                const thrust = engine.thrust * engine.throttle;
                const leverArm = engine.position.length();
                
                // Moments from gimbal deflection
                const pitchMoment = thrust * Math.sin(engine.gimbal.y) * leverArm;
                const yawMoment = thrust * Math.sin(engine.gimbal.x) * leverArm;
                
                totalMoment.x += pitchMoment;
                totalMoment.y += yawMoment;
            }
        });
        
        // Aerodynamic moments from control surfaces
        if (vehicle === this.vehicles.starship) {
            const aeroMoments = this.calculateAerodynamicMoments(vehicle);
            totalMoment.add(aeroMoments);
        }
        
        // Gyroscopic effects (simplified)
        const gyroMoment = vehicle.angularVelocity.clone()
            .cross(new THREE.Vector3(0, vehicle.momentOfInertia.elements[4], 0))
            .multiplyScalar(-1);
        totalMoment.add(gyroMoment);
        
        return totalMoment;
    }

    /**
     * Calculate aerodynamic moments from control surfaces
     * @param {Object} vehicle - Vehicle object
     * @returns {THREE.Vector3} Aerodynamic moment vector
     */
    calculateAerodynamicMoments(vehicle) {
        const moments = new THREE.Vector3();
        
        // Control surface moments
        const leverArm = this.vehicleSpecs.starship.length / 2;
        const flapArea = this.vehicleSpecs.starship.flaps.area / 4;
        
        // Forward flaps (pitch control)
        const forwardFlapMoment = (vehicle.controlSurfaces.flaps.forward.left - 
                                 vehicle.controlSurfaces.flaps.forward.right) * 
                                vehicle.dynamicPressure * flapArea * leverArm;
        moments.z += forwardFlapMoment;
        
        // Aft flaps (pitch control)
        const aftFlapMoment = (vehicle.controlSurfaces.flaps.aft.left - 
                             vehicle.controlSurfaces.flaps.aft.right) * 
                            vehicle.dynamicPressure * flapArea * leverArm;
        moments.z += aftFlapMoment;
        
        return moments;
    }

    /**
     * Update vehicle mass based on propellant consumption
     * @param {Object} vehicle - Vehicle object
     * @param {number} dt - Time step
     */
    updateMass(vehicle, dt) {
        let totalMassFlow = 0;
        
        vehicle.engines.forEach(engine => {
            if (engine.lit && engine.throttle > 0) {
                totalMassFlow += engine.fuelFlow + engine.oxidFlow;
            }
        });
        
        // Consume propellant
        const massConsumed = totalMassFlow * dt;
        vehicle.propellantMass = Math.max(0, vehicle.propellantMass - massConsumed);
        vehicle.currentMass = vehicle.dryMass + vehicle.propellantMass;
        
        // Update center of mass (simplified)
        const fuelFraction = vehicle.propellantMass / this.vehicleSpecs[
            vehicle === this.vehicles.starship ? 'starship' : 'superHeavy'
        ].propellantMass;
        
        // Fuel drains from bottom up
        vehicle.centerOfMass.y = -vehicle.length * 0.3 * (1 - fuelFraction);
    }

    /**
     * Update performance metrics
     * @param {Object} vehicle - Vehicle object
     */
    updatePerformanceMetrics(vehicle) {
        // Track maximum values
        vehicle.maxQ = Math.max(vehicle.maxQ, vehicle.dynamicPressure);
        vehicle.maxAcceleration = Math.max(vehicle.maxAcceleration, vehicle.acceleration.length());
        
        // Calculate heating rate (simplified)
        const velocity = vehicle.velocity.length();
        const airDensity = this.atmosphericConditions.density;
        const heatingRate = 1.83e-4 * Math.sqrt(airDensity) * Math.pow(velocity, 3);
        vehicle.maxHeatingRate = Math.max(vehicle.maxHeatingRate, heatingRate);
    }

    /**
     * Calculate gravity at altitude
     * @param {number} altitude - Altitude in meters
     * @returns {number} Gravity in m/s²
     */
    calculateGravity(altitude) {
        const distance = this.EARTH_RADIUS + altitude;
        return (this.G * this.EARTH_MASS) / (distance * distance);
    }

    /**
     * Update mission phase logic
     * @param {number} dt - Time step
     */
    updateMissionPhase(dt) {
        // Phase transitions would be implemented here
        // This is a simplified version
        
        if (this.flightPhase === 'launch' && this.vehicles.superHeavy.position.y > 1000) {
            this.flightPhase = 'ascent';
        }
        
        if (this.flightPhase === 'ascent' && this.separationTimer !== null) {
            this.flightPhase = 'separation';
            this.separationTimer -= dt;
            
            if (this.separationTimer <= 0) {
                this.flightPhase = 'post_separation';
            }
        }
    }

    /**
     * Get current simulation state
     * @returns {Object} Current state
     */
    getState() {
        return {
            missionTime: this.missionTime,
            flightPhase: this.flightPhase,
            atmosphere: this.atmosphericConditions,
            vehicles: {
                starship: {
                    position: this.vehicles.starship.position.clone(),
                    velocity: this.vehicles.starship.velocity.clone(),
                    acceleration: this.vehicles.starship.acceleration.clone(),
                    orientation: this.vehicles.starship.orientation.clone(),
                    mass: this.vehicles.starship.currentMass,
                    propellant: this.vehicles.starship.propellantMass,
                    performance: {
                        maxQ: this.vehicles.starship.maxQ,
                        maxAccel: this.vehicles.starship.maxAcceleration,
                        maxHeating: this.vehicles.starship.maxHeatingRate
                    }
                },
                superHeavy: {
                    position: this.vehicles.superHeavy.position.clone(),
                    velocity: this.vehicles.superHeavy.velocity.clone(),
                    acceleration: this.vehicles.superHeavy.acceleration.clone(),
                    orientation: this.vehicles.superHeavy.orientation.clone(),
                    mass: this.vehicles.superHeavy.currentMass,
                    propellant: this.vehicles.superHeavy.propellantMass,
                    performance: {
                        maxQ: this.vehicles.superHeavy.maxQ,
                        maxAccel: this.vehicles.superHeavy.maxAcceleration,
                        maxHeating: this.vehicles.superHeavy.maxHeatingRate
                    }
                }
            }
        };
    }

    /**
     * Engine control methods
     */
    
    /**
     * Start engines
     * @param {string} vehicleId - Vehicle identifier
     * @param {Array} engineIds - Engine IDs to start
     */
    startEngines(vehicleId, engineIds = null) {
        const vehicle = this.vehicles[vehicleId];
        if (!vehicle) return;
        
        const engines = engineIds ? 
            vehicle.engines.filter(e => engineIds.includes(e.id)) : 
            vehicle.engines;
        
        engines.forEach(engine => {
            engine.lit = true;
            engine.throttle = engine.throttleRange[0]; // Minimum throttle
        });
        
        vehicle.engines_lit = true;
    }

    /**
     * Set engine throttle
     * @param {string} vehicleId - Vehicle identifier
     * @param {number} throttle - Throttle value (0-1)
     * @param {Array} engineIds - Specific engines (optional)
     */
    setThrottle(vehicleId, throttle, engineIds = null) {
        const vehicle = this.vehicles[vehicleId];
        if (!vehicle) return;
        
        const engines = engineIds ? 
            vehicle.engines.filter(e => engineIds.includes(e.id)) : 
            vehicle.engines.filter(e => e.lit);
        
        engines.forEach(engine => {
            const minThrottle = engine.throttleRange[0];
            const maxThrottle = engine.throttleRange[1];
            engine.throttle = Math.max(0, Math.min(maxThrottle, 
                throttle > 0 ? Math.max(minThrottle, throttle) : 0));
        });
    }

    /**
     * Set engine gimbal
     * @param {string} vehicleId - Vehicle identifier
     * @param {THREE.Vector2} gimbal - Gimbal angles in radians
     * @param {Array} engineIds - Specific engines (optional)
     */
    setGimbal(vehicleId, gimbal, engineIds = null) {
        const vehicle = this.vehicles[vehicleId];
        if (!vehicle) return;
        
        const engines = engineIds ? 
            vehicle.engines.filter(e => engineIds.includes(e.id)) : 
            vehicle.engines.filter(e => e.gimbal);
        
        engines.forEach(engine => {
            if (engine.gimbal) {
                const maxGimbal = engine.gimbalRange * Math.PI / 180;
                engine.gimbal.x = Math.max(-maxGimbal, Math.min(maxGimbal, gimbal.x));
                engine.gimbal.y = Math.max(-maxGimbal, Math.min(maxGimbal, gimbal.y));
            }
        });
    }

    /**
     * Shutdown engines
     * @param {string} vehicleId - Vehicle identifier
     * @param {Array} engineIds - Engine IDs to shutdown
     */
    shutdownEngines(vehicleId, engineIds = null) {
        const vehicle = this.vehicles[vehicleId];
        if (!vehicle) return;
        
        const engines = engineIds ? 
            vehicle.engines.filter(e => engineIds.includes(e.id)) : 
            vehicle.engines;
        
        engines.forEach(engine => {
            engine.lit = false;
            engine.throttle = 0;
        });
        
        // Check if any engines are still lit
        vehicle.engines_lit = vehicle.engines.some(e => e.lit);
    }

    /**
     * Reset simulation
     */
    reset() {
        this.missionTime = 0;
        this.flightPhase = 'prelaunch';
        this.separationTimer = null;
        
        // Reset vehicles
        this.vehicles.starship = this.initializeVehicle('starship');
        this.vehicles.superHeavy = this.initializeVehicle('superHeavy');
        
        // Reset atmospheric conditions
        this.updateAtmosphericConditions();
    }
}