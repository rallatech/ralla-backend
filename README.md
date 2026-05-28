# Ralla Water Purifiers Backend API

A simple Node.js backend for the Ralla Water Purifiers e-commerce platform.

## Features

- **Simple Authentication**: Phone number + password login
- **Product Management**: 4 water purifier products
- **Order Management**: Create, view, and track orders
- **Payment Processing**: Basic payment tracking
- **Firebase Integration**: Uses Firestore for data storage

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product

### Orders
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `PATCH /api/orders/:id/status` - Update order status

### Payments
- `POST /api/payments` - Create payment
- `GET /api/payments` - Get user's payments
- `GET /api/payments/:id` - Get single payment
- `PATCH /api/payments/:id/status` - Update payment status
- `GET /api/orders/:orderId/payments` - Get payments for order

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up Firebase**:
   - Create a Firebase project
   - Enable Firestore
   - Generate service account key
   - Copy the key to `.env` file

3. **Environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your Firebase credentials
   ```

4. **Run locally**:
   ```bash
   npm run dev
   ```

## Deployment to Google Cloud Run

1. **Enable APIs**:
   ```bash
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   ```

2. **Deploy**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

## Free Tier Limits

With only 2 daily active users, this will easily stay within Google Cloud Run's free tier:
- 2 million requests per month
- 180,000 vCPU-seconds per month
- 360,000 GiB-seconds per month

## Database Schema

### Users Collection
- `phone` (string): User's phone number
- `password` (string): Hashed password
- `name` (string): User's name
- `email` (string): User's email
- `address` (string): User's address
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Orders Collection
- `userId` (string): Reference to user
- `productId` (number): Product ID (1-4)
- `productName` (string): Product name
- `price` (number): Product price
- `quantity` (number): Order quantity
- `status` (string): Order status
- `shippingAddress` (string): Delivery address
- `notes` (string): Order notes
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### Payments Collection
- `orderId` (string): Reference to order
- `userId` (string): Reference to user
- `amount` (number): Payment amount
- `currency` (string): Currency (INR)
- `paymentMethod` (string): Payment method
- `status` (string): Payment status
- `transactionId` (string): Gateway transaction ID
- `paymentGateway` (string): Payment gateway used
- `createdAt` (timestamp)
- `updatedAt` (timestamp)