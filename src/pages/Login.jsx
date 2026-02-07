import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Zap, ArrowRight, Loader2, Sparkles } from 'lucide-react'

export default function Login() {
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app')
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential'
          ? 'Email ou mot de passe incorrect'
          : 'Une erreur est survenue'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
      navigate('/app')
    } catch (err) {
      setError('Erreur de connexion avec Google')
    } finally {
      setLoading(false)
    }
  }

  const handleDemo = () => {
    navigate('/app?demo=true')
  }

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/20 via-dark-950 to-dark-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,212,154,0.15),_transparent_60%)]" />

        <div className="relative z-10 flex flex-col justify-between p-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Zap className="w-6 h-6 text-dark-950" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-2xl">Face Media</h1>
              <span className="text-sm text-brand-400 font-medium">Factory</span>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-display text-4xl font-bold text-white leading-tight">
              Transformez votre
              <br />
              prospection en
              <br />
              <span className="gradient-text">machine à leads.</span>
            </h2>
            <p className="text-dark-300 text-lg max-w-md">
              L'IA analyse vos clients, génère des séquences email personnalisées
              et identifie vos meilleurs prospects. Automatiquement.
            </p>
          </div>

          <div className="flex items-center gap-8 text-sm text-dark-400">
            <div>
              <p className="text-2xl font-display font-bold text-white">4x</p>
              <p>plus de réponses</p>
            </div>
            <div className="w-px h-10 bg-dark-700" />
            <div>
              <p className="text-2xl font-display font-bold text-white">10 min</p>
              <p>par jour suffisent</p>
            </div>
            <div className="w-px h-10 bg-dark-700" />
            <div>
              <p className="text-2xl font-display font-bold text-white">0</p>
              <p>compétences requises</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-dark-950" />
            </div>
            <h1 className="font-display font-bold text-white text-xl">Face Media Factory</h1>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-display font-bold text-white">Bon retour 👋</h2>
            <p className="mt-2 text-dark-400">Connectez-vous pour accéder à votre dashboard</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="vous@entreprise.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-dark-950 text-dark-500">ou</span>
            </div>
          </div>

          <button onClick={handleGoogle} className="btn-secondary w-full flex items-center justify-center gap-3" disabled={loading}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuer avec Google
          </button>

          {/* Demo Button */}
          <button
            onClick={handleDemo}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-500/10 to-purple-500/10 border border-brand-500/30 text-brand-400 hover:from-brand-500/20 hover:to-purple-500/20 transition-all font-medium"
          >
            <Sparkles className="w-5 h-5" />
            Tester la demo gratuitement
          </button>

          <p className="text-center text-sm text-dark-500">
            Pas encore de compte ?{' '}
            <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
