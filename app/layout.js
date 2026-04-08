import './globals.css'

export const metadata = {
  title: 'VietArt Site Scorecard',
  description: 'Đánh giá mặt bằng mở mới — VietArt F&B',
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
