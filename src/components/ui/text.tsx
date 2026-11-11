import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cn } from '../../lib/utils';

function Text({ className, ...props }: React.ComponentProps<typeof RNText> & { className?: string }) {
  return <RNText className={cn('text-base text-foreground', className)} {...props} />;
}
export { Text };
