import * as THREE from 'three';

/**
 * Creates realistic Raptor engine exhaust effects
 * @param {THREE.Object3D} engineMesh - The engine mesh to attach the effect to
 * @param {number} power - Power level from 0 to 1
 * @returns {Object} An object containing the exhaust effects and update function
 */
export function createRaptorEngineEffect(engineMesh, power = 0) {
    // Engine exhaust group to hold all effects
    const exhaustGroup = new THREE.Group();
    
    // Create primary exhaust plume
    const plumeGeometry = new THREE.CylinderGeometry(0.3, 1.5, 6, 16, 10, true);
    
    // Custom shader material for the animated fire effect
    const plumeShaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 },
            power: { value: power },
            colorBase: { value: new THREE.Color(0xFFA500) }, // Orange base
            colorAccent: { value: new THREE.Color(0xFF4500) }, // Red-orange accent
        },
        vertexShader: `
            varying vec2 vUv;
            varying float vDisplacement;
            
            void main() {
                vUv = uv;
                
                // Create animated displacement for flame effect
                float displacement = sin(position.y * 2.0 + position.x * 5.0) * 0.1;
                displacement += cos(position.z * 3.0 + position.y * 2.0) * 0.1;
                
                // More displacement at the bottom of the plume
                displacement *= (1.0 - position.y * 0.1);
                
                // Apply displacement to the vertices
                vec3 newPosition = position;
                newPosition.x += displacement;
                newPosition.z += displacement;
                
                vDisplacement = displacement;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform float power;
            uniform vec3 colorBase;
            uniform vec3 colorAccent;
            
            varying vec2 vUv;
            varying float vDisplacement;
            
            void main() {
                // Create turbulent noise pattern for flame
                float noise = sin(vUv.y * 20.0 + time * 2.0) * 0.5 + 0.5;
                noise += cos(vUv.x * 15.0 + time * 3.0) * 0.25;
                
                // Stronger at the center, fading to edges
                float edge = 1.0 - 2.0 * abs(vUv.x - 0.5);
                
                // Mix colors based on noise and position
                vec3 color = mix(colorBase, colorAccent, noise * vUv.y);
                
                // Add white hot core
                float core = smoothstep(0.4, 0.0, length(vUv - vec2(0.5, 0.8)));
                color = mix(color, vec3(1.0, 1.0, 0.8), core * 0.7);
                
                // Fade out at edges and based on power level
                float alpha = edge * (1.0 - vUv.y) * power;
                
                // Add some horizontal bands/rings
                float bands = sin(vUv.y * 30.0) * 0.05;
                alpha += bands * power;
                
                // Ensure minimum transparency at low power
                alpha = max(0.0, alpha);
                
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
    });
    
    const plume = new THREE.Mesh(plumeGeometry, plumeShaderMaterial);
    plume.position.y = -3; // Position below the engine
    plume.rotation.x = Math.PI; // Point downward
    
    // Add shock diamonds (bright spots in the exhaust)
    const shockDiamondGeometry = new THREE.SphereGeometry(0.4, 16, 8);
    const shockDiamondMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFAA,
        transparent: true,
        opacity: 0.8,
    });
    
    // Create multiple shock diamonds
    const shockDiamonds = [];
    for (let i = 0; i < 4; i++) {
        const diamond = new THREE.Mesh(shockDiamondGeometry, shockDiamondMaterial);
        diamond.position.y = -2 - i * 1.5; // Position along the exhaust
        diamond.scale.set(0.1, 0.3, 0.1); // Flatten for right shape
        exhaustGroup.add(diamond);
        shockDiamonds.push(diamond);
    }
    
    // Add small particles for smoke effect
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    
    // Create particle positions
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    
    for (let i = 0; i < particleCount; i++) {
        // Initial positions (will be updated in animation)
        positions[i * 3] = (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = -3 - Math.random() * 5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
        
        // Store velocity and lifetime for animation
        velocities.push(
            (Math.random() - 0.5) * 0.1,
            -Math.random() * 0.5 - 0.2,
            (Math.random() - 0.5) * 0.1
        );
        
        // Random lifetime for each particle
        lifetimes.push(Math.random() * 2);
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xDDDDDD,
        size: 0.1,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    exhaustGroup.add(particles);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFAA44,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = -0.5;
    exhaustGroup.add(glow);
    
    // Add engine bell heating effect (reddish glow)
    const heatGeometry = new THREE.CylinderGeometry(0.4, 0.8, 1.5, 16);
    const heatMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF2200,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
    });
    
    const heatGlow = new THREE.Mesh(heatGeometry, heatMaterial);
    heatGlow.position.y = -0.75;
    exhaustGroup.add(heatGlow);
    
    // Attach exhaust group to the engine
    engineMesh.add(exhaustGroup);
    
    // Animation time tracker
    let time = 0;
    
    // Update function for animating the effects
    function update(deltaTime, currentPower) {
        // Update shader time
        time += deltaTime;
        plumeShaderMaterial.uniforms.time.value = time;
        
        // Update power level with better clamping
        const targetPower = Math.max(0, Math.min(1, currentPower || 0));
        power = power * 0.9 + targetPower * 0.1; // Smooth transition
        plumeShaderMaterial.uniforms.power.value = power;
        
        // Scale effects based on power
        plume.scale.set(
            0.8 + power * 0.4, 
            0.5 + power * 0.8, 
            0.8 + power * 0.4
        );
        
        // Update shock diamonds
        shockDiamonds.forEach((diamond, i) => {
            diamond.position.y = -2 - i * (1.2 + power * 0.5);
            diamond.scale.x = diamond.scale.z = 0.1 + power * 0.3 * (1 - i * 0.2);
            diamond.scale.y = 0.3 + power * 0.3;
            diamond.material.opacity = power * 0.8 * (1 - i * 0.2);
        });
        
        // Update glow effect
        glow.scale.set(
            1 + power * 1.5,
            1 + power * 1.5,
            1 + power * 1.5
        );
        glow.material.opacity = power * 0.7;
        
        // Update heat glow on engine bell
        heatGlow.material.opacity = power * 0.6;
        
        // Animate particles
        if (power > 0.1) {
            const positions = particleGeometry.getAttribute('position').array;
            
            for (let i = 0; i < particleCount; i++) {
                // Update particle positions
                positions[i * 3] += velocities[i * 3] * deltaTime * 10;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime * 10;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime * 10;
                
                // Update lifetime and reset particles
                lifetimes[i] -= deltaTime;
                
                if (lifetimes[i] <= 0) {
                    // Reset particle
                    positions[i * 3] = (Math.random() - 0.5) * 0.2 * power;
                    positions[i * 3 + 1] = -3 - Math.random() * 2 * power;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.2 * power;
                    
                    // Reset lifetime
                    lifetimes[i] = Math.random() * 2;
                }
            }
            
            particleGeometry.getAttribute('position').needsUpdate = true;
        }
    }
    
    // Return the group and the update function
    return {
        group: exhaustGroup,
        update: update,
    };
}

/**
 * Creates engine effects for a group of engines
 * @param {Array} engines - Array of engine meshes
 * @returns {Object} Object containing effect update function
 */
export function createEngineEffects(engines) {
    const engineEffects = [];
    
    // Create effects for each engine
    engines.forEach(engine => {
        engineEffects.push(createRaptorEngineEffect(engine, 0));
    });
    
    // Return update function for all effects
    return {
        update: function(deltaTime, power) {
            engineEffects.forEach(effect => {
                effect.update(deltaTime, power);
            });
        }
    };
}
