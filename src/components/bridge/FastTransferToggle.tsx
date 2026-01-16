'use client';

import { Switch } from '@/components/ui/switch';

interface FastTransferToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  visible?: boolean;
}

export function FastTransferToggle({
  enabled,
  onChange,
  visible = true,
}: FastTransferToggleProps) {
  if (!visible) return null;

  return (
    <Switch
      id="fast-transfer"
      checked={enabled}
      onCheckedChange={onChange}
    />
  );
}
