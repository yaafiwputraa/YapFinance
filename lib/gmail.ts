import { google } from "googleapis";

export function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Decode a base64url-encoded Gmail message part.
 */
export function decodeBase64(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

/**
 * Extract plain text body from a Gmail message payload.
 */
interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
}

export function extractTextBody(payload: GmailPart): string {
  if (!payload) return "";

  // Prefer plain text
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Recurse into multipart
  if (payload.parts) {
    // First pass: prefer text/plain
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }
    // Second pass: recurse deeper
    for (const part of payload.parts) {
      const text = extractTextBody(part);
      if (text) return text;
    }
  }

  // Fallback: use HTML if no plain text found
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = decodeBase64(payload.body.data);
    // Strip HTML tags for a rough plain-text version
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return "";
}
