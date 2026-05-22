import React, { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './styles.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="center">Loading...</div>
  }

  return session ? (
    <ScienceHome session={session} />
  ) : (
    <Auth />
  )
}

function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setMsg('')
    setLoading(true)

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        })

        if (error) {
          setMsg(error.message)
        } else {
          setMsg('Account created successfully!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })

        if (error) {
          setMsg(error.message)
        }
      }
    } catch (err) {
      setMsg('Something went wrong')
    }

    setLoading(false)
  }

  return (
    <div className="authPage">
      <form className="authCard" onSubmit={handleSubmit}>
        <div className="logo">🧠</div>

        <h1>Cambridge Science Mind Map</h1>

        <p>
          Ôn tập Science bằng sơ đồ tư duy, hình ảnh và quiz.
        </p>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading
            ? 'Loading...'
            : mode === 'login'
            ? 'Log in'
            : 'Create account'}
        </button>

        <button
          type="button"
          className="ghost"
          onClick={() =>
            setMode(mode === 'login' ? 'signup' : 'login')
          }
        >
          {mode === 'login'
            ? 'Create new account'
            : 'Back to login'}
        </button>

        {msg && <div className="message">{msg}</div>}
      </form>
    </div>
  )
}

function ScienceHome({ session }) {
  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="home">
      <div className="topbar">
        <div>
          <h2>Science Mind Map</h2>
          <p>{session.user.email}</p>
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="content">
        <div className="card">
          <h3>Plants</h3>
          <p>Roots • Stem • Leaves • Flower</p>
        </div>

        <div className="card">
          <h3>Animals</h3>
          <p>Mammals • Birds • Fish • Reptiles</p>
        </div>

        <div className="card">
          <h3>Materials</h3>
          <p>Wood • Metal • Plastic • Glass</p>
        </div>
      </div>
    </div>
  )
}
