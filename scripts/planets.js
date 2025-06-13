import * as THREE from 'three';
import { loadTextures } from './texture_loader.js';

/**
 * Creates a realistic Mars planet with proper textures
 * @param {number} radius - Radius of the planet in units
 * @param {number} distance - Distance from the origin
 * @param {THREE.Texture} marsTexture - Optional pre-loaded Mars texture
 * @returns {THREE.Group} Mars object with proper rotation
 */
export function createMars(radius = 1000, distance = 50000, marsTexture = null) {
    const marsGroup = new THREE.Group();
    
    // Use provided texture or create a procedural one
    let marsMap = marsTexture;
    let marsBumpMap = null;
    
    if (!marsMap) {
        // Try to load from texture_loader
        try {
            const textures = loadTextures();
            if (textures && textures.mars) {
                marsMap = textures.mars;
                if (textures.marsNormal) {
                    marsBumpMap = textures.marsNormal;
                }
            }
        } catch (e) {
            console.warn('Could not load Mars texture from texture_loader, falling back to procedural texture');
        }
    }
    
    // If still no texture, create a procedural one
    if (!marsMap) {
        // Create canvas for Mars texture
        const textureCanvas = document.createElement('canvas');
        const context = textureCanvas.getContext('2d');
        textureCanvas.width = 1024;
        textureCanvas.height = 512;
        
        // Draw Mars surface (reddish-orange with darker areas)
        context.fillStyle = '#C1440E'; // Base Mars color
        context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
        
        // Add darker regions (maria)
        context.fillStyle = '#7A2C0A';
        
        // Draw northern dark region
        context.beginPath();
        context.ellipse(
            textureCanvas.width * 0.5, 
            textureCanvas.height * 0.3, 
            textureCanvas.width * 0.4, 
            textureCanvas.height * 0.2, 
            0, 0, Math.PI * 2
        );
        context.fill();
        
        // Draw southern crater region
        context.beginPath();
        context.ellipse(
            textureCanvas.width * 0.7, 
            textureCanvas.height * 0.6, 
            textureCanvas.width * 0.2, 
            textureCanvas.height * 0.2, 
            0, 0, Math.PI * 2
        );
        context.fill();
        
        // Add some craters and surface details
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * textureCanvas.width;
            const y = Math.random() * textureCanvas.height;
            const size = 5 + Math.random() * 20;
            
            context.fillStyle = '#A33A0D';
            context.beginPath();
            context.arc(x, y, size, 0, Math.PI * 2);
            context.fill();
            
            // Crater rim highlight
            context.strokeStyle = '#D55A2B';
            context.lineWidth = 1;
            context.beginPath();
            context.arc(x, y, size + 1, 0, Math.PI * 2);
            context.stroke();
        }
        
        // Add polar ice caps
        context.fillStyle = '#FFFFFF';
        
        // North pole
        context.beginPath();
        context.ellipse(
            textureCanvas.width * 0.5, 
            textureCanvas.height * 0.1, 
            textureCanvas.width * 0.5, 
            textureCanvas.height * 0.1, 
            0, 0, Math.PI * 2
        );
        context.fill();
        
        // South pole
        context.beginPath();
        context.ellipse(
            textureCanvas.width * 0.5, 
            textureCanvas.height * 0.9, 
            textureCanvas.width * 0.5, 
            textureCanvas.height * 0.1, 
            0, 0, Math.PI * 2
        );
        context.fill();
        
        // Create texture from canvas
        marsMap = new THREE.CanvasTexture(textureCanvas);
        
        // Create bump map for terrain
        const bumpCanvas = document.createElement('canvas');
        const bumpContext = bumpCanvas.getContext('2d');
        bumpCanvas.width = 512;
        bumpCanvas.height = 256;
        
        // Fill with noise for the bump map
        bumpContext.fillStyle = '#888888';
        bumpContext.fillRect(0, 0, bumpCanvas.width, bumpCanvas.height);
        
        for (let i = 0; i < 1000; i++) {
            const x = Math.random() * bumpCanvas.width;
            const y = Math.random() * bumpCanvas.height;
            const size = 1 + Math.random() * 4;
            const brightness = 100 + Math.round(Math.random() * 155);
            
            bumpContext.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
            bumpContext.beginPath();
            bumpContext.arc(x, y, size, 0, Math.PI * 2);
            bumpContext.fill();
        }
        
        marsBumpMap = new THREE.CanvasTexture(bumpCanvas);
    }
    
    // Create Mars material with available textures
    const marsMaterial = new THREE.MeshStandardMaterial({
        map: marsMap,
        roughness: 0.9,
        metalness: 0.1
    });
    
    // Add bump map if available
    if (marsBumpMap) {
        marsMaterial.bumpMap = marsBumpMap;
        marsMaterial.bumpScale = 0.5;
    }
    
    // Create Mars sphere with higher detail
    const marsGeometry = new THREE.SphereGeometry(radius, 96, 64);
    const mars = new THREE.Mesh(marsGeometry, marsMaterial);
    
    // Add a subtle atmosphere glow
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.03, 96, 64);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: 0xE27D60,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    
    // Position Mars
    marsGroup.position.set(distance, 0, -distance * 0.5);
    
    // Add Mars and atmosphere to group
    marsGroup.add(mars);
    marsGroup.add(atmosphere);
    
    // Add rotation animation
    marsGroup.rotation.y = Math.random() * Math.PI * 2;
    
    return marsGroup;
}

/**
 * Updates Mars rotation
 * @param {THREE.Group} marsGroup - The Mars group to animate
 * @param {number} deltaTime - Time since last frame
 */
export function updateMars(marsGroup, deltaTime) {
    // Mars rotates slower than Earth, about 24.6 hours
    marsGroup.rotation.y += deltaTime * 0.05;
}
