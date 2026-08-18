import { useEffect, useRef, useState } from 'react';
import { createInbox, fetchInbox, ApiError } from '../api/tempMailApi.js';

function formatCountdown(expiresAt) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

export default function TempMail() {
  const [inbox, setInbox] = useState(null); // { address, expiresAt }
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState('');
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setMessages([]);
    try {
      const data = await createInbox();
      setInbox(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function refresh(address) {
    setRefreshing(true);
    try {
      const data = await fetchInbox(address);
      setMessages(data.messages || []);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) {
        setError('This inbox has expired. Generate a new one.');
        setInbox(null);
      } else {
        setError(err instanceof ApiError ? err.message : 'Unexpected error refreshing inbox.');
      }
    } finally {
      setRefreshing(false);
    }
  }

  function handleCopy() {
    if (inbox?.address) navigator.clipboard?.writeText(inbox.address);
  }

  useEffect(() => {
    if (!inbox) return;
    refresh(inbox.address);
    pollRef.current = setInterval(() => refresh(inbox.address), 10000);
    tickRef.current = setInterval(() => setCountdown(formatCountdown(inbox.expiresAt)), 1000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inbox?.address]);

  return (
    <div className="tool-panel">
      <h2>Get a disposable email address</h2>
      <p className="sub">
        Use this for sign-ups you don't fully trust. The inbox expires automatically —
        nothing is kept after that.
      </p>

      {!inbox && (
        <button className="primary-btn" onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating…' : 'Generate inbox'}
        </button>
      )}

      {inbox && (
        <div className="inbox-card">
          <div className="inbox-address" onClick={handleCopy} title="Click to copy">
            {inbox.address}
          </div>
          <div className="inbox-meta">
            <span>Expires in {countdown || formatCountdown(inbox.expiresAt)}</span>
            <button className="text-btn" onClick={() => refresh(inbox.address)} disabled={refreshing}>
              {refreshing ? 'Checking…' : 'Refresh'}
            </button>
          </div>

          <div className="inbox-messages">
            {messages.length === 0 ? (
              <p className="empty-state">No messages yet. This page checks automatically every 10 seconds.</p>
            ) : (
              messages.map((m, i) => (
                <div className="message-card" key={i}>
                  <div className="message-head">
                    <span className="from">{m.from}</span>
                    <span className="time">{new Date(m.receivedAt).toLocaleTimeString('en-PH')}</span>
                  </div>
                  {m.subject && <div className="subject">{m.subject}</div>}
                  <div className="body">{m.text}</div>
                </div>
              ))
            )}
          </div>

          <button className="text-btn" onClick={handleGenerate} disabled={loading}>
            Get a different address
          </button>
        </div>
      )}

      {error && (
        <div className="receipt-wrap show">
          <div className="receipt">
            <div className="r-head"><div className="mark">Result</div><div className="verdict err">Something went wrong</div></div>
            <div className="r-body"><div className="r-row"><span className="k">Reason</span><span className="v">{error}</span></div></div>
          </div>
        </div>
      )}
    </div>
  );
}
