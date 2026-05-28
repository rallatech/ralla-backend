import express from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import initializeFirebase from '../config/firebase.js';
import { User } from '../models/User.js';

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Get user's cart
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = initializeFirebase();
    const userDoc = await db.collection('users').doc(req.userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    res.json({ cart: userData.cart || [] });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add item to cart
router.post('/add', [
  authenticateToken,
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;
    const db = initializeFirebase();
    const userRef = db.collection('users').doc(req.userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    let cart = userData.cart || [];

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex(item => item.productId === productId);
    
    if (existingItemIndex >= 0) {
      // Update quantity if item exists
      cart[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.push({ productId, quantity });
    }

    // Update user's cart
    await userRef.update({
      cart: cart,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Item added to cart successfully',
      cart: cart 
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update item quantity in cart
router.put('/update', [
  authenticateToken,
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity } = req.body;
    const db = initializeFirebase();
    const userRef = db.collection('users').doc(req.userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    let cart = userData.cart || [];

    // Find item in cart
    const itemIndex = cart.findIndex(item => item.productId === productId);
    
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart[itemIndex].quantity = quantity;
    }

    // Update user's cart
    await userRef.update({
      cart: cart,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Cart updated successfully',
      cart: cart 
    });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Remove item from cart
router.delete('/remove/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const db = initializeFirebase();
    const userRef = db.collection('users').doc(req.userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userData = User.fromFirestore(userDoc);
    let cart = userData.cart || [];

    // Remove item from cart
    cart = cart.filter(item => item.productId !== productId);

    // Update user's cart
    await userRef.update({
      cart: cart,
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Item removed from cart successfully',
      cart: cart 
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Clear entire cart
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    const db = initializeFirebase();
    const userRef = db.collection('users').doc(req.userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clear user's cart
    await userRef.update({
      cart: [],
      updatedAt: new Date()
    });

    res.json({ 
      message: 'Cart cleared successfully',
      cart: [] 
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;