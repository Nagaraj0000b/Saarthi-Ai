const fs = require('fs');
let content = fs.readFileSync('server/controllers/chatController.js', 'utf8');

// For voice reply
content = content.replace('const nextStep = getNextStep(currentStep, extractedValue);\n    conversation.step = nextStep;\n\n    if (nextStep === "done") {', 
                          'const nextStep = getNextStep(currentStep, extractedValue);\n    conversation.step = nextStep;\n\n    if (currentStep !== "done" && nextStep === "done") {');

// For text reply
content = content.replace('const nextStep = getNextStep(conversation.step, extractedValue);\n    conversation.step = nextStep;\n\n    if (nextStep === "done") {', 
                          'const nextStep = getNextStep(conversation.step, extractedValue);\n    const prevStep = conversation.step;\n    conversation.step = nextStep;\n\n    if (prevStep !== "done" && nextStep === "done") {');

// For auto-save defensive ENUM guard
content = content.replace(/platform: ed\.platform\.charAt\(0\)\.toUpperCase\(\) \+ ed\.platform\.slice\(1\)\.toLowerCase\(\),/g,
                          'platform: ["Uber", "Swiggy", "Rapido", "Other"].includes(ed.platform.charAt(0).toUpperCase() + ed.platform.substring(1).toLowerCase()) ? ed.platform.charAt(0).toUpperCase() + ed.platform.substring(1).toLowerCase() : "Other",');

fs.writeFileSync('server/controllers/chatController.js', content);
console.log("Replaced successfully!");
