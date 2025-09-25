// models/User.js
const mongoose = require('mongoose');

// EmergencyContactSchema (already defined)
const EmergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  number: { type: String, required: true, trim: true }
}, { _id: true });

// MedicationSchema (already defined)
const MedicationSchema = new mongoose.Schema({
  medicineName: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true },
  times: { type: String, required: true, trim: true },
  lastReminderAnnounced: { type: Date, default: null }
}, { _id: true });

// ConsultationSchema (already defined)
const ConsultationSchema = new mongoose.Schema({
  doctorName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true, trim: true },
  lastReminderAnnounced: { type: Date, default: null }
}, { _id: true });

// GeneralContactSchema (already defined)
const GeneralContactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  number: { type: String, required: true, trim: true }
}, { _id: true });

// --- NEW: Define a schema for health records ---
const HealthRecordSchema = new mongoose.Schema({
  date: { // Date of the health record
    type: Date,
    required: true,
    unique: true, // Only one record per day for a user
  },
  heightCm: { // Height in centimeters
    type: Number,
    min: 0,
    required: true,
  },
  weightKg: { // Weight in kilograms
    type: Number,
    min: 0,
    required: true,
  },
  bloodPressure: { // e.g., "120/80"
    type: String,
    trim: true,
    default: '',
  },
  sugarLevel: { // e.g., "100 mg/dL"
    type: String,
    trim: true,
    default: '',
  },
  bloodLevel: { // e.g., "14 g/dL" (Hemoglobin)
    type: String,
    trim: true,
    default: '',
  },
  heartBeatRate: { // e.g., "72 bpm"
    type: Number,
    min: 0,
    default: null,
  },
  bmi: { // Calculated BMI
    type: Number,
    default: null,
  }
}, { _id: true });
// --- END NEW ---


const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, trim: true, default: '' },
  age: { type: Number, min: 0, default: null },
  contactNumber: { type: String, trim: true, default: '' },
  address: { type: String, trim: true, default: '' },
  emergencyContacts: [EmergencyContactSchema],
  medications: [MedicationSchema],
  consultations: [ConsultationSchema],
  generalContacts: [GeneralContactSchema],
  // --- New Field for Health Records ---
  healthRecords: [HealthRecordSchema], // Array of sub-documents
  // --- End New Field ---
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);