import HomePage from './HomePage';
import { CHAINS } from '@/lib/cctp/constants';

// Send display data only: the public client must not import RPC/wallet libraries.
export default function LandingPage() {
  const chains = CHAINS.map(({ name, color, icon }) => ({ name, color, icon }));
  return <HomePage chains={chains} />;
}
