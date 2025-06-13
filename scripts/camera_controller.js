// Advanced camera controller for Starship Simulator
import * as THREE from 'three';

/**
 * Camera controller that provides smooth tracking and transitions
 */
export class CameraController {
    /**
     * Create a new camera controller
     * @param {THREE.PerspectiveCamera} camera - The camera to control
     * @param {THREE.OrbitControls} orbitControls - Orbit controls instance
     */
    constructor(camera, orbitControls) {
        this.camera = camera;
        this.orbitControls = orbitControls;
        this.target = new THREE.Vector3(0, 0, 0);
        this.position = new THREE.Vector3(0, 0, 0);
        this.currentMode = 'external';
        
        // Improve orbit controls for better user experience
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1; // More responsive
        this.orbitControls.rotateSpeed = 0.7; // Slightly slower rotation for more control
        this.orbitControls.panSpeed = 0.8; // Adjusted pan speed
        this.orbitControls.zoomSpeed = 1.2; // Slightly faster zoom
        this.orbitControls.keyPanSpeed = 20; // Faster keyboard pan
        this.orbitControls.minDistance = 10; // Minimum zoom distance
        this.orbitControls.maxDistance = 2000; // Maximum zoom distance
        
        // Camera transition properties
        this.transitioning = false;
        this.transitionStartTime = 0;
        this.transitionDuration = 1.5; // seconds - faster transitions
        this.startPosition = new THREE.Vector3();
        this.startTarget = new THREE.Vector3();
        this.endPosition = new THREE.Vector3();
        this.endTarget = new THREE.Vector3();
        
        // Dynamic tracking properties
        this.trackingObject = null;
        this.trackingOffset = new THREE.Vector3(0, 0, 0);
        this.trackingDistance = 200;
        this.trackingHeight = 100;
        this.trackingLerp = 0.08; // Increased to follow the object more closely
        
        // Camera shake properties
        this.shakeEnabled = false;
        this.shakeIntensity = 0;
        this.maxShakeIntensity = 0.7; // Reduced max intensity for less jarring shake
        this.shakeDecay = 0.92; // Slightly faster decay
        this.shakeVector = new THREE.Vector3();
        
        // Add quick navigation presets
        this.addCameraControls();
    }
    
    /**
     * Set the camera mode with smooth transition
     * @param {string} mode - Camera mode (external, booster, starship, tower, tracking)
     * @param {Object} positions - Camera positions configuration
     */
    setMode(mode, positions) {
        // Don't transition to the same mode
        if (mode === this.currentMode && !this.transitioning) return;
        
        this.currentMode = mode;
        
        // Start transition
        this.transitioning = true;
        this.transitionStartTime = Date.now() / 1000;
        
        // Store current position and target as start points
        this.startPosition.copy(this.camera.position);
        this.startTarget.copy(this.orbitControls.target);
        
        // Set end position and target based on mode
        if (mode === 'tracking' && this.trackingObject) {
            // For tracking mode, we'll update the end position in the update method
            const objectPosition = this.trackingObject.position.clone();
            this.endPosition.copy(objectPosition).add(new THREE.Vector3(
                this.trackingDistance, 
                this.trackingHeight, 
                this.trackingDistance
            ));
            this.endTarget.copy(objectPosition);
        } else if (positions[mode]) {
            this.endPosition.copy(positions[mode].position);
            this.endTarget.copy(positions[mode].target);
        }
        
        // Disable orbit controls during transition
        this.orbitControls.enabled = false;
    }
    
    /**
     * Track an object with the camera
     * @param {Object} object - Object to track
     * @param {number} deltaTime - Time step for smooth tracking
     * @param {number} distance - Distance from camera to object
     * @param {number} height - Height offset
     * @param {THREE.Vector3} offset - Additional offset vector
     */
    trackObject(object, deltaTime = 0.016, distance = 100, height = 30, offset = new THREE.Vector3(0, 0, 0)) {
        // Validate input object has required properties
        if (!object || !object.position) {
            console.error('Invalid object for camera tracking - missing position property');
            return;
        }
        
        // Create quaternion property if it doesn't exist (needed for some tracking situations)
        if (!object.quaternion) {
            object.quaternion = new THREE.Quaternion();
        }
        
        console.log(`Tracking object at position: ${object.position.x.toFixed(2)}, ${object.position.y.toFixed(2)}, ${object.position.z.toFixed(2)}`);
        console.log(`Tracking parameters: distance=${distance}, height=${height}, offset=${offset.x},${offset.y},${offset.z}`);
        
        // Store tracking parameters
        this.trackingObject = object;
        this.trackingDistance = distance || 100;
        this.trackingHeight = height || 30;
        this.trackingOffset = offset || new THREE.Vector3(0, 0, 0);
        this.trackingDeltaTime = deltaTime || 0.016;
        
        // Immediately update camera position without smoothing to prevent freezing
        this.updateCameraPositionImmediate();
        
        // Set flag for continuous tracking
        this.isTracking = true;
        
        if (height !== null && typeof height === 'number') {
            this.trackingHeight = height;
        } else {
            this.trackingHeight = 100; // Default height
        }
        
        // Update camera immediately with no interpolation
        this.smoothingFactor = 1.0; // Temporarily disable smoothing
        this.update(deltaTime);
        this.smoothingFactor = 0.1; // Restore normal smoothing
    }

    /**
     * Immediately update camera position (helper method)
     */
    updateCameraPositionImmediate() {
        if (!this.trackingObject) return;
        
        const objectPosition = this.trackingObject.position.clone();
        const targetPosition = objectPosition.clone().add(new THREE.Vector3(
            this.trackingDistance, 
            this.trackingHeight, 
            this.trackingDistance
        ));
        
        // Set camera position immediately without interpolation
        this.camera.position.copy(targetPosition);
        this.orbitControls.target.copy(objectPosition);
        this.orbitControls.update();
    }
    
    /**
     * Add camera shake effect (for launch, engines, etc.)
     * @param {number} intensity - Shake intensity
     */
    addShake(intensity) {
        this.shakeEnabled = true;
        this.shakeIntensity = Math.min(this.maxShakeIntensity, intensity);
    }
    
    /**
     * Update camera position and handle transitions
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Handle camera shake
        if (this.shakeEnabled && this.shakeIntensity > 0.001) {
            // Generate random shake offset
            this.shakeVector.set(
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity,
                (Math.random() - 0.5) * this.shakeIntensity
            );
            
            // Apply shake to camera
            this.camera.position.add(this.shakeVector);
            
            // Decay shake intensity
            this.shakeIntensity *= this.shakeDecay;
        } else {
            this.shakeEnabled = false;
            this.shakeIntensity = 0;
        }
        
        // Handle camera transitions
        if (this.transitioning) {
            const currentTime = Date.now() / 1000;
            const elapsed = currentTime - this.transitionStartTime;
            const progress = Math.min(elapsed / this.transitionDuration, 1.0);
            
            // Use smooth easing function
            const eased = this.easeInOutCubic(progress);
            
            // If in tracking mode, update the end position based on tracked object
            if (this.currentMode === 'tracking' && this.trackingObject) {
                const objectPosition = this.trackingObject.position.clone();
                this.endPosition.copy(objectPosition).add(new THREE.Vector3(
                    this.trackingDistance, 
                    this.trackingHeight, 
                    this.trackingDistance
                ));
                this.endTarget.copy(objectPosition);
            }
            
            // Interpolate position and target
            this.camera.position.lerpVectors(this.startPosition, this.endPosition, eased);
            this.orbitControls.target.lerpVectors(this.startTarget, this.endTarget, eased);
            
            // Update controls
            this.orbitControls.update();
            
            // Check if transition is complete
            if (progress >= 1.0) {
                this.transitioning = false;
                this.orbitControls.enabled = true;
            }
        } 
        // Handle dynamic object tracking when not transitioning
        else if (this.currentMode === 'tracking' && this.trackingObject) {
            const objectPosition = this.trackingObject.position.clone();
            const targetPosition = objectPosition.clone().add(new THREE.Vector3(
                this.trackingDistance, 
                this.trackingHeight, 
                this.trackingDistance
            ));
            
            // Smoothly move camera to follow object
            this.camera.position.lerp(targetPosition, this.trackingLerp * deltaTime * 10);
            this.orbitControls.target.lerp(objectPosition, this.trackingLerp * deltaTime * 10);
            
            // Update controls
            this.orbitControls.update();
        }
    }
    
    /**
     * Cubic easing function for smooth transitions
     * @param {number} t - Progress from 0 to 1
     * @returns {number} Eased value
     */
    easeInOutCubic(t) {
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    /**
     * Get the current camera mode
     * @returns {string} Current camera mode
     */
    getMode() {
        return this.currentMode;
    }
    
    /**
     * Add camera control UI elements for easier navigation
     */
    addCameraControls() {
        // Create container for camera controls
        const container = document.createElement('div');
        container.className = 'camera-controls';
        container.style.position = 'absolute';
        container.style.top = '20px';
        container.style.right = '20px';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '10px';
        container.style.zIndex = '100';
        
        // Create camera reset button
        const resetButton = document.createElement('button');
        resetButton.innerText = 'Reset Camera';
        resetButton.className = 'control-button';
        resetButton.style.padding = '8px 12px';
        resetButton.style.backgroundColor = '#333';
        resetButton.style.color = 'white';
        resetButton.style.border = '1px solid #555';
        resetButton.style.borderRadius = '4px';
        resetButton.style.cursor = 'pointer';
        resetButton.addEventListener('click', () => {
            // Reset to default external view
            this.setMode('external');
        });
        
        // Add help text for camera controls
        const helpText = document.createElement('div');
        helpText.innerHTML = `
            <div style="background-color: rgba(0,0,0,0.7); padding: 10px; border-radius: 4px; margin-top: 10px; font-size: 12px; color: white;">
                <strong>Camera Controls:</strong><br>
                Left-click + drag: Rotate<br>
                Right-click + drag: Pan<br>
                Scroll: Zoom in/out<br>
                Middle-click + drag: Pan
            </div>
        `;
        
        // Add buttons to container
        container.appendChild(resetButton);
        container.appendChild(helpText);
        
        // Add container to document
        document.body.appendChild(container);
    }
}
