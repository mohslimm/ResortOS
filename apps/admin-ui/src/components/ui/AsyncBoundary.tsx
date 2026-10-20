import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';
import { Button } from './Button';
import type { AsyncState } from '@/types';

interface AsyncBoundaryProps<T> {
  state: AsyncState<T>;
  children: (data: T) => ReactNode;
}

export const AsyncBoundary = <T,>({ state, children }: AsyncBoundaryProps<T>) => {
  if (state.status === 'idle') {
    return null;
  }

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text-muted min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500 mb-4" />
        <p className="font-outfit text-sm">{state.message || 'Chargement des données...'}</p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center"
      >
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-danger" />
        </div>
        <h3 className="font-cormorant text-xl text-text-primary mb-2">Erreur de chargement</h3>
        <p className="font-outfit text-text-muted max-w-md mb-6">{state.error}</p>
        {state.retry && (
          <Button onClick={state.retry} variant="secondary">
            Réessayer
          </Button>
        )}
      </motion.div>
    );
  }

  if (state.status === 'empty') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-12 min-h-[300px] border border-dashed border-border-subtle rounded-xl bg-bg-surface"
      >
        <Inbox className="h-10 w-10 text-gold-500/50 mb-4" />
        <p className="font-outfit text-text-muted mb-4">{state.cta || 'Aucune donnée trouvée.'}</p>
      </motion.div>
    );
  }

  return <>{children(state.data)}</>;
};

AsyncBoundary.displayName = 'AsyncBoundary';
