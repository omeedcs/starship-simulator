// ISRU (In-Situ Resource Utilization) System for Starship Simulator
import * as THREE from 'three';

/**
 * Simulates the ISRU systems for propellant production on Mars
 * Implements the Sabatier reaction (methanation): CO₂ + 4H₂ → CH₄ + 2H₂O
 */
export class ISRUSystem {
    constructor() {
        // System parameters
        this.active = false;
        this.reactorTemperature = 300; // K, optimal is ~400°C (673K)
        this.reactorPressure = 1; // atm
        this.catalystEfficiency = 0.92; // Ni or Ru catalyst efficiency
        
        // Resource collection rates (kg/hour)
        this.co2CollectionRate = 2.0; // CO₂ from atmosphere
        this.waterElectrolysisRate = 0.5; // H₂O electrolysis for H₂
        
        // Storage capacities (kg)
        this.co2Storage = 0;
        this.co2StorageCapacity = 100;
        
        this.h2Storage = 0;
        this.h2StorageCapacity = 20;
        
        this.ch4Storage = 0;
        this.ch4StorageCapacity = 500;
        
        this.h2oStorage = 0;
        this.h2oStorageCapacity = 200;
        
        // Power systems
        this.availablePower = 50; // kW
        this.co2CollectionPower = 2; // kW per kg/h
        this.electrolysisSystemPower = 10; // kW per kg/h
        this.reactorHeatingPower = 5; // kW
        
        // Reaction stoichiometry (molar ratios)
        this.co2MolarMass = 44.01; // g/mol
        this.h2MolarMass = 2.016; // g/mol
        this.ch4MolarMass = 16.04; // g/mol
        this.h2oMolarMass = 18.015; // g/mol
        
        // Reaction requires 4 mol H₂ per 1 mol CO₂
        this.h2ToCo2Ratio = 4 * (this.h2MolarMass / this.co2MolarMass);
        
        // Reaction produces 1 mol CH₄ and 2 mol H₂O per 1 mol CO₂
        this.ch4ToCo2Ratio = 1 * (this.ch4MolarMass / this.co2MolarMass);
        this.h2oToCo2Ratio = 2 * (this.h2oMolarMass / this.co2MolarMass);
        
        // Process telemetry
        this.telemetry = {
            reactorTemp: this.reactorTemperature,
            reactorPressure: this.reactorPressure,
            powerUsage: 0,
            co2Level: 0,
            h2Level: 0,
            ch4Level: 0,
            h2oLevel: 0,
            reactorEfficiency: 0,
            methanationRate: 0
        };
    }
    
    /**
     * Update the ISRU system simulation
     * @param {number} deltaTime - Time step in hours
     * @returns {Object} Current ISRU system status
     */
    update(deltaTime) {
        if (!this.active) return this.getTelemetry();
        
        // Calculate available power for each subsystem
        let remainingPower = this.availablePower;
        
        // 1. Reactor heating - prioritize maintaining temperature
        const heatingPower = Math.min(this.reactorHeatingPower, remainingPower);
        remainingPower -= heatingPower;
        
        // Update reactor temperature based on heating power
        const targetTemp = 673; // K (400°C optimal for Sabatier)
        const tempDelta = (heatingPower / this.reactorHeatingPower) * (targetTemp - this.reactorTemperature) * deltaTime;
        this.reactorTemperature = Math.min(targetTemp, this.reactorTemperature + tempDelta);
        
        // 2. CO₂ collection
        const maxCo2Collection = this.co2CollectionRate * deltaTime;
        const co2PowerNeeded = maxCo2Collection * this.co2CollectionPower;
        const co2PowerAvailable = Math.min(co2PowerNeeded, remainingPower);
        remainingPower -= co2PowerAvailable;
        
        const co2Collected = (co2PowerAvailable / co2PowerNeeded) * maxCo2Collection;
        this.co2Storage = Math.min(this.co2StorageCapacity, this.co2Storage + co2Collected);
        
        // 3. Water electrolysis for H₂ production
        const maxWaterElectrolysis = this.waterElectrolysisRate * deltaTime;
        const electrolysisPowerNeeded = maxWaterElectrolysis * this.electrolysisSystemPower;
        const electrolysisPowerAvailable = Math.min(electrolysisPowerNeeded, remainingPower);
        remainingPower -= electrolysisPowerAvailable;
        
        const waterElectrolyzed = (electrolysisPowerAvailable / electrolysisPowerNeeded) * maxWaterElectrolysis;
        
        // Electrolysis produces H₂ and O₂ (H₂O → H₂ + ½O₂)
        // Molar ratio: 2 mol H₂ per 1 mol H₂O
        const h2Produced = waterElectrolyzed * (2 * this.h2MolarMass / this.h2oMolarMass);
        this.h2Storage = Math.min(this.h2StorageCapacity, this.h2Storage + h2Produced);
        this.h2oStorage = Math.max(0, this.h2oStorage - waterElectrolyzed);
        
        // 4. Sabatier reaction (methanation)
        // Calculate temperature efficiency factor (0-1)
        const tempEfficiency = this.calculateTemperatureEfficiency(this.reactorTemperature);
        
        // Calculate max reaction rate based on available reactants
        const maxCo2ForReaction = this.co2Storage;
        const maxH2ForReaction = this.h2Storage;
        
        // Determine limiting reactant
        const h2Required = maxCo2ForReaction * this.h2ToCo2Ratio;
        const co2Required = maxH2ForReaction / this.h2ToCo2Ratio;
        
        // Use the minimum of available reactants
        const co2Consumed = Math.min(maxCo2ForReaction, co2Required);
        const h2Consumed = co2Consumed * this.h2ToCo2Ratio;
        
        // Apply temperature, pressure, and catalyst efficiency
        const reactionEfficiency = tempEfficiency * this.catalystEfficiency;
        const actualCo2Consumed = co2Consumed * reactionEfficiency;
        const actualH2Consumed = h2Consumed * reactionEfficiency;
        
        // Calculate products
        const ch4Produced = actualCo2Consumed * this.ch4ToCo2Ratio;
        const h2oProduced = actualCo2Consumed * this.h2oToCo2Ratio;
        
        // Update resource storage
        this.co2Storage -= actualCo2Consumed;
        this.h2Storage -= actualH2Consumed;
        this.ch4Storage = Math.min(this.ch4StorageCapacity, this.ch4Storage + ch4Produced);
        this.h2oStorage = Math.min(this.h2oStorageCapacity, this.h2oStorage + h2oProduced);
        
        // Update telemetry
        this.telemetry.reactorTemp = this.reactorTemperature;
        this.telemetry.reactorPressure = this.reactorPressure;
        this.telemetry.powerUsage = this.availablePower - remainingPower;
        this.telemetry.co2Level = this.co2Storage / this.co2StorageCapacity;
        this.telemetry.h2Level = this.h2Storage / this.h2StorageCapacity;
        this.telemetry.ch4Level = this.ch4Storage / this.ch4StorageCapacity;
        this.telemetry.h2oLevel = this.h2oStorage / this.h2oStorageCapacity;
        this.telemetry.reactorEfficiency = reactionEfficiency;
        this.telemetry.methanationRate = ch4Produced / deltaTime;
        
        return this.getTelemetry();
    }
    
    /**
     * Calculate temperature efficiency factor for the Sabatier reaction
     * @param {number} temperature - Current reactor temperature in K
     * @returns {number} Efficiency factor (0-1)
     */
    calculateTemperatureEfficiency(temperature) {
        // Sabatier reaction is exothermic and works best around 300-400°C (573-673K)
        // Efficiency drops at lower and higher temperatures
        const optimalTemp = 623; // K (350°C)
        const tempRange = 100; // K
        
        if (temperature < 473) return 0.1; // Below 200°C, very slow reaction
        if (temperature > 773) return 0.4; // Above 500°C, favors reverse reaction
        
        // Peak efficiency near optimal temperature
        return 1.0 - Math.abs(temperature - optimalTemp) / tempRange;
    }
    
    /**
     * Get current telemetry data
     * @returns {Object} Telemetry data
     */
    getTelemetry() {
        return {
            ...this.telemetry,
            co2Storage: this.co2Storage,
            h2Storage: this.h2Storage,
            ch4Storage: this.ch4Storage,
            h2oStorage: this.h2oStorage
        };
    }
    
    /**
     * Activate the ISRU system
     */
    activate() {
        this.active = true;
        console.log('ISRU system activated');
    }
    
    /**
     * Deactivate the ISRU system
     */
    deactivate() {
        this.active = false;
        console.log('ISRU system deactivated');
    }
    
    /**
     * Transfer methane to vehicle fuel tanks
     * @param {Object} vehicle - Vehicle to transfer fuel to
     * @param {number} amount - Amount to transfer in kg
     * @returns {number} Actual amount transferred
     */
    transferMethane(vehicle, amount) {
        const availableTransfer = Math.min(amount, this.ch4Storage);
        
        if (availableTransfer > 0 && vehicle && typeof vehicle.fuel !== 'undefined') {
            // Calculate remaining capacity in vehicle
            const fuelCapacity = vehicle.maxFuel || 1200000; // Default to 1,200 tons if not specified
            const remainingCapacity = fuelCapacity - vehicle.fuel;
            
            // Transfer the minimum of available methane and remaining vehicle capacity
            const actualTransfer = Math.min(availableTransfer, remainingCapacity);
            
            // Update storage and vehicle fuel
            this.ch4Storage -= actualTransfer;
            vehicle.fuel += actualTransfer;
            
            console.log(`Transferred ${actualTransfer.toFixed(2)} kg of methane to vehicle`);
            return actualTransfer;
        }
        
        return 0;
    }
}
