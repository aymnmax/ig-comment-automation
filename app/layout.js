import "./globals.css";

export const metadata = {
  title: "IG Comment Automation",
  description: "Auto-reply and auto-DM on Instagram comments"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
