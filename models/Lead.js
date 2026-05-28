// Lead model for Firestore
export class Lead {
  constructor(data) {
    this.id = data.id || null;
    this.name = data.name;
    this.phone = data.phone;
    this.email = data.email || '';
    this.referralCode = data.referralCode || '';
    this.message = data.message || '';
    this.source = data.source || 'website'; // website, modal, etc.
    this.status = data.status || 'new'; // new, contacted, converted, closed
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      name: this.name,
      phone: this.phone,
      email: this.email,
      referralCode: this.referralCode,
      message: this.message,
      source: this.source,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Lead({
      id: doc.id,
      ...data
    });
  }
}