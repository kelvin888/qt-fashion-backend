import { Router } from 'express';
import {
  signup,
  login,
  logout,
  getProfile,
  updatePushToken,
  removePushToken,
  createAdmin,
  checkAdminCreationStatus,
} from '../controllers/auth.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Register a new user (Customer or Designer)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [CUSTOMER, DESIGNER]
 *               brandName:
 *                 type: string
 *                 description: Required for designers
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/signup', signup);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Login user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', authenticate, getProfile);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Logout user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, logout);

/**
 * @swagger
 * /api/auth/push-token:
 *   patch:
 *     tags:
 *       - Authentication
 *     summary: Update user's Expo Push Token for notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - expoPushToken
 *             properties:
 *               expoPushToken:
 *                 type: string
 *                 description: Expo Push Token from device
 *     responses:
 *       200:
 *         description: Push token updated successfully
 *       401:
 *         description: Unauthorized
 */
router.patch('/push-token', authenticate, updatePushToken);

/**
 * @swagger
 * /api/auth/push-token:
 *   delete:
 *     tags:
 *       - Authentication
 *     summary: Remove user's Expo Push Token (on logout)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Push token removed successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/push-token', authenticate, removePushToken);

/**
 * @swagger
 * /api/auth/create-admin:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Create first admin user (one-time use)
 *     description: |
 *       Creates the initial admin user for the platform. This endpoint should be:
 *       - Used only once during initial deployment
 *       - Disabled after creating the first admin (remove ADMIN_CREATION_SECRET)
 *       - Protected with a strong, randomly generated secret key
 *       
 *       After creating admin:
 *       - Remove ADMIN_CREATION_SECRET from environment variables
 *       - Login and change the password
 *       - Verify endpoint is disabled via /admin-status
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - fullName
 *               - secretKey
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@qtfashion.com
 *               password:
 *                 type: string
 *                 minLength: 12
 *                 description: Must contain uppercase, lowercase, number, and special character
 *                 example: SecureAdmin@2026!
 *               fullName:
 *                 type: string
 *                 example: System Administrator
 *               secretKey:
 *                 type: string
 *                 description: ADMIN_CREATION_SECRET from environment variables
 *     responses:
 *       201:
 *         description: Admin user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     token:
 *                       type: string
 *       400:
 *         description: Validation error (weak password, missing fields, etc.)
 *       403:
 *         description: Invalid secret key
 *       409:
 *         description: Admin user already exists
 *       500:
 *         description: Endpoint not configured
 */
router.post('/create-admin', createAdmin);

/**
 * @swagger
 * /api/auth/admin-status:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Check admin creation endpoint status
 *     description: Returns security status and recommendations for admin creation endpoint
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     isEnabled:
 *                       type: boolean
 *                     adminCount:
 *                       type: number
 *                     recommendation:
 *                       type: string
 *                     securityLevel:
 *                       type: string
 *                       enum: [SECURE, VULNERABLE]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (admin role required)
 */
router.get('/admin-status', authenticate, requireRole('ADMIN'), checkAdminCreationStatus);

export default router;
