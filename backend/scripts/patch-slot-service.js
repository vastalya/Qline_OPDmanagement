const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'services', 'slotService.js');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
    /!\s*doctor\.workingHours\s*\|\|\s*!\s*doctor\.defaultConsultTime\s*\|\|\s*!\s*doctor\.maxPatientsPerDay/g,
    "!doctor.workingHours || !doctor.defaultConsultTime || !doctor.maxPatientsPerDay || !doctor.isConfigured"
);

fs.writeFileSync(p, c, 'utf8');
console.log('slotService patched');
