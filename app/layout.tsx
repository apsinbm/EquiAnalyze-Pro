import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Patrick's EquiAnalyze Pro",
  description: 'AI-powered equestrian biomechanics analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-equi-dark text-white">{children}</body>
    </html>
  );
}
