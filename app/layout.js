import './globals.css';

export const metadata = {
  title: 'AttendEase | Event Check-In',
  description: 'Fast and simple attendee check-in system. Enter your phone number to check in to the event.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
