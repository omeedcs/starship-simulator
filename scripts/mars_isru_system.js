// Mars In-Situ Resource Utilization (ISRU) System
import * as THREE from 'three';

/**
 * Comprehensive Mars ISRU system modeling:
 * 1. CO₂ acquisition from atmosphere
 * 2. Water extraction from regolith/ice
 * 3. Water electrolysis (H₂O → H₂ + ½O₂)
 * 4. Sabatier reaction (CO₂ + 4H₂ → CH₄ + 2H₂O)
 * 5. Propellant storage and management
 */
export class MarsISRUSystem {
    constructor() {
        // System state
        this.active = false;
        this.operationalDays = 0;
        
        // Environment parameters
        this.atmosphericCO2Content = 0.955; // 95.5% CO₂ in Mars atmosphere
        this.atmosphericPressure = 0.00636; // Average Mars pressure in bar
        this.atmosphericTemperature = 210; // K, average Mars temperature
        this.regolithWaterContent = 0.05; // 5% water in regolith (optimistic)
        this.subsurfaceIceContent = 0.90; // 90% water in subsurface ice deposits
        
        // === Equipment Parameters ===
        
        // Power system
        this.availablePower = 50; // kW from solar array
        this.batteryStorage = 200; // kWh capacity
        this.batteryCharge = 100; // kWh initial charge
        this.powerDistribution = {
            atmosphericCapture: 0,
            regolithProcessing: 0,
            waterElectrolysis: 0,
            sabatierReactor: 0,
            liquefaction: 0,
            thermal: 0
        };
        
        // CO₂ capture system
        this.co2CaptureRate = 4.0; // kg/hour at full power
        this.co2CaptureEfficiency = 0.92; // Efficiency factor
        this.co2CompressionPower = 1.2; // kW per kg/hour
        
        // Regolith processing
        this.regolithProcessingRate = 10.0; // kg/hour of regolith
        this.waterExtractionEfficiency = 0.85; // Efficiency of water extraction
        this.regolithProcessingPower = 2.5; // kW per kg/hour
        
        // Ice mining
        this.iceMiningRate = 2.0; // kg/hour of ice
        this.iceMiningPower = 3.0; // kW per kg/hour
        
        // Water electrolysis
        this.electrolysisPower = 4.5; // kW per kg/hour of H₂O
        this.electrolysisEfficiency = 0.75; // Efficiency factor
        
        // Sabatier reactor
        this.sabatierReactorTemperature = 300; // K
        this.optimalSabatierTemperature = 673; // K (400°C)
        this.sabatierReactorPressure = 1.0; // bar
        this.sabatierCatalystEfficiency = 0.94; // Ni or Ru catalyst efficiency
        this.sabatierHeatingPower = 3.0; // kW needed for heating
        
        // Liquefaction & Refrigeration
        this.liquefactionPower = 2.0; // kW per kg/hour
        this.refrigerationPower = 1.5; // kW maintenance per day
        
        // === Resource Storage ===
        
        // Raw resources
        this.regolithStorage = 0; // kg
        this.regolithCapacity = 1000; // kg
        
        this.iceStorage = 0; // kg
        this.iceCapacity = 500; // kg
        
        // Intermediate resources
        this.co2Storage = 0; // kg
        this.co2Capacity = 500; // kg
        
        this.waterStorage = 0; // kg
        this.waterCapacity = 1000; // kg
        
        this.hydrogenStorage = 0; // kg
        this.hydrogenCapacity = 100; // kg
        
        // Final products
        this.methaneStorage = 0; // kg
        this.methaneCapacity = 2000; // kg
        
        this.oxygenStorage = 0; // kg
        this.oxygenCapacity = 4000; // kg
        
        // === Molar masses for stoichiometric calculations ===
        this.molarMass = {
            co2: 44.01, // g/mol
            h2o: 18.015, // g/mol
            h2: 2.016, // g/mol
            o2: 31.998, // g/mol
            ch4: 16.043 // g/mol
        };
        
        // === Process status and telemetry ===
        this.telemetry = {
            // Power system
            powerGeneration: 0, // kW
            powerUsage: 0, // kW
            batteryLevel: this.batteryCharge / this.batteryStorage,
            
            // Process rates (kg/h)
            co2CaptureRate: 0,
            waterExtractionRate: 0,
            waterElectrolysisRate: 0,
            h2ProductionRate: 0,
            o2ProductionRate: 0,
            ch4ProductionRate: 0,
            
            // Storage levels (0-1)
            regolithLevel: 0,
            iceLevel: 0,
            co2Level: 0,
            waterLevel: 0,
            hydrogenLevel: 0,
            methaneLevel: 0,
            oxygenLevel: 0,
            
            // Equipment status
            sabatierTemperature: this.sabatierReactorTemperature,
            sabatierPressure: this.sabatierReactorPressure,
            sabatierEfficiency: 0,
            
            // Resource totals
            totalCO2Collected: 0,
            totalWaterExtracted: 0,
            totalMethaneProduced: 0,
            totalOxygenProduced: 0,
            
            // Mission stats
            fuelProductionProgress: 0, // 0-1 fraction of needed fuel
            estimatedCompletionDays: 0
        };
    }
    
    /**
     * Update the Mars ISRU system
     * @param {number} deltaTime - Time in hours
     * @param {Object} environment - Environmental factors like sunlight
     * @returns {Object} Current system telemetry
     */
    update(deltaTime, environment = { solarIntensity: 0.6 }) {
        if (!this.active) return this.getTelemetry();
        
        this.operationalDays += deltaTime / 24;
        
        // === 1. Update power generation and distribution ===
        this.updatePowerSystem(deltaTime, environment);
        
        // === 2. CO₂ atmospheric capture ===
        this.processCO2Capture(deltaTime);
        
        // === 3. Regolith & ice processing for water ===
        this.processRegolithAndIce(deltaTime);
        
        // === 4. Water electrolysis ===
        this.processWaterElectrolysis(deltaTime);
        
        // === 5. Sabatier reaction ===
        this.processSabatierReaction(deltaTime);
        
        // === 6. Liquefaction and storage ===
        this.processLiquefaction(deltaTime);
        
        // === 7. Update telemetry ===
        this.updateTelemetry();
        
        return this.getTelemetry();
    }
    
    /**
     * Update power generation and distribution
     */
    updatePowerSystem(deltaTime, environment) {
        // Calculate power generation from solar (varies with Mars day/night cycle)
        const generatedPower = this.availablePower * environment.solarIntensity;
        
        // Calculate battery charge/discharge
        const previousCharge = this.batteryCharge;
        if (generatedPower > 0) {
            this.batteryCharge = Math.min(this.batteryStorage, 
                this.batteryCharge + (generatedPower * deltaTime));
        }
        
        // Determine available power for this update cycle
        let availablePower = generatedPower;
        
        // If insufficient solar power, draw from battery
        if (availablePower < 5 && this.batteryCharge > 0) {
            const batteryPower = Math.min(20, this.batteryCharge / deltaTime);
            availablePower += batteryPower;
            this.batteryCharge = Math.max(0, this.batteryCharge - (batteryPower * deltaTime));
        }
        
        // Zero out power distribution
        Object.keys(this.powerDistribution).forEach(key => {
            this.powerDistribution[key] = 0;
        });
        
        // Allocate power to critical systems first
        let remainingPower = availablePower;
        
        // 1. Thermal management (always prioritized)
        const thermalPower = Math.min(2.0, remainingPower);
        this.powerDistribution.thermal = thermalPower;
        remainingPower -= thermalPower;
        
        // 2. Sabatier reactor heating (if we have resources to process)
        if (this.co2Storage > 0 && this.hydrogenStorage > 0) {
            const reactorPower = Math.min(this.sabatierHeatingPower, remainingPower);
            this.powerDistribution.sabatierReactor = reactorPower;
            remainingPower -= reactorPower;
        }
        
        // 3. Distribute remaining power based on process needs and storage levels
        // Prioritize based on bottlenecks in the production chain
        
        // If low on CO₂, prioritize capture
        if (this.co2Storage / this.co2Capacity < 0.3) {
            const co2Power = Math.min(this.co2CaptureRate * this.co2CompressionPower, remainingPower);
            this.powerDistribution.atmosphericCapture = co2Power;
            remainingPower -= co2Power;
        }
        
        // If low on water, prioritize regolith processing
        if (this.waterStorage / this.waterCapacity < 0.3) {
            const regolithPower = Math.min(this.regolithProcessingRate * this.regolithProcessingPower, remainingPower);
            this.powerDistribution.regolithProcessing = regolithPower;
            remainingPower -= regolithPower;
        }
        
        // If we have water, run electrolysis
        if (this.waterStorage > 0) {
            const electrolysisPower = Math.min(
                (this.waterStorage / deltaTime) * this.electrolysisPower, 
                remainingPower
            );
            this.powerDistribution.waterElectrolysis = electrolysisPower;
            remainingPower -= electrolysisPower;
        }
        
        // If we have produced gases, run liquefaction
        if (this.methaneStorage > 0 || this.oxygenStorage > 0) {
            const liquefactionPower = Math.min(this.liquefactionPower * 5, remainingPower);
            this.powerDistribution.liquefaction = liquefactionPower;
            remainingPower -= liquefactionPower;
        }
        
        // Distribute any remaining power to maximize throughput
        if (remainingPower > 0) {
            // Spread across systems proportionally to their needs
            const totalNeeded = 
                (this.co2CaptureRate * this.co2CompressionPower) +
                (this.regolithProcessingRate * this.regolithProcessingPower) +
                (this.waterStorage > 0 ? this.electrolysisPower * 5 : 0);
                
            if (totalNeeded > 0) {
                // CO₂ capture
                this.powerDistribution.atmosphericCapture += 
                    remainingPower * ((this.co2CaptureRate * this.co2CompressionPower) / totalNeeded);
                    
                // Regolith processing
                this.powerDistribution.regolithProcessing += 
                    remainingPower * ((this.regolithProcessingRate * this.regolithProcessingPower) / totalNeeded);
                    
                // Water electrolysis (if water available)
                if (this.waterStorage > 0) {
                    this.powerDistribution.waterElectrolysis += 
                        remainingPower * ((this.electrolysisPower * 5) / totalNeeded);
                }
            }
        }
        
        this.telemetry.powerGeneration = generatedPower;
        this.telemetry.powerUsage = Object.values(this.powerDistribution).reduce((sum, val) => sum + val, 0);
    }
    
    /**
     * Process CO₂ capture from atmosphere
     */
    processCO2Capture(deltaTime) {
        const power = this.powerDistribution.atmosphericCapture;
        if (power <= 0) return;
        
        // Calculate how much CO₂ we can capture with available power
        const maxCapture = (power / this.co2CompressionPower) * deltaTime;
        
        // Calculate actual capture based on atmospheric conditions and efficiency
        const atmosphericFactor = this.atmosphericCO2Content * (this.atmosphericPressure / 0.01); // Normalize to expected pressure
        const actualCapture = maxCapture * this.co2CaptureEfficiency * atmosphericFactor;
        
        // Add to storage (limited by capacity)
        const previousCO2 = this.co2Storage;
        this.co2Storage = Math.min(this.co2Capacity, this.co2Storage + actualCapture);
        
        // Track total collected
        this.telemetry.totalCO2Collected += (this.co2Storage - previousCO2);
        this.telemetry.co2CaptureRate = actualCapture / deltaTime;
    }
    
    /**
     * Process regolith and ice for water extraction
     */
    processRegolithAndIce(deltaTime) {
        const power = this.powerDistribution.regolithProcessing;
        if (power <= 0) return;
        
        // Split power between regolith processing and ice mining
        // Favor ice mining if available since it's more efficient
        let regolithPower = power;
        let icePower = 0;
        
        if (this.iceStorage > 0 || this.operationalDays > 10) {
            // After 10 days, we've found ice deposits or brought them
            icePower = power * 0.7; // Allocate 70% to ice
            regolithPower = power * 0.3; // 30% to regolith as backup
        }
        
        // Process regolith
        const regolithProcessed = (regolithPower / this.regolithProcessingPower) * deltaTime;
        const waterFromRegolith = regolithProcessed * this.regolithWaterContent * this.waterExtractionEfficiency;
        
        // Mine ice
        const iceMined = (icePower / this.iceMiningPower) * deltaTime;
        const waterFromIce = iceMined * this.subsurfaceIceContent * 0.95; // 95% extraction efficiency from ice
        
        // Update storage
        this.regolithStorage = Math.min(this.regolithCapacity, this.regolithStorage + regolithProcessed);
        this.iceStorage = Math.min(this.iceCapacity, this.iceStorage + iceMined);
        
        const previousWater = this.waterStorage;
        this.waterStorage = Math.min(this.waterCapacity, this.waterStorage + waterFromRegolith + waterFromIce);
        
        // Track total extracted
        this.telemetry.totalWaterExtracted += (this.waterStorage - previousWater);
        this.telemetry.waterExtractionRate = (waterFromRegolith + waterFromIce) / deltaTime;
    }
    
    /**
     * Process water electrolysis to produce H₂ and O₂
     */
    processWaterElectrolysis(deltaTime) {
        const power = this.powerDistribution.waterElectrolysis;
        if (power <= 0 || this.waterStorage <= 0) return;
        
        // Calculate max water electrolysis with available power
        const maxElectrolysis = (power / this.electrolysisPower) * deltaTime;
        
        // Limit by available water
        const actualElectrolysis = Math.min(maxElectrolysis, this.waterStorage);
        
        // Apply efficiency factor
        const effectiveElectrolysis = actualElectrolysis * this.electrolysisEfficiency;
        
        // Calculate H₂ and O₂ production based on stoichiometry
        // H₂O → H₂ + ½O₂
        // 18.015g water yields 2.016g hydrogen and 15.999g oxygen
        const hydrogenProduced = effectiveElectrolysis * (this.molarMass.h2 / this.molarMass.h2o);
        const oxygenProduced = effectiveElectrolysis * (this.molarMass.o2 / (2 * this.molarMass.h2o));
        
        // Update storage
        this.waterStorage -= actualElectrolysis;
        this.hydrogenStorage = Math.min(this.hydrogenCapacity, this.hydrogenStorage + hydrogenProduced);
        this.oxygenStorage = Math.min(this.oxygenCapacity, this.oxygenStorage + oxygenProduced);
        
        // Update telemetry
        this.telemetry.waterElectrolysisRate = actualElectrolysis / deltaTime;
        this.telemetry.h2ProductionRate = hydrogenProduced / deltaTime;
        this.telemetry.o2ProductionRate = oxygenProduced / deltaTime;
        this.telemetry.totalOxygenProduced += oxygenProduced;
    }
    
    /**
     * Process Sabatier reaction to produce CH₄ and H₂O
     * CO₂ + 4H₂ → CH₄ + 2H₂O
     */
    processSabatierReaction(deltaTime) {
        const power = this.powerDistribution.sabatierReactor;
        if (power <= 0) return;
        
        // Update reactor temperature based on power input
        const targetTemp = this.optimalSabatierTemperature;
        const maxTempChange = power * 50 * deltaTime; // 50K per kW-hour
        const tempChange = Math.min(
            maxTempChange,
            Math.abs(targetTemp - this.sabatierReactorTemperature)
        ) * Math.sign(targetTemp - this.sabatierReactorTemperature);
        
        this.sabatierReactorTemperature += tempChange;
        
        // Calculate temperature efficiency factor
        const tempEfficiency = this.calculateSabatierTemperatureEfficiency();
        const reactionEfficiency = tempEfficiency * this.sabatierCatalystEfficiency;
        
        // Only proceed if we have sufficient reactants and temperature
        if (this.co2Storage <= 0 || this.hydrogenStorage <= 0 || tempEfficiency < 0.1) return;
        
        // Calculate stoichiometric amounts needed
        // CO₂ + 4H₂ → CH₄ + 2H₂O
        const h2ToCo2Ratio = 4 * (this.molarMass.h2 / this.molarMass.co2);
        
        // Determine limiting reactant
        const maxCo2Reaction = this.co2Storage;
        const maxH2Reaction = this.hydrogenStorage;
        const h2Required = maxCo2Reaction * h2ToCo2Ratio;
        const co2Required = maxH2Reaction / h2ToCo2Ratio;
        
        // Use the minimum of available reactants
        const co2Consumed = Math.min(maxCo2Reaction, co2Required);
        const h2Consumed = co2Consumed * h2ToCo2Ratio;
        
        // Apply reaction efficiency
        const effectiveCo2 = co2Consumed * reactionEfficiency;
        const effectiveH2 = h2Consumed * reactionEfficiency;
        
        // Calculate products
        // CO₂ + 4H₂ → CH₄ + 2H₂O
        const ch4Produced = effectiveCo2 * (this.molarMass.ch4 / this.molarMass.co2);
        const h2oProduced = effectiveCo2 * (2 * this.molarMass.h2o / this.molarMass.co2);
        
        // Update storage
        this.co2Storage -= co2Consumed;
        this.hydrogenStorage -= h2Consumed;
        this.methaneStorage = Math.min(this.methaneCapacity, this.methaneStorage + ch4Produced);
        this.waterStorage = Math.min(this.waterCapacity, this.waterStorage + h2oProduced);
        
        // Update telemetry
        this.telemetry.sabatierEfficiency = reactionEfficiency;
        this.telemetry.ch4ProductionRate = ch4Produced / deltaTime;
        this.telemetry.totalMethaneProduced += ch4Produced;
    }
    
    /**
     * Process liquefaction and storage of produced gases
     */
    processLiquefaction(deltaTime) {
        // This is primarily for maintenance of already liquefied gases
        // and doesn't directly affect production rates
        
        // In a real system, we'd model boil-off and refrigeration needs
        // For simplicity, we'll just use some power for maintenance
    }
    
    /**
     * Calculate temperature efficiency factor for the Sabatier reaction
     * @returns {number} Efficiency factor (0-1)
     */
    calculateSabatierTemperatureEfficiency() {
        // Sabatier reaction is exothermic and works best around 300-400°C (573-673K)
        // Efficiency drops at lower and higher temperatures
        const optimalTemp = 623; // K (350°C)
        const tempRange = 100; // K
        
        if (this.sabatierReactorTemperature < 473) return 0.1; // Below 200°C, very slow reaction
        if (this.sabatierReactorTemperature > 773) return 0.4; // Above 500°C, favors reverse reaction
        
        // Peak efficiency near optimal temperature
        return 1.0 - Math.abs(this.sabatierReactorTemperature - optimalTemp) / tempRange;
    }
    
    /**
     * Update all telemetry values
     */
    updateTelemetry() {
        // Update storage levels
        this.telemetry.regolithLevel = this.regolithStorage / this.regolithCapacity;
        this.telemetry.iceLevel = this.iceStorage / this.iceCapacity;
        this.telemetry.co2Level = this.co2Storage / this.co2Capacity;
        this.telemetry.waterLevel = this.waterStorage / this.waterCapacity;
        this.telemetry.hydrogenLevel = this.hydrogenStorage / this.hydrogenCapacity;
        this.telemetry.methaneLevel = this.methaneStorage / this.methaneCapacity;
        this.telemetry.oxygenLevel = this.oxygenStorage / this.oxygenCapacity;
        this.telemetry.batteryLevel = this.batteryCharge / this.batteryStorage;
        
        // Update equipment status
        this.telemetry.sabatierTemperature = this.sabatierReactorTemperature;
        this.telemetry.sabatierPressure = this.sabatierReactorPressure;
        
        // Fuel production progress (assume we need 1000kg CH₄ and 4000kg O₂)
        const fuelTarget = 1000;
        const oxygenTarget = 4000;
        this.telemetry.fuelProductionProgress = Math.min(1.0, 
            Math.min(
                this.methaneStorage / fuelTarget,
                this.oxygenStorage / oxygenTarget
            )
        );
        
        // Estimated completion days
        if (this.telemetry.ch4ProductionRate > 0) {
            const remainingMethane = Math.max(0, fuelTarget - this.methaneStorage);
            const daysToCompleteMethane = remainingMethane / (this.telemetry.ch4ProductionRate * 24);
            
            const remainingOxygen = Math.max(0, oxygenTarget - this.oxygenStorage);
            const daysToCompleteOxygen = remainingOxygen / (this.telemetry.o2ProductionRate * 24);
            
            this.telemetry.estimatedCompletionDays = Math.max(daysToCompleteMethane, daysToCompleteOxygen);
        } else {
            this.telemetry.estimatedCompletionDays = Infinity;
        }
    }
    
    /**
     * Get the current telemetry data
     * @returns {Object} System telemetry
     */
    getTelemetry() {
        return {
            ...this.telemetry,
            operationalDays: this.operationalDays
        };
    }
    
    /**
     * Activate the ISRU system
     */
    activate() {
        this.active = true;
        console.log('Mars ISRU system activated');
    }
    
    /**
     * Deactivate the ISRU system
     */
    deactivate() {
        this.active = false;
        console.log('Mars ISRU system deactivated');
    }
    
    /**
     * Transfer methane to vehicle fuel tanks
     * @param {Object} vehicle - Vehicle to transfer fuel to
     * @param {number} amount - Amount to transfer in kg
     * @returns {number} Actual amount transferred
     */
    transferMethane(vehicle, amount) {
        const availableTransfer = Math.min(amount, this.methaneStorage);
        
        if (availableTransfer > 0 && vehicle && typeof vehicle.fuel !== 'undefined') {
            // Calculate remaining capacity in vehicle
            const fuelCapacity = vehicle.maxFuel || 1200000; // Default to 1,200 tons
            const remainingCapacity = fuelCapacity - vehicle.fuel;
            
            // Transfer the minimum of available methane and remaining capacity
            const actualTransfer = Math.min(availableTransfer, remainingCapacity);
            
            // Update storage and vehicle fuel
            this.methaneStorage -= actualTransfer;
            vehicle.fuel += actualTransfer;
            
            console.log(`Transferred ${actualTransfer.toFixed(2)} kg of methane to vehicle`);
            return actualTransfer;
        }
        
        return 0;
    }
    
    /**
     * Transfer oxygen to vehicle oxidizer tanks
     * @param {Object} vehicle - Vehicle to transfer oxidizer to
     * @param {number} amount - Amount to transfer in kg
     * @returns {number} Actual amount transferred
     */
    transferOxygen(vehicle, amount) {
        const availableTransfer = Math.min(amount, this.oxygenStorage);
        
        if (availableTransfer > 0 && vehicle && typeof vehicle.oxidizer !== 'undefined') {
            // Calculate remaining capacity in vehicle
            const oxidizerCapacity = vehicle.maxOxidizer || 4800000; // Default to 4,800 tons
            const remainingCapacity = oxidizerCapacity - vehicle.oxidizer;
            
            // Transfer the minimum of available oxygen and remaining capacity
            const actualTransfer = Math.min(availableTransfer, remainingCapacity);
            
            // Update storage and vehicle oxidizer
            this.oxygenStorage -= actualTransfer;
            vehicle.oxidizer += actualTransfer;
            
            console.log(`Transferred ${actualTransfer.toFixed(2)} kg of oxygen to vehicle`);
            return actualTransfer;
        }
        
        return 0;
    }
}
