import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { CrashGuard } from './components/CrashGuard';
import { installDiagnostics } from './services/diagnostics';

installDiagnostics();

createRoot(document.getElementById('root')!).render(<CrashGuard><App /></CrashGuard>);
