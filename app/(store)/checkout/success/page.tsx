import Link from "next/link";
import { redirect } from "next/navigation";

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const orderId = params.orderId;

  if (!orderId) redirect("/");

  return (
    <div
      className="p-6 max-w-lg mx-auto w-full text-center py-16 px-8"
      data-page="checkout-success"
    >
      <h1
        className="text-2xl sm:text-3xl font-bold uppercase tracking-tight mb-4"
        style={{ color: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
      >
        Thank you for your order
      </h1>
      <p
        className="text-gray-600 mb-2 font-medium"
        style={{ fontFamily: "var(--font-program-narrow)" }}
      >
        Order ID: <strong>{orderId}</strong>
      </p>
      <p className="text-gray-600 mb-8 text-sm">
        A confirmation email has been sent to the address you provided.
      </p>
      <Link
        href="/products"
        className="inline-block text-white px-8 py-3.5 rounded-full font-semibold uppercase tracking-wide hover:opacity-90 transition-opacity"
        style={{ background: "var(--millies-pink)", fontFamily: "var(--font-program-narrow)" }}
      >
        Continue shopping
      </Link>
    </div>
  );
}
