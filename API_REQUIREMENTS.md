# QT Fashion Backend - API Requirements

Based on the mobile app (qt-fashion-expo), here's what the backend needs to support:

## 📱 Frontend Summary

- React Native Expo app
- React Query for data fetching
- TypeScript
- Currently using mock data
- Ready to switch to real API

---

## 🔐 Authentication Endpoints

### POST /api/auth/signup

**Request:**

```typescript
{
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: 'customer' | 'designer';
}
```

**Response:**

```typescript
{
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string;
    role: 'customer' | 'designer';
    profileImage?: string;
    brandName?: string;  // For designers
    brandLogo?: string;  // For designers
  };
  token: string;
  expiresIn: number;
}
```

### POST /api/auth/login

**Request:**

```typescript
{
  email: string;
  password: string;
}
```

**Response:** Same as signup

### POST /api/auth/logout

**Headers:** Authorization: Bearer {token}
**Response:** { message: 'Logged out successfully' }

---

## 👤 User Endpoints

### GET /api/auth/profile

**Headers:** Authorization: Bearer {token}
**Response:**

```typescript
{
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: 'customer' | 'designer';
  profileImage?: string;
  // Designer-specific fields
  brandName?: string;
  brandLogo?: string;
  brandBanner?: string;
  yearsOfExperience?: string;
  specialties?: string[];
  bio?: string;
}
```

---

## 📐 Measurement Endpoints

### GET /api/users/:userId/measurements

**Response:**

```typescript
{
  id: string;
  userId: string;
  profileName: string;
  measurements: {
    chest: number; // cm
    waist: number;
    hips: number;
    shoulder: number;
    armLength: number;
    inseam: number;
    height: number;
    weight: number;
  }
  unit: 'cm' | 'in';
  fitPreference: 'slim' | 'regular' | 'loose';
  source: 'manual' | 'body_scan' | 'imported';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
[];
```

### POST /api/measurements

**Request:**

```typescript
{
  userId: string;
  profileName: string;
  measurements: { chest, waist, hips, shoulder, armLength, inseam, height, weight };
  unit?: 'cm' | 'in';
  fitPreference?: 'slim' | 'regular' | 'loose';
  source?: 'manual' | 'body_scan';
}
```

### POST /api/measurements/body-scan

**Request:**

```typescript
{
  userId: string;
  profileName: string;
  imageUrls: string[];  // URLs to uploaded images
  height?: number;
  weight?: number;
}
```

**Response:** Returns measurement object + scan quality data

---

## 🎨 Design Endpoints

### GET /api/designs

**Query Params:**

- category?: 'traditional' | 'corporate' | 'casual' | 'evening'
- designerId?: string
- minPrice?: number
- maxPrice?: number
- searchQuery?: string
- sortBy?: 'price-low' | 'price-high' | 'rating' | 'newest'
- page?: number
- pageSize?: number

**Response:**

```typescript
{
  designs: [
    {
      id: string;
      title: string;
      category: string;
      price: number;
      description?: string;
      images: string[];  // Array of image URLs
      thumbnailUrl: string;
      rating: number;
      reviewCount: number;
      designer: {
        id: string;
        name: string;
        brandName: string;
        avatarUrl: string;
        rating: number;
      };
      productionTime: number;  // days
      createdAt: string;
    }
  ];
  total: number;
  page: number;
  pageSize: number;
}
```

### GET /api/designs/:id

**Response:** Single design object (same structure as above)

### POST /api/designs

**Headers:** Authorization: Bearer {token} (Designer only)
**Request:**

```typescript
{
  title: string;
  category: string;
  price: number;
  description?: string;
  images: string[];  // URLs or base64
  productionSteps?: Array<{
    title: string;
    estimatedTime: string;
    description: string;
  }>;
}
```

---

## 💰 Offer/Negotiation Endpoints

### GET /api/offers

**Query Params:**

- customerId?: string
- designerId?: string
- status?: 'pending' | 'counter' | 'accepted' | 'rejected' | 'expired'
- designId?: string

**Response:**

```typescript
{
  id: string;
  customerId: string;
  designerId: string;
  designId: string;
  design: { title, imageUrl };
  originalPrice: number;
  proposedPrice: number;
  counterPrice?: number;
  status: 'pending' | 'counter' | 'accepted' | 'rejected' | 'expired';
  customerMessage: string;
  designerMessage?: string;
  measurements?: object;
  customizationRequests?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}[]
```

### POST /api/offers

**Request:**

```typescript
{
  customerId: string;
  designerId: string;
  designId: string;
  proposedPrice: number;
  message: string;
  measurements?: object;
  customizationRequests?: string;
}
```

### POST /api/offers/:id/accept

**Request:** { message?: string }

### POST /api/offers/:id/reject

**Request:** { message?: string }

### POST /api/offers/:id/counter

**Request:**

```typescript
{
  counterPrice: number;
  message: string;
}
```

---

## 📦 Order Endpoints

### GET /api/orders

**Query Params:**

- customerId?: string
- designerId?: string
- status?: 'confirmed' | 'payment_held' | 'in_production' | 'quality_check' | 'shipped' | 'delivered' | 'completed'
- fromDate?: string
- toDate?: string

**Response:**

```typescript
{
  id: string;
  orderNumber: string;  // e.g., "QT-8821"
  customerId: string;
  designerId: string;
  designId: string;
  design: { title, imageUrl, category };
  designer: { name, brandName };
  status: OrderStatus;
  price: number;
  measurements: object;
  customizationNotes?: string;
  productionSteps: [
    {
      id: string;
      stage: string;  // e.g., "Cutting", "Stitching", "Quality Check"
      status: 'pending' | 'in_progress' | 'completed';
      description: string;
      imageUrl?: string;
      completedAt?: string;
    }
  ];
  shipment?: {
    carrier: string;
    trackingNumber: string;
    estimatedDelivery: string;
    actualDelivery?: string;
  };
  createdAt: string;
  estimatedCompletionDate: string;
  completedAt?: string;
}[]
```

### POST /api/orders

**Request:**

```typescript
{
  customerId: string;
  designerId: string;
  designId: string;
  measurements: object;
  customizationNotes?: string;
  price: number;
  estimatedCompletionDate: string;
}
```

### PATCH /api/orders/:id/status

**Request:**

```typescript
{
  status: OrderStatus;
  note?: string;
}
```

### PATCH /api/orders/:id/production-steps/:stepId

**Request:**

```typescript
{
  completed: boolean;
  imageUrl?: string;  // Proof of work
}
```

### POST /api/orders/:id/shipment

**Request:**

```typescript
{
  carrier: string;
  trackingNumber: string;
  estimatedDelivery: string;
}
```

---

## 🎭 Virtual Try-On Endpoints

### POST /api/try-on/process

**Request:**

```typescript
{
  userId: string;
  designId: string;
  measurementId: string;
}
```

**Response:**

```typescript
{
  id: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  resultImageUrl?: string;  // Available when completed
  resultVideoUrl?: string;
}
```

### GET /api/try-on/:id

**Response:** Same as above (for polling status)

---

## 📤 File Upload Endpoint

### POST /api/uploads

**Content-Type:** multipart/form-data
**Request:** Form data with file
**Response:**

```typescript
{
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}
```

---

## 🔑 Key Database Models Needed

1. **User** - id, email, password (hashed), fullName, phoneNumber, role, profile fields
2. **Measurement** - id, userId, profileName, measurements, fitPreference, isDefault
3. **Design** - id, designerId, title, category, price, images, rating, productionTime
4. **Offer** - id, customerId, designerId, designId, prices, status, messages
5. **Order** - id, orderNumber, customerId, designerId, designId, status, price, measurements
6. **ProductionStep** - id, orderId, stage, status, imageUrl
7. **TryOnResult** - id, userId, designId, measurementId, status, resultImageUrl

---

## 🚀 Next Steps for Backend Implementation

1. ✅ Set up minimal Prisma schema with User model
2. Create authentication endpoints (signup, login, logout)
3. Implement JWT token generation and validation
4. Add remaining models to Prisma schema incrementally
5. Build CRUD endpoints for each resource
6. Add file upload handling (Cloudinary)
7. Implement authorization middleware (role-based)
8. Add validation and error handling
9. Set up CORS for mobile app
10. Test with real mobile app

---

## 📝 Notes

- All protected routes need `Authorization: Bearer {token}` header
- Passwords must be hashed with bcrypt
- Use Cloudinary for image storage
- PostgreSQL database
- Express.js + TypeScript
- JWT for authentication
- Role-based access control (customers vs designers)
