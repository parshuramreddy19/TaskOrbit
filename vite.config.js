import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Configure Vite and Vitest for the TaskOrbit project.
export default defineConfig({
  plugins: [react()],

  // Vitest configuration
  test: {
    environment: "jsdom", // Simulates a browser environment for React tests
    setupFiles: "./src/setupTests.js", // Loads testing tools before each test
    globals: true, // Allows us to use test, expect and describe without importing them
    css: true, // Allows components with CSS imports to be tested
  },
});