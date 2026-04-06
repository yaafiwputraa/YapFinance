import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
})

export const metadata: Metadata = {
  title: "YapBalance",
  description: "AI-Powered Finance Tracker",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`overflow-x-hidden ${plusJakartaSans.variable}`}>
      <body className="overflow-x-hidden w-full font-[var(--font-jakarta)]">
        {children}
      </body>
    </html>
  )
}
