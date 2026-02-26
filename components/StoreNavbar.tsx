"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const MILLIES_PINK = "#ef4b81";
/* Nav links point to main Millie's site */
const NAV_LINKS = [
  { href: "https://www.millieshomemade.com/flavors/", label: "FLAVORS" },
  { href: "https://www.millieshomemade.com/about-millies-ice-cream/", label: "OUR STORY" },
  { href: "https://millies-homemade.com/events", label: "EVENTS" },
  { href: "https://www.milliesfranchise.com/", label: "FRANCHISING" },
  { href: "https://www.millieshomemade.com/locations/", label: "LOCATIONS" },
  { href: "https://www.millieshomemade.com/contact/", label: "CONTACT" },
];

export function StoreNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="millies-top-navbar">
      <div className="millies-navbar-container">
        <div className="millies-navbar-logo">
          <Link href="https://www.millieshomemade.com/">
            <Image
              src="/images/millies-logo.png"
              alt="millie's"
              width={160}
              height={48}
              className="millies-logo-image"
              priority
            />
          </Link>
        </div>
        <button
          type="button"
          className={`millies-mobile-menu-toggle${mobileMenuOpen ? " active" : ""}`}
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-expanded={mobileMenuOpen}
        >
          <span />
          <span />
          <span />
        </button>
        <div className={`millies-middle-nav ${mobileMenuOpen ? "active" : ""}`}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="millies-top-nav-middle"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="millies-navbar-cta">
          <Link href="https://www.millieshomemade.com/order-now/" className="millies-order-button">
            ORDER NOW
          </Link>
        </div>
      </div>
    </nav>
  );
}
