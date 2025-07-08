export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-80px)]">
      <div className="m-auto w-full max-w-md">
        {children}
      </div>
    </div>
  )
} 