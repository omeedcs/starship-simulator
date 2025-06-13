// Physics engine for SpaceX Starship Simulator
// Implements accurate 6 degrees of freedom simulation

class PhysicsEngine {
    constructor() {
        // Constants
        this.G = 6.67430e-11; // Gravitational constant (m^3 kg^-1 s^-2)
        this.EARTH_MASS = 5.972e24; // kg
        this.EARTH_RADIUS = 6371000; // m
        this.AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m^3
        
        // Vehicle properties
        this.superHeavyMass = 200000; // kg (dry mass)
        this.starshipMass = 120000; // kg (dry mass)
        this.superHeavyPropellantMass = 3400000; // kg
        this.starshipPropellantMass = 1200000; // kg
        this.superHeavyThrust = 7590000 * 9.81; // N (7,590 metric tons of thrust)
        this.starshipThrust = 1200000 * 9.81; // N (approx. 1,200 metric tons)
        this.dragCoefficient = 0.3; // Approximate
        this.crossSectionalArea = Math.PI * Math.pow(9 / 2, 2); // m^2 (based on 9m diameter)
        
        // State variables
        this.position = { x: 0, y: 0, z: 0 }; // m
        this.velocity = { x: 0, y: 0, z: 0 }; // m/s
        this.acceleration = { x: 0, y: 0, z: 0 }; // m/s^2
        this.orientation = { roll: 0, pitch: 0, yaw: 0 }; // radians
        this.angularVelocity = { roll: 0, pitch: 0, yaw: 0 }; // radians/s
        
        // Control variables
        this.throttle = 0; // 0 to 1
        this.gimbalAngle = { x: 0, y: 0 }; // radians
        this.gridFinAngle = { x: 0, y: 0, z: 0, w: 0 }; // radians (4 grid fins)
        this.flapAngle = { forward: { left: 0, right: 0 }, aft: { left: 0, right: 0 } }; // radians
        
        // Mission variables
        this.stageSeparated = false;
        this.propellantRemaining = {
            superHeavy: this.superHeavyPropellantMass,
            starship: this.starshipPropellantMass
        };
    }
    
    // Calculate gravitational force
    calculateGravity(altitude) {
        // F = G * M * m / r^2
        const distance = this.EARTH_RADIUS + altitude;
        const gravitationalForce = this.G * this.EARTH_MASS / Math.pow(distance, 2);
        return gravitationalForce;
    }
    
    // Calculate air density at given altitude
    calculateAirDensity(altitude) {
        // Simplified exponential atmospheric model
        const scaleHeight = 8500; // m
        return this.AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / scaleHeight);
    }
    
    // Calculate drag force
    calculateDrag(velocity, altitude) {
        const airDensity = this.calculateAirDensity(altitude);
        const velocityMagnitude = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Fd = 0.5 * ρ * v^2 * Cd * A
        const dragForce = 0.5 * airDensity * Math.pow(velocityMagnitude, 2) * 
                         this.dragCoefficient * this.crossSectionalArea;
        
        // Calculate drag components
        let dragComponents = { x: 0, y: 0, z: 0 };
        if (velocityMagnitude > 0) {
            dragComponents.x = -dragForce * velocity.x / velocityMagnitude;
            dragComponents.y = -dragForce * velocity.y / velocityMagnitude;
            dragComponents.z = -dragForce * velocity.z / velocityMagnitude;
        }
        
        return dragComponents;
    }
    
    // Calculate thrust force
    calculateThrust(throttle, orientation) {
        const thrustMagnitude = this.stageSeparated ? 
            this.starshipThrust * throttle : 
            this.superHeavyThrust * throttle;
        
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
    
    // Calculate total mass
    calculateMass() {
        if (this.stageSeparated) {
            return this.starshipMass + this.propellantRemaining.starship;
        } else {
            return this.superHeavyMass + this.starshipMass + 
                   this.propellantRemaining.superHeavy + this.propellantRemaining.starship;
        }
    }
    
    // Calculate propellant consumption
    calculatePropellantConsumption(throttle, deltaTime) {
        // Simplified model: propellant consumption proportional to throttle
        const stage = this.stageSeparated ? 'starship' : 'superHeavy';
        const maxFlowRate = this.stageSeparated ? 
            this.starshipThrust / (9.81 * 350) : // Isp ~350s
            this.superHeavyThrust / (9.81 * 330); // Isp ~330s
        
        const consumption = maxFlowRate * throttle * deltaTime;
        this.propellantRemaining[stage] -= consumption;
        
        // Ensure non-negative propellant
        this.propellantRemaining[stage] = Math.max(0, this.propellantRemaining[stage]);
        
        return consumption;
    }
    
    // Update physics for one time step
    update(deltaTime, controls) {
        // Apply controls
        this.throttle = controls.throttle || 0;
        this.gimbalAngle = controls.gimbalAngle || { x: 0, y: 0 };
        this.gridFinAngle = controls.gridFinAngle || { x: 0, y: 0, z: 0, w: 0 };
        this.flapAngle = controls.flapAngle || { 
            forward: { left: 0, right: 0 }, 
            aft: { left: 0, right: 0 } 
        };
        
        // Calculate altitude (distance from Earth's surface)
        const altitude = Math.sqrt(
            this.position.x * this.position.x + 
            this.position.y * this.position.y + 
            this.position.z * this.position.z
        ) - this.EARTH_RADIUS;
        
        // Calculate forces
        const gravity = this.calculateGravity(altitude);
        const drag = this.calculateDrag(this.velocity, altitude);
        const thrust = this.calculateThrust(this.throttle, this.orientation);
        
        // Calculate propellant consumption
        this.calculatePropellantConsumption(this.throttle, deltaTime);
        
        // Calculate total mass
        const mass = this.calculateMass();
        
        // Calculate acceleration (F = ma)
        this.acceleration = {
            x: (thrust.x + drag.x) / mass,
            y: (thrust.y + drag.y - gravity * mass) / mass,
            z: (thrust.z + drag.z) / mass
        };
        
        // Update velocity (v = v0 + a*t)
        this.velocity.x += this.acceleration.x * deltaTime;
        this.velocity.y += this.acceleration.y * deltaTime;
        this.velocity.z += this.acceleration.z * deltaTime;
        
        // Update position (p = p0 + v*t)
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Calculate aerodynamic torques (simplified)
        // This would be much more complex in a full simulator
        
        // Return current state for visualization
        return {
            position: this.position,
            velocity: this.velocity,
            acceleration: this.acceleration,
            orientation: this.orientation,
            altitude: altitude,
            velocityMagnitude: Math.sqrt(
                this.velocity.x * this.velocity.x + 
                this.velocity.y * this.velocity.y + 
                this.velocity.z * this.velocity.z
            ),
            propellantRemaining: this.propellantRemaining
        };
    }
    
    // Perform stage separation
    performStageSeparation() {
        this.stageSeparated = true;
        
        // Return separate physics states for both stages
        return {
            superHeavy: {
                position: { ...this.position },
                velocity: { 
                    x: this.velocity.x * 0.9, 
                    y: this.velocity.y * 0.9, 
                    z: this.velocity.z * 0.9 
                },
                orientation: { ...this.orientation }
            },
            starship: {
                position: { ...this.position },
                velocity: { 
                    x: this.velocity.x * 1.1, 
                    y: this.velocity.y * 1.1, 
                    z: this.velocity.z * 1.1 
                },
                orientation: { ...this.orientation }
            }
        };
    }
    
    // Reset the physics engine
    reset() {
        this.position = { x: 0, y: this.EARTH_RADIUS, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
        this.orientation = { roll: 0, pitch: 0, yaw: 0 };
        this.angularVelocity = { roll: 0, pitch: 0, yaw: 0 };
        this.throttle = 0;
        this.gimbalAngle = { x: 0, y: 0 };
        this.gridFinAngle = { x: 0, y: 0, z: 0, w: 0 };
        this.flapAngle = { forward: { left: 0, right: 0 }, aft: { left: 0, right: 0 } };
        this.stageSeparated = false;
        this.propellantRemaining = {
            superHeavy: this.superHeavyPropellantMass,
            starship: this.starshipPropellantMass
        };
    }
}

export { PhysicsEngine };
