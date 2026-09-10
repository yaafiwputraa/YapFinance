import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — YapBalance",
  description: "How YapBalance handles your Gmail and transaction data.",
};

/**
 * Wajib ada karena Google menolak "Publish app" di OAuth consent screen tanpa
 * privacy policy URL yang bisa diakses publik. Isinya harus jujur: Google
 * meninjau halaman ini saat aplikasi memakai scope Gmail.
 */
export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-slate-800">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: 11 September 2026</p>

      <p className="mt-8">
        YapBalance is a personal finance tracker operated by a single individual
        for their own use. It reads bank notification emails and turns them into
        a spending dashboard.
      </p>

      <h2 className="mt-10 text-xl font-semibold">What data is accessed</h2>
      <p className="mt-3">
        With your permission, YapBalance uses the{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
          gmail.readonly
        </code>{" "}
        scope to read messages in your Gmail account. It only ever requests
        messages sent from{" "}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
          receipts@blubybcadigital.id
        </code>
        , the Blu BCA transaction notification address. No other messages are
        read, and nothing is ever sent, deleted, or modified.
      </p>

      <h2 className="mt-10 text-xl font-semibold">How it is used</h2>
      <p className="mt-3">
        The text of each matching email is sent to an AI language model provider
        for the sole purpose of extracting structured transaction fields: date,
        amount, debit or credit, merchant name, and a spending category. Only
        those extracted fields, plus the Gmail message ID and a short preview
        snippet, are stored. The full email body is not retained.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Where it is stored</h2>
      <p className="mt-3">
        Extracted transactions are stored in a private Supabase (PostgreSQL)
        database accessible only to the operator. Budget settings are stored
        locally in your own browser and never leave your device.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Sharing</h2>
      <p className="mt-3">
        Your data is never sold, rented, or shared with third parties. It is not
        used for advertising, profiling, or training AI models. The only external
        services involved are Google (to read the emails), the AI provider (to
        extract fields from the email text), and Supabase (to store the result).
      </p>

      <h2 className="mt-10 text-xl font-semibold">Retention and deletion</h2>
      <p className="mt-3">
        Transactions are kept until deleted from the dashboard. You can revoke
        YapBalance&apos;s access to your Gmail account at any time at{" "}
        <a
          className="text-blue-600 underline"
          href="https://myaccount.google.com/permissions"
        >
          myaccount.google.com/permissions
        </a>
        , which immediately and permanently stops all further email access.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Contact</h2>
      <p className="mt-3">
        Questions about this policy can be sent to the developer contact address
        listed on the Google consent screen for this application.
      </p>
    </main>
  );
}
