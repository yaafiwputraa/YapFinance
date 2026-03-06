import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * TEMPORARY ROUTE — Handles the Google OAuth2 callback.
 * This will display your refresh token so you can copy it to .env.local.
 * After getting the token, you can delete this file.
 *
 * GOOGLE_REDIRECT_URI must be set to:
 * http://localhost:3000/api/auth/callback/google
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code returned from Google" }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  const { tokens } = await oauth2Client.getToken(code);

  // Return the tokens as JSON so you can copy the refresh_token
  return NextResponse.json({
    message: "Copy the refresh_token below into your .env.local as GOOGLE_REFRESH_TOKEN",
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expiry_date: tokens.expiry_date,
  });
}
