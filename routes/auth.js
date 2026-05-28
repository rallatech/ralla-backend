import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import initializeFirebase from '../config/firebase.js';
import { User } from '../models/User.js';

const router = express.Router();

// Register user
router.post('/register', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password, name, email, address } = req.body;
    const db = initializeFirebase();

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('phone', '==', phone).get();
    
    if (!existingUser.empty) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      phone,
      password: hashedPassword,
      name,
      email: email || '',
      address: address || ''
    });

    // Save to Firestore
    const docRef = await usersRef.add(user.toFirestore());
    const newUser = await docRef.get();
    const userData = User.fromFirestore(newUser);

    // Generate JWT token
    const token = jwt.sign(
      { userId: userData.id, phone: userData.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login user
router.post('/login', [
  body('phone').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { phone, password } = req.body;
    const db = initializeFirebase();

    // Find user by phone
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('phone', '==', phone).get();
    
    if (userQuery.empty) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    const userDoc = userQuery.docs[0];
    const userData = User.fromFirestore(userDoc);

    // Verify password
    const isValidPassword = await bcrypt.compare(password, userData.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: userData.id, phone: userData.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    res.json({
      id: userData.id,
      phone: userData.phone,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      address: userData.address,
      addressDetails: userData.addressDetails
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user address details
router.put('/address', [
  body('addressLine1').notEmpty().withMessage('Address Line 1 is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    const { addressLine1, addressLine2, city, state, landmark, pincode } = req.body;

    // Update address details
    userData.addressDetails = {
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      landmark: landmark || '',
      pincode
    };
    userData.updatedAt = new Date();

    // Save updated user
    await db.collection('users').doc(decoded.userId).update(userData.toFirestore());

    res.json({
      message: 'Address updated successfully',
      addressDetails: userData.addressDetails
    });
  } catch (error) {
    console.error('Address update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    if (userData.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get all users
    const usersRef = db.collection('users');
    const snapshot = await usersRef.orderBy('createdAt', 'desc').get();
    
    const users = [];
    snapshot.forEach(doc => {
      const userData = User.fromFirestore(doc);
      users.push({
        id: userData.id,
        phone: userData.phone,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        createdAt: userData.createdAt.toDate ? userData.createdAt.toDate().toISOString() : userData.createdAt
      });
    });

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    
    // Check if requester is admin
    const requesterDoc = await db.collection('users').doc(decoded.userId).get();
    if (!requesterDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requesterData = User.fromFirestore(requesterDoc);
    if (requesterData.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get target user
    const { userId } = req.params;
    const { role } = req.body;

    // Validate role
    if (role !== 'admin' && role !== 'user') {
      return res.status(400).json({ message: 'Invalid role. Must be "admin" or "user"' });
    }

    // Prevent admin from removing their own admin status
    if (userId === decoded.userId && role === 'user') {
      return res.status(400).json({ message: 'You cannot remove your own admin status' });
    }

    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const targetUserData = User.fromFirestore(targetUserDoc);
    targetUserData.role = role;
    targetUserData.updatedAt = new Date();

    // Update user role
    await db.collection('users').doc(userId).update({ 
      role: targetUserData.role,
      updatedAt: targetUserData.updatedAt
    });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: {
        id: targetUserData.id,
        phone: targetUserData.phone,
        name: targetUserData.name,
        email: targetUserData.email,
        role: targetUserData.role
      }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Reset user password (admin only)
router.post('/users/:userId/reset-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    
    // Check if requester is admin
    const requesterDoc = await db.collection('users').doc(decoded.userId).get();
    if (!requesterDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const requesterData = User.fromFirestore(requesterDoc);
    if (requesterData.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }

    // Get target user
    const { userId } = req.params;

    const targetUserDoc = await db.collection('users').doc(userId).get();
    if (!targetUserDoc.exists) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Generate random 6-digit password
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db.collection('users').doc(userId).update({ 
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: newPassword,
      user: {
        id: userId,
        phone: targetUserDoc.data().phone,
        name: targetUserDoc.data().name
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Change user password (user can change their own password)
router.put('/change-password', [
  body('oldPassword').notEmpty().withMessage('Old password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = initializeFirebase();
    
    // Get user
    const userDoc = await db.collection('users').doc(decoded.userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    const { oldPassword, newPassword } = req.body;

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, userData.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.collection('users').doc(decoded.userId).update({ 
      password: hashedPassword,
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;