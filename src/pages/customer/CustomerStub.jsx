import { Link } from 'react-router-dom'

export default function CustomerStub() {
  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h1 className="text-2xl font-extrabold text-black tracking-tight">You're in.</h1>
      <p className="text-sm text-black/55 mt-2 max-w-xs">
        Auth is bypassed for now. Home, restaurants and dish screens are next in the queue —
        we'll build them when you give the word.
      </p>
      <Link
        to="/welcome"
        className="mt-8 inline-flex items-center justify-center px-5 h-11 rounded-full border border-black/20 text-sm font-semibold text-black hover:bg-black/5 transition-colors"
      >
        Back to Welcome
      </Link>
    </div>
  )
}
