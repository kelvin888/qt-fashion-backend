import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken } from '../utils/jwt';
import { validateAndNormalizeEmail } from '../utils/validation';

const prisma = new PrismaClient();

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: 'customer' | 'designer';
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
  // Designer-specific fields
  brandName?: string;
  brandLogo?: string;
  brandBanner?: string;
  bio?: string;
  yearsOfExperience?: string;
  specialties?: string[];
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    phoneNumber: string | null;
    role: string;
    gender?: string | null;
    profileImage: string | null;
    brandName: string | null;
    brandLogo: string | null;
    brandBanner: string | null;
    bio: string | null;
    createdAt: string;
  };
  token: string;
  expiresIn: number;
}

class AuthService {
  async signup(data: SignupData): Promise<AuthResponse> {
    // Normalize email
    const normalizedEmail = validateAndNormalizeEmail(data.email);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Prepare user data
    const userData: any = {
      email: normalizedEmail,
      password: hashedPassword,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      role: data.role.toUpperCase() === 'DESIGNER' ? UserRole.DESIGNER : UserRole.CUSTOMER,
      gender: data.gender || null,
    };

    // Add designer-specific fields if role is designer
    if (data.role.toUpperCase() === 'DESIGNER') {
      userData.brandName = data.brandName;
      userData.brandLogo = data.brandLogo;
      userData.brandBanner = data.brandBanner;
      userData.bio = data.bio;
      // Store yearsOfExperience and specialties in bio or as separate fields
      if (data.yearsOfExperience) {
        userData.bio = `${userData.bio || ''}\n\nExperience: ${data.yearsOfExperience} years`;
      }
      if (data.specialties && data.specialties.length > 0) {
        userData.bio = `${userData.bio || ''}\n\nSpecialties: ${data.specialties.join(', ')}`;
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: userData,
    });

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role.toLowerCase(),
        gender: user.gender,
        profileImage: user.profileImage,
        brandName: user.brandName,
        brandLogo: user.brandLogo,
        brandBanner: user.brandBanner,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      expiresIn: 604800, // 7 days in seconds
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Normalize email
    const normalizedEmail = validateAndNormalizeEmail(data.email);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role.toLowerCase(),
        gender: user.gender,
        profileImage: user.profileImage,
        brandName: user.brandName,
        brandLogo: user.brandLogo,
        brandBanner: user.brandBanner,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      expiresIn: 604800,
    };
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        role: true,
        gender: true,
        profileImage: true,
        brandName: true,
        brandLogo: true,
        brandBanner: true,
        bio: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updatePushToken(userId: string, expoPushToken: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken },
    });
  }

  async removePushToken(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: null },
    });
  }

  /**
   * Create admin user (one-time use)
   * @param data Admin user details
   * @returns User and JWT token
   * @throws Error if admin already exists or user with email exists
   */
  async createAdminUser(data: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<AuthResponse> {
    // Normalize email
    const normalizedEmail = validateAndNormalizeEmail(data.email);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      throw new Error(
        'Admin user already exists. Please contact support if you need to create additional admins.'
      );
    }

    // Check if user with this email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password with high cost factor for admin accounts
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        fullName: data.fullName,
        role: 'ADMIN',
        accountVerified: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        gender: user.gender,
        profileImage: user.profileImage,
        brandName: user.brandName,
        brandLogo: user.brandLogo,
        brandBanner: user.brandBanner,
        bio: user.bio,
        createdAt: user.createdAt.toISOString(),
      },
      token,
      expiresIn: 604800, // 7 days in seconds
    };
  }

  /**
   * Get admin creation endpoint status
   * @returns Status information
   */
  async getAdminCreationStatus(): Promise<{
    isEnabled: boolean;
    adminCount: number;
  }> {
    const isEnabled = !!process.env.ADMIN_CREATION_SECRET;
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' },
    });

    return {
      isEnabled,
      adminCount,
    };
  }
}

export default new AuthService();
