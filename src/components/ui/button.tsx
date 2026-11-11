import * as React from 'react';
import { Pressable } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { Text } from './text';

const buttonVariants = cva('flex-row items-center justify-center rounded-md active:opacity-80', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-transparent',
      ghost: 'bg-transparent',
    },
    size: { default: 'h-12 px-5', sm: 'h-10 px-4', lg: 'h-14 px-8' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});

type Props = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants> & { className?: string; label: string };

function Button({ className, variant, size, label, ...props }: Props) {
  return (
    <Pressable className={cn(buttonVariants({ variant, size }), className)} {...props}>
      <Text className="text-lg font-bold">{label}</Text>
    </Pressable>
  );
}
export { Button, buttonVariants };
