import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Hommikuülevaade',
  description: 'Isiklik hommikuarmatuurlaud — turud, energia ja ilm ühes kohas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
