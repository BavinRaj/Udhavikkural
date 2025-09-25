// routes/profile.js (Updated)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { check, validationResult } = require('express-validator');

// @route   GET api/profile
// @desc    Get current user's entire profile (including all sub-documents)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -__v -createdAt');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/profile
// @desc    Update user profile (basic details like name, age, etc.)
// @access  Private
router.put('/', auth, async (req, res) => {
  const { name, age, contactNumber, address } = req.body;

  const profileFields = {};
  if (name !== undefined) profileFields.name = name;
  if (age !== undefined) profileFields.age = age;
  if (contactNumber !== undefined) profileFields.contactNumber = contactNumber;
  if (address !== undefined) profileFields.address = address;

  try {
    let user = await User.findById(req.user.id);

    if (user) {
      user = await User.findOneAndUpdate(
        { _id: req.user.id },
        { $set: profileFields },
        { new: true, runValidators: true }
      ).select('-password -__v -createdAt');
      return res.json(user);
    }

    return res.status(404).json({ msg: 'User not found' });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Emergency Contacts Routes (existing, no changes here)
router.post('/contacts', [auth, [check('name', 'Contact name is required').not().isEmpty(), check('number', 'Contact number is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { name, number } = req.body; const newContact = { name, number }; try { const user = await User.findById(req.user.id); user.emergencyContacts.unshift(newContact); await user.save(); res.json(user.emergencyContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.put('/contacts/:contact_id', [auth, [check('name', 'Contact name is required').not().isEmpty(), check('number', 'Contact number is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { name, number } = req.body; try { const user = await User.findById(req.user.id); const contactToUpdate = user.emergencyContacts.id(req.params.contact_id); if (!contactToUpdate) { return res.status(404).json({ msg: 'Contact not found' }); } contactToUpdate.name = name; contactToUpdate.number = number; await user.save(); res.json(user.emergencyContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.delete('/contacts/:contact_id', auth, async (req, res) => { try { const user = await User.findById(req.user.id); user.emergencyContacts = user.emergencyContacts.filter( contact => contact._id.toString() !== req.params.contact_id ); await user.save(); res.json(user.emergencyContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});

// Medication Routes (existing, no changes here)
router.post('/medications', [auth, [check('medicineName', 'Medicine name is required').not().isEmpty(), check('dosage', 'Dosage is required').not().isEmpty(), check('times', 'Times are required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { medicineName, dosage, times } = req.body; const newMedication = { medicineName, dosage, times }; try { const user = await User.findById(req.user.id); user.medications.unshift(newMedication); await user.save(); res.json(user.medications); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.put('/medications/:medication_id', [auth, [check('medicineName', 'Medicine name is required').not().isEmpty(), check('dosage', 'Dosage is required').not().isEmpty(), check('times', 'Times are required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { medicineName, dosage, times } = req.body; try { const user = await User.findById(req.user.id); const medicationToUpdate = user.medications.id(req.params.medication_id); if (!medicationToUpdate) { return res.status(404).json({ msg: 'Medication not found' }); } medicationToUpdate.medicineName = medicineName; medicationToUpdate.dosage = dosage; medicationToUpdate.times = times; await user.save(); res.json(user.medications); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.delete('/medications/:medication_id', auth, async (req, res) => { try { const user = await User.findById(req.user.id); user.medications = user.medications.filter( medication => medication._id.toString() !== req.params.medication_id ); await user.save(); res.json(user.medications); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});

// Consultation Routes (existing, no changes here)
router.post('/consultations', [auth, [check('doctorName', 'Doctor name is required').not().isEmpty(), check('date', 'Date is required and must be a valid date').isISO8601().toDate(), check('time', 'Time is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { doctorName, date, time } = req.body; const newConsultation = { doctorName, date, time }; try { const user = await User.findById(req.user.id); user.consultations.unshift(newConsultation); await user.save(); res.json(user.consultations); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.put('/consultations/:consultation_id', [auth, [check('doctorName', 'Doctor name is required').not().isEmpty(), check('date', 'Date is required and must be a valid date').isISO8601().toDate(), check('time', 'Time is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { doctorName, date, time } = req.body; try { const user = await User.findById(req.user.id); const consultationToUpdate = user.consultations.id(req.params.consultation_id); if (!consultationToUpdate) { return res.status(404).json({ msg: 'Consultation not found' }); } consultationToUpdate.doctorName = doctorName; consultationToUpdate.date = date; consultationToUpdate.time = time; await user.save(); res.json(user.consultations); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.delete('/consultations/:consultation_id', auth, async (req, res) => { try { const user = await User.findById(req.user.id); user.consultations = user.consultations.filter( consultation => consultation._id.toString() !== req.params.consultation_id ); await user.save(); res.json(user.consultations); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});

// General Contacts Routes (existing, no changes here)
router.post('/general-contacts', [auth, [check('name', 'Contact name is required').not().isEmpty(), check('number', 'Contact number is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { name, number } = req.body; const newContact = { name, number }; try { const user = await User.findById(req.user.id); user.generalContacts.unshift(newContact); await user.save(); res.json(user.generalContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.put('/general-contacts/:contact_id', [auth, [check('name', 'Contact name is required').not().isEmpty(), check('number', 'Contact number is required').not().isEmpty()]], async (req, res) => { const errors = validationResult(req); if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); } const { name, number } = req.body; try { const user = await User.findById(req.user.id); const contactToUpdate = user.generalContacts.id(req.params.contact_id); if (!contactToUpdate) { return res.status(404).json({ msg: 'Contact not found' }); } contactToUpdate.name = name; contactToUpdate.number = number; await user.save(); res.json(user.generalContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});
router.delete('/general-contacts/:contact_id', auth, async (req, res) => { try { const user = await User.findById(req.user.id); user.generalContacts = user.generalContacts.filter( contact => contact._id.toString() !== req.params.contact_id ); await user.save(); res.json(user.generalContacts); } catch (err) { console.error(err.message); res.status(500).send('Server error'); }});

// --- NEW Health Records Routes ---

// Helper function to calculate BMI
const calculateBMI = (heightCm, weightKg) => {
  if (heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100; // Convert cm to meters
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2));
};

// @route   POST api/profile/health-records
// @desc    Add a new health record
// @access  Private
router.post('/health-records', [
  auth,
  [
    check('date', 'Date is required and must be a valid date').isISO8601().toDate(),
    check('heightCm', 'Height in cm is required and must be a number').isFloat({ gt: 0 }),
    check('weightKg', 'Weight in kg is required and must be a number').isFloat({ gt: 0 }),
    // Optional fields can be empty strings, no need to check .not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, heightCm, weightKg, bloodPressure, sugarLevel, bloodLevel, heartBeatRate } = req.body;

  try {
    const user = await User.findById(req.user.id);

    // Check for duplicate record for the same date
    const existingRecord = user.healthRecords.find(
      record => new Date(record.date).toDateString() === new Date(date).toDateString()
    );
    if (existingRecord) {
      return res.status(400).json({ msg: 'Health record for this date already exists. Please edit the existing one.' });
    }

    const bmi = calculateBMI(heightCm, weightKg);

    const newRecord = {
      date, heightCm, weightKg,
      bloodPressure: bloodPressure || '',
      sugarLevel: sugarLevel || '',
      bloodLevel: bloodLevel || '',
      heartBeatRate: heartBeatRate !== undefined && heartBeatRate !== null ? heartBeatRate : null,
      bmi
    };

    user.healthRecords.unshift(newRecord); // Add to the beginning of the array
    await user.save();
    res.json(user.healthRecords); // Return just the updated list of records
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT api/profile/health-records/:record_id
// @desc    Update a health record
// @access  Private
router.put('/health-records/:record_id', [
  auth,
  [
    check('date', 'Date is required and must be a valid date').isISO8601().toDate(),
    check('heightCm', 'Height in cm is required and must be a number').isFloat({ gt: 0 }),
    check('weightKg', 'Weight in kg is required and must be a number').isFloat({ gt: 0 }),
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { date, heightCm, weightKg, bloodPressure, sugarLevel, bloodLevel, heartBeatRate } = req.body;

  try {
    const user = await User.findById(req.user.id);
    const recordToUpdate = user.healthRecords.id(req.params.record_id);

    if (!recordToUpdate) {
      return res.status(404).json({ msg: 'Health record not found' });
    }

    // Check for duplicate date if the date is being changed
    if (new Date(recordToUpdate.date).toDateString() !== new Date(date).toDateString()) {
        const existingRecord = user.healthRecords.find(
            record => record._id.toString() !== req.params.record_id && new Date(record.date).toDateString() === new Date(date).toDateString()
        );
        if (existingRecord) {
            return res.status(400).json({ msg: 'Health record for this date already exists.' });
        }
    }

    const bmi = calculateBMI(heightCm, weightKg);

    recordToUpdate.date = date;
    recordToUpdate.heightCm = heightCm;
    recordToUpdate.weightKg = weightKg;
    recordToUpdate.bloodPressure = bloodPressure || '';
    recordToUpdate.sugarLevel = sugarLevel || '';
    recordToUpdate.bloodLevel = bloodLevel || '';
    recordToUpdate.heartBeatRate = heartBeatRate !== undefined && heartBeatRate !== null ? heartBeatRate : null;
    recordToUpdate.bmi = bmi;

    await user.save();
    res.json(user.healthRecords); // Return updated list of records
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/profile/health-records/:record_id
// @desc    Delete a health record
// @access  Private
router.delete('/health-records/:record_id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    user.healthRecords = user.healthRecords.filter(
      record => record._id.toString() !== req.params.record_id
    );

    await user.save();
    res.json(user.healthRecords); // Return updated list of records
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


module.exports = router;