// Orbital mechanics module for SpaceX Starship Simulator
// Implements accurate orbital calculations and trajectory planning

class OrbitalMechanics {
    constructor() {
        // Constants
        this.G = 6.67430e-11; // Gravitational constant (m^3 kg^-1 s^-2)
        this.EARTH_MASS = 5.972e24; // kg
        this.EARTH_RADIUS = 6371000; // m
        this.EARTH_MU = this.G * this.EARTH_MASS; // Standard gravitational parameter
        
        // Orbital parameters
        this.semiMajorAxis = 0; // m
        this.eccentricity = 0;
        this.inclination = 0; // radians
        this.longitudeOfAscendingNode = 0; // radians
        this.argumentOfPeriapsis = 0; // radians
        this.trueAnomaly = 0; // radians
        
        // State vectors
        this.position = { x: 0, y: 0, z: 0 }; // m
        this.velocity = { x: 0, y: 0, z: 0 }; // m/s
    }
    
    // Calculate orbital period
    calculateOrbitalPeriod() {
        return 2 * Math.PI * Math.sqrt(Math.pow(this.semiMajorAxis, 3) / this.EARTH_MU);
    }
    
    // Convert state vectors (position, velocity) to orbital elements
    stateVectorsToOrbitalElements(position, velocity) {
        const r = Math.sqrt(
            position.x * position.x + 
            position.y * position.y + 
            position.z * position.z
        );
        
        const v = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Angular momentum vector
        const h = {
            x: position.y * velocity.z - position.z * velocity.y,
            y: position.z * velocity.x - position.x * velocity.z,
            z: position.x * velocity.y - position.y * velocity.x
        };
        
        const hMag = Math.sqrt(h.x * h.x + h.y * h.y + h.z * h.z);
        
        // Node vector
        const n = {
            x: -h.y,
            y: h.x,
            z: 0
        };
        
        const nMag = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
        
        // Eccentricity vector
        const eVec = {
            x: (v * v - this.EARTH_MU / r) * position.x - (position.x * velocity.x + position.y * velocity.y + position.z * velocity.z) * velocity.x,
            y: (v * v - this.EARTH_MU / r) * position.y - (position.x * velocity.x + position.y * velocity.y + position.z * velocity.z) * velocity.y,
            z: (v * v - this.EARTH_MU / r) * position.z - (position.x * velocity.x + position.y * velocity.y + position.z * velocity.z) * velocity.z
        };
        
        eVec.x /= this.EARTH_MU;
        eVec.y /= this.EARTH_MU;
        eVec.z /= this.EARTH_MU;
        
        const e = Math.sqrt(eVec.x * eVec.x + eVec.y * eVec.y + eVec.z * eVec.z);
        
        // Semi-major axis
        const a = hMag * hMag / (this.EARTH_MU * (1 - e * e));
        
        // Inclination
        const i = Math.acos(h.z / hMag);
        
        // Longitude of ascending node
        let omega = Math.acos(n.x / nMag);
        if (n.y < 0) {
            omega = 2 * Math.PI - omega;
        }
        
        // Argument of periapsis
        let w = Math.acos((n.x * eVec.x + n.y * eVec.y + n.z * eVec.z) / (nMag * e));
        if (eVec.z < 0) {
            w = 2 * Math.PI - w;
        }
        
        // True anomaly
        let theta = Math.acos((eVec.x * position.x + eVec.y * position.y + eVec.z * position.z) / (e * r));
        if (position.x * velocity.x + position.y * velocity.y + position.z * velocity.z < 0) {
            theta = 2 * Math.PI - theta;
        }
        
        // Update orbital elements
        this.semiMajorAxis = a;
        this.eccentricity = e;
        this.inclination = i;
        this.longitudeOfAscendingNode = omega;
        this.argumentOfPeriapsis = w;
        this.trueAnomaly = theta;
        
        return {
            semiMajorAxis: a,
            eccentricity: e,
            inclination: i,
            longitudeOfAscendingNode: omega,
            argumentOfPeriapsis: w,
            trueAnomaly: theta
        };
    }
    
    // Convert orbital elements to state vectors
    orbitalElementsToStateVectors(elements) {
        const { semiMajorAxis, eccentricity, inclination, longitudeOfAscendingNode, argumentOfPeriapsis, trueAnomaly } = elements;
        
        // Semi-latus rectum
        const p = semiMajorAxis * (1 - eccentricity * eccentricity);
        
        // Distance from focus
        const r = p / (1 + eccentricity * Math.cos(trueAnomaly));
        
        // Position in orbital plane
        const xOrbit = r * Math.cos(trueAnomaly);
        const yOrbit = r * Math.sin(trueAnomaly);
        
        // Rotation matrices to transform to reference frame
        const cosO = Math.cos(longitudeOfAscendingNode);
        const sinO = Math.sin(longitudeOfAscendingNode);
        const cosw = Math.cos(argumentOfPeriapsis);
        const sinw = Math.sin(argumentOfPeriapsis);
        const cosi = Math.cos(inclination);
        const sini = Math.sin(inclination);
        
        // Position vector
        const position = {
            x: (cosO * cosw - sinO * sinw * cosi) * xOrbit + (-cosO * sinw - sinO * cosw * cosi) * yOrbit,
            y: (sinO * cosw + cosO * sinw * cosi) * xOrbit + (-sinO * sinw + cosO * cosw * cosi) * yOrbit,
            z: (sinw * sini) * xOrbit + (cosw * sini) * yOrbit
        };
        
        // Velocity calculation
        const mu = this.EARTH_MU;
        const h = Math.sqrt(mu * p);
        
        const vxOrbit = -mu / h * Math.sin(trueAnomaly);
        const vyOrbit = mu / h * (eccentricity + Math.cos(trueAnomaly));
        
        // Velocity vector
        const velocity = {
            x: (cosO * cosw - sinO * sinw * cosi) * vxOrbit + (-cosO * sinw - sinO * cosw * cosi) * vyOrbit,
            y: (sinO * cosw + cosO * sinw * cosi) * vxOrbit + (-sinO * sinw + cosO * cosw * cosi) * vyOrbit,
            z: (sinw * sini) * vxOrbit + (cosw * sini) * vyOrbit
        };
        
        // Update state vectors
        this.position = position;
        this.velocity = velocity;
        
        return { position, velocity };
    }
    
    // Calculate orbital maneuvers
    calculateHohmannTransfer(initialAltitude, finalAltitude) {
        const r1 = this.EARTH_RADIUS + initialAltitude;
        const r2 = this.EARTH_RADIUS + finalAltitude;
        
        // Semi-major axis of transfer orbit
        const a_transfer = (r1 + r2) / 2;
        
        // Initial circular orbit velocity
        const v1 = Math.sqrt(this.EARTH_MU / r1);
        
        // Final circular orbit velocity
        const v2 = Math.sqrt(this.EARTH_MU / r2);
        
        // Transfer orbit velocities at periapsis and apoapsis
        const v_periapsis = Math.sqrt(this.EARTH_MU * (2 / r1 - 1 / a_transfer));
        const v_apoapsis = Math.sqrt(this.EARTH_MU * (2 / r2 - 1 / a_transfer));
        
        // Delta-v calculations
        const deltaV1 = Math.abs(v_periapsis - v1);
        const deltaV2 = Math.abs(v2 - v_apoapsis);
        const totalDeltaV = deltaV1 + deltaV2;
        
        // Transfer time (half the orbital period of transfer orbit)
        const transferTime = Math.PI * Math.sqrt(Math.pow(a_transfer, 3) / this.EARTH_MU);
        
        return {
            deltaV1,
            deltaV2,
            totalDeltaV,
            transferTime,
            transferOrbit: {
                semiMajorAxis: a_transfer,
                eccentricity: Math.abs(r2 - r1) / (r2 + r1)
            }
        };
    }
    
    // Calculate position at a specific time using Kepler's equation
    calculatePositionAtTime(time, initialElements) {
        // Use initial elements or current elements
        const elements = initialElements || {
            semiMajorAxis: this.semiMajorAxis,
            eccentricity: this.eccentricity,
            inclination: this.inclination,
            longitudeOfAscendingNode: this.longitudeOfAscendingNode,
            argumentOfPeriapsis: this.argumentOfPeriapsis,
            trueAnomaly: this.trueAnomaly
        };
        
        // Calculate mean motion
        const n = Math.sqrt(this.EARTH_MU / Math.pow(elements.semiMajorAxis, 3));
        
        // Calculate initial mean anomaly
        const E0 = 2 * Math.atan(Math.sqrt((1 - elements.eccentricity) / (1 + elements.eccentricity)) * Math.tan(elements.trueAnomaly / 2));
        const M0 = E0 - elements.eccentricity * Math.sin(E0);
        
        // Calculate mean anomaly at time t
        const M = M0 + n * time;
        
        // Solve Kepler's equation for eccentric anomaly using Newton-Raphson method
        let E = M;
        let dE = 1;
        while (Math.abs(dE) > 1e-8) {
            dE = (E - elements.eccentricity * Math.sin(E) - M) / (1 - elements.eccentricity * Math.cos(E));
            E -= dE;
        }
        
        // Calculate true anomaly
        const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + elements.eccentricity) / (1 - elements.eccentricity)) * Math.tan(E / 2));
        
        // Create new elements with updated true anomaly
        const newElements = {
            ...elements,
            trueAnomaly
        };
        
        // Convert to state vectors
        return this.orbitalElementsToStateVectors(newElements);
    }
    
    // Calculate orbital insertion burn
    calculateOrbitalInsertion(altitude, inclination) {
        // Calculate circular orbit velocity at desired altitude
        const r = this.EARTH_RADIUS + altitude;
        const v_orbit = Math.sqrt(this.EARTH_MU / r);
        
        // Simplified delta-v calculation (ignoring launch site latitude)
        // In a real simulator, this would account for Earth's rotation and launch site
        const deltaV = v_orbit;
        
        return {
            deltaV,
            orbitalVelocity: v_orbit,
            orbitalPeriod: 2 * Math.PI * Math.sqrt(Math.pow(r, 3) / this.EARTH_MU)
        };
    }
    
    // Reset the orbital mechanics calculator
    reset() {
        this.semiMajorAxis = 0;
        this.eccentricity = 0;
        this.inclination = 0;
        this.longitudeOfAscendingNode = 0;
        this.argumentOfPeriapsis = 0;
        this.trueAnomaly = 0;
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
    }
}

export { OrbitalMechanics };
