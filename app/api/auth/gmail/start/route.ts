import { NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * TEMPORARY ROUTE — Run once to get your Gmail refresh token.
 * After getting the token, store it in .env.local as GOOGLE_REFRESH_TOKEN.
 * You can then delete this file.
 *
 * Visit: http://localhost:3000/api/auth/gmail/start
 */
export async function GET() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Force to always return refresh_token
    scope: ["https://www.googleapis.com/auth/gmail.readonly"],
  });

  return NextResponse.redirect(authUrl);
}
