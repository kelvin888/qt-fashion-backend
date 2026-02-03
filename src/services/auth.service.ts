import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken } from '../utils/jwt';

const prisma = new PrismaClient();

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
  role: 'customer' | 'designer';
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
    profileImage: string | null;
    brandName: string | null;
    brandLogo: string | null;
  };
  token: string;
  expiresIn: number;
}

class AuthService {
  async signup(data: SignupData): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        role: data.role.toUpperCase() === 'DESIGNER' ? UserRole.DESIGNER : UserRole.CUSTOMER,
      },
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
        profileImage: user.profileImage,
        brandName: user.brandName,
        brandLogo: user.brandLogo,
      },
      token,
      expiresIn: 604800, // 7 days in seconds
    };
  }

  async login(data: LoginData): Promise<AuthResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
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
        profileImage: user.profileImage,
        brandName: user.brandName,
        brandLogo: user.brandLogo,
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
}

export default new AuthService();
