import { SignIn } from "@clerk/nextjs"

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold text-white">Sign in to MediLedger</h2>
          <p className="mt-2 text-sm text-slate-400">Access your healthcare blockchain dashboard</p>
        </div>
        <SignIn
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "glassmorphism border-slate-700",
            },
          }}
        />
      </div>
    </div>
  )
}
