export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
} 