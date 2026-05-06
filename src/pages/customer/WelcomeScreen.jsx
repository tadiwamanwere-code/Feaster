import { useNavigate } from 'react-router-dom'

export default function WelcomeScreen() {
  const navigate = useNavigate()

  // If user already onboarded, skip welcome
  // (kept simple — onboarding completion writes feaster:onboarded=true)

  const onStart = () => {
    const onboarded = localStorage.getItem('feaster:onboarded') === 'true'
    navigate(onboarded ? '/app' : '/onboarding')
  }

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col items-center justify-center px-6">
      <h1 className="text-4xl font-extrabold text-black tracking-tight text-center leading-tight">
        Welcome to Feaster
      </h1>

      <button
        onClick={onStart}
        className="mt-12 w-full max-w-xs h-14 rounded-full bg-black text-white font-bold text-base active:scale-[0.97] transition-transform"
      >
        Get Started
      </button>
    </div>
  )
}
