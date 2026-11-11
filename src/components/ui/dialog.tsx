import * as React from 'react';
import { View } from 'react-native';
import * as DialogPrimitive from '@rn-primitives/dialog';
import { cn } from '../../lib/utils';
import { Text } from './text';

const Dialog = DialogPrimitive.Root;
const DialogClose = DialogPrimitive.Close;

function DialogContent({ className, children, ...props }: DialogPrimitive.ContentProps & { className?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="absolute inset-0 items-center justify-center bg-black/70 p-6">
        <DialogPrimitive.Content className={cn('w-full max-w-sm rounded-lg border-2 border-border bg-card p-5', className)} {...props}>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  );
}
function DialogHeader({ className, ...props }: React.ComponentProps<typeof View> & { className?: string }) {
  return <View className={cn('mb-4 items-center gap-1', className)} {...props} />;
}
function DialogTitle({ className, ...props }: DialogPrimitive.TitleProps & { className?: string }) {
  return <DialogPrimitive.Title className={cn('text-2xl font-black text-foreground', className)} {...props} />;
}
function DialogDescription({ className, ...props }: DialogPrimitive.DescriptionProps & { className?: string }) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}
export { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription, Text };
