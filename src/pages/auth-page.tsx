import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Chrome, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/auth-context';

export default function AuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, resetPassword, configured } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (!configured) { setError('CHECKMATE accounts are not enabled yet. Firebase setup is required.'); return; }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUp(name, email, password);
        setMessage('Account created. Check your inbox for the email verification link.');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message.replace('Firebase: ', '').replace(/ \(auth\/[^)]+\)\.?/, '') : 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  async function google() {
    setError(''); setMessage('');
    if (!configured) { setError('Google sign-in will be available after CHECKMATE Firebase setup.'); return; }
    setBusy(true);
    try { await signInWithGoogle(); navigate('/'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Google sign-in failed.'); }
    finally { setBusy(false); }
  }

  async function forgotPassword() {
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    if (!configured) { setError('Password recovery will be available after Firebase setup.'); return; }
    setError(''); setMessage('');
    try { await resetPassword(email); setMessage('If an account exists for that email, a password reset link has been sent.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send the reset email.'); }
  }

  return <main className="auth-screen">
    <div className="auth-glow"/>
    <Link to="/" className="auth-back"><ArrowLeft size={16}/> Back to CHECKMATE</Link>
    <section className="auth-card">
      <div className="auth-brand"><span>♞</span><b>CHECK<span>MATE</span></b></div>
      <div className="auth-kicker"><Sparkles size={13}/> YOUR NEXT CHAPTER STARTS HERE</div>
      <h1>{mode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h1>
      <p className="auth-subtitle">{mode === 'signup' ? 'Join a community built around the love of chess.' : 'Your board is waiting. Pick up where you left off.'}</p>
      {!configured && <div className="auth-config-note"><ShieldCheck size={16}/><span>Account services are being prepared. Firebase configuration is required before sign-in can be enabled.</span></div>}
      <button className="google-button" onClick={google} disabled={busy}><Chrome size={17}/> Continue with Google</button>
      <div className="auth-divider"><span/> OR WITH EMAIL <span/></div>
      <form onSubmit={submit} className="auth-form">
        {mode === 'signup' && <label>Display name<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="How should we call you?" required minLength={2}/></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/></label>
        <label>Password<span className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'} required minLength={mode === 'signup' ? 8 : 1}/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label="Toggle password visibility">{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></span></label>
        {mode === 'login' && <button type="button" className="forgot-link" onClick={forgotPassword}>Forgot password?</button>}
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'} <span>→</span></button>
      </form>
      <p className="auth-switch">{mode === 'signup' ? 'Already have an account?' : "New to CHECKMATE?"} <button onClick={()=>{setMode(mode === 'signup' ? 'login' : 'signup');setError('');setMessage('');}}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p>
      <div className="auth-legal">By continuing, you agree to play fair and respect the community.</div>
    </section>
    <div className="auth-footnote"><ShieldCheck size={13}/> Your account is separate from all other CHECKMATE projects.</div>
  </main>;
}
