// =============================================================================
// src/app/actions/auth.ts — Server Actions for Registration
// =============================================================================
// Handles user registration with password hashing and input validation.
// New users are created with status PENDING — they cannot log in until
// an admin changes their status to APPROVED.
// =============================================================================

"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
