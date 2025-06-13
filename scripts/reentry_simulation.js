// Reentry and landing simulation module for SpaceX Starship Simulator
// Implements heat shield effects, aerodynamic control, and landing sequence

class ReentrySimulation {
    constructor() {
        // Constants
        this.EARTH_RADIUS = 6371000; // m
        this.G = 6.67430e-11; // Gravitational constant (m^3 kg^-1 s^-2)
        this.EARTH_MASS = 5.972e24; // kg
        this.EARTH_MU = this.G * this.EARTH_MASS; // Standard gravitational parameter
        
        // Atmospheric model constants
        this.SCALE_HEIGHT = 8500; // m
        this.AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m^3
        
        // Vehicle properties
        this.mass = 120000; // kg (dry mass of Starship)
        this.crossSectionalArea = Math.PI * Math.pow(9 / 2, 2); // m^2 (based on 9m diameter)
        this.dragCoefficient = 0.3; // Base drag coefficient
        this.liftCoefficient = 0.1; // Base lift coefficient
        
        // Heat shield properties
        this.heatShieldArea = this.crossSectionalArea * 0.6; // m^2 (approximate area covered by heat shield)
        this.heatShieldEmissivity = 0.8; // Emissivity of heat shield material
        this.heatShieldConductivity = 0.1; // W/(m·K) (thermal conductivity)
        this.heatShieldThickness = 0.1; // m
        this.stefanBoltzmannConstant = 5.67e-8; // W/(m^2·K^4)
        
        // State variables
        this.position = { x: 0, y: 0, z: 0 }; // m
        this.velocity = { x: 0, y: 0, z: 0 }; // m/s
        this.acceleration = { x: 0, y: 0, z: 0 }; // m/s^2
        this.orientation = { roll: 0, pitch: 0, yaw: 0 }; // radians
        this.angularVelocity = { roll: 0, pitch: 0, yaw: 0 }; // radians/s
        
        // Thermal state
        this.heatShieldTemperature = 293; // K (ambient temperature)
        this.heatRate = 0; // W/m^2
        this.totalHeatLoad = 0; // J/m^2
        
        // Control variables
        this.flapAngle = { forward: { left: 0, right: 0 }, aft: { left: 0, right: 0 } }; // radians
        this.engineThrottle = 0; // 0 to 1
        
        // Landing variables
        this.landingTargetPosition = { x: 0, y: 0, z: 0 }; // m
        this.distanceToTarget = 0; // m
        this.landingBurnStartAltitude = 2000; // m
        this.touchdownVelocity = 0; // m/s
    }
    
    // Calculate air density at given altitude
    calculateAirDensity(altitude) {
        return this.AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / this.SCALE_HEIGHT);
    }
    
    // Calculate gravitational acceleration at given altitude
    calculateGravity(altitude) {
        const distance = this.EARTH_RADIUS + altitude;
        return this.EARTH_MU / (distance * distance);
    }
    
    // Calculate aerodynamic forces (drag and lift)
    calculateAerodynamicForces(velocity, altitude, angleOfAttack) {
        const airDensity = this.calculateAirDensity(altitude);
        const velocityMagnitude = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Adjust coefficients based on angle of attack
        const adjustedDragCoefficient = this.dragCoefficient * (1 + 0.5 * Math.sin(angleOfAttack));
        const adjustedLiftCoefficient = this.liftCoefficient * Math.sin(2 * angleOfAttack);
        
        // Calculate drag force magnitude
        const dragForceMagnitude = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                                 adjustedDragCoefficient * this.crossSectionalArea;
        
        // Calculate lift force magnitude
        const liftForceMagnitude = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                                adjustedLiftCoefficient * this.crossSectionalArea;
        
        // Calculate drag force components (opposite to velocity direction)
        const dragForce = {
            x: -dragForceMagnitude * velocity.x / velocityMagnitude,
            y: -dragForceMagnitude * velocity.y / velocityMagnitude,
            z: -dragForceMagnitude * velocity.z / velocityMagnitude
        };
        
        // Calculate lift force direction (perpendicular to velocity and roll axis)
        // This is a simplified model; a real simulator would use a more complex aerodynamic model
        const liftDirection = {
            x: -velocity.z,
            y: 0,
            z: velocity.x
        };
        
        // Normalize lift direction
        const liftDirectionMagnitude = Math.sqrt(
            liftDirection.x * liftDirection.x + 
            liftDirection.y * liftDirection.y + 
            liftDirection.z * liftDirection.z
        );
        
        if (liftDirectionMagnitude > 0) {
            liftDirection.x /= liftDirectionMagnitude;
            liftDirection.y /= liftDirectionMagnitude;
            liftDirection.z /= liftDirectionMagnitude;
        }
        
        // Calculate lift force components
        const liftForce = {
            x: liftForceMagnitude * liftDirection.x,
            y: liftForceMagnitude * liftDirection.y,
            z: liftForceMagnitude * liftDirection.z
        };
        
        // Total aerodynamic force
        const totalForce = {
            x: dragForce.x + liftForce.x,
            y: dragForce.y + liftForce.y,
            z: dragForce.z + liftForce.z
        };
        
        return {
            drag: dragForce,
            lift: liftForce,
            total: totalForce,
            dragMagnitude: dragForceMagnitude,
            liftMagnitude: liftForceMagnitude
        };
    }
    
    // Calculate aerodynamic heating
    calculateAerodynamicHeating(velocity, altitude) {
        const airDensity = this.calculateAirDensity(altitude);
        const velocityMagnitude = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Sutton-Graves heating equation (simplified)
        const heatRate = 1.83e-4 * Math.sqrt(airDensity) * Math.pow(velocityMagnitude, 3);
        
        // Update heat shield temperature using lumped capacitance model
        const heatShieldMass = this.heatShieldArea * this.heatShieldThickness * 2000; // kg (assuming density of 2000 kg/m^3)
        const heatShieldSpecificHeat = 1000; // J/(kg·K)
        
        // Heat input
        const heatInput = heatRate * this.heatShieldArea;
        
        // Heat radiation (Stefan-Boltzmann law)
        const heatRadiation = this.heatShieldEmissivity * this.stefanBoltzmannConstant * 
                             this.heatShieldArea * Math.pow(this.heatShieldTemperature, 4);
        
        // Net heat and temperature change
        const netHeat = heatInput - heatRadiation;
        const deltaTemperature = netHeat / (heatShieldMass * heatShieldSpecificHeat);
        
        // Update temperature and heat load
        this.heatShieldTemperature += deltaTemperature;
        this.heatRate = heatRate;
        this.totalHeatLoad += heatRate;
        
        return {
            heatRate,
            heatShieldTemperature: this.heatShieldTemperature,
            totalHeatLoad: this.totalHeatLoad
        };
    }
    
    // Calculate control forces from flaps
    calculateControlForces(velocity, altitude, flapAngles) {
        const airDensity = this.calculateAirDensity(altitude);
        const velocityMagnitude = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Simplified model for flap forces
        const flapArea = 10; // m^2 (approximate area of each flap)
        const flapLeverArm = 4; // m (approximate distance from center of mass)
        
        // Calculate forces for each flap
        const forwardLeftForce = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                               flapArea * Math.sin(flapAngles.forward.left);
        
        const forwardRightForce = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                                flapArea * Math.sin(flapAngles.forward.right);
        
        const aftLeftForce = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                           flapArea * Math.sin(flapAngles.aft.left);
        
        const aftRightForce = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                            flapArea * Math.sin(flapAngles.aft.right);
        
        // Calculate torques
        const rollTorque = (forwardLeftForce - forwardRightForce + aftLeftForce - aftRightForce) * flapLeverArm;
        const pitchTorque = (forwardLeftForce + forwardRightForce - aftLeftForce - aftRightForce) * flapLeverArm;
        const yawTorque = 0; // Simplified model doesn't include yaw control from flaps
        
        return {
            torque: {
                roll: rollTorque,
                pitch: pitchTorque,
                yaw: yawTorque
            },
            forces: {
                forwardLeft: forwardLeftForce,
                forwardRight: forwardRightForce,
                aftLeft: aftLeftForce,
                aftRight: aftRightForce
            }
        };
    }
    
    // Calculate engine thrust forces
    calculateEngineForces(throttle, orientation) {
        const maxThrust = 1200000 * 9.81; // N (approx. 1,200 metric tons)
        const thrustMagnitude = maxThrust * throttle;
        
        // Convert orientation to direction vector
        const pitch = orientation.pitch;
        const yaw = orientation.yaw;
        
        // Calculate thrust components
        const thrustComponents = {
            x: thrustMagnitude * Math.sin(yaw) * Math.cos(pitch),
            y: thrustMagnitude * Math.sin(pitch),
            z: thrustMagnitude * Math.cos(yaw) * Math.cos(pitch)
        };
        
        return thrustComponents;
    }
    
    // Calculate distance to landing target
    calculateDistanceToTarget() {
        const dx = this.position.x - this.landingTargetPosition.x;
        const dy = this.position.y - this.landingTargetPosition.y;
        const dz = this.position.z - this.landingTargetPosition.z;
        
        this.distanceToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);
        return this.distanceToTarget;
    }
    
    // Determine if landing burn should start
    shouldStartLandingBurn(altitude, verticalVelocity) {
        // Simple heuristic: start burn when below certain altitude and descending
        return altitude < this.landingBurnStartAltitude && verticalVelocity < 0;
    }
    
    // Calculate landing burn throttle
    calculateLandingBurnThrottle(altitude, velocity) {
        // Calculate time to impact assuming constant velocity
        const timeToImpact = altitude / -velocity.y;
        
        // Calculate required deceleration
        const requiredDeceleration = velocity.y / timeToImpact + this.calculateGravity(altitude);
        
        // Calculate required thrust
        const requiredThrust = this.mass * requiredDeceleration;
        
        // Calculate throttle (0 to 1)
        const maxThrust = 1200000 * 9.81; // N
        let throttle = requiredThrust / maxThrust;
        
        // Clamp throttle between 0 and 1
        throttle = Math.max(0, Math.min(1, throttle));
        
        return throttle;
    }
    
    // Update simulation for one time step
    update(deltaTime, controls) {
        // Apply controls
        this.flapAngle = controls.flapAngle || this.flapAngle;
        this.engineThrottle = controls.engineThrottle || this.engineThrottle;
        this.orientation = controls.orientation || this.orientation;
        
        // Calculate altitude (distance from Earth's surface)
        const positionMagnitude = Math.sqrt(
            this.position.x * this.position.x + 
            this.position.y * this.position.y + 
            this.position.z * this.position.z
        );
        const altitude = positionMagnitude - this.EARTH_RADIUS;
        
        // Calculate angle of attack (simplified)
        const velocityMagnitude = Math.sqrt(
            this.velocity.x * this.velocity.x + 
            this.velocity.y * this.velocity.y + 
            this.velocity.z * this.velocity.z
        );
        
        // Dot product of velocity and orientation vectors
        const angleOfAttack = Math.acos(
            (this.velocity.x * Math.cos(this.orientation.yaw) * Math.cos(this.orientation.pitch) +
             this.velocity.y * Math.sin(this.orientation.pitch) +
             this.velocity.z * Math.sin(this.orientation.yaw) * Math.cos(this.orientation.pitch)) / 
            velocityMagnitude
        );
        
        // Calculate forces
        const gravity = this.calculateGravity(altitude);
        const aerodynamicForces = this.calculateAerodynamicForces(this.velocity, altitude, angleOfAttack);
        const controlForces = this.calculateControlForces(this.velocity, altitude, this.flapAngle);
        const engineForces = this.calculateEngineForces(this.engineThrottle, this.orientation);
        
        // Calculate heating
        const heating = this.calculateAerodynamicHeating(this.velocity, altitude);
        
        // Calculate total force
        const totalForce = {
            x: aerodynamicForces.total.x + engineForces.x,
            y: aerodynamicForces.total.y + engineForces.y - this.mass * gravity,
            z: aerodynamicForces.total.z + engineForces.z
        };
        
        // Calculate acceleration (F = ma)
        this.acceleration = {
            x: totalForce.x / this.mass,
            y: totalForce.y / this.mass,
            z: totalForce.z / this.mass
        };
        
        // Update velocity (v = v0 + a*t)
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.velocity.z += this.acceleration.z * deltaTime;
        
        // Update position (p = p0 + v*t)
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Calculate angular acceleration from torques
        const momentOfInertia = 1000000; // kg·m^2 (simplified)
        const angularAcceleration = {
            roll: controlForces.torque.roll / momentOfInertia,
            pitch: controlForces.torque.pitch / momentOfInertia,
            yaw: controlForces.torque.yaw / momentOfInertia
        };
        
        // Update angular velocity
        this.angularVelocity.roll += angularAcceleration.roll * deltaTime;
        this.angularVelocity.pitch += angularAcceleration.pitch * deltaTime;
        this.angularVelocity.yaw += angularAcceleration.yaw * deltaTime;
        
        // Update orientation
        this.orientation.roll += this.angularVelocity.roll * deltaTime;
        this.orientation.pitch += this.angularVelocity.pitch * deltaTime;
        this.orientation.yaw += this.angularVelocity.yaw * deltaTime;
        
        // Calculate distance to target
        this.calculateDistanceToTarget();
        
        // Check for landing
        if (altitude <= 0) {
            this.touchdownVelocity = Math.sqrt(
                this.velocity.x * this.velocity.x + 
                this.velocity.y * this.velocity.y + 
                this.velocity.z * this.velocity.z
            );
        }
        
        // Return current state for visualization
        return {
            position: this.position,
            velocity: this.velocity,
            acceleration: this.acceleration,
            orientation: this.orientation,
            angularVelocity: this.angularVelocity,
            altitude: altitude,
            heatShieldTemperature: this.heatShieldTemperature,
            heatRate: this.heatRate,
            distanceToTarget: this.distanceToTarget,
            touchdownVelocity: this.touchdownVelocity
        };
    }
    
    // Initialize reentry from orbital parameters
    initializeReentry(altitude, velocity, orientation) {
        this.position = {
            x: 0,
            y: this.EARTH_RADIUS + altitude,
            z: 0
        };
        
        this.velocity = velocity;
        this.orientation = orientation;
        this.heatShieldTemperature = 293; // K (ambient temperature)
        this.heatRate = 0;
        this.totalHeatLoad = 0;
        this.touchdownVelocity = 0;
    }
    
    // Set landing target
    setLandingTarget(x, y, z) {
        this.landingTargetPosition = { x, y, z };
    }
    
    // Reset the reentry simulation
    reset() {
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.orientation = { roll: 0, pitch: 0, yaw: 0 };
        this.angularVelocity = { roll: 0, pitch: 0, yaw: 0 };
        this.heatShieldTemperature = 293;
        this.heatRate = 0;
        this.totalHeatLoad = 0;
        this.flapAngle = { forward: { left: 0, right: 0 }, aft: { left: 0, right: 0 } };
        this.engineThrottle = 0;
        this.distanceToTarget = 0;
        this.touchdownVelocity = 0;
    }
}

export { ReentrySimulation };
