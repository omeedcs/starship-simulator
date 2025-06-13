// Advanced physics engine for Starship Simulator
import * as THREE from 'three';

/**
 * Enhanced physics engine with realistic dynamics for Starship simulation
 */
export class ImprovedPhysicsEngine {
    constructor() {
        // Gravity constant (Earth gravity is 9.81 m/s²)
        this.gravity = 9.81;
        
        // Flag to indicate if stages are combined or separated
        this.combinedStage = true; // Default to combined stages on launch
        
        // Atmospheric density factors
        this.atmosphericDensity = 1.225; // Earth atmosphere density at sea level
        
        // Vehicle properties
        this.vehicles = {
            starship: {
                mass: 120000, // kg (dry mass)
                fuel: 1200000, // kg
                maxThrust: 7500000, // N (6 Raptor engines)
                dragCoefficient: 0.82,
                crossSectionalArea: Math.PI * 4.5 * 4.5, // m²
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                acceleration: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Euler(0, 0, 0),
                angularVelocity: new THREE.Vector3(0, 0, 0),
                throttle: 0,
                active: false,
                // Aerodynamic properties
                flaps: {
                    deployed: false,
                    effectiveness: 0.0, // 0-1 range, increases with deployment
                    dragContribution: 0.3 // Additional drag when deployed
                },
                landingLegs: {
                    deployed: false,
                    deploymentProgress: 0.0 // 0-1 range
                },
                // Engine control properties
                engineStartupTime: 2.5, // seconds to reach stable thrust
                engineShutdownTime: 1.2, // seconds to shutdown
                gimbalAuthority: 15, // degrees
                gimbalPosition: new THREE.Vector2(0, 0), // x,y normalized -1 to 1
                // Thermal properties
                heatShield: {
                    temperature: 300, // Kelvin
                    maxTemperature: 1800, // Kelvin
                    coolingRate: 4 // K/s in normal conditions
                }
            },
            superHeavy: {
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                acceleration: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Euler(0, 0, 0),
                angularVelocity: new THREE.Vector3(0, 0, 0),
                mass: 200000, // kg (dry mass)
                fuel: 3400000, // kg (propellant)
                maxThrust: 72000000, // N (33 Raptor engines)
                throttle: 0,
                active: false,
                // Aerodynamic properties
                dragCoefficient: 0.8, // Baseline drag coefficient
                crossSectionalArea: 100, // m² (approximate)
                gridFins: {
                    deployed: false,
                    effectiveness: 0.0, // 0-1 range, increases with deployment
                    dragContribution: 0.2, // Additional drag when deployed
                    deploymentRate: 0.2  // How quickly they deploy (0-1 per second)
                },
                landingLegs: {
                    deployed: false,
                    deploymentProgress: 0.0, // 0-1 range
                    deploymentRate: 0.3  // How quickly they deploy (0-1 per second)
                },
                // Engine control properties
                engineStartupTime: 2.0, // seconds to reach stable thrust
                engineShutdownTime: 1.0, // seconds to shutdown
                gimbalAuthority: 10, // degrees
                gimbalPosition: new THREE.Vector2(0, 0), // x,y normalized -1 to 1
                // Thermal properties
                heatShield: {
                    temperature: 300, // Kelvin
                    maxTemperature: 2000, // Kelvin
                    coolingRate: 5 // K/s in normal conditions
                }
            }
        };
        
        // Constants
        this.G = 9.81; // m/s^2
        this.airDensitySeaLevel = 1.225; // kg/m^3
        
        // Launch parameters
        this.launchStartTime = 0;
        this.launchElapsedTime = 0;
        this.launchMaxThrottleTime = 5.0; // seconds to reach max throttle
        
        // Landing parameters
        this.landingTarget = new THREE.Vector3(0, 0, 0);
        this.landingPhase = 'none'; // none, coast, boostback, entry, descent, landing, touchdown
        
        // Detailed landing parameters
        this.landingParams = {
            // Phase altitude triggers
            coastAltitude: 70000,    // m - Start coast phase after stage separation
            boostbackAltitude: 65000, // m - Start boostback burn
            entryAltitude: 40000,    // m - Start entry burn
            descentAltitude: 20000,   // m - Begin controlled descent
            landingAltitude: 3000,    // m - Start landing burn
            hoverAltitude: 50,        // m - Altitude for hover maneuver
            touchdownSpeed: 2.0,      // m/s - Target touchdown velocity
            
            // Burn durations
            boostbackBurnDuration: 20, // seconds
            entryBurnDuration: 15,     // seconds
            
            // Grid fin deployment settings
            gridFinDeployAltitude: 60000, // m - Deploy grid fins
            gridFinStowAltitude: 1000,    // m - Stow grid fins before landing
            
            // Landing leg deployment
            landingLegDeployAltitude: 1000, // m - Deploy landing legs
            
            // Thrust profiles for each phase
            coastThrottle: 0.0,       // No thrust during coast
            boostbackThrottle: 0.6,   // Medium thrust for boostback
            entryThrottle: 0.4,       // Lower thrust for entry burn
            descentThrottle: 0.0,     // No thrust during guided descent
            landingBaseThrottle: 0.3, // Base landing throttle (will be adjusted by PID)
            
            // Timing variables
            phaseStartTime: 0,        // Time when current phase started
            currentPhaseTime: 0       // Elapsed time in current phase
        };
        
        // PID controllers for landing
        this.pidControllers = {
            // Vertical velocity control
            verticalVelocity: {
                kP: 0.2,
                kI: 0.01,
                kD: 0.1,
                setpoint: 0,
                integral: 0,
                previousError: 0,
                output: 0,
                maxOutput: 0.3,
                minOutput: -0.3
            },
            
            // Horizontal position control
            horizontalPosition: {
                kP: 0.1,
                kI: 0.005,
                kD: 0.05,
                setpoint: new THREE.Vector2(0, 0),
                integral: new THREE.Vector2(0, 0),
                previousError: new THREE.Vector2(0, 0),
                output: new THREE.Vector2(0, 0),
                maxOutput: 0.2,
                minOutput: -0.2
            },
            
            // Attitude control
            attitude: {
                kP: 0.5,
                kI: 0.01,
                kD: 0.2,
                setpoint: new THREE.Euler(0, 0, 0),
                integral: new THREE.Vector3(0, 0, 0),
                previousError: new THREE.Vector3(0, 0, 0),
                output: new THREE.Vector3(0, 0, 0),
                maxOutput: 0.1,
                minOutput: -0.1
            }
        };
        
        // Atmospheric model constants
        this.atmosphereScaleHeight = 8500; // meters, scale height of Earth's atmosphere
        this.airDensitySeaLevel = 1.225; // kg/m³, sea level air density
        this.gravity = 9.81; // m/s², Earth gravity
        this.simulationTime = 0; // Track total simulation time
        
        // Wind model
        this.windSpeed = 0;
        this.windDirection = 0;
        this.gustStrength = 0;
        this.turbulenceIntensity = 0;
    }
    
    /**
     * Set the landing target position
     * @param {THREE.Vector3} target - Target landing position
     */
    setLandingTarget(target) {
        this.landingTarget.copy(target);
    }
    
    /**
     * Start the landing sequence for a vehicle
     * @param {string} vehicleId - ID of the vehicle (starship or superHeavy)
     */
    startLandingSequence(vehicleId) {
        const vehicle = this.vehicles[vehicleId];
        if (!vehicle) return;
        
        this.landingPhase = 'approach';
        
        // Reset PID controllers
        if (this.pidControllers) {
            // Reset vertical velocity controller
            if (this.pidControllers.verticalVelocity) {
                this.pidControllers.verticalVelocity.integral = 0;
                this.pidControllers.verticalVelocity.previousError = 0;
                this.pidControllers.verticalVelocity.output = 0;
            }
            
            // Reset horizontal position controller
            if (this.pidControllers.horizontalPosition) {
                this.pidControllers.horizontalPosition.integral.set(0, 0);
                this.pidControllers.horizontalPosition.previousError.set(0, 0);
                this.pidControllers.horizontalPosition.output.set(0, 0);
            }
            
            // Reset attitude controller
            if (this.pidControllers.attitude) {
                this.pidControllers.attitude.integral.set(0, 0, 0);
                this.pidControllers.attitude.previousError.set(0, 0, 0);
                this.pidControllers.attitude.output.set(0, 0, 0);
            }
        }
        
        // Set initial approach parameters
        vehicle.throttle = 0.3;
        
        // Calculate initial rotation to point toward landing target
        const direction = new THREE.Vector3().subVectors(this.landingTarget, vehicle.position).normalize();
        const angle = Math.atan2(direction.x, direction.z);
        vehicle.rotation.y = angle;
        
        return {
            phase: this.landingPhase,
            altitude: vehicle.position.y,
            distance: vehicle.position.distanceTo(this.landingTarget)
        };
    }
    
    /**
     * Update the physics simulation
     * @param {number} deltaTime - Time step in seconds
     * @param {Object} scene - The THREE.js scene for visual updates
     */
    update(deltaTime, scene) {
        // Cap delta time to prevent instability
        const dt = Math.min(deltaTime, 0.1);
        
        // Update wind model
        this.updateWind(dt);
        
        // Update each vehicle
        for (const [id, vehicle] of Object.entries(this.vehicles)) {
            // Skip if vehicle is not active
            if (!vehicle.active) continue;
            
            // Calculate forces
            const forces = this.calculateForces(vehicle, dt);
            
            // Apply landing control if in landing phase
            if (this.landingPhase !== 'none' && id === 'superHeavy') {
                this.updateLandingControl(vehicle, dt);
            }
            
            // Update acceleration (F = ma)
            const totalMass = vehicle.mass + vehicle.fuel;
            vehicle.acceleration.x = forces.x / totalMass;
            vehicle.acceleration.y = forces.y / totalMass;
            vehicle.acceleration.z = forces.z / totalMass;
            
            // Update velocity (v = v0 + a*t)
            vehicle.velocity.x += vehicle.acceleration.x * dt;
            vehicle.velocity.y += vehicle.acceleration.y * dt;
            vehicle.velocity.z += vehicle.acceleration.z * dt;
            
            // Update position (p = p0 + v*t)
            vehicle.position.x += vehicle.velocity.x * dt;
            vehicle.position.y += vehicle.velocity.y * dt;
            vehicle.position.z += vehicle.velocity.z * dt;
            
            // Update rotation based on angular velocity
            vehicle.rotation.x += vehicle.angularVelocity.x * dt;
            vehicle.rotation.y += vehicle.angularVelocity.y * dt;
            vehicle.rotation.z += vehicle.angularVelocity.z * dt;
            
            // Update fuel consumption
            if (vehicle.throttle > 0) {
                // Fuel consumption rate is proportional to throttle
                const fuelRate = vehicle.maxThrust * vehicle.throttle / 3000; // kg/s
                vehicle.fuel = Math.max(0, vehicle.fuel - fuelRate * dt);
            }
            
            // Create quaternion from Euler angles
            vehicle.quaternion = new THREE.Quaternion().setFromEuler(
                new THREE.Euler(vehicle.rotation.x, vehicle.rotation.y, vehicle.rotation.z, 'XYZ')
            );
            
            // Calculate Euler angles for telemetry
            vehicle.eulerAngles = {
                x: vehicle.rotation.x,
                y: vehicle.rotation.y,
                z: vehicle.rotation.z
            };
            
            // Ground collision detection
            if (vehicle.position.y < 0) {
                vehicle.position.y = 0;
                vehicle.velocity.set(0, 0, 0);
                vehicle.acceleration.set(0, 0, 0);
                vehicle.angularVelocity.set(0, 0, 0);
                
                // Set landing phase to touchdown if we were landing
                if (this.landingPhase === 'final') {
                    this.landingPhase = 'touchdown';
                }
            }
        }
        
        return {
            superHeavy: {
                position: this.vehicles.superHeavy.position.clone(),
                rotation: this.vehicles.superHeavy.rotation.clone(),
                velocity: this.vehicles.superHeavy.velocity.length(),
                acceleration: this.vehicles.superHeavy.acceleration.length(),
                throttle: this.vehicles.superHeavy.throttle,
                fuel: this.vehicles.superHeavy.fuel
            },
            starship: {
                position: this.vehicles.starship.position.clone(),
                rotation: this.vehicles.starship.rotation.clone(),
                velocity: this.vehicles.starship.velocity.length(),
                acceleration: this.vehicles.starship.acceleration.length(),
                throttle: this.vehicles.starship.throttle,
                fuel: this.vehicles.starship.fuel
            },
            landingPhase: this.landingPhase
        };
    }
    
    /**
     * Calculate all forces acting on a vehicle
     * @param {Object} vehicle - Vehicle object
     * @param {number} dt - Time step
     * @returns {THREE.Vector3} Net force vector
     */
    calculateForces(vehicle, dt) {
        const forces = new THREE.Vector3(0, 0, 0);
        
        // Gravity force (F = mg)
        const gravityForce = this.gravity * (vehicle.mass + vehicle.fuel);
        forces.y -= gravityForce;
        
        // Thrust force
        if (vehicle.throttle > 0) {
            // Calculate thrust direction based on vehicle orientation and gimbal
            // By default, thrust should point upward (positive y) when the rocket is upright
            
            // Check if gimbalPosition exists, otherwise initialize it
            if (!vehicle.gimbalPosition) {
                vehicle.gimbalPosition = new THREE.Vector2(0, 0);
            }
            
            // For vertical launch, thrust should point straight up (positive Y)
            // Apply vehicle rotation and gimbal for steering
            const thrustDirection = new THREE.Vector3(
                vehicle.gimbalPosition.x * 0.1, // Small gimbal effect on X
                1.0, // Main thrust upward
                vehicle.gimbalPosition.y * 0.1  // Small gimbal effect on Z
            );
            
            // Apply vehicle rotation to thrust direction
            const rotationQuaternion = new THREE.Quaternion().setFromEuler(vehicle.rotation);
            thrustDirection.applyQuaternion(rotationQuaternion).normalize();
            
            // Apply thrust force (F = T * direction)
            const thrustMagnitude = vehicle.maxThrust * vehicle.throttle;
            const thrustForce = thrustDirection.multiplyScalar(thrustMagnitude);
            
            // Removed excessive debug logging for performance
            
            forces.add(thrustForce);
        }
        
        // Aerodynamic drag
        // Calculate atmospheric density at current altitude
        const altitude = vehicle.position.y;
        const densityFactor = Math.exp(-altitude / 11000) * this.atmosphericDensity;
        
        // Calculate drag force magnitude (F = 0.5 * rho * v^2 * Cd * A)
        const velocitySquared = vehicle.velocity.lengthSq();
        if (velocitySquared > 0) {
            const dragMagnitude = 0.5 * densityFactor * velocitySquared * 
                                 vehicle.dragCoefficient * vehicle.crossSectionalArea;
            
            // Drag direction is opposite to velocity
            const dragDirection = vehicle.velocity.clone().normalize().negate();
            forces.add(dragDirection.multiplyScalar(dragMagnitude));
        }
        
        // Grid fin forces (only if deployed and in atmosphere)
        if (vehicle.gridFinDeflection !== 0 && densityFactor > 0.001) {
            // Calculate lift and control forces from grid fins
            const finForce = new THREE.Vector3(
                vehicle.gridFinDeflection * velocitySquared * 0.01 * densityFactor,
                0,
                0
            );
            
            // Apply fin force
            forces.add(finForce);
            
            // Add torque effect (simplified)
            vehicle.angularVelocity.z += vehicle.gridFinDeflection * velocitySquared * 0.0001 * densityFactor * dt;
        }
        
        // Wind forces
        if (this.windSpeed > 0 && densityFactor > 0.001) {
            const windDirection = new THREE.Vector3(
                Math.cos(this.windDirection),
                0,
                Math.sin(this.windDirection)
            );
            
            // Add gust component
            const gustVector = windDirection.clone().multiplyScalar(this.gustStrength);
            
            // Calculate wind force (simplified)
            const windForce = windDirection.multiplyScalar(
                this.windSpeed * densityFactor * vehicle.crossSectionalArea * 0.5
            );
            windForce.add(gustVector);
            
            forces.add(windForce);
        }
        
        return forces;
    }
    
    /**
     * Update the landing control system
     * @param {Object} vehicle - Vehicle object
     * @param {number} dt - Time step
     */
    updateLandingControl(vehicle, dt) {
        // Calculate distance to target
        const horizontalDistance = new THREE.Vector2(
            vehicle.position.x - this.landingTarget.x,
            vehicle.position.z - this.landingTarget.z
        ).length();
        
        // Update landing phase based on altitude
        if (this.landingPhase === 'approach' && vehicle.position.y < this.landingStartAltitude / 2) {
            this.landingPhase = 'final';
        }
        
        // PID control for altitude
        let targetAltitudeRate;
        let targetThrottle;
        
        if (this.landingPhase === 'approach') {
            // During approach, maintain a controlled descent rate based on altitude
            const descentRate = Math.max(-50, -vehicle.position.y / 20);
            targetAltitudeRate = descentRate;
            
            // Aim toward landing target
            const directionToTarget = new THREE.Vector3(
                this.landingTarget.x - vehicle.position.x,
                0,
                this.landingTarget.z - vehicle.position.z
            ).normalize();
            
            // Calculate desired rotation to point toward target
            const targetAngle = Math.atan2(directionToTarget.x, directionToTarget.z);
            const currentAngle = vehicle.rotation.y;
            const angleError = this.normalizeAngle(targetAngle - currentAngle);
            
            // Make sure attitude PID controller exists
            if (!this.pidControllers || !this.pidControllers.attitude) {
                if (!this.pidControllers) {
                    this.pidControllers = {};
                }
                this.pidControllers.attitude = {
                    kP: 0.5, kI: 0.01, kD: 0.2,
                    setpoint: new THREE.Euler(0, 0, 0),
                    integral: new THREE.Vector3(0, 0, 0),
                    previousError: new THREE.Vector3(0, 0, 0),
                    output: new THREE.Vector3(0, 0, 0),
                    maxOutput: 0.1, minOutput: -0.1
                };
            }
            
            // Apply rotation correction using PID
            const attitudeOutput = this.updatePID(this.pidControllers.attitude, new THREE.Vector3(0, angleError, 0), dt);
            vehicle.angularVelocity.y = attitudeOutput.y;
            
            // Use grid fins for additional control
            // Ensure horizontalPosition controller exists
            if (!this.pidControllers || !this.pidControllers.horizontalPosition) {
                if (!this.pidControllers) {
                    this.pidControllers = {};
                }
                this.pidControllers.horizontalPosition = {
                    kP: 0.1, kI: 0.005, kD: 0.05,
                    setpoint: new THREE.Vector2(0, 0),
                    integral: new THREE.Vector2(0, 0),
                    previousError: new THREE.Vector2(0, 0),
                    output: new THREE.Vector2(0, 0),
                    maxOutput: 0.2, minOutput: -0.2
                };
            }
            
            const horizontalOutput = this.updatePID(this.pidControllers.horizontalPosition, 
                                                 new THREE.Vector2(horizontalDistance, 0), dt);
            vehicle.gridFinDeflection = horizontalOutput.x * 0.1;
        } 
        else if (this.landingPhase === 'final') {
            // Final approach - slow descent and precise positioning
            
            // Target hover at specified altitude, then descend slowly
            const hoverError = vehicle.position.y - this.hoverAltitude;
            if (hoverError > 0) {
                // Still descending to hover altitude
                targetAltitudeRate = -Math.min(20, hoverError / 2);
            } else {
                // At or below hover altitude, descend very slowly
                targetAltitudeRate = -this.touchdownSpeed;
            }
            
            // Horizontal position control - aim directly at target
            const horizontalError = new THREE.Vector2(
                this.landingTarget.x - vehicle.position.x,
                this.landingTarget.z - vehicle.position.z
            );
            
            // Apply horizontal correction using engine gimbal
            // Check if gimbalPosition exists, otherwise initialize it
            if (!vehicle.gimbalPosition) {
                vehicle.gimbalPosition = new THREE.Vector2(0, 0);
            }
            
            // Use pidControllers for horizontal position control
            if (!this.pidControllers || !this.pidControllers.horizontalPosition) {
                // Initialize if missing (should be created in constructor/reset, but this is a fallback)
                if (!this.pidControllers) {
                    this.pidControllers = {};
                }
                this.pidControllers.horizontalPosition = {
                    kP: 0.1, kI: 0.005, kD: 0.05,
                    setpoint: new THREE.Vector2(0, 0),
                    integral: new THREE.Vector2(0, 0),
                    previousError: new THREE.Vector2(0, 0),
                    output: new THREE.Vector2(0, 0),
                    maxOutput: 0.2, minOutput: -0.2
                };
            }
            
            // Set the horizontal position error for PID control
            const error = new THREE.Vector2(horizontalError.x, horizontalError.y);
            const output = this.updatePID(this.pidControllers.horizontalPosition, error, dt);
            
            // Apply to gimbal with scaling factor
            vehicle.gimbalPosition.x = output.x * 0.05;
            vehicle.gimbalPosition.y = output.y * 0.05;
            
            // Keep vehicle vertical during final descent
            const attitudeError = -vehicle.rotation.z;
            
            // Make sure attitude PID controller exists
            if (!this.pidControllers || !this.pidControllers.attitude) {
                if (!this.pidControllers) {
                    this.pidControllers = {};
                }
                this.pidControllers.attitude = {
                    kP: 0.5, kI: 0.01, kD: 0.2,
                    setpoint: new THREE.Euler(0, 0, 0),
                    integral: new THREE.Vector3(0, 0, 0),
                    previousError: new THREE.Vector3(0, 0, 0),
                    output: new THREE.Vector3(0, 0, 0),
                    maxOutput: 0.1, minOutput: -0.1
                };
            }
            
            // Apply PID control for attitude
            const attitudeOutput = this.updatePID(this.pidControllers.attitude, new THREE.Vector3(0, 0, attitudeError), dt);
            vehicle.angularVelocity.z = attitudeOutput.z;
        }
        
        // Altitude rate control
        const currentAltitudeRate = vehicle.velocity.y;
        const altitudeRateError = targetAltitudeRate - currentAltitudeRate;
        
        // Initialize vertical velocity PID controller if needed
        if (!this.pidControllers || !this.pidControllers.verticalVelocity) {
            if (!this.pidControllers) {
                this.pidControllers = {};
            }
            this.pidControllers.verticalVelocity = {
                kP: 0.2, kI: 0.01, kD: 0.1,
                setpoint: 0,
                integral: 0, previousError: 0, output: 0,
                maxOutput: 0.3, minOutput: -0.3
            };
        }
        
        // Calculate throttle using PID controller
        const throttleOutput = this.updatePID(this.pidControllers.verticalVelocity, altitudeRateError, dt);
        const throttleAdjustment = throttleOutput;
        
        // Apply throttle with limits
        targetThrottle = 0.5 + throttleAdjustment;
        vehicle.throttle = Math.max(0.1, Math.min(1.0, targetThrottle));
        
        return {
            phase: this.landingPhase,
            throttle: vehicle.throttle,
            altitude: vehicle.position.y,
            distance: horizontalDistance
        };
    }
    
    /**
     * Calculate air density at a given altitude
     * @param {number} altitude - Altitude in meters
     * @returns {number} Air density in kg/m³
     */
    calculateAirDensity(altitude) {
        // Exponential atmospheric model based on scale height
        return this.airDensitySeaLevel * Math.exp(-altitude / this.atmosphereScaleHeight);
    }
    
    /**
     * Calculate atmospheric temperature at a given altitude
     * @param {number} altitude - Altitude in meters
     * @returns {number} Temperature in Kelvin
     */
    calculateAtmosphericTemperature(altitude) {
        // Simple atmospheric temperature model
        const seaLevelTemp = 288.15; // K (15°C)
        const lapseRate = 0.0065; // K/m, standard temperature lapse rate
        
        // Temperature decreases with altitude in troposphere (up to ~11km)
        if (altitude < 11000) {
            return seaLevelTemp - (lapseRate * altitude);
        } else if (altitude < 20000) {
            // Approximately constant in lower stratosphere
            return 216.65;
        } else if (altitude < 50000) {
            // Increases slightly in upper stratosphere
            return 216.65 + 0.001 * (altitude - 20000);
        } else {
            // Decreases in mesosphere
            return 270.65 - 0.0025 * (altitude - 50000);
        }
    }
    
    /**
     * Calculate aerodynamic drag force
     * @param {Object} vehicle - Vehicle to calculate drag for
     * @param {number} altitude - Current altitude in meters
     * @returns {THREE.Vector3} Drag force vector in Newtons
     */
    calculateDrag(vehicle, altitude) {
        // Get velocity magnitude
        const velocityMagnitude = vehicle.velocity.length();
        if (velocityMagnitude < 0.01) return new THREE.Vector3(0, 0, 0);
        
        // Calculate air density at current altitude
        const airDensity = this.calculateAirDensity(altitude);
        
        // Calculate base drag coefficient
        let dragCoefficient = vehicle.dragCoefficient;
        
        // Add contribution from grid fins if deployed (for superHeavy)
        if (vehicle === this.vehicles.superHeavy && vehicle.gridFins && vehicle.gridFins.deployed) {
            dragCoefficient += vehicle.gridFins.dragContribution * vehicle.gridFins.effectiveness;
        }
        // Add contribution from flaps if deployed (for starship)
        else if (vehicle === this.vehicles.starship && vehicle.flaps && vehicle.flaps.deployed) {
            dragCoefficient += vehicle.flaps.dragContribution * vehicle.flaps.effectiveness;
        }
        
        // Calculate drag force magnitude
        // F_drag = 0.5 * ρ * v² * Cd * A
        const dragForceMagnitude = 0.5 * airDensity * velocityMagnitude * velocityMagnitude * 
                                dragCoefficient * vehicle.crossSectionalArea;
        
        // Drag force is opposite to velocity direction
        const dragForce = vehicle.velocity.clone().normalize().multiplyScalar(-dragForceMagnitude);
        
        return dragForce;
    }
    
    /**
     * Calculate heating rate during atmospheric entry
     * @param {Object} vehicle - Vehicle to calculate heating for
     * @param {number} altitude - Current altitude in meters
     * @returns {number} Heating rate in Kelvin/second
     */
    calculateHeatingRate(vehicle, altitude) {
        const velocityMagnitude = vehicle.velocity.length();
        const airDensity = this.calculateAirDensity(altitude);
        
        // Simple heating model based on velocity³ and √airDensity
        const heatingRate = 1e-10 * Math.pow(velocityMagnitude, 3) * Math.sqrt(airDensity);
        
        return heatingRate;
    }
    
    /**
     * Update vehicle thermal state
     * @param {Object} vehicle - Vehicle to update
     * @param {number} altitude - Current altitude
     * @param {number} deltaTime - Time step in seconds
     */
    updateThermalState(vehicle, altitude, deltaTime) {
        if (!vehicle.heatShield) return; // Skip if vehicle doesn't have a heat shield
        
        // Calculate heating rate
        const heatingRate = this.calculateHeatingRate(vehicle, altitude);
        
        // Update vehicle heat shield temperature
        vehicle.heatShield.temperature += heatingRate * deltaTime;
        
        // Apply cooling based on altitude (cooling is more effective at lower altitudes)
        const coolingFactor = 1.0 - Math.min(1.0, (altitude / 100000));
        const cooling = vehicle.heatShield.coolingRate * coolingFactor * deltaTime;
        
        // Temperature can't go below ambient
        const ambientTemp = this.calculateAtmosphericTemperature(altitude);
        vehicle.heatShield.temperature = Math.max(
            ambientTemp,
            vehicle.heatShield.temperature - cooling
        );
        
        // Check for overheating (could add consequences later)
        if (vehicle.heatShield.temperature > vehicle.heatShield.maxTemperature) {
            console.warn('Vehicle heat shield temperature exceeding maximum!');
        }
    }
    
    /**
     * Update PID controller
     * @param {Object} controller - PID controller object
     * @param {number|THREE.Vector2|THREE.Vector3|THREE.Euler} currentValue - Current measured value
     * @param {number} deltaTime - Time step in seconds
     * @returns {number|THREE.Vector2|THREE.Vector3} Control output
     */
    updatePID(controller, currentValue, deltaTime) {
        // For Vector2 types (horizontal position)
        if (currentValue instanceof THREE.Vector2) {
            // Calculate error
            const error = new THREE.Vector2();
            error.subVectors(controller.setpoint, currentValue);
            
            // Calculate derivative
            const derivative = new THREE.Vector2();
            derivative.subVectors(error, controller.previousError);
            derivative.divideScalar(deltaTime);
            
            // Update integral
            controller.integral.add(error.clone().multiplyScalar(deltaTime));
            
            // Limit integral to prevent windup
            if (controller.integral.length() > controller.maxOutput) {
                controller.integral.normalize().multiplyScalar(controller.maxOutput);
            }
            
            // Calculate output
            controller.output = new THREE.Vector2();
            controller.output.add(error.clone().multiplyScalar(controller.kP)); // P term
            controller.output.add(controller.integral.clone().multiplyScalar(controller.kI)); // I term
            controller.output.add(derivative.clone().multiplyScalar(controller.kD)); // D term
            
            // Clamp output magnitude
            if (controller.output.length() > controller.maxOutput) {
                controller.output.normalize().multiplyScalar(controller.maxOutput);
            }
            
            // Save error for next update
            controller.previousError.copy(error);
            
            return controller.output;
        }
        // For Vector3 types (attitude control)
        else if (currentValue instanceof THREE.Vector3 || currentValue instanceof THREE.Euler) {
            // Convert Euler to Vector3 if needed
            const currentVector = currentValue instanceof THREE.Euler ? 
                new THREE.Vector3(currentValue.x, currentValue.y, currentValue.z) : currentValue;
            
            // Calculate error (for Euler we want to minimize difference)
            const targetVector = controller.setpoint instanceof THREE.Euler ?
                new THREE.Vector3(controller.setpoint.x, controller.setpoint.y, controller.setpoint.z) :
                controller.setpoint;
            
            const error = new THREE.Vector3();
            error.subVectors(targetVector, currentVector);
            
            // Calculate derivative
            const derivative = new THREE.Vector3();
            derivative.subVectors(error, controller.previousError);
            derivative.divideScalar(deltaTime);
            
            // Update integral
            controller.integral.add(error.clone().multiplyScalar(deltaTime));
            
            // Limit integral to prevent windup
            if (controller.integral.length() > controller.maxOutput) {
                controller.integral.normalize().multiplyScalar(controller.maxOutput);
            }
            
            // Calculate output
            controller.output = new THREE.Vector3();
            controller.output.add(error.clone().multiplyScalar(controller.kP)); // P term
            controller.output.add(controller.integral.clone().multiplyScalar(controller.kI)); // I term
            controller.output.add(derivative.clone().multiplyScalar(controller.kD)); // D term
            
            // Clamp output magnitude
            if (controller.output.length() > controller.maxOutput) {
                controller.output.normalize().multiplyScalar(controller.maxOutput);
            }
            
            // Save error for next update
            controller.previousError.copy(error);
            
            return controller.output;
        }
        // For scalar values (vertical velocity)
        else {
            // Calculate error
            const error = controller.setpoint - currentValue;
            
            // Calculate derivative
            const derivative = (error - controller.previousError) / deltaTime;
            
            // Update integral
            controller.integral += error * deltaTime;
            
            // Limit integral to prevent windup
            controller.integral = Math.max(controller.minOutput, Math.min(controller.maxOutput, controller.integral));
            
            // Calculate output
            controller.output = (controller.kP * error) + 
                              (controller.kI * controller.integral) + 
                              (controller.kD * derivative);
            
            // Clamp output
            controller.output = Math.max(controller.minOutput, Math.min(controller.maxOutput, controller.output));
            
            // Save error for next update
            controller.previousError = error;
            
            return controller.output;
        }
    }
    
    /**
     * Update the wind model
     * @param {number} deltaTime - Time step in seconds
     */
    updateWind(deltaTime) {
        // Simple wind model with gusts
        // Wind direction varies slowly
        this.windDirection += (Math.random() - 0.5) * 0.01;
        
        // Wind speed varies with gusts
        const gustProbability = 0.01; // Probability of a gust each update
        if (Math.random() < gustProbability) {
            this.gustStrength = Math.random() * 5.0; // Gust strength 0-5 m/s
        } else {
            this.gustStrength *= 0.95; // Gust dissipation
        }
        this.turbulenceIntensity = Math.random() * this.windSpeed * 0.1;
    }
    
    /**
     * PID controller implementation
     * @param {Object} controller - PID controller parameters
     * @param {number} error - Current error
     * @param {number} dt - Time step
     * @returns {number} Control output
     */
    pidControl(controller, error, dt) {
        // Proportional term
        const p = controller.kP * error;
        
        // Integral term
        controller.integral += error * dt;
        const i = controller.kI * controller.integral;
        
        // Derivative term
        const errorRate = (error - controller.lastError) / dt;
        const d = controller.kD * errorRate;
        
        // Update last error
        controller.lastError = error;
        
        // Return combined control output
        return p + i + d;
    }
    
    /**
     * Normalize an angle to the range [-PI, PI]
     * @param {number} angle - Angle in radians
     * @returns {number} Normalized angle
     */
    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
    
    /**
     * Linear interpolation helper function
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp(a, b, t) {
        return a + (b - a) * Math.max(0, Math.min(1, t));
    }
    
    /**
     * Update physics for launch phase
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state
     */
    updateLaunch(deltaTime) {
        // Set Super Heavy to active and ensure correct initialization
        this.vehicles.superHeavy.active = true;
        this.vehicles.superHeavy.throttle = 1.0; // Full throttle for launch
        
        // Ensure rotation is properly set for vertical launch
        this.vehicles.superHeavy.rotation.set(0, 0, 0);
        
        // Create quaternion from updated Euler angles
        this.vehicles.superHeavy.quaternion = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, 0, 'XYZ')
        );
        
        // Run general update
        this.update(deltaTime);
        
        // Return current state for the main simulation
        return {
            position: this.vehicles.superHeavy.position.clone(),
            velocity: this.vehicles.superHeavy.velocity.clone(),
            acceleration: this.vehicles.superHeavy.acceleration.clone(),
            quaternion: this.vehicles.superHeavy.quaternion,
            eulerAngles: this.vehicles.superHeavy.eulerAngles,
            thrust: this.vehicles.superHeavy.throttle * this.vehicles.superHeavy.maxThrust,
            fuel: this.vehicles.superHeavy.fuel
        };
    }
    
    /**
     * Update physics for ascent phase
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state
     */
    updateAscent(deltaTime) {
        // Continue with ascent physics
        this.vehicles.superHeavy.throttle = 0.9; // Slightly reduced throttle after initial launch
        
        // Run general update
        this.update(deltaTime);
        
        // Apply slight pitch maneuver for gravity turn
        if (this.vehicles.superHeavy.position.y > 500) {
            // Gradually pitch over based on altitude
            const pitchAngle = Math.min(0.2, (this.vehicles.superHeavy.position.y - 500) / 10000);
            this.vehicles.superHeavy.rotation.z = pitchAngle;
        }
        
        // Return current state for the main simulation
        return {
            position: this.vehicles.superHeavy.position.clone(),
            velocity: this.vehicles.superHeavy.velocity.clone(),
            acceleration: this.vehicles.superHeavy.acceleration.clone(),
            quaternion: this.vehicles.superHeavy.quaternion,
            eulerAngles: this.vehicles.superHeavy.eulerAngles,
            thrust: this.vehicles.superHeavy.throttle * this.vehicles.superHeavy.maxThrust,
            fuel: this.vehicles.superHeavy.fuel
        };
    }

    /**
     * Update physics for stage separation phase
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state for both vehicles
     */
    updateStageSeparation(deltaTime) {
        // Make sure both vehicles exist
        if (!this.vehicles.superHeavy || !this.vehicles.starship) {
            console.error('Cannot perform stage separation - vehicles not properly initialized');
            return {
                separationComplete: true,
                error: true
            };
        }
        
        // Initialize separation if not already started
        if (!this.separationTimer) {
            console.log('Stage separation initiated - setting up clean separation');
            
            // Set combined stage to false to indicate separation
            this.combinedStage = false;
            
            // Get current Super Heavy state
            const currentPosition = this.vehicles.superHeavy.position.clone();
            const currentVelocity = this.vehicles.superHeavy.velocity.clone();
            const currentRotation = this.vehicles.superHeavy.rotation.clone();
            
            // Position Starship exactly on top of Super Heavy
            this.vehicles.starship.position.copy(currentPosition);
            this.vehicles.starship.position.y += 60; // Proper stacked height
            
            // Both vehicles start with same velocity and rotation
            this.vehicles.starship.velocity.copy(currentVelocity);
            this.vehicles.starship.rotation.copy(currentRotation);
            
            // Set separation timer
            this.separationTimer = 3.0;
            
            // Initial separation impulses
            this.vehicles.superHeavy.velocity.y -= 2.0; // Booster slows down
            this.vehicles.starship.velocity.y += 3.0;   // Starship speeds up
            
            // Set throttle states for separation
            this.vehicles.superHeavy.throttle = 0.0; // Booster engines off initially
            this.vehicles.starship.throttle = 0.9;   // Starship engines on
            
            console.log('Separation initialized:', {
                boosterPos: this.vehicles.superHeavy.position.y,
                starshipPos: this.vehicles.starship.position.y,
                boosterVel: this.vehicles.superHeavy.velocity.y,
                starshipVel: this.vehicles.starship.velocity.y
            });
        }

        // Update separation timer
        this.separationTimer -= deltaTime;
        const separationComplete = this.separationTimer <= 0;

        // Update physics for both vehicles
        this.updateVehiclePhysics(this.vehicles.superHeavy, deltaTime, this.vehicles.superHeavy.throttle > 0);
        this.updateVehiclePhysics(this.vehicles.starship, deltaTime, this.vehicles.starship.throttle > 0);
        
        // Continue separation forces
        if (!separationComplete) {
            // Gradual force diminishing over time
            const forceStrength = this.separationTimer / 3.0;
            this.vehicles.superHeavy.acceleration.y -= forceStrength * 0.5;
            this.vehicles.starship.acceleration.y += forceStrength * 0.8;
        }
        
        // Complete separation setup
        if (separationComplete && !this.separationCompleted) {
            console.log('Stage separation complete - setting up post-separation phases');
            this.separationCompleted = true;
            
            // Starship continues ascent
            this.vehicles.starship.throttle = 1.0;
            this.vehicles.starship.active = true;
            
            // Super Heavy begins return trajectory
            this.vehicles.superHeavy.throttle = 0.0; // Coast first
            this.vehicles.superHeavy.active = true;
            
            // Initialize booster return to Mechazilla
            this.initializeBoosterReturn();
        }
        
        // Return comprehensive state
        return {
            boosterPosition: this.vehicles.superHeavy.position.clone(),
            boosterQuaternion: new THREE.Quaternion().setFromEuler(this.vehicles.superHeavy.rotation),
            boosterVelocity: this.vehicles.superHeavy.velocity.clone(),
            boosterEulerAngles: {
                x: this.vehicles.superHeavy.rotation.x,
                y: this.vehicles.superHeavy.rotation.y,
                z: this.vehicles.superHeavy.rotation.z
            },
            boosterAcceleration: this.vehicles.superHeavy.acceleration.clone(),
            boosterThrottle: this.vehicles.superHeavy.throttle,
            
            starshipPosition: this.vehicles.starship.position.clone(),
            starshipQuaternion: new THREE.Quaternion().setFromEuler(this.vehicles.starship.rotation),
            starshipVelocity: this.vehicles.starship.velocity.clone(),
            starshipEulerAngles: {
                x: this.vehicles.starship.rotation.x,
                y: this.vehicles.starship.rotation.y,
                z: this.vehicles.starship.rotation.z
            },
            starshipAcceleration: this.vehicles.starship.acceleration.clone(),
            starshipThrottle: this.vehicles.starship.throttle,
            
            separationComplete: separationComplete,
            separationTime: this.separationTimer,
            combinedStage: this.combinedStage
        };
    }

    /**
     * Initialize booster return trajectory to Mechazilla
     */
    initializeBoosterReturn() {
        console.log('Initializing booster return to Mechazilla');
        
        // Set Mechazilla position as landing target
        this.landingTarget = new THREE.Vector3(-120, 0, 0); // Mechazilla position
        this.landingPhase = 'return'; // Start return phase
        
        // Initialize return trajectory parameters
        this.returnParams = {
            startTime: this.simulationTime,
            coastDuration: 10.0, // seconds of ballistic coast
            turnDuration: 5.0,   // seconds to flip around
            burnDuration: 15.0,  // seconds of return burn
            phase: 'coast'       // coast, flip, burn, approach
        };
        
        console.log('Booster return initialized with target:', this.landingTarget);
    }

    /**
     * Update physics for booster return phase
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state for the booster
     */
    updateBoosterReturn(deltaTime) {
        const vehicle = this.vehicles.superHeavy;
        
        // Update simulation time for trajectory tracking
        this.simulationTime += deltaTime;
        
        // If return parameters are set, execute trajectory guidance
        if (this.returnParams && this.returnParams.phase) {
            const timeInPhase = this.simulationTime - this.returnParams.startTime;
            
            switch (this.returnParams.phase) {
                case 'coast':
                    // Ballistic coast phase - engines off, minimal attitude control
                    vehicle.throttle = 0.0;
                    
                    // Check if coast duration is complete
                    if (timeInPhase >= this.returnParams.coastDuration) {
                        console.log('Booster coast phase complete, starting flip maneuver');
                        this.returnParams.phase = 'flip';
                        this.returnParams.startTime = this.simulationTime;
                    }
                    break;
                    
                case 'flip':
                    // Flip maneuver to point engines toward Mechazilla
                    vehicle.throttle = 0.2; // Light thrust for attitude control
                    
                    // Calculate direction to Mechazilla
                    const directionToTarget = new THREE.Vector3();
                    directionToTarget.subVectors(this.landingTarget, vehicle.position).normalize();
                    
                    // Calculate target rotation (engines pointing toward trajectory)
                    const targetPitch = Math.atan2(-directionToTarget.y, 
                        Math.sqrt(directionToTarget.x * directionToTarget.x + directionToTarget.z * directionToTarget.z));
                    const targetYaw = Math.atan2(directionToTarget.x, directionToTarget.z);
                    
                    // Apply rotation toward target gradually
                    const flipRate = 0.8 * deltaTime; // radians per second
                    vehicle.rotation.x = this.lerp(vehicle.rotation.x, targetPitch, flipRate);
                    vehicle.rotation.y = this.lerp(vehicle.rotation.y, targetYaw, flipRate);
                    
                    // Check if flip is complete
                    if (timeInPhase >= this.returnParams.turnDuration) {
                        console.log('Booster flip maneuver complete, starting return burn');
                        this.returnParams.phase = 'burn';
                        this.returnParams.startTime = this.simulationTime;
                    }
                    break;
                    
                case 'burn':
                    // Return burn - thrust toward Mechazilla
                    vehicle.throttle = 0.6; // Medium thrust for trajectory correction
                    
                    // Continuously adjust attitude to point toward Mechazilla
                    const burnDirection = new THREE.Vector3();
                    burnDirection.subVectors(this.landingTarget, vehicle.position).normalize();
                    
                    const burnPitch = Math.atan2(-burnDirection.y, 
                        Math.sqrt(burnDirection.x * burnDirection.x + burnDirection.z * burnDirection.z));
                    const burnYaw = Math.atan2(burnDirection.x, burnDirection.z);
                    
                    // Smoother attitude adjustment during burn
                    const burnRate = 0.5 * deltaTime;
                    vehicle.rotation.x = this.lerp(vehicle.rotation.x, burnPitch, burnRate);
                    vehicle.rotation.y = this.lerp(vehicle.rotation.y, burnYaw, burnRate);
                    
                    // Check if burn duration is complete
                    if (timeInPhase >= this.returnParams.burnDuration) {
                        console.log('Booster return burn complete, entering approach phase');
                        this.returnParams.phase = 'approach';
                        this.returnParams.startTime = this.simulationTime;
                        
                        // Start landing sequence automatically
                        this.landingPhase = 'approach';
                        console.log('Automatically starting landing sequence');
                    }
                    break;
                    
                case 'approach':
                    // Approach phase - use existing landing control system
                    if (this.landingPhase === 'none') {
                        this.landingPhase = 'approach';
                        console.log('Starting approach phase for landing');
                    }
                    
                    // Let the landing control system take over
                    this.updateLandingControl(vehicle, deltaTime);
                    break;
            }
        }
        
        // Apply general physics for all phases
        this.updateVehiclePhysics(vehicle, deltaTime, vehicle.throttle > 0);
        
        // If landing phase is active but return params aren't, use landing control
        if (this.landingPhase !== 'none' && this.landingPhase !== 'touchdown' && 
            (!this.returnParams || this.returnParams.phase === 'approach')) {
            this.updateLandingControl(vehicle, deltaTime);
        }

        return {
            position: vehicle.position.clone(),
            quaternion: new THREE.Quaternion().setFromEuler(vehicle.rotation),
            velocity: vehicle.velocity.clone(),
            acceleration: vehicle.acceleration.clone(),
            eulerAngles: {
                x: vehicle.rotation.x,
                y: vehicle.rotation.y,
                z: vehicle.rotation.z
            },
            fuel: vehicle.fuel,
            throttle: vehicle.throttle,
            landingComplete: this.landingPhase === 'touchdown',
            readyForCatch: this.landingPhase === 'final' && vehicle.position.y < 100,
            returnPhase: this.returnParams ? this.returnParams.phase : 'none',
            distanceToTarget: vehicle.position.distanceTo(this.landingTarget)
        };
    }

    /**
     * Update physics for Starship ascent phase
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state for Starship
     */
    updateStarshipAscent(deltaTime) {
        if (!this.vehicles.starship) {
            return null;
        }
        
        const vehicle = this.vehicles.starship;
        vehicle.throttle = 1.0; // Full throttle for ascent
        
        // Apply physics
        this.updateVehiclePhysics(vehicle, deltaTime, true); // Enable engines
        
        return {
            position: vehicle.position.clone(),
            velocity: vehicle.velocity.clone(),
            quaternion: new THREE.Quaternion().setFromEuler(vehicle.rotation),
            thrust: vehicle.maxThrust * vehicle.throttle,
            throttle: vehicle.throttle,
            fuel: vehicle.fuel,
            orbitReached: vehicle.position.y > 200000 // Example: 200km for orbit
        };
    }

    /**
     * Update the booster landing sequence
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Physics state and telemetry
     */
    updateBoosterLanding(deltaTime) {
        if (!this.vehicles.superHeavy) {
            console.error('Cannot update booster landing - superHeavy not initialized');
            return {
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                acceleration: new THREE.Vector3(0, 0, 0),
                rotation: new THREE.Euler(0, 0, 0),
                quaternion: new THREE.Quaternion(),
                throttle: 0,
                altitude: 0,
                horizontalDistance: 0,
                landingPhase: 'none',
                landingComplete: false,
                gridFinDeployment: 0,
                landingLegDeployment: 0,
                heatShieldTemperature: 300
            };
        }
        
        // Initialize landing target if not set
        if (!this.landingTarget) {
            this.landingTarget = new THREE.Vector3(0, 0, 0);
        }
        
        const booster = this.vehicles.superHeavy;
        const dt = Math.min(deltaTime, 0.05); // Cap delta time for stability
        this.simulationTime += dt;
        
        // Calculate current altitude and horizontal distance to landing target
        const altitude = booster.position.y;
        const horizontalPosition = new THREE.Vector2(
            booster.position.x - this.landingTarget.x,
            booster.position.z - this.landingTarget.z
        );
        const horizontalDistance = horizontalPosition.length();
        
        // Initialize landing phase if not set
        if (this.landingPhase === 'none') {
            this.landingPhase = 'descent'; // Start with descent phase
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Landing phase initialized to descent at altitude:', altitude);
        }
        
        // Update phase elapsed time
        this.landingParams.currentPhaseTime = this.simulationTime - this.landingParams.phaseStartTime;
        
        // Transition between phases based on altitude
        if (this.landingPhase === 'coast' && altitude <= this.landingParams.boostbackAltitude) {
            this.landingPhase = 'boostback';
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Transition to boostback phase');
        } else if (this.landingPhase === 'boostback' && 
                  (this.landingParams.currentPhaseTime >= this.landingParams.boostbackBurnDuration || 
                   altitude <= this.landingParams.entryAltitude)) {
            this.landingPhase = 'entry';
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Transition to entry phase');
        } else if (this.landingPhase === 'entry' && 
                  (this.landingParams.currentPhaseTime >= this.landingParams.entryBurnDuration || 
                   altitude <= this.landingParams.descentAltitude)) {
            this.landingPhase = 'descent';
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Transition to descent phase');
        } else if (this.landingPhase === 'descent' && altitude <= this.landingParams.landingAltitude) {
            this.landingPhase = 'landing';
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Transition to landing phase');
        } else if (this.landingPhase === 'landing' && altitude <= 0) {
            this.landingPhase = 'touchdown';
            this.landingParams.phaseStartTime = this.simulationTime;
            console.log('Touchdown!');
        }
        
        // Handle grid fin deployment/stowing
        if (altitude <= this.landingParams.gridFinDeployAltitude && 
            altitude >= this.landingParams.gridFinStowAltitude && 
            !booster.gridFins.deployed) {
            // Deploy grid fins gradually
            booster.gridFins.effectiveness += booster.gridFins.deploymentRate * deltaTime;
            if (booster.gridFins.effectiveness >= 1.0) {
                booster.gridFins.effectiveness = 1.0;
                booster.gridFins.deployed = true;
                console.log('Grid fins fully deployed');
            }
        } else if ((altitude < this.landingParams.gridFinStowAltitude || 
                   altitude > this.landingParams.gridFinDeployAltitude) && 
                   booster.gridFins.deployed) {
            // Stow grid fins gradually
            booster.gridFins.effectiveness -= booster.gridFins.deploymentRate * deltaTime;
            if (booster.gridFins.effectiveness <= 0.0) {
                booster.gridFins.effectiveness = 0.0;
                booster.gridFins.deployed = false;
                console.log('Grid fins stowed');
            }
        }
        
        // Handle landing leg deployment
        if (altitude <= this.landingParams.landingLegDeployAltitude && !booster.landingLegs.deployed) {
            // Deploy landing legs gradually
            booster.landingLegs.deploymentProgress += booster.landingLegs.deploymentRate * deltaTime;
            if (booster.landingLegs.deploymentProgress >= 1.0) {
                booster.landingLegs.deploymentProgress = 1.0;
                booster.landingLegs.deployed = true;
                console.log('Landing legs fully deployed');
            }
        }
        
        // Handle thermal effects during entry
        this.updateThermalState(booster, altitude, deltaTime);
        
        // ------ PHASE-SPECIFIC BEHAVIORS ------
        
        // Initialize throttle and PID setpoints based on current phase
        let baseThrottle = 0;
        
        // Update PID setpoints and target attitudes based on current phase
        if (this.landingPhase === 'coast') {
            // Ballistic coast phase - engines off, preparing for boostback
            baseThrottle = this.landingParams.coastThrottle;
            
            // Set target attitude to prepare for boostback burn
            // Point retrograde relative to velocity for most efficient deceleration
            if (booster.velocity.length() > 10) {
                const retrogradeDir = booster.velocity.clone().normalize().negate();
                // Align Y axis with retrograde vector
                const targetAttitude = new THREE.Euler();
                targetAttitude.x = Math.atan2(retrogradeDir.y, Math.sqrt(retrogradeDir.x * retrogradeDir.x + retrogradeDir.z * retrogradeDir.z));
                targetAttitude.z = Math.atan2(retrogradeDir.x, retrogradeDir.z);
                this.pidControllers.attitude.setpoint = targetAttitude;
            }
        } 
        else if (this.landingPhase === 'boostback') {
            // Boostback burn - firing engines to cancel horizontal velocity
            baseThrottle = this.landingParams.boostbackThrottle;
            
            // Target attitude to cancel horizontal velocity
            const horizontalVel = new THREE.Vector2(booster.velocity.x, booster.velocity.z);
            if (horizontalVel.length() > 2) {
                const cancelDir = horizontalVel.clone().normalize().negate();
                const targetAttitude = new THREE.Euler();
                // Calculate tilt angle to target horizontal cancellation while maintaining some vertical stability
                const tiltAngle = Math.min(Math.PI * 0.25, horizontalVel.length() * 0.01); // Max 45 degree tilt
                targetAttitude.x = cancelDir.y * tiltAngle;
                targetAttitude.z = -cancelDir.x * tiltAngle;
                this.pidControllers.attitude.setpoint = targetAttitude;
            } else {
                // If horizontal velocity is nearly zero, start transitioning to vertical orientation
                this.pidControllers.attitude.setpoint = new THREE.Euler(0, 0, 0);
            }
        }
        else if (this.landingPhase === 'entry') {
            // Entry burn - slowing down in the atmosphere
            baseThrottle = this.landingParams.entryThrottle;
            
            // Target attitude should be engines pointed in velocity direction for entry burn
            const velDir = booster.velocity.clone().normalize();
            const targetAttitude = new THREE.Euler();
            // Align with velocity vector for most efficient braking
            targetAttitude.x = Math.atan2(-velDir.y, Math.sqrt(velDir.x * velDir.x + velDir.z * velDir.z));
            targetAttitude.z = Math.atan2(-velDir.x, -velDir.z);
            this.pidControllers.attitude.setpoint = targetAttitude;
            
            // Vertical velocity control - aim for controlled entry speed
            const entrySpeed = -50; // m/s, terminal velocity target during entry
            this.pidControllers.verticalVelocity.setpoint = entrySpeed;
        }
        else if (this.landingPhase === 'descent') {
            // Guided descent - using aerodynamic control surfaces
            baseThrottle = this.landingParams.descentThrottle;
            
            // Set vertical attitude (engines down)
            this.pidControllers.attitude.setpoint = new THREE.Euler(0, 0, 0);
            
            // Begin targeting landing position horizontally
            this.pidControllers.horizontalPosition.setpoint = new THREE.Vector2(0, 0);
            
            // Calculate horizontal position offset
            const horizontalPosControl = this.updatePID(
                this.pidControllers.horizontalPosition,
                horizontalPosition,
                dt
            );
            
            // Apply horizontal control via grid fin effect (simulated by applying slight rotation)
            if (booster.gridFins.effectiveness > 0.1) {
                const controlEffectiveness = booster.gridFins.effectiveness * 0.1;
                booster.rotation.x = -horizontalPosControl.y * controlEffectiveness;
                booster.rotation.z = horizontalPosControl.x * controlEffectiveness;
            }
        }
        else if (this.landingPhase === 'landing') {
            // Landing burn - precision control for touchdown
            baseThrottle = this.landingParams.landingBaseThrottle;
            
            // Set completely vertical attitude
            this.pidControllers.attitude.setpoint = new THREE.Euler(0, 0, 0);
            
            // Target vertical velocity based on altitude (hover-slam profile)
            const targetSpeed = Math.min(
                -this.landingParams.touchdownSpeed,
                -Math.sqrt(2 * 0.5 * this.gravity * altitude) // sqrt(2*0.5*g*h) gives velocity to brake to zero at ground
            );
            this.pidControllers.verticalVelocity.setpoint = targetSpeed;
            
            // Horizontal position control becomes more aggressive near ground
            this.pidControllers.horizontalPosition.setpoint = new THREE.Vector2(0, 0);
            this.pidControllers.horizontalPosition.kP = 0.1 + (0.2 * (1.0 - Math.min(1.0, altitude / 1000)));
            
            // Calculate horizontal position correction
            const horizontalPosControl = this.updatePID(
                this.pidControllers.horizontalPosition,
                horizontalPosition,
                dt
            );
            
            // Apply gimbal control for horizontal positioning
            const gimbalLimit = booster.gimbalAuthority * (Math.PI / 180); // Convert to radians
            booster.gimbalPosition = new THREE.Vector2(
                Math.max(-1, Math.min(1, horizontalPosControl.x * 5)),
                Math.max(-1, Math.min(1, horizontalPosControl.y * 5))
            );
            
            // Apply engine gimbal effect to attitude
            booster.rotation.x = booster.gimbalPosition.y * gimbalLimit * 0.3;
            booster.rotation.z = -booster.gimbalPosition.x * gimbalLimit * 0.3;
        }
        else if (this.landingPhase === 'touchdown') {
            // Touchdown phase - maintain minimum thrust for soft landing
            baseThrottle = 0.2;
            
            // Keep completely vertical
            booster.rotation.x *= 0.8;
            booster.rotation.z *= 0.8;
            
            // Reduce throttle as we settle
            baseThrottle *= Math.max(0, 1.0 - this.landingParams.currentPhaseTime * 0.5);
            
            // Cut engines once fully settled
            if (this.landingParams.currentPhaseTime > 3.0) {
                baseThrottle = 0;
            }
        }
        
        // Apply vertical velocity PID control to adjust throttle for landing burn and touchdown
        if (this.landingPhase === 'landing' || this.landingPhase === 'touchdown') {
            // Update PID controller for vertical velocity
            const verticalControl = this.updatePID(
                this.pidControllers.verticalVelocity,
                booster.velocity.y,
                dt
            );
            
            // Apply PID output to throttle
            booster.throttle = baseThrottle + verticalControl;
        } else {
            // For other phases, just use the base throttle
            booster.throttle = baseThrottle;
        }
        
        // Clamp throttle between 0 and 1
        booster.throttle = Math.min(1.0, Math.max(0.0, booster.throttle));
        
        // Apply attitude control (in all phases)
        const attitudeControl = this.updatePID(
            this.pidControllers.attitude,
            booster.rotation,
            dt
        );
        
        // Apply attitude control as angular acceleration
        booster.angularVelocity.x += attitudeControl.x;
        booster.angularVelocity.y += attitudeControl.y;
        booster.angularVelocity.z += attitudeControl.z;
        
        // Simulate gimbal engine thrust vectoring effect
        if (booster.throttle > 0.1) {
            // Additional rotational effect from engine thrust
            const thrustVectoringStrength = 0.5 * booster.throttle;
            booster.angularVelocity.x += booster.gimbalPosition.y * thrustVectoringStrength;
            booster.angularVelocity.z -= booster.gimbalPosition.x * thrustVectoringStrength;
        }
        
        // Dampen angular velocity (aerodynamic stability)
        const angularDamping = 0.95 - (0.1 * booster.gridFins.effectiveness); // more damping with grid fins
        booster.angularVelocity.multiplyScalar(angularDamping);
        
        // Simulate ground effect when close to landing
        if (altitude < 20 && booster.throttle > 0.1) {
            // Ground effect provides additional lift and stability near the ground
            const groundEffectStrength = 0.2 * (1.0 - altitude / 20.0) * booster.throttle;
            booster.acceleration.y += groundEffectStrength * this.gravity;
            
            // Ground effect also helps stabilize attitude
            booster.angularVelocity.multiplyScalar(0.9);
        }
        
        // Update vehicle physics
        this.updateVehiclePhysics(booster, deltaTime, booster.throttle > 0);
        
        // Check if landing is complete
        const landingComplete = this.landingPhase === 'touchdown' && 
                              this.landingParams.currentPhaseTime > 3.0 &&
                              altitude <= 0.1 && 
                              Math.abs(booster.velocity.y) < 0.1;
        
        // Create quaternion from euler rotation for return value
        const quaternion = new THREE.Quaternion().setFromEuler(booster.rotation);
        
        return {
            position: booster.position.clone(),
            velocity: booster.velocity.clone(),
            acceleration: booster.acceleration.clone(),
            rotation: booster.rotation.clone(),
            quaternion: quaternion,
            throttle: booster.throttle,
            altitude: altitude,
            horizontalDistance: horizontalDistance,
            landingPhase: this.landingPhase,
            landingComplete: landingComplete,
            gridFinDeployment: booster.gridFins.effectiveness,
            landingLegDeployment: booster.landingLegs.deploymentProgress,
            heatShieldTemperature: booster.heatShield.temperature,
            telemetry: {
                phase: this.landingPhase,
                phaseTime: this.landingParams.currentPhaseTime.toFixed(1) + 's',
                altitude: altitude.toFixed(1) + 'm',
                velocity: booster.velocity.length().toFixed(1) + 'm/s',
                verticalVelocity: booster.velocity.y.toFixed(1) + 'm/s',
                horizontalDistance: horizontalDistance.toFixed(1) + 'm',
                throttle: (booster.throttle * 100).toFixed(0) + '%',
                temperature: booster.heatShield.temperature.toFixed(0) + 'K'
            }
        };
    }

    /**
     * Update Mechazilla catch physics
     * @param {number} deltaTime - Time step in seconds
     * @returns {Object} Current physics state
     */
    updateMechazillaCatch(deltaTime) {
        if (!this.vehicles.superHeavy) {
            console.error('Cannot update Mechazilla catch - superHeavy not initialized');
            return {
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                quaternion: new THREE.Quaternion(),
                eulerAngles: { x: 0, y: 0, z: 0 },
                acceleration: new THREE.Vector3(0, 0, 0),
                error: true
            };
        }
        
        const booster = this.vehicles.superHeavy;
        
        // Cap delta time to prevent physics instability
        const dt = Math.min(deltaTime, 0.05);
        
        // Guide booster to Mechazilla catch position
        const catchPosition = new THREE.Vector3(-120, 100, 0); // Position of Mechazilla arms
        
        // Calculate distance to catch position
        const distanceToCatch = booster.position.distanceTo(catchPosition);
        
        // Gradually slow down as we approach Mechazilla
        // More gradual approach with better scaling
        let desiredSpeed = Math.min(5, distanceToCatch * 0.1);
        
        // Direction to Mechazilla
        const direction = new THREE.Vector3();
        direction.subVectors(catchPosition, booster.position).normalize();
        
        // Adjust velocity to approach Mechazilla with smoother damping
        const currentSpeed = booster.velocity.length();
        const speedDiff = desiredSpeed - currentSpeed;
        
        // Smoother acceleration with damping factor
        const accelerationFactor = Math.min(2.0, 1.0 + (distanceToCatch * 0.01));
        const acceleration = direction.clone().multiplyScalar(speedDiff * accelerationFactor);
        
        // Limit maximum acceleration to prevent erratic movement
        const maxAccel = 5.0;
        if (acceleration.length() > maxAccel) {
            acceleration.normalize().multiplyScalar(maxAccel);
        }
        
        booster.acceleration.lerp(acceleration, 0.2); // Smooth acceleration changes
        
        // Gradually adjust throttle based on distance
        booster.throttle = 0.1 + (0.2 * Math.min(1.0, distanceToCatch / 50));
        
        // Ensure vertical position is maintained with stability
        if (Math.abs(booster.position.y - catchPosition.y) > 5) {
            const verticalCorrection = (catchPosition.y - booster.position.y) * 0.1;
            booster.acceleration.y += verticalCorrection;
        }
        
        // Apply physics update with smaller time steps for stability
        this.updateVehiclePhysics(booster, deltaTime, true);
        
        // Check if catch is complete with a more forgiving threshold
        const catchComplete = distanceToCatch < 10;
        
        // Keep the booster upright during catch sequence
        if (distanceToCatch < 50) {
            // Gradually rotate to vertical orientation
            booster.rotation.x = booster.rotation.x * 0.95;
            booster.rotation.z = booster.rotation.z * 0.95;
        }
        
        // Convert Euler rotation to quaternion for return value
        const quaternion = new THREE.Quaternion().setFromEuler(booster.rotation);
        
        // Return comprehensive state
        return {
            position: booster.position.clone(),
            velocity: booster.velocity.clone(),
            quaternion: quaternion,
            eulerAngles: {
                x: booster.rotation.x,
                y: booster.rotation.y,
                z: booster.rotation.z
            },
            acceleration: booster.acceleration.clone(),
            distanceToCatch: distanceToCatch,
            catchComplete: catchComplete,
            engineThrottle: booster.throttle
        };
    }
    
    /**
     * Helper to apply common physics updates to a vehicle
     * @param {number} deltaTime - Time step
     * @param {boolean} enginesOn - Whether to calculate thrust and fuel consumption
     */
    updateVehiclePhysics(vehicle, deltaTime, enginesOn) {
        const dt = Math.min(deltaTime, 0.1); // Cap delta time

        // Calculate forces
        const forces = this.calculateForces(vehicle, dt); // calculateForces already handles throttle for thrust

        // Update acceleration (F = ma)
        const totalMass = vehicle.mass + vehicle.fuel;
        if (totalMass <= 0) return; // Avoid division by zero if fuel is exhausted and mass is zero

        vehicle.acceleration.x = forces.x / totalMass;
        vehicle.acceleration.y = forces.y / totalMass;
        vehicle.acceleration.z = forces.z / totalMass;
        
        // Update velocity (v = v0 + a*t)
        vehicle.velocity.x += vehicle.acceleration.x * dt;
        vehicle.velocity.y += vehicle.acceleration.y * dt;
        vehicle.velocity.z += vehicle.acceleration.z * dt;
        
        // Update position (p = p0 + v*t)
        vehicle.position.x += vehicle.velocity.x * dt;
        vehicle.position.y += vehicle.velocity.y * dt;
        vehicle.position.z += vehicle.velocity.z * dt;
        
        // Update rotation based on angular velocity
        vehicle.rotation.x += vehicle.angularVelocity.x * dt;
        vehicle.rotation.y += vehicle.angularVelocity.y * dt;
        vehicle.rotation.z += vehicle.angularVelocity.z * dt;
        
        // Update fuel consumption if engines are on
        if (enginesOn && vehicle.throttle > 0) {
            const fuelRate = vehicle.maxThrust * vehicle.throttle / 3000; // kg/s (example specific impulse)
            vehicle.fuel = Math.max(0, vehicle.fuel - fuelRate * dt);
        }

        // Ground collision detection
        if (vehicle.position.y < 0) {
            vehicle.position.y = 0;
            vehicle.velocity.set(0, 0, 0);
            vehicle.acceleration.set(0, 0, 0);
            vehicle.angularVelocity.set(0, 0, 0);
            if (vehicle === this.vehicles.superHeavy && this.landingPhase === 'final') {
                this.landingPhase = 'touchdown';
            }
        }
    }
    
    /**
     * Reset the physics engine
     */
    reset() {
        console.log('Resetting physics engine state');
        
        // Reset separation state
        this.separationTimer = null;
        this.separationCompleted = false;
        this.combinedStage = true;
        
        // Initialize vehicles if not already done
        if (!this.vehicles) {
            this.vehicles = {
                starship: {
                    position: new THREE.Vector3(0, 70, 0),
                    velocity: new THREE.Vector3(0, 0, 0),
                    acceleration: new THREE.Vector3(0, 0, 0),
                    rotation: new THREE.Euler(0, 0, 0),
                    angularVelocity: new THREE.Vector3(0, 0, 0),
                    mass: 100000, // kg (dry mass)
                    fuel: 1200000, // kg (propellant)
                    maxThrust: 16000000, // N
                    throttle: 0,
                    active: true,
                    gimbalPosition: new THREE.Vector2(0, 0),
                    quaternion: new THREE.Quaternion(),
                    eulerAngles: { x: 0, y: 0, z: 0 }
                },
                superHeavy: {
                    position: new THREE.Vector3(0, 0.1, 0),
                    velocity: new THREE.Vector3(0, 0, 0),
                    acceleration: new THREE.Vector3(0, 0, 0),
                    rotation: new THREE.Euler(0, 0, 0),
                    angularVelocity: new THREE.Vector3(0, 0, 0),
                    mass: 200000, // kg (dry mass)
                    fuel: 3400000, // kg (propellant)
                    maxThrust: 45000000, // N
                    throttle: 0,
                    active: true,
                    gimbalPosition: new THREE.Vector2(0, 0),
                    quaternion: new THREE.Quaternion(),
                    eulerAngles: { x: 0, y: 0, z: 0 }
                }
            };
            console.log('Vehicles initialized in reset method');
        }
        
        // Reset vehicle states if vehicles exist
        if (this.vehicles) {
            for (const vehicleKey in this.vehicles) {
                const vehicle = this.vehicles[vehicleKey];
                if (vehicle) {
                    if (vehicle.position) vehicle.position.set(0, vehicleKey === 'superHeavy' ? 0.1 : 60.75, 0); // Starship positioned properly on top
                    if (vehicle.velocity) vehicle.velocity.set(0, 0, 0);
                    if (vehicle.acceleration) vehicle.acceleration.set(0, 0, 0);
                    if (vehicle.rotation) vehicle.rotation.set(0, 0, 0);
                    if (vehicle.angularVelocity) vehicle.angularVelocity.set(0, 0, 0);
                    vehicle.throttle = 0;
                    vehicle.gridFinDeflection = 0;
                    
                    // Use gimbalPosition if it exists
                    if (vehicle.gimbalPosition) {
                        vehicle.gimbalPosition.set(0, 0);
                    } else {
                        vehicle.gimbalPosition = new THREE.Vector2(0, 0);
                    }
                    
                    vehicle.active = true; // Make sure vehicles are active
                    
                    // Proper initialization of quaternion from Euler angles
                    if (!vehicle.quaternion) {
                        vehicle.quaternion = new THREE.Quaternion();
                    }
                    vehicle.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'XYZ'));
                    
                    if (!vehicle.eulerAngles) {
                        vehicle.eulerAngles = { x: 0, y: 0, z: 0 };
                    } else {
                        vehicle.eulerAngles.x = 0;
                        vehicle.eulerAngles.y = 0;
                        vehicle.eulerAngles.z = 0;
                    }
                }
            }
        }
        
        // Reset landing parameters
        this.landingPhase = 'none';
        
        // Initialize landing parameters if they don't exist
        if (!this.landingParams) {
            this.landingParams = {
                phaseStartTime: 0,
                currentPhaseTime: 0,
                gridFinDeployment: 0,
                landingLegDeployment: 0,
                targetAltitude: 0,
                targetHorizontalPosition: new THREE.Vector2(0, 0)
            };
            console.log('Landing parameters initialized in reset method');
        }
        
        // Initialize or reset PID controllers
        if (!this.pidControllers) {
            // If they don't exist, create with default values (should be created in constructor, but this is a fallback)
            this.pidControllers = {
                verticalVelocity: {
                    kP: 0.2, kI: 0.01, kD: 0.1,
                    setpoint: 0,
                    integral: 0, previousError: 0, output: 0,
                    maxOutput: 0.3, minOutput: -0.3
                },
                horizontalPosition: {
                    kP: 0.1, kI: 0.005, kD: 0.05,
                    setpoint: new THREE.Vector2(0, 0),
                    integral: new THREE.Vector2(0, 0),
                    previousError: new THREE.Vector2(0, 0),
                    output: new THREE.Vector2(0, 0),
                    maxOutput: 0.2, minOutput: -0.2
                },
                attitude: {
                    kP: 0.5, kI: 0.01, kD: 0.2,
                    setpoint: new THREE.Euler(0, 0, 0),
                    integral: new THREE.Vector3(0, 0, 0),
                    previousError: new THREE.Vector3(0, 0, 0),
                    output: new THREE.Vector3(0, 0, 0),
                    maxOutput: 0.1, minOutput: -0.1
                }
            };
            console.log('PID controllers initialized in reset method');
        } else {
            // Reset existing PID controllers
            // Vertical velocity
            this.pidControllers.verticalVelocity.setpoint = 0;
            this.pidControllers.verticalVelocity.integral = 0;
            this.pidControllers.verticalVelocity.previousError = 0;
            this.pidControllers.verticalVelocity.output = 0;
            
            // Horizontal position
            this.pidControllers.horizontalPosition.setpoint.set(0, 0);
            this.pidControllers.horizontalPosition.integral.set(0, 0);
            this.pidControllers.horizontalPosition.previousError.set(0, 0);
            this.pidControllers.horizontalPosition.output.set(0, 0);
            
            // Attitude
            this.pidControllers.attitude.setpoint = new THREE.Euler(0, 0, 0);
            this.pidControllers.attitude.integral.set(0, 0, 0);
            this.pidControllers.attitude.previousError.set(0, 0, 0);
            this.pidControllers.attitude.output.set(0, 0, 0);
            
            console.log('PID controllers reset');
        }
        
        // Remove any reference to the old pid structure if it exists
        this.pid = null;
        
        // Reset wind
        this.windSpeed = 0;
        this.gustStrength = 0;
        this.turbulenceIntensity = 0;
        
        // Reset separation timer
        this.separationTimer = null;
        
        // Reset simulation time
        this.simulationTime = 0;
    }
}
