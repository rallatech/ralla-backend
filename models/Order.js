// Order model for Firestore
export class Order {
  constructor(data) {
    this.id = data.id || null;
    this.userId = data.userId;
    this.productId = data.productId;
    this.productName = data.productName;
    this.price = data.price;
    this.quantity = data.quantity || 1;
    this.status = data.status || 'pending'; // pending, confirmed, shipped, delivered, cancelled
    this.shippingAddress = data.shippingAddress;
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      userId: this.userId,
      productId: this.productId,
      productName: this.productName,
      price: this.price,
      quantity: this.quantity,
      status: this.status,
      shippingAddress: this.shippingAddress,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Order({
      id: doc.id,
      ...data
    });
  }
}