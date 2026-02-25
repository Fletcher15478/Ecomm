import localFont from "next/font/local";

/**
 * Program Narrow (navbar) – from app/programnarrow copy/
 * Medium (500) for nav links and ORDER NOW button.
 */
export const programNarrow = localFont({
  src: "./programnarrow copy/ProgramNarOT-Medium.otf",
  variable: "--font-program-narrow",
  display: "swap",
});

/**
 * Poppins – from app/poppins copy/
 * Use for body or other UI; variable: --font-poppins
 */
export const poppins = localFont({
  src: [
    { path: "./poppins copy/Poppins-Regular.ttf", weight: "400" },
    { path: "./poppins copy/Poppins-Medium.ttf", weight: "500" },
    { path: "./poppins copy/Poppins-SemiBold.ttf", weight: "600" },
    { path: "./poppins copy/Poppins-Bold.ttf", weight: "700" },
  ],
  variable: "--font-poppins",
  display: "swap",
});
