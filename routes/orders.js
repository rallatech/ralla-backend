import express from 'express';
import { body, validationResult } from 'express-validator';
import initializeFirebase from '../config/firebase.js';
import { Order } from '../models/Order.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Product data (same as frontend)
const products = [
  {
    id: 1,
    name: "RWP - Basic Water Purifier",
    price: 7999,
    features: ["7-stage filtration", "UV protection", "Smart water saving", "DIY maintenance"]
  },
  {
    id: 2,
    name: "RWP - Pro Water Purifier",
    price: 11999,
    features: ["5-stage filtration", "UV protection", "Compact design", "No electricity needed"]
  },
  {
    id: 3,
    name: "RWP - Pro Plus: Premium Water Purifier",
    price: 12999,
    features: ["6-stage filtration", "RO+UV dual protection", "TDS controller", "Low maintenance"]
  },
  {
    id: 4,
    name: "RWP - Ultra: Premium Water Purifier",
    price: 14499,
    features: ["App connectivity", "Water quality alerts", "Filter replacement reminders", "Energy-efficient"]
  }
];

// Get all products
router.get('/products', (req, res) => {
  res.json(products);
});

// Get single product
router.get('/products/:id', (req, res) => {
  const productId = parseInt(req.params.id);
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }
  
  res.json(product);
});

// Create order
router.post('/orders', [
  authenticateToken,
  body('productId').isInt({ min: 1, max: 4 }).withMessage('Valid product ID required'),
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shippingAddress').notEmpty().withMessage('Shipping address is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, quantity, shippingAddress, notes } = req.body;
    const userId = req.user.userId;
    const db = initializeFirebase();

    // Find product
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Create order
    const order = new Order({
      userId,
      productId,
      productName: product.name,
      price: product.price,
      quantity,
      shippingAddress,
      notes: notes || ''
    });

    // Save to Firestore
    const ordersRef = db.collection('orders');
    const docRef = await ordersRef.add(order.toFirestore());
    const newOrder = await docRef.get();
    const orderData = Order.fromFirestore(newOrder);

    res.status(201).json({
      message: 'Order created successfully',
      order: orderData
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = initializeFirebase();
    const ordersRef = db.collection('orders');
    const userOrders = await ordersRef.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    
    const orders = [];
    userOrders.forEach(doc => {
      orders.push(Order.fromFirestore(doc));
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single order
router.get('/orders/:id', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.id;
    const userId = req.user.userId;
    const db = initializeFirebase();
    
    const orderDoc = await db.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = Order.fromFirestore(orderDoc);
    
    // Check if order belongs to user
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update order status (admin only - for now, any authenticated user can update)
router.patch('/orders/:id/status', [
  authenticateToken,
  body('status').isIn(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.user.userId;
    const db = initializeFirebase();

    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();
    
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = Order.fromFirestore(orderDoc);
    
    // Check if order belongs to user
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update order
    await orderRef.update({
      status,
      updatedAt: new Date()
    });

    res.json({ message: 'Order status updated successfully' });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;