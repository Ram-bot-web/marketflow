import { useOffline } from '@/hooks/use-offline';
import { Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert, AlertDescription } from './alert';

export function OfflineIndicator() {
  const { isOffline, wasOffline } = useOffline();

  return (
    <AnimatePresence>
      {(isOffline || wasOffline) && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 z-50 max-w-sm"
        >
          <Alert
            variant={isOffline ? 'destructive' : 'default'}
            className="shadow-lg"
          >
            <div className="flex items-center gap-2">
              {isOffline ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  <AlertDescription>
                    You're offline. Some features may be limited.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <AlertDescription>
                    Connection restored!
                  </AlertDescription>
                </>
              )}
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

