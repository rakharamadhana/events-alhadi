// =============================================================================
// src/app/actions/auth.ts — Server Actions for Registration
// =============================================================================
// Handles user registration with password hashing and input validation.
// New users are created with status PENDING — they cannot log in until
// an admin changes their status to APPROVED.
// =============================================================================

"use server";

import { hash } from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface RegisterResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// registerUser — Create a new PENDING user
// ---------------------------------------------------------------------------
export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const name = formData.get("name") as string | null;
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  // -------------------------------------------------------------------------
  // 1. Validate inputs
  // -------------------------------------------------------------------------
  if (!name || !email || !password || !confirmPassword) {
    return { success: false, error: "All fields are required." };
  }

  if (name.trim().length < 2) {
    return { success: false, error: "Name must be at least 2 characters." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (password.length < 8) {
    return {
      success: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  // -------------------------------------------------------------------------
  // 2. Check for existing user
  // -------------------------------------------------------------------------
  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  // -------------------------------------------------------------------------
  // 3. Hash password and create user with PENDING status
  // -------------------------------------------------------------------------
  try {
    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        status: "PENDING",
        role: "USER",
      },
    });

    return { success: true };
  } catch (error) {
    console.error("[registerUser] Error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

interface ProfileResult {
  success: boolean;
  error?: string;
  profileImageUrl?: string | null;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to update your profile." };
  }

  const name = optionalString(formData, "name");
  if (!name || name.length < 2) {
    return { success: false, error: "Name must be at least 2 characters." };
  }

  const birthYearRaw = optionalString(formData, "birthYear");
  let birthYear: number | null = null;
  const currentYear = new Date().getFullYear();

  if (birthYearRaw) {
    const parsedBirthYear = Number.parseInt(birthYearRaw, 10);
    if (!Number.isInteger(parsedBirthYear) || parsedBirthYear < 1900 || parsedBirthYear > currentYear) {
      return { success: false, error: "Please enter a valid birth year." };
    }
    birthYear = parsedBirthYear;
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        profileImageUrl: optionalString(formData, "profileImageUrl"),
        phone: optionalString(formData, "phone"),
        city: optionalString(formData, "city"),
        country: optionalString(formData, "country"),
        gender: optionalString(formData, "gender"),
        birthYear,
        bio: optionalString(formData, "bio"),
      },
    });

    revalidatePath("/");
    revalidatePath("/profile");
    return { success: true };
  } catch (error) {
    console.error("[updateProfile] Error:", error);
    return { success: false, error: "Unable to update your profile. Please try again." };
  }
}

export async function uploadProfilePhoto(formData: FormData): Promise<ProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "You must be signed in to upload a profile photo." };
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return { success: false, error: "No file was selected." };
  }

  const MAX_SIZE = 1 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { success: false, error: "File size must be under 1MB." };
  }

  const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!validMimes.includes(file.type)) {
    return { success: false, error: "Only JPEG, PNG, and WEBP image files are allowed." };
  }

  try {
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const extension = file.type.split("/")[1] || "jpg";
    const filename = `${session.user.id}_profile_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));

    const profileImageUrl = `/uploads/${filename}`;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { profileImageUrl },
    });

    revalidatePath("/");
    revalidatePath("/profile");
    return { success: true, profileImageUrl };
  } catch (error) {
    console.error("[uploadProfilePhoto] Error:", error);
    return { success: false, error: "Unable to upload your profile photo. Please try again." };
  }
}
