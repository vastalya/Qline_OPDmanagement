const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'services', 'queueService.js');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
    /\$set:\s*\{\s*status:\s*'in_progress'\s*\}/g,
    `$set: { status: 'in_progress', consultationStartTime: new Date() }`
);

const markCompletedReplacement = `        // Mark as completed
        currentAppointment.status = 'completed';
        currentAppointment.consultationEndTime = new Date();
        if (currentAppointment.consultationStartTime) {
            currentAppointment.consultationDuration = Math.max(1, Math.round((currentAppointment.consultationEndTime - currentAppointment.consultationStartTime) / 60000));
        } else {
            currentAppointment.consultationDuration = 15;
        }
        await currentAppointment.save({ session });

        // Update dotor's average consult time
        const Doctor = require('../models/Doctor');
        const doctorDoc = await Doctor.findById(doctorId).session(session);
        if (doctorDoc) {
            doctorDoc.averageConsultTime = Math.round(((doctorDoc.averageConsultTime || doctorDoc.defaultConsultTime) * 9 + currentAppointment.consultationDuration) / 10);
            await doctorDoc.save({ session });
        }`;

c = c.replace(
    /\/\/ Mark as completed\s*currentAppointment\.status = 'completed';\s*await currentAppointment\.save\(\{\s*session\s*\}\);/g,
    markCompletedReplacement
);


fs.writeFileSync(p, c, 'utf8');
console.log('queueService patched with consultation times.');
