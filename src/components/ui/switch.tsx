import * as React from 'react';
import * as SwitchPrimitives from '@rn-primitives/switch';
import { cn } from '../../lib/utils';

function Switch({ className, ...props }: SwitchPrimitives.RootProps & { className?: string }) {
  return (
    <SwitchPrimitives.Root
      className={cn('h-8 w-14 flex-row items-center rounded-full border-2 border-transparent', props.checked ? 'bg-primary' : 'bg-input', className)}
      {...props}
    >
      <SwitchPrimitives.Thumb className={cn('h-6 w-6 rounded-full bg-white', props.checked ? 'ml-auto' : 'ml-0')} />
    </SwitchPrimitives.Root>
  );
}
export { Switch };
