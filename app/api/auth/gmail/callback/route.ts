import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

/**
 * OAuth2 callback — exchanges the authorization code for tokens.
 * After visiting /api/auth/gmail/start and approving access, Google
 * redirects here. Copy the displayed refresh_token into your Vercel
 * environment variables as GOOGLE_REFRESH_TOKEN.
 *
 * This route is intentionally not protected — it only works once per
 * OAuth flow and produces no side effects beyond displaying the token.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#000;color:#f00">
        <h2>OAuth Error</h2><pre>${error}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (!code) {
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#000;color:#f00">
        <h2>Missing code parameter</h2>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `<html><body style="font-family:monospace;padding:2rem;background:#111;color:#fbbf24">
          <h2>⚠️ No refresh_token returned</h2>
          <p>Google only returns a refresh_token on the <strong>first</strong> authorization.
          If you've authorized this app before, revoke access first:</p>
          <ol>
            <li>Go to <a href="https://myaccount.google.com/permissions" style="color:#60a5fa">myaccount.google.com/permissions</a></li>
            <li>Revoke access for your app</li>
            <li>Visit <a href="/api/auth/gmail/start" style="color:#60a5fa">/api/auth/gmail/start</a> again</li>
          </ol>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#111;color:#e4e4e7">
        <h2 style="color:#4ade80">✓ Got refresh token</h2>
        <p>Copy this value into your Vercel environment variables as <code style="color:#60a5fa">GOOGLE_REFRESH_TOKEN</code>:</p>
        <pre style="background:#000;padding:1rem;border-radius:8px;word-break:break-all;color:#fbbf24">${tokens.refresh_token}</pre>
        <p style="color:#71717a;font-size:0.8rem">After saving the env var in Vercel, redeploy for it to take effect.</p>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new NextResponse(
      `<html><body style="font-family:monospace;padding:2rem;background:#000;color:#f00">
        <h2>Token exchange failed</h2><pre>${message}</pre>
      </body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
}
