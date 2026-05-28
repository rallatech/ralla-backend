// Payment model for Firestore
export class Payment {
  constructor(data) {
    this.id = data.id || null;
    this.orderId = data.orderId;
    this.userId = data.userId;
    this.amount = data.amount;
    this.currency = data.currency || 'INR';
    this.paymentMethod = data.paymentMethod; // cash, card, upi, netbanking
    this.status = data.status || 'pending'; // pending, completed, failed, refunded
    this.transactionId = data.transactionId || '';
    this.paymentGateway = data.paymentGateway || 'razorpay'; // razorpay, payu, etc.
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      orderId: this.orderId,
      userId: this.userId,
      amount: this.amount,
      currency: this.currency,
      paymentMethod: this.paymentMethod,
      status: this.status,
      transactionId: this.transactionId,
      paymentGateway: this.paymentGateway,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Payment({
      id: doc.id,
      ...data
    });
  }
}