import { ScreenerPanel } from '../components/screener/ScreenerPanel';

export default function Screener() {
  return (
    <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <ScreenerPanel />
    </div>
  );
}
