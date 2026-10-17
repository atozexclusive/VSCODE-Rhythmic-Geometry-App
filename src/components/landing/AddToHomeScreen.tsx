import { useEffect, useRef, useState } from 'react';
import { Check, Download, PlusSquare, Share, Smartphone, X } from 'lucide-react';

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export default function AddToHomeScreen() {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(isStandalone);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const update = () => {
      const standalone = isStandalone();
      setInstalled(standalone);
      if (standalone) setOpen(false);
    };
    const ready = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const complete = () => { setInstalled(true); setOpen(false); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    displayMode.addEventListener('change', update);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', complete);
      displayMode.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  async function install() {
    if (!installPrompt || installing) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === 'accepted') setOpen(false);
    } catch {
      setInstallPrompt(null);
      setNotice('Use your browser menu to add Rhythmic Geometry.');
    } finally {
      setInstalling(false);
    }
  }

  const steps = [
    { icon: Share, title: 'Open browser menu and tap share' },
    { icon: PlusSquare, title: 'Select “Add to Home Screen” option' },
    { icon: Check, title: 'Click “Confirm” and enjoy easy access to Rhythmic Geometry!' },
  ];

  return <>
    {!installed && <button type="button" ref={triggerRef} className="rg-install-trigger" onClick={() => { setNotice(''); setOpen(true); }}><Smartphone size={16} aria-hidden="true" />Add to Home Screen</button>}
    {open && <dialog ref={dialogRef} className="rg-install-dialog" aria-labelledby="rg-install-title" aria-describedby="rg-install-description"
      onCancel={() => setOpen(false)} onClose={() => setOpen(false)}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
      }}>
      <button type="button" className="rg-install-close" aria-label="Close install guide" onClick={() => setOpen(false)} autoFocus><X size={20} /></button>
      <div className="rg-install-preview"><img src="/icons/glass-cathedral-192.png" width="80" height="80" alt="Rhythmic Geometry app icon" /><span>Rhythmic Geometry</span></div>
      <p className="rg-install-eyebrow">Your rhythm. One tap away.</p>
      <h2 id="rg-install-title">Keep rhythm<br />within reach.</h2>
      <p id="rg-install-description">Add Rhythmic Geometry for quick access to Orbit, Study, and Riff.</p>
      {installPrompt && !appleMobile ? <button type="button" className="rg-button rg-install-primary" disabled={installing} onClick={install}><Download size={17} />{installing ? 'Opening installer…' : 'Install Rhythmic Geometry'}</button> : null}
      <ol className="rg-install-steps">{steps.map((step, index) => <li key={step.title}><span className="rg-install-step-number">{index + 1}</span><div><h3>{step.title}<step.icon size={17} aria-hidden="true" /></h3></div></li>)}</ol>
      {notice ? <p className="rg-install-note" role="status">{notice}</p> : null}
    </dialog>}
  </>;
}
