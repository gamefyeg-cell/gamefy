import Header from "@/components/storefront/Header";
import Footer from "@/components/storefront/Footer";
import PreloaderLoader from "@/components/intro/PreloaderLoader";
import AmbientBackground from "@/components/storefront/AmbientBackground";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AmbientBackground />
      {/* Storefront-only — admins managing the store don't need the brand
          intro replaying every session. */}
      <PreloaderLoader />
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
