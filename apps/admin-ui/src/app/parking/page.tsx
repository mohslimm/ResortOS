import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParkingStore } from '@/stores/useParkingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Car, ArrowRightToLine, ArrowLeftFromLine } from 'lucide-react';
import { VARIANTS } from '@/lib/variants';
import { format } from 'date-fns';

export default function ParkingPage() {
  const { slotsState, sessionsState, fetchSlots, fetchSessions, enterParking, exitParking } = useParkingStore();
  const { isAuthenticated } = useAuthStore();
  const [entryPlate, setEntryPlate] = useState('');
  const [exitPlate, setExitPlate] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchSlots();
      fetchSessions();
    }
  }, [isAuthenticated, fetchSlots, fetchSessions]);

  const handleEnter = () => {
    if (entryPlate) {
      enterParking(entryPlate);
      setEntryPlate('');
    }
  };

  const handleExit = () => {
    if (exitPlate) {
      exitParking(exitPlate);
      setExitPlate('');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cormorant text-3xl text-text-primary italic mb-2">Parking & Valet</h1>
        <p className="font-outfit text-text-muted">Gestion des entrées, sorties et facturation du parking.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ACTION PANEL */}
        <section className="space-y-4">
          <Card className="p-6">
            <h2 className="font-outfit text-xl font-medium text-text-primary mb-4 flex items-center gap-2">
              <ArrowRightToLine className="h-5 w-5 text-success" />
              Entrée Véhicule
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Plaque d'immatriculation"
                value={entryPlate}
                onChange={(e) => setEntryPlate(e.target.value.toUpperCase())}
                className="flex-1 bg-bg-primary border border-border-subtle rounded-md px-4 py-2 text-text-primary focus:outline-none focus:border-gold-500 transition-colors"
              />
              <Button onClick={handleEnter} disabled={!entryPlate}>Ouvrir Barrière</Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-outfit text-xl font-medium text-text-primary mb-4 flex items-center gap-2">
              <ArrowLeftFromLine className="h-5 w-5 text-danger" />
              Sortie Véhicule
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Plaque d'immatriculation"
                value={exitPlate}
                onChange={(e) => setExitPlate(e.target.value.toUpperCase())}
                className="flex-1 bg-bg-primary border border-border-subtle rounded-md px-4 py-2 text-text-primary focus:outline-none focus:border-gold-500 transition-colors"
              />
              <Button onClick={handleExit} variant="secondary" disabled={!exitPlate}>Calculer Frais</Button>
            </div>
          </Card>

          <h2 className="font-outfit text-xl font-medium text-text-primary mt-8 mb-4">État des places</h2>
          <AsyncBoundary state={slotsState}>
            {(slots) => (
              <motion.div 
                className="grid grid-cols-4 gap-3"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {slots.map(slot => (
                  <motion.div key={slot.id} variants={VARIANTS.fadeInUp}>
                    <div className={`p-3 rounded-lg border text-center ${
                      slot.status === 'FREE' 
                        ? 'border-success/30 bg-success/5 text-success' 
                        : slot.status === 'OCCUPIED'
                          ? 'border-danger/30 bg-danger/5 text-danger'
                          : 'border-warning/30 bg-warning/5 text-warning'
                    }`}>
                      <div className="font-bold text-lg">{slot.slotNumber}</div>
                      <div className="text-xs opacity-70">{slot.zone}</div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AsyncBoundary>
        </section>

        {/* SESSIONS LIST */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Car className="h-5 w-5 text-gold-500" />
            <h2 className="font-outfit text-xl font-medium text-text-primary">Sessions Actives</h2>
          </div>
          <AsyncBoundary state={sessionsState}>
            {(sessions) => (
              <motion.div 
                className="grid gap-3"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {sessions.filter(s => s.status === 'ACTIVE').map(session => (
                  <motion.div key={session.id} variants={VARIANTS.fadeInUp}>
                    <Card className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-outfit font-bold text-text-primary text-xl tracking-widest mb-1">
                          {session.licensePlate}
                        </div>
                        <div className="text-sm text-text-muted">
                          Place {session.slot.slotNumber} • Entré à {format(new Date(session.entryTime), 'HH:mm')}
                        </div>
                      </div>
                      <Badge variant="warning">En cours</Badge>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AsyncBoundary>
        </section>
      </div>
    </div>
  );
}
