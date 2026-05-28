import express from 'express';
import { body, validationResult } from 'express-validator';
import initializeFirebase from '../config/firebase.js';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create payment
router.post('/payments', [
  authenticateToken,
  body('orderId').notEmpty().withMessage('Order ID is required'),
  body('paymentMethod').isIn(['cash', 'card', 'upi', 'netbanking']).withMessage('Valid payment method required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { orderId, paymentMethod, amount, transactionId } = req.body;
    const userId = req.user.userId;
    const db = initializeFirebase();

    // Verify order exists and belongs to user
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = Order.fromFirestore(orderDoc);
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if payment already exists for this order
    const existingPayment = await db.collection('payments')
      .where('orderId', '==', orderId)
      .where('status', 'in', ['pending', 'completed'])
      .get();

    if (!existingPayment.empty) {
      return res.status(400).json({ message: 'Payment already exists for this order' });
    }

    // Create payment
    const payment = new Payment({
      orderId,
      userId,
      amount,
      paymentMethod,
      transactionId: transactionId || '',
      status: 'pending'
    });

    // Save to Firestore
    const paymentsRef = db.collection('payments');
    const docRef = await paymentsRef.add(payment.toFirestore());
    const newPayment = await docRef.get();
    const paymentData = Payment.fromFirestore(newPayment);

    res.status(201).json({
      message: 'Payment created successfully',
      payment: paymentData
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's payments
router.get('/payments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const db = initializeFirebase();
    const paymentsRef = db.collection('payments');
    const userPayments = await paymentsRef.where('userId', '==', userId).orderBy('createdAt', 'desc').get();
    
    const payments = [];
    userPayments.forEach(doc => {
      payments.push(Payment.fromFirestore(doc));
    });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get single payment
router.get('/payments/:id', authenticateToken, async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.userId;
    const db = initializeFirebase();
    
    const paymentDoc = await db.collection('payments').doc(paymentId).get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = Payment.fromFirestore(paymentDoc);
    
    // Check if payment belongs to user
    if (payment.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update payment status
router.patch('/payments/:id/status', [
  authenticateToken,
  body('status').isIn(['pending', 'completed', 'failed', 'refunded']).withMessage('Invalid status'),
  body('transactionId').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const paymentId = req.params.id;
    const { status, transactionId } = req.body;
    const userId = req.user.userId;
    const db = initializeFirebase();

    const paymentRef = db.collection('payments').doc(paymentId);
    const paymentDoc = await paymentRef.get();
    
    if (!paymentDoc.exists) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const payment = Payment.fromFirestore(paymentDoc);
    
    // Check if payment belongs to user
    if (payment.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update payment
    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    await paymentRef.update(updateData);

    // If payment is completed, update order status
    if (status === 'completed') {
      const orderRef = db.collection('orders').doc(payment.orderId);
      await orderRef.update({
        status: 'confirmed',
        updatedAt: new Date()
      });
    }

    res.json({ message: 'Payment status updated successfully' });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get payments for an order
router.get('/orders/:orderId/payments', authenticateToken, async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.user.userId;
    const db = initializeFirebase();

    // Verify order belongs to user
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = Order.fromFirestore(orderDoc);
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Get payments for this order
    const paymentsRef = db.collection('payments');
    const orderPayments = await paymentsRef.where('orderId', '==', orderId).get();
    
    const payments = [];
    orderPayments.forEach(doc => {
      payments.push(Payment.fromFirestore(doc));
    });

    res.json(payments);
  } catch (error) {
    console.error('Get order payments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;