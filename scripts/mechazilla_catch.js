// Mechazilla catch simulation module for SpaceX Starship Simulator
// Implements the tower catch mechanism for Super Heavy booster recovery

class MechazillaCatchSimulation {
    constructor() {
        // Tower properties
        this.towerHeight = 146; // meters
        this.towerPosition = { x: -50, y: 0, z: 0 }; // meters
        
        // Arm properties
        this.armLength = 20; // meters
        this.armWidth = 2; // meters
        this.armPosition = { x: -50, y: 100, z: 0 }; // meters (starting position)
        this.armSpread = 15; // meters (distance between arms)
        this.armSpeed = 2; // meters per second (vertical movement)
        this.armClosingSpeed = 1; // meters per second (horizontal movement)
        
        // Catch points
        this.catchPointsHeight = 71 * 0.8; // meters (80% of Super Heavy height)
        this.catchPointsRadius = 4.5; // meters (half of Super Heavy diameter)
        
        // State variables
        this.armsOpen = true;
        this.armsVerticalPosition = 100; // meters (height on tower)
        this.armsHorizontalPosition = 15; // meters (spread from center)
        this.catchInProgress = false;
        this.catchSuccessful = false;
        this.catchFailed = false;
        
        // Booster state
        this.boosterPosition = { x: 0, y: 0, z: 0 };
        this.boosterVelocity = { x: 0, y: 0, z: 0 };
        this.boosterOrientation = { roll: 0, pitch: 0, yaw: 0 };
        
        // Tracking system
        this.trackingError = { x: 0, y: 0, z: 0 }; // meters
        this.trackingActive = false;
        this.trackingRange = 1000; // meters (maximum tracking distance)
        this.trackingAccuracy = 0.1; // meters (standard deviation of tracking error)
    }
    
    // Initialize the catch system
    initialize() {
        this.armsOpen = true;
        this.armsVerticalPosition = 100;
        this.armsHorizontalPosition = 15;
        this.catchInProgress = false;
        this.catchSuccessful = false;
        this.catchFailed = false;
        this.trackingActive = false;
    }
    
    // Start tracking the booster
    startTracking(boosterPosition, boosterVelocity) {
        // Calculate distance to booster
        const dx = boosterPosition.x - this.towerPosition.x;
        const dy = boosterPosition.y - this.towerPosition.y;
        const dz = boosterPosition.z - this.towerPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Check if booster is within tracking range
        if (distance <= this.trackingRange) {
            this.trackingActive = true;
            
            // Generate small random tracking errors
            this.trackingError = {
                x: (Math.random() - 0.5) * 2 * this.trackingAccuracy,
                y: (Math.random() - 0.5) * 2 * this.trackingAccuracy,
                z: (Math.random() - 0.5) * 2 * this.trackingAccuracy
            };
            
            return true;
        }
        
        return false;
    }
    
    // Update arm position based on booster tracking
    updateArmPosition(boosterPosition, deltaTime) {
        if (!this.trackingActive) return false;
        
        // Calculate target height for arms (match booster catch points)
        const targetHeight = boosterPosition.y - (71 - this.catchPointsHeight);
        
        // Move arms vertically toward target height
        const heightDifference = targetHeight - this.armsVerticalPosition;
        const heightMovement = Math.min(Math.abs(heightDifference), this.armSpeed * deltaTime) * Math.sign(heightDifference);
        this.armsVerticalPosition += heightMovement;
        
        // Clamp arm position to tower limits
        this.armsVerticalPosition = Math.max(10, Math.min(this.armsVerticalPosition, this.towerHeight - 10));
        
        // Update arm position
        this.armPosition.y = this.armsVerticalPosition;
        
        return Math.abs(heightDifference) < 1; // Return true if arms are close to target height
    }
    
    // Prepare for catch by opening arms
    prepareForCatch() {
        if (!this.trackingActive) return false;
        
        this.armsOpen = true;
        this.armsHorizontalPosition = 15;
        this.catchInProgress = true;
        
        return true;
    }
    
    // Attempt to catch the booster
    attemptCatch(boosterPosition, boosterVelocity, deltaTime) {
        if (!this.catchInProgress) return false;
        
        // Calculate horizontal distance from tower to booster
        const dx = boosterPosition.x - this.towerPosition.x;
        const dz = boosterPosition.z - this.towerPosition.z;
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        
        // Check if booster is aligned with tower
        if (horizontalDistance < 5) {
            // Check if booster is at the right height
            const heightDifference = Math.abs((boosterPosition.y - (71 - this.catchPointsHeight)) - this.armsVerticalPosition);
            
            if (heightDifference < 2) {
                // Close arms
                if (this.armsOpen) {
                    this.armsHorizontalPosition -= this.armClosingSpeed * deltaTime;
                    
                    // Check if arms have closed enough to catch
                    if (this.armsHorizontalPosition <= 5) {
                        this.armsOpen = false;
                        this.armsHorizontalPosition = 5;
                        
                        // Check catch conditions
                        const verticalVelocity = Math.abs(boosterVelocity.y);
                        const horizontalVelocity = Math.sqrt(boosterVelocity.x * boosterVelocity.x + boosterVelocity.z * boosterVelocity.z);
                        
                        // Catch is successful if velocities are within limits
                        if (verticalVelocity < 2 && horizontalVelocity < 1) {
                            this.catchSuccessful = true;
                            return true;
                        } else {
                            this.catchFailed = true;
                            return false;
                        }
                    }
                }
            } else {
                // Booster missed the catch arms
                if (boosterPosition.y < this.armsVerticalPosition - 5) {
                    this.catchFailed = true;
                    return false;
                }
            }
        } else if (boosterPosition.y < 10) {
            // Booster has reached ground level without being caught
            this.catchFailed = true;
            return false;
        }
        
        return false;
    }
    
    // Get current state of the catch system
    getState() {
        return {
            armPosition: this.armPosition,
            armsOpen: this.armsOpen,
            armsVerticalPosition: this.armsVerticalPosition,
            armsHorizontalPosition: this.armsHorizontalPosition,
            catchInProgress: this.catchInProgress,
            catchSuccessful: this.catchSuccessful,
            catchFailed: this.catchFailed,
            trackingActive: this.trackingActive
        };
    }
    
    // Update simulation for one time step
    update(deltaTime, boosterPosition, boosterVelocity, boosterOrientation) {
        // Update booster state
        this.boosterPosition = boosterPosition;
        this.boosterVelocity = boosterVelocity;
        this.boosterOrientation = boosterOrientation;
        
        // Start tracking if not already active
        if (!this.trackingActive) {
            this.startTracking(boosterPosition, boosterVelocity);
        }
        
        // Update arm position
        const armsInPosition = this.updateArmPosition(boosterPosition, deltaTime);
        
        // If arms are in position and catch is not in progress, prepare for catch
        if (armsInPosition && !this.catchInProgress) {
            this.prepareForCatch();
        }
        
        // Attempt catch if in progress
        if (this.catchInProgress && !this.catchSuccessful && !this.catchFailed) {
            this.attemptCatch(boosterPosition, boosterVelocity, deltaTime);
        }
        
        return this.getState();
    }
    
    // Reset the catch simulation
    reset() {
        this.armsOpen = true;
        this.armsVerticalPosition = 100;
        this.armsHorizontalPosition = 15;
        this.catchInProgress = false;
        this.catchSuccessful = false;
        this.catchFailed = false;
        this.trackingActive = false;
        this.armPosition = { x: -50, y: 100, z: 0 };
    }
}

export { MechazillaCatchSimulation };
