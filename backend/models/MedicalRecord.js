const mongoose = require('mongoose');
const encrypt = require('mongoose-field-encryption').fieldEncryption;

const medicalRecordSchema = new mongoose.Schema(
    {
        patientId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Doctor',
            required: true,
            index: true
        },
        appointmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Appointment',
            required: true,
            unique: true
        },
        date: {
            type: Date,
            required: true,
            index: true
        },
        chiefComplaint: {
            type: String,
            required: true
        },
        symptoms: [String],
        diagnosis: {
            type: String
        },
        notes: {
            type: String
        },
        medications: [{
            name: String,
            dosage: String,
            frequency: String,
            duration: String,
            instructions: String
        }],
        labTests: [{
            name: String,
            result: String,
            date: Date,
            normalRange: String
        }],
        vitals: {
            bloodPressure: String,
            heartRate: Number,
            temperature: Number,
            weight: Number,
            height: Number,
            respiratoryRate: Number,
            oxygenSaturation: Number
        },
        followUp: {
            required: Boolean,
            date: Date,
            notes: String
        }
    },
    {
        timestamps: true
    }
);

// Indexes
medicalRecordSchema.index({ patientId: 1, date: -1 });
medicalRecordSchema.index({ doctorId: 1, date: -1 });

// CRITICAL: Field-level encryption for sensitive health data
// Encrypted fields: diagnosis, notes, medications, labTests, vitals, followUp
const encryptionKey = process.env.MEDICAL_RECORD_ENCRYPTION_KEY;

if (!encryptionKey) {
    console.error('🚨 CRITICAL: MEDICAL_RECORD_ENCRYPTION_KEY not set in environment');
    if (process.env.NODE_ENV === 'production') {
        throw new Error('Medical record encryption key is required in production');
    }
    console.warn('⚠️  Medical records will NOT be encrypted (development mode)');
} else {
    // Apply encryption to sensitive fields
    medicalRecordSchema.plugin(encrypt, {
        fields: ['diagnosis', 'notes', 'medications', 'labTests', 'vitals', 'followUp'],
        secret: encryptionKey,
        saltGenerator: (secret) => secret.slice(0, 16) // Use first 16 chars as salt
    });
    console.log('✅ Medical record encryption enabled');
}

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
