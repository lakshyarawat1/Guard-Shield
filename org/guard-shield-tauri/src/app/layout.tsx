import './global.css';

export const metadata = {
  title: 'Welcome to Guard Shield',
  description: 'Integrated Network Security Solution',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
