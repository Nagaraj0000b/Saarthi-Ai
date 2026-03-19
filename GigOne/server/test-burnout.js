const { checkBurnout } = require("./services/burnoutService");

console.log("--- Burnout Module Math Tests ---");

const scenarios = [
  {
    name: "Perfectly Happy Worker",
    history: [0.5, 0.8, 1.0, 0.4, 0.9]
  },
  {
    name: "One Bad Day (No Alert Should Fire)",
    history: [0.2, 0.5, -0.9, 0.3, 0.1] 
  },
  {
    name: "3 Consecutive Negative Days (Burnout Alert - Effort-Recovery Model)",
    history: [0.5, 0.1, -0.1, -0.4, -0.2] // Last 3 are negative
  },
  {
    name: "Highly Stressed 5 Days (Stress Warning - EMA model)",
    history: [-0.4, -0.2, 0.1, -0.6, -0.5] // Avg is -0.32
  },
  {
    name: "Worst Case (Both triggers fire)",
    history: [-0.5, -0.6, -0.4, -0.3, -0.8] // Avg is -0.52, all negative
  }
];

scenarios.forEach(scene => {
  console.log(`\nTest: ${scene.name}`);
  console.log(`Input Array: [${scene.history.join(", ")}]`);
  const result = checkBurnout(scene.history);
  console.log(result);
});
