import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/auth-context';

export default function ProfilePage() {
  const { user, loading, updatePlayerName, resendVerification } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.displayName || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(Boolean(user?.emailVerified));
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth?mode=login', { replace: true });
  }, [loading, user, navigate]);

  useEffect(() => { setName(user?.displayName || ''); }, [user?.displayName]);
  useEffect(() => { setVerified(Boolean(user?.emailVerified)); }, [user?.emailVerified]);

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try { await updatePlayerName(name); setMessage('Your display name has been updated.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update your profile.'); }
    finally { setBusy(false); }
  }

  async function verify() {
    setError(''); setMessage(''); setVerifyBusy(true);
    try { await resendVerification(); setMessage('A verification email has been sent. Check your inbox.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not send the verification email.'); }
    finally { setVerifyBusy(false); }
  }

  async function refreshVerification() {
    setError(''); setMessage(''); setVerifyBusy(true);
    try {
      await user.reload();
      await user.getIdToken(true);
      setVerified(user.emailVerified);
      setMessage(user.emailVerified ? 'Email verified. Online matchmaking is now unlocked.' : 'Email is not verified yet. Open the link in your inbox, then refresh again.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh verification status.'); }
    finally { setVerifyBusy(false); }
  }

  if (loading || !user) return <main className="profile-loading">Loading your player profile…</main>;

  return <main className="profile-screen">
    <Link to="/" className="auth-back"><ArrowLeft size={16}/> Back to CHECKMATE</Link>
    <section className="profile-card">
      <div className="auth-brand"><span>♞</span><b>CHECK<span>MATE</span></b></div>
      <div className="auth-kicker"><UserRound size={13}/> PLAYER ACCOUNT</div>
      <h1>Your profile.</h1>
      <p className="auth-subtitle">Manage the identity attached to your chess journey.</p>
      <div className="profile-identity">
        <div className="profile-avatar">{(user.displayName || user.email || 'P').charAt(0).toUpperCase()}</div>
        <div><strong>{user.displayName || 'Player'}</strong><span>{user.email}</span></div>
        <BadgeCheck size={19} className="profile-check"/>
      </div>
      <form className="auth-form" onSubmit={save}>
        <label>Display name<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={30} required placeholder="Your player name"/></label>
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile'} <span>→</span></button>
      </form>
      <div className="profile-security">
        <div><Mail size={17}/><span><b>Email address</b><small>{user.email}</small></span><em className={user.emailVerified ? 'verified' : 'unverified'}>{verified ? 'Verified' : 'Unverified'}</em></div>
        {!verified && <div className="verification-actions"><button onClick={verify} disabled={verifyBusy}>Resend verification email</button><button onClick={refreshVerification} disabled={verifyBusy}>I've verified — refresh status</button></div>}
        <div><ShieldCheck size={17}/><span><b>Account security</b><small>Authentication is managed by Firebase.</small></span></div>
      </div>
      {error && <div className="auth-error">{error}</div>}
      {message && <div className="auth-success">{message}</div>}
      <p className="auth-legal">Your CHECKMATE account is separate from AgriSence.</p>
    </section>
  </main>;
}
