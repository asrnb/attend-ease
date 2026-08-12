'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchCount() {
  // Count unique attendees who have checked in (not total attempts)
  const { data, error } = await supabase
    .from('checkins')
    .select('attendee_id');
  if (error) throw error;
  const unique = new Set((data ?? []).map(r => r.attendee_id));
  return unique.size;
}

async function findAttendee(phone) {
  const { data, error } = await supabase
    .from('attendees')
    .select('id, name')
    .eq('phone', phone)
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

async function hasCheckedIn(attendeeId) {
  const { count, error } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .eq('attendee_id', attendeeId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function createCheckIn(attendeeId) {
  const { error } = await supabase
    .from('checkins')
    .insert({ attendee_id: attendeeId });
  if (error) throw error;
}

async function registerAttendee(name, phone) {
  const { data, error } = await supabase
    .from('attendees')
    .insert({ name, phone })
    .select('id, name')
    .single();
  if (error) throw error;
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CheckInPage() {
  const [step, setStep]           = useState('phone'); // 'phone' | 'newuser' | 'success' | 'already'
  const [phone, setPhone]         = useState('');
  const [name, setName]           = useState('');
  const [pendingPhone, setPending] = useState('');
  const [successData, setSuccess] = useState({ name: '', msg: '' });
  const [alreadyName, setAlreadyName] = useState('');
  const [count, setCount]         = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const phoneRef = useRef(null);
  const nameRef  = useRef(null);

  // Load initial count
  useEffect(() => {
    fetchCount().then(setCount).catch(console.error);
    phoneRef.current?.focus();
  }, []);

  // Auto-focus name input when new-user step appears
  useEffect(() => {
    if (step === 'newuser') nameRef.current?.focus();
    if (step === 'phone')   phoneRef.current?.focus();
  }, [step]);

  // ── Check In (existing user) ──
  async function handleCheckIn() {
    const trimmed = phone.trim();
    if (!trimmed) { setError('Please enter your phone number.'); return; }

    setLoading(true);
    setError('');
    try {
      const attendee = await findAttendee(trimmed);
      if (attendee) {
        // Check if this attendee has already checked in
        const alreadyIn = await hasCheckedIn(attendee.id);
        if (alreadyIn) {
          setAlreadyName(attendee.name);
          setStep('already');
          return;
        }
        await createCheckIn(attendee.id);
        const newCount = await fetchCount();
        setCount(newCount);
        setSuccess({ name: attendee.name, msg: 'Successfully checked in! 🎉' });
        setStep('success');
      } else {
        setPending(trimmed);
        setStep('newuser');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ── Register + Check In (new user) ──
  async function handleRegister() {
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Please enter your name.'); return; }

    setLoading(true);
    setError('');
    try {
      const attendee = await registerAttendee(trimmedName, pendingPhone);
      await createCheckIn(attendee.id);
      const newCount = await fetchCount();
      setCount(newCount);
      setSuccess({ name: attendee.name, msg: 'Registered & checked in! Welcome 🎊' });
      setStep('success');
    } catch (err) {
      if (err.code === '23505') {
        setError('That phone number is already registered. Go back and try again.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setStep('phone');
    setPhone('');
    setName('');
    setPending('');
    setError('');
    setSuccess({ name: '', msg: '' });
    setAlreadyName('');
  }

  function resetToPhone() {
    setStep('phone');
    setName('');
    setError('');
  }

  // ── Keyboard shortcuts ──
  function onPhoneKey(e)  { if (e.key === 'Enter') handleCheckIn();  }
  function onNameKey(e)   { if (e.key === 'Enter') handleRegister();  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <main className={styles.container}>

        {/* Header */}
        <header className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <span className={styles.logoText}>AttendEase</span>
          </div>
          <div className={styles.eventBadge}>Live Event</div>
        </header>

        {/* Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.cardTitle}>Welcome! 👋</h1>
            <p className={styles.cardSubtitle}>Enter your phone number to check in</p>
          </div>

          {/* ── Step: Phone ── */}
          {step === 'phone' && (
            <div className={styles.step}>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input
                  ref={phoneRef}
                  id="phone-input"
                  type="tel"
                  className={styles.textInput}
                  placeholder="e.g. 09171234567"
                  maxLength={15}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={onPhoneKey}
                  autoComplete="tel"
                />
              </div>
              <button
                id="checkin-btn"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleCheckIn}
                disabled={loading}
              >
                {loading ? <Spinner /> : (
                  <>
                    <span>Check In</span>
                    <ChevronIcon />
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── Step: New User ── */}
          {step === 'newuser' && (
            <div className={styles.step}>
              <div className={styles.newUserBanner}>
                <span className={styles.newUserEmoji}>✨</span>
                <div>
                  <p className={styles.newUserTitle}>You&apos;re new here!</p>
                  <p className={styles.newUserDesc}>Enter your name to complete registration</p>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <span className={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  ref={nameRef}
                  id="name-input"
                  type="text"
                  className={styles.textInput}
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={onNameKey}
                  autoComplete="name"
                />
              </div>
              <div className={styles.btnRow}>
                <button
                  id="back-btn"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={resetToPhone}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  id="register-btn"
                  className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFlex}`}
                  onClick={handleRegister}
                  disabled={loading}
                >
                  {loading ? <Spinner /> : (
                    <>
                      <span>Register &amp; Check In</span>
                      <CheckIcon />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step: Success ── */}
          {step === 'success' && (
            <div className={`${styles.step} ${styles.stepSuccess}`}>
              <div className={styles.successBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className={styles.successName}>{successData.name}</h2>
              <p className={styles.successMsg}>{successData.msg}</p>
              <button
                id="checkin-another-btn"
                className={`${styles.btn} ${styles.btnOutline}`}
                onClick={resetAll}
              >
                Check in another
              </button>
            </div>
          )}

          {/* ── Step: Already Checked In ── */}
          {step === 'already' && (
            <div className={`${styles.step} ${styles.stepAlready}`}>
              <div className={styles.alreadyBadge}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <h2 className={styles.alreadyName}>{alreadyName}</h2>
              <p className={styles.alreadyTitle}>Already checked in!</p>
              <p className={styles.alreadyDesc}>This attendee has already been checked in today. No duplicate entry was recorded.</p>
              <button
                id="already-back-btn"
                className={`${styles.btn} ${styles.btnAmber}`}
                onClick={resetAll}
              >
                Try another number
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className={styles.errorMsg} role="alert">{error}</div>
          )}
        </div>

        {/* Stats */}
        <div className={styles.statsCard}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>📋</span>
            <div className={styles.statInfo}>
              <span className={styles.statLabel}>Total Check-Ins Today</span>
              <span className={styles.statValue} id="checkin-count">
                {count === null ? '—' : count}
              </span>
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <p>Powered by <strong>AttendEase</strong> × Supabase</p>
        </footer>

      </main>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className={styles.spinner} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
      <path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="1"/>
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
