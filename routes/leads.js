import express from 'express';
import { body, validationResult } from 'express-validator';
import initializeFirebase from '../config/firebase.js';
import { Lead } from '../models/Lead.js';

const router = express.Router();

// Create a new lead
router.post('/create', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit Indian phone number required'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email address'),
  body('referralCode').optional().isString(),
  body('message').optional().isString(),
  body('source').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, phone, email, referralCode, message, source } = req.body;
    console.log('Received data:', { name, phone, email, referralCode, message, source });
    const db = initializeFirebase();

    // Check if lead already exists with this phone number
    const leadsRef = db.collection('leads');
    const existingLead = await leadsRef.where('phone', '==', phone).get();
    
    if (!existingLead.empty) {
      return res.status(200).json({ 
        success: true,
        message: 'We already have your information! We will contact you ASAP.',
        isDuplicate: true,
        lead: {
          id: existingLead.docs[0].id,
          name: existingLead.docs[0].data().name,
          phone: existingLead.docs[0].data().phone,
          status: existingLead.docs[0].data().status,
          createdAt: existingLead.docs[0].data().createdAt
        }
      });
    }

    // Create new lead
    const lead = new Lead({
      name,
      phone,
      email: email || '',
      referralCode: referralCode || '',
      message: message || '',
      source: source || 'website'
    });

    // Save to Firestore
    const docRef = await leadsRef.add(lead.toFirestore());
    const newLead = await docRef.get();
    const leadData = Lead.fromFirestore(newLead);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      lead: {
        id: leadData.id,
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        source: leadData.source,
        status: leadData.status,
        createdAt: leadData.createdAt
      }
    });
  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Get all leads (for admin purposes)
router.get('/', async (req, res) => {
  try {
    const db = initializeFirebase();
    const leadsRef = db.collection('leads');
    const snapshot = await leadsRef.orderBy('createdAt', 'desc').get();
    
    const leads = [];
    snapshot.forEach(doc => {
      const leadData = Lead.fromFirestore(doc);
      leads.push({
        id: leadData.id,
        name: leadData.name,
        phone: leadData.phone,
        email: leadData.email,
        referralCode: leadData.referralCode,
        message: leadData.message,
        source: leadData.source,
        status: leadData.status,
        createdAt: leadData.createdAt.toDate ? leadData.createdAt.toDate().toISOString() : leadData.createdAt
      });
    });

    res.json({
      success: true,
      leads,
      count: leads.length
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

// Update lead status
router.put('/:id/status', [
  body('status').isIn(['new', 'contacted', 'converted', 'closed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { id } = req.params;
    const { status } = req.body;
    const db = initializeFirebase();

    const leadRef = db.collection('leads').doc(id);
    const leadDoc = await leadRef.get();
    
    if (!leadDoc.exists) {
      return res.status(404).json({ 
        success: false,
        message: 'Lead not found' 
      });
    }

    await leadRef.update({
      status,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Lead status updated successfully'
    });
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
});

export default router;