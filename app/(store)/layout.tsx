import { FloatingCartButton } from "@/components/FloatingCartButton";
import { StoreBannerWrapper } from "@/components/StoreBannerWrapper";
import { StoreNavbar } from "@/components/StoreNavbar";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <StoreNavbar />
      <StoreBannerWrapper />
      <main className="store-layout-main flex-1">{children}</main>
      <FloatingCartButton />
    </div>
  );
}
