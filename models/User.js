// User model for Firestore
export class User {
  constructor(data) {
    this.id = data.id || null;
    this.phone = data.phone;
    this.password = data.password; // Will be hashed
    this.name = data.name || '';
    this.email = data.email || '';
    this.role = data.role || 'user'; // Default role is 'user'
    this.address = data.address || ''; // Keep for backward compatibility
    this.addressDetails = data.addressDetails || {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      landmark: '',
      pincode: ''
    };
    this.cart = data.cart || []; // Array of cart items: [{productId, quantity}]
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      phone: this.phone,
      password: this.password,
      name: this.name,
      email: this.email,
      role: this.role,
      address: this.address,
      addressDetails: this.addressDetails,
      cart: this.cart,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new User({
      id: doc.id,
      ...data
    });
  }
}