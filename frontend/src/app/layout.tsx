import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Q's Wellness AI Front Desk (Demo)",
  description: "Sales demo: AI receptionist, social media and patient reactivation agents for Q's Wellness Clinic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <div className="flex min-h-screen flex-col lg:flex-row">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <div className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900">
                DEMO DATA — fictional patients. No real patient information is used. Pricing shown is sample pricing.
              </div>
              <main className="mx-auto w-full min-w-0 max-w-[1500px] p-4 md:p-6">{children}</main>
            </div>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
