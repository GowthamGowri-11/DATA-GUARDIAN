import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Data Guardian - Secure Data Protection",
  description: "Protect your sensitive data with military-grade encryption, ephemeral sessions, and complete access control.",
  keywords: ["data protection", "encryption", "secure sharing", "privacy", "cybersecurity"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat&family=Lobster&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
