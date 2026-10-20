import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { usePmsStore } from '@/stores/usePmsStore';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BedDouble, Calendar, User, LogIn, LogOut } from 'lucide-react';
import { VARIANTS } from '@/lib/variants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BookingModal } from '@/components/modules/pms/BookingModal';import { useAuthStore } from '@/stores/useAuthStore';

export default function PmsPage() {
  const { roomsState, bookingsState, fetchRooms, fetchBookings, checkIn, checkOut } = usePmsStore();
  const { isAuthenticated } = useAuthStore();
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchRooms();
      fetchBookings();
    }
  }, [isAuthenticated, fetchRooms, fetchBookings]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return 'success';
      case 'OCCUPIED': return 'danger';
      case 'MAINTENANCE': return 'warning';
      case 'CLEANING': return 'warning';
      default: return 'default';
    }
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'success';
      case 'CHECKED_IN': return 'warning';
      case 'CHECKED_OUT': return 'default';
      case 'CANCELLED': return 'danger';
      default: return 'default';
    }
  };

  const availableRooms = roomsState.status === 'success' 
    ? roomsState.data.filter(r => r.status === 'AVAILABLE') 
    : [];

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-cormorant text-3xl text-text-primary italic mb-2">Property Management</h1>
          <p className="font-outfit text-text-muted">Gestion des chambres et des réservations du resort.</p>
        </div>
        <Button onClick={() => setIsBookingOpen(true)}>
          Nouvelle Réservation
        </Button>
      </div>

      <BookingModal 
        isOpen={isBookingOpen} 
        onClose={() => setIsBookingOpen(false)} 
        availableRooms={availableRooms}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ROOMS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <BedDouble className="h-5 w-5 text-gold-500" />
            <h2 className="font-outfit text-xl font-medium text-text-primary">Chambres</h2>
          </div>
          <AsyncBoundary state={roomsState}>
            {(rooms) => (
              <motion.div 
                className="grid gap-4"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {rooms.map(room => (
                  <motion.div key={room.id} variants={VARIANTS.fadeInUp}>
                    <Card className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-outfit font-medium text-text-primary text-lg">
                          Chambre {room.number}
                        </div>
                        <div className="text-sm text-text-muted">{room.type} • {room.pricePerNight || (room as any).price} MAD/nuit</div>
                      </div>
                      <Badge variant={getStatusColor(room.status) as any}>
                        {room.status}
                      </Badge>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AsyncBoundary>
        </section>

        {/* BOOKINGS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-gold-500" />
            <h2 className="font-outfit text-xl font-medium text-text-primary">Réservations Récentes</h2>
          </div>
          <AsyncBoundary state={bookingsState}>
            {(bookings) => (
              <motion.div 
                className="grid gap-4"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {bookings.map(booking => (
                  <motion.div key={booking.id} variants={VARIANTS.fadeInUp}>
                    <Card className="p-4 flex flex-col gap-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-gold-500" />
                            <span className="font-outfit font-medium text-text-primary">
                              {booking.guest.fullName}
                            </span>
                          </div>
                          <div className="text-sm text-text-muted mb-2">
                            Chambre {booking.room.number} • {booking.room.type}
                          </div>
                          <div className="text-xs text-text-muted flex gap-2">
                            <span>In: {format(new Date(booking.checkIn), 'dd MMM yyyy', { locale: fr })}</span>
                            <span>Out: {format(new Date(booking.checkOut), 'dd MMM yyyy', { locale: fr })}</span>
                          </div>
                        </div>
                        <Badge variant={getBookingStatusColor(booking.status) as any}>
                          {booking.status}
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex justify-end gap-2 border-t border-border-subtle pt-3">
                        {booking.status === 'CONFIRMED' && (
                          <Button size="sm" onClick={() => checkIn(booking.id)}>
                            <LogIn className="h-4 w-4 mr-2" />
                            Check-in
                          </Button>
                        )}
                        {booking.status === 'CHECKED_IN' && (
                          <Button size="sm" variant="secondary" onClick={() => checkOut(booking.id)}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Check-out
                          </Button>
                        )}
                      </div>
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
