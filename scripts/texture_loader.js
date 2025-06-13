// Advanced texture loader for Starship Simulator
import * as THREE from 'three';

// Utility function to convert a diffuse texture to a normal map
function diffuseToNormalMap(diffuseTexture, strength = 1.0) {
    // Create a new canvas with the same dimensions
    const canvas = document.createElement('canvas');
    const diffuseImage = diffuseTexture.image;
    
    if (!diffuseImage) {
        console.warn('Diffuse texture has no image data');
        return createDefaultNormalMap();
    }
    
    canvas.width = diffuseImage.width || 512;
    canvas.height = diffuseImage.height || 512;
    const ctx = canvas.getContext('2d');
    
    // Draw the diffuse texture to the canvas
    try {
        ctx.drawImage(diffuseImage, 0, 0);
    } catch (e) {
        console.warn('Could not draw diffuse image to canvas:', e);
        return createDefaultNormalMap();
    }
    
    // Get the image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Create a new image data for the normal map
    const normalData = ctx.createImageData(canvas.width, canvas.height);
    const normalPixels = normalData.data;
    
    // Simple sobel filter for normal map generation
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            // Sample surrounding pixels for height (using grayscale)
            const tl = (data[((y-1) * canvas.width + (x-1)) * 4] + 
                       data[((y-1) * canvas.width + (x-1)) * 4 + 1] + 
                       data[((y-1) * canvas.width + (x-1)) * 4 + 2]) / 3;
            const t  = (data[((y-1) * canvas.width + x) * 4] + 
                       data[((y-1) * canvas.width + x) * 4 + 1] + 
                       data[((y-1) * canvas.width + x) * 4 + 2]) / 3;
            const tr = (data[((y-1) * canvas.width + (x+1)) * 4] + 
                       data[((y-1) * canvas.width + (x+1)) * 4 + 1] + 
                       data[((y-1) * canvas.width + (x+1)) * 4 + 2]) / 3;
            const l  = (data[(y * canvas.width + (x-1)) * 4] + 
                       data[(y * canvas.width + (x-1)) * 4 + 1] + 
                       data[(y * canvas.width + (x-1)) * 4 + 2]) / 3;
            const r  = (data[(y * canvas.width + (x+1)) * 4] + 
                       data[(y * canvas.width + (x+1)) * 4 + 1] + 
                       data[(y * canvas.width + (x+1)) * 4 + 2]) / 3;
            const bl = (data[((y+1) * canvas.width + (x-1)) * 4] + 
                       data[((y+1) * canvas.width + (x-1)) * 4 + 1] + 
                       data[((y+1) * canvas.width + (x-1)) * 4 + 2]) / 3;
            const b  = (data[((y+1) * canvas.width + x) * 4] + 
                       data[((y+1) * canvas.width + x) * 4 + 1] + 
                       data[((y+1) * canvas.width + x) * 4 + 2]) / 3;
            const br = (data[((y+1) * canvas.width + (x+1)) * 4] + 
                       data[((y+1) * canvas.width + (x+1)) * 4 + 1] + 
                       data[((y+1) * canvas.width + (x+1)) * 4 + 2]) / 3;
            
            // Sobel filter for X and Y gradients
            const gx = -tl - 2*l - bl + tr + 2*r + br;
            const gy = -tl - 2*t - tr + bl + 2*b + br;
            
            // Calculate normal vector
            const nx = -gx * strength;
            const ny = -gy * strength;
            const nz = 255;
            
            // Normalize and map to 0-255 range
            const length = Math.sqrt(nx*nx + ny*ny + nz*nz);
            
            // Store in RGB format (normal map convention)
            normalPixels[idx] = 128 + (nx / length) * 127;     // R = X
            normalPixels[idx+1] = 128 + (ny / length) * 127;   // G = Y
            normalPixels[idx+2] = nz / length * 255;           // B = Z
            normalPixels[idx+3] = 255;                         // Alpha
        }
    }
    
    // Put the normal map data back to the canvas
    ctx.putImageData(normalData, 0, 0);
    
    // Create a texture from the canvas
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    
    return normalTexture;
}

// Create a default normal map (flat blue)
function createDefaultNormalMap(width = 256, height = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // Standard normal map blue (pointing up in Z)
    ctx.fillStyle = '#8080FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

/**
 * Creates and loads all textures for the simulation
 * @returns {Object} Object containing all loaded textures
 */
export function loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const textures = {};
    
    try {
        // Create procedural textures - diffuse maps
        textures.starship = createStarshipTexture();
        textures.mars = createMarsTexture();
        textures.stars = createStarsTexture();
        textures.launchpad = createLaunchpadTexture();
        
        // Create normal maps
        textures.starshipNormal = createStarshipNormalMap();
        textures.marsNormal = createMarsNormalMap();
        textures.launchpadNormal = createLaunchpadNormalMap();
        
        // Create displacement maps
        textures.starshipDisplacement = createStarshipDisplacementMap();
        textures.launchpadDisplacement = createLaunchpadDisplacementMap();
        
        // Create roughness maps
        textures.starshipRoughness = createStarshipRoughnessMap();
        textures.launchpadRoughness = createLaunchpadRoughnessMap();
        
        // Create metalness maps
        textures.starshipMetalness = createStarshipMetalnessMap();
    } catch (e) {
        console.warn('Error creating textures:', e);
    }
    
    return textures;
}

/**
 * Creates a detailed texture for the Starship
 * @returns {THREE.Texture} Starship texture
 */
function createStarshipTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base metallic color
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#E8E8E8');
    gradient.addColorStop(0.5, '#F5F5F5');
    gradient.addColorStop(1, '#E0E0E0');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add panel lines
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    
    // Horizontal panels
    const panelHeight = 64;
    for (let y = 0; y < canvas.height; y += panelHeight) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Vertical panels with variation
    for (let x = 0; x < canvas.width; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Add rivets and details
    ctx.fillStyle = '#AAAAAA';
    for (let y = panelHeight/2; y < canvas.height; y += panelHeight) {
        for (let x = 32; x < canvas.width; x += 64) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Add some wear and tear
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 1 + Math.random() * 3;
        
        ctx.fillStyle = `rgba(120, 120, 120, ${Math.random() * 0.3})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

/**
 * Creates a detailed texture for Mars
 * @returns {THREE.Texture} Mars texture
 */
function createMarsTexture() {
    // Use Solar System Scope 8K Mars texture
    const textureLoader = new THREE.TextureLoader();
    
    console.log('Loading 8K Mars texture from Solar System Scope');
    
    try {
        // Attempt to load the high-res texture
        const texture = textureLoader.load('./images/mars_8k.jpg', 
            // onLoad callback
            function(texture) {
                console.log('Mars texture loaded successfully');
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.encoding = THREE.sRGBEncoding; // Use proper color encoding
                texture.anisotropy = 16; // Higher quality texture filtering
            },
            // onProgress callback
            function(xhr) {
                console.log('Mars texture loading: ' + (xhr.loaded / xhr.total * 100) + '%');
            },
            // onError callback
            function(error) {
                console.error('Error loading Mars texture:', error);
                // Fall back to procedural texture
                return createProceduralMarsTexture();
            }
        );
        
        return texture;
    } catch (error) {
        console.error('Exception while loading Mars texture:', error);
        // Fall back to procedural texture
        return createProceduralMarsTexture();
    }
}

/**
 * Creates a procedural Mars texture as a fallback
 * @returns {THREE.Texture} Mars texture
 */
function createProceduralMarsTexture() {
    console.log('Falling back to procedural Mars texture');
    
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base Mars color
    const gradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height/2, 0,
        canvas.width/2, canvas.height/2, canvas.width/2
    );
    gradient.addColorStop(0, '#D76A4C'); // Lighter center
    gradient.addColorStop(0.7, '#C1440E'); // Base Mars color
    gradient.addColorStop(1, '#9E3A0F'); // Darker edge
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add large features - Valles Marineris
    ctx.fillStyle = '#7A2C0A';
    ctx.beginPath();
    ctx.ellipse(
        canvas.width * 0.5, 
        canvas.height * 0.4, 
        canvas.width * 0.4, 
        canvas.height * 0.1, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Olympus Mons
    ctx.fillStyle = '#E27D60';
    ctx.beginPath();
    ctx.arc(
        canvas.width * 0.3,
        canvas.height * 0.3,
        canvas.width * 0.1,
        0, Math.PI * 2
    );
    ctx.fill();
    
    // Add polar ice caps with gradient
    const polarGradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height * 0.1, 0,
        canvas.width/2, canvas.height * 0.1, canvas.width * 0.5
    );
    polarGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    polarGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    polarGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    polarGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    // North pole
    ctx.fillStyle = polarGradient;
    ctx.beginPath();
    ctx.ellipse(
        canvas.width * 0.5, 
        canvas.height * 0.1, 
        canvas.width * 0.5, 
        canvas.height * 0.2, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // South pole
    const southPolarGradient = ctx.createRadialGradient(
        canvas.width/2, canvas.height * 0.9, 0,
        canvas.width/2, canvas.height * 0.9, canvas.width * 0.5
    );
    southPolarGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    southPolarGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    southPolarGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
    southPolarGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = southPolarGradient;
    ctx.beginPath();
    ctx.ellipse(
        canvas.width * 0.5, 
        canvas.height * 0.9, 
        canvas.width * 0.5, 
        canvas.height * 0.2, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Add craters and surface details
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 2 + Math.random() * 30;
        
        // Skip if in polar regions
        if (y < canvas.height * 0.2 || y > canvas.height * 0.8) {
            if (Math.random() > 0.7) continue;
        }
        
        // Crater
        const craterGradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, size
        );
        craterGradient.addColorStop(0, '#A33A0D');
        craterGradient.addColorStop(0.7, '#7A2C0A');
        craterGradient.addColorStop(1, '#C1440E');
        
        ctx.fillStyle = craterGradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Crater rim highlight
        ctx.strokeStyle = '#D55A2B';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, size + 1, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

/**
 * Creates a starfield texture
 * @returns {THREE.Texture} Stars texture
 */
function createStarsTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    
    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add stars with varying brightness
    for (let i = 0; i < 10000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        const brightness = 150 + Math.round(Math.random() * 105);
        
        // Star color variations
        let color;
        const colorRand = Math.random();
        if (colorRand > 0.95) {
            // Reddish stars
            color = `rgba(${brightness}, ${brightness * 0.7}, ${brightness * 0.7}, 1)`;
        } else if (colorRand > 0.9) {
            // Bluish stars
            color = `rgba(${brightness * 0.7}, ${brightness * 0.8}, ${brightness}, 1)`;
        } else {
            // White/yellow stars
            color = `rgba(${brightness}, ${brightness}, ${brightness * 0.9}, 1)`;
        }
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow to brighter stars
        if (size > 1.5) {
            const glow = ctx.createRadialGradient(
                x, y, 0,
                x, y, size * 4
            );
            glow.addColorStop(0, `rgba(${brightness}, ${brightness}, ${brightness}, 0.3)`);
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, size * 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

/**
 * Creates a launchpad texture
 * @returns {THREE.Texture} Launchpad texture
 */
function createLaunchpadTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Base concrete color
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add concrete texture
    for (let i = 0; i < 50000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * 2;
        const shade = 70 + Math.floor(Math.random() * 30);
        
        ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Add grid pattern
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 3;
    
    const gridSize = 64;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Add some burn marks
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = 20 + Math.random() * 50;
        
        const burnGradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, size
        );
        burnGradient.addColorStop(0, 'rgba(30, 30, 30, 0.9)');
        burnGradient.addColorStop(1, 'rgba(80, 80, 80, 0)');
        
        ctx.fillStyle = burnGradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
}

// Create normal maps for materials
function createStarshipNormalMap() {
    return createDefaultNormalMap(512, 512);
}

function createMarsNormalMap() {
    return createDefaultNormalMap(1024, 1024);
}

function createLaunchpadNormalMap() {
    return createDefaultNormalMap(512, 512);
}

// Create displacement maps
function createStarshipDisplacementMap() {
    return createDefaultNormalMap(512, 512);
}

function createLaunchpadDisplacementMap() {
    return createDefaultNormalMap(512, 512);
}

// Create roughness maps
function createStarshipRoughnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return new THREE.CanvasTexture(canvas);
}

function createLaunchpadRoughnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#CCCCCC';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return new THREE.CanvasTexture(canvas);
}

// Create metalness maps
function createStarshipMetalnessMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    return new THREE.CanvasTexture(canvas);
}
