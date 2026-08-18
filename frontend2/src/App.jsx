import { useState } from 'react';
import FileScanner from './components/FileScanner.jsx';
import TempMail from './components/TempMail.jsx';

const TABS = [
  { id: 'scan', label: 'File Scanner' },
  { id: 'tempmail', label: 'Temp Mail' },
];

export default function App() {
  const [active, setActive] = useState('scan');

  return (
    <div className="page">
      <div className="brandbar">
        <div className="mark">S</div>
        <span>Sinta Tools</span>
      </div>

      <h1>Extra tools to stay <em>a step ahead</em></h1>
      <p className="sub">Two more ways to check before you click or share.</p>

      <div className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${active === t.id ? 'active' : ''}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {active === 'scan' && <FileScanner />}
        {active === 'tempmail' && <TempMail />}
      </div>

      <footer>
        Looking for the email leak checker? That's a separate standalone page.
        Not a replacement for official advice — if money or a government ID was involved, report to the{' '}
        <a href="https://www.pnpacg.ph/" target="_blank" rel="noopener noreferrer">PNP Anti-Cybercrime Group</a>{' '}
        or the{' '}
        <a href="https://www.privacy.gov.ph/" target="_blank" rel="noopener noreferrer">National Privacy Commission</a>.
      </footer>
    </div>
  );
}
