import { useRef, useState } from 'react';
import { scanFile, ApiError } from '../api/scanApi.js';

const MAX_SIZE_MB = 20;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function verdictLabel(v) {
  return {
    clean: 'Clean',
    suspicious: 'Suspicious',
    malicious: 'Malicious',
    unknown: 'Unknown — not previously seen',
  }[v] || v;
}

function VerdictReceipt({ result }) {
  const cls = { clean: 'safe', suspicious: 'warn', malicious: 'danger', unknown: 'err' }[result.verdict] || 'err';

  return (
    <div className="receipt">
      <div className="r-head">
        <div className="mark">Scan Result</div>
        <div className={`verdict ${cls}`}>{verdictLabel(result.verdict)}</div>
      </div>
      <div className="r-body">
        <div className="r-row"><span className="k">File</span><span className="v">{result.filename}</span></div>
        <div className="r-row"><span className="k">Size</span><span className="v">{formatSize(result.sizeBytes)}</span></div>
        <div className="r-row"><span className="k">SHA-256</span><span className="v mono-small">{result.sha256}</span></div>

        {result.findings?.length > 0 && (
          <ul className="steps">
            {result.findings.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        )}

        {result.reputation?.known && (
          <div className="r-row" style={{ marginTop: 10 }}>
            <span className="k">VirusTotal</span>
            <span className="v">{result.reputation.malicious} malicious / {result.reputation.harmless} harmless</span>
          </div>
        )}
      </div>
      <div className="r-foot">
        <p>
          {result.verdict === 'clean' && "No issues found by local checks or reputation lookup. Still exercise normal caution with files from unknown senders."}
          {result.verdict === 'unknown' && "This exact file hasn't been seen before, so no reputation data exists yet — local checks found nothing wrong, but treat it carefully if the source is unfamiliar."}
          {result.verdict === 'suspicious' && "Something about this file doesn't match what it claims to be. Don't open it unless you trust the source and know what you're doing."}
          {result.verdict === 'malicious' && "This file matched a pattern we never allow, or has been flagged by reputation data. Do not open it."}
        </p>
      </div>
    </div>
  );
}

export default function FileScanner() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function pickFile(file) {
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleScan() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanFile(selectedFile);
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tool-panel">
      <h2>Scan a file before you open it</h2>
      <p className="sub">
        Checks the file's signature against what it claims to be, and looks up its hash
        against known threat reports. Files are scanned in memory and never saved. Max {MAX_SIZE_MB}MB.
      </p>

      <div
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {selectedFile ? (
          <span className="dz-file">{selectedFile.name} · {formatSize(selectedFile.size)}</span>
        ) : (
          <span className="dz-hint">Drop a file here, or click to choose one</span>
        )}
      </div>

      <button className="primary-btn" onClick={handleScan} disabled={!selectedFile || loading}>
        {loading ? 'Scanning…' : 'Scan file'}
      </button>

      {loading && <div className="loading show">reading file, checking signature, looking up reputation …</div>}

      {error && (
        <div className="receipt-wrap show">
          <div className="receipt">
            <div className="r-head"><div className="mark">Result</div><div className="verdict err">Couldn't complete scan</div></div>
            <div className="r-body"><div className="r-row"><span className="k">Reason</span><span className="v">{error}</span></div></div>
          </div>
        </div>
      )}

      {result && (
        <div className="receipt-wrap show">
          <VerdictReceipt result={result} />
        </div>
      )}
    </div>
  );
}
