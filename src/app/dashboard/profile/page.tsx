'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Profile {
  id: string
  email: string
  role: string
  full_name: string | null
  alert_email: string | null
}

const supabase = createClient()

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

const STYLES = `
  * { box-sizing: border-box; }

  .page-root {
    min-height: 100vh;
    background: #f7f6f3;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
    color: #1a1917;
  }

  .page-header {
    background: white;
    border-bottom: 1px solid #e8e6e0;
    padding: 0 28px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  }

  .header-left { display: flex; align-items: center; gap: 12px; }

  .brand-link {
    font-size: 18px;
    font-weight: 700;
    color: #1a1917;
    text-decoration: none;
    letter-spacing: -0.3px;
  }
  .brand-link:hover { color: #6366f1; }

  .header-divider { width: 1px; height: 18px; background: #e8e6e0; }
  .page-title { font-size: 13px; font-weight: 500; color: #9e9c97; }

  .header-nav { display: flex; align-items: center; gap: 4px; }
  .nav-link {
    text-decoration: none;
    font-size: 12px;
    font-weight: 500;
    color: #9e9c97;
    padding: 6px 12px;
    border-radius: 8px;
    transition: all 0.15s;
  }
  .nav-link:hover { background: #f7f6f3; color: #1a1917; }

  .nav-btn {
    font-size: 12px;
    font-weight: 500;
    color: #9e9c97;
    padding: 6px 12px;
    border-radius: 8px;
    border: none;
    background: none;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
  }
  .nav-btn:hover { background: #fef2f2; color: #dc2626; }

  .page-body {
    max-width: 560px;
    margin: 0 auto;
    padding: 28px 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .card {
    background: white;
    border: 1px solid #e8e6e0;
    border-radius: 16px;
    padding: 22px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  .card.danger { border-color: #fca5a5; background: #fffafa; }

  .card-title {
    font-size: 11px;
    font-weight: 600;
    color: #a09e99;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 18px;
  }

  /* Avatar row */
  .avatar-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    padding-bottom: 18px;
    border-bottom: 1px solid #f0ede6;
  }

  .avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: #eff4ff;
    border: 2px solid #93b4fd;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: #6366f1;
    flex-shrink: 0;
  }

  .avatar-name { font-size: 15px; font-weight: 600; color: #1a1917; letter-spacing: -0.2px; }
  .avatar-email { font-size: 12px; color: #9e9c97; margin-top: 2px; }

  .role-pill {
    display: inline-block;
    margin-top: 5px;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 9px;
    border-radius: 10px;
    background: #eff4ff;
    color: #6366f1;
    border: 1px solid #93b4fd;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .field-group { margin-bottom: 14px; }
  .field-group:last-of-type { margin-bottom: 0; }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: #a09e99;
    letter-spacing: 0.4px;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .field-hint { font-size: 11px; color: #c4c1ba; margin-top: 4px; }

  .text-input {
    width: 100%;
    height: 44px;
    background: #fafaf8;
    border: 1.5px solid #e8e6e0;
    border-radius: 10px;
    padding: 0 14px;
    font-size: 14px;
    font-family: inherit;
    color: #1a1917;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .text-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .text-input::placeholder { color: #c4c1ba; }

  .btn-primary {
    width: 100%;
    height: 44px;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(99,102,241,0.2);
  }
  .btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; transform: none; box-shadow: none; }

  /* Password section */
  .pw-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .toggle-link {
    font-size: 12px;
    font-weight: 500;
    color: #6366f1;
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
  }
  .toggle-link:hover { text-decoration: underline; }

  .pw-hint { font-size: 12px; color: #a09e99; line-height: 1.5; }

  .error-text { font-size: 12px; color: #dc2626; margin-top: 6px; }

  /* Danger zone */
  .danger-title { font-size: 11px; font-weight: 600; color: #dc2626; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
  .danger-desc { font-size: 13px; color: #9e9c97; margin-bottom: 14px; line-height: 1.5; }

  .btn-danger {
    height: 40px;
    padding: 0 18px;
    background: none;
    color: #dc2626;
    border: 1.5px solid #fca5a5;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .btn-danger:hover { background: #fef2f2; border-color: #dc2626; }

  /* Loading */
  .loading-root {
    min-height: 100vh;
    background: #f7f6f3;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
  }
  .loading-dots { display: flex; gap: 6px; }
  .loading-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #6366f1;
    animation: bounce 1.2s infinite;
  }
  .loading-dot:nth-child(2) { animation-delay: 0.15s; }
  .loading-dot:nth-child(3) { animation-delay: 0.3s; }
  @keyframes bounce {
    0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner {
    display: inline-block;
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
`

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  const [fullName, setFullName] = useState('')
  const [alertEmail, setAlertEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const router = useRouter()

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        setFullName(profileData.full_name || '')
        setAlertEmail(profileData.alert_email || user.email || '')
      }
    } catch { toast.error('Failed to load profile') }
    finally { setLoading(false) }
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: fullName || null, alert_email: alertEmail || null })
        .eq('id', user.id)

      if (profileError) throw profileError

      await fetchWithAuth('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ alert_email: alertEmail }),
      })

      toast.success('Profile saved')
      loadProfile()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password changed successfully')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswordForm(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password')
    } finally { setChangingPassword(false) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const avatarLetter = (profile?.full_name || profile?.email || 'U')[0].toUpperCase()
  const pwMismatch = newPassword && confirmPassword && newPassword !== confirmPassword

  return (
    <div className="page-root">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="page-header">
        <div className="header-left">
          <a href="/dashboard" className="brand-link">Sentinel</a>
          <div className="header-divider" />
          <span className="page-title">Profile</span>
        </div>
        <nav className="header-nav">
          <a href="/dashboard" className="nav-link">Dashboard</a>
          <a href="/dashboard/settings" className="nav-link">Settings</a>
          <button onClick={handleLogout} className="nav-btn">Log out</button>
        </nav>
      </header>

      {loading ? (
        <div className="loading-root">
          <div className="loading-dots">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
        </div>
      ) : (
        <div className="page-body">
          {/* Account info */}
          <div className="card">
            <div className="card-title">Account</div>
            <div className="avatar-row">
              <div className="avatar">{avatarLetter}</div>
              <div>
                <div className="avatar-name">{profile?.full_name || 'No name set'}</div>
                <div className="avatar-email">{profile?.email}</div>
                <div className="role-pill">{profile?.role}</div>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Display Name</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your name"
                className="text-input"
              />
            </div>

            <div className="field-group">
              <label className="field-label">Alert Email</label>
              <input
                value={alertEmail}
                onChange={e => setAlertEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="text-input"
              />
              <div className="field-hint">All signal alerts and weekly reports are sent here</div>
            </div>

            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
              {saving ? <><span className="spinner" /> Saving…</> : <>Save profile</>}
            </button>
          </div>

          {/* Password */}
          <div className="card">
            <div className="pw-header">
              <div className="card-title" style={{ margin: 0 }}>Password</div>
              <button className="toggle-link" onClick={() => setShowPasswordForm(!showPasswordForm)}>
                {showPasswordForm ? 'Cancel' : 'Change password'}
              </button>
            </div>

            {!showPasswordForm ? (
              <div className="pw-hint">Your password was set when your account was created. Click "Change password" to update it.</div>
            ) : (
              <>
                <div className="field-group">
                  <label className="field-label">New Password</label>
                  <input
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="Min 8 characters"
                    className="text-input"
                  />
                </div>
                <div className="field-group">
                  <label className="field-label">Confirm New Password</label>
                  <input
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="Repeat new password"
                    className="text-input"
                  />
                  {pwMismatch && <div className="error-text">Passwords do not match</div>}
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !!pwMismatch || newPassword.length < 8}
                  className="btn-primary"
                  style={{ marginTop: 8 }}
                >
                  {changingPassword ? <><span className="spinner" /> Updating…</> : <>Update password</>}
                </button>
              </>
            )}
          </div>

          {/* Sign out */}
          <div className="card danger">
            <div className="danger-title">Sign out</div>
            <div className="danger-desc">Sign out from this device. You can log back in anytime.</div>
            <button onClick={handleLogout} className="btn-danger">Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}