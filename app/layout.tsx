import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/app/cart/CartContext";
import { programNarrow, poppins } from "./fonts";

export const metadata: Metadata = {
  title: "Store",
  description: "Custom ecommerce platform",
  icons: {
    icon: [{ url: "/images/cone-pink.svg", type: "image/svg+xml" }],
    apple: [{ url: "/images/cone-pink.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`antialiased min-h-screen bg-gray-50 text-gray-900 ${programNarrow.variable} ${poppins.variable}`}
        suppressHydrationWarning
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
