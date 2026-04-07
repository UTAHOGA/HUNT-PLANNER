// src/app.js

// Main application entry point for Hunt Planner App

// Importing necessary modules
import { initializeMap } from './map';
import { initializeHunts } from './hunts';
import { initializeOutfitters } from './outfitters';
import { initializeStorage } from './storage';

// Application lifecycle handling
class HuntPlanner {
    constructor() {
        this.map = null;
        this.hunts = null;
        this.outfitters = null;
        this.storage = null;
    }

    // Initialize the application
    async initialize() {
        this.map = await initializeMap();
        this.hunts = await initializeHunts();
        this.outfitters = await initializeOutfitters();
        this.storage = await initializeStorage();
        this.startApplication();
    }

    // Starting the application
    startApplication() {
        console.log('Hunt Planner App initialized. Ready to go!');
        // Additional start logic here
    }
}

// Running the application
const app = new HuntPlanner();
app.initialize();