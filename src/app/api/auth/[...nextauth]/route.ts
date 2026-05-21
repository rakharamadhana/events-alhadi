// =============================================================================
// src/app/api/auth/[...nextauth]/route.ts — Auth.js v5 API Route Handler
// =============================================================================
// Exposes the NextAuth.js GET/POST handlers at /api/auth/*.
// =============================================================================

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
