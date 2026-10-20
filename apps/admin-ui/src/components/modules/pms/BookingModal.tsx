import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { usePmsStore } from '@/stores/usePmsStore';

const bookingSchema = z.object({
  guestFullName: z.string().min(2, 'Nom complet trop court'),
  guestIdCard: z.string().min(2, 'N° Carte d\'identité obligatoire'),
  guestPhone: z.string().optional(),
  roomId: z.string().min(1, 'Veuillez choisir une chambre'),
  checkIn: z.string().min(1, 'Date de début obligatoire'),
  checkOut: z.string().min(1, 'Date de fin obligatoire'),
  notes: z.string().optional(),
});

import { apiFetch } from '@/lib/api';

type BookingFormValues = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRooms: any[];
}

export function BookingModal({ isOpen, onClose, availableRooms }: BookingModalProps) {
  const { fetchBookings } = usePmsStore();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
  });

  const onSubmit = async (data: BookingFormValues) => {
    try {
      await apiFetch('/pms/bookings', {
        method: 'POST',
        body: JSON.stringify({
          roomId: data.roomId,
          checkIn: new Date(data.checkIn).toISOString(),
          checkOut: new Date(data.checkOut).toISOString(),
          guestFullName: data.guestFullName,
          guestIdCard: data.guestIdCard,
          guestPhone: data.guestPhone || undefined,
          notes: data.notes || undefined,
        }),
      });
      
      await fetchBookings();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erreur lors de la création de la réservation');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nouvelle Réservation">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Nom complet du client" {...register('guestFullName')} error={errors.guestFullName?.message} />
          <Input label="N° Carte d'identité / Passeport" {...register('guestIdCard')} error={errors.guestIdCard?.message} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Input label="Téléphone (optionnel)" {...register('guestPhone')} error={errors.guestPhone?.message} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-text-muted ml-1">Chambre</label>
            <select
              {...register('roomId')}
              className="flex h-10 w-full rounded-lg border border-border-subtle bg-[#14142a]/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 transition-all"
            >
              <option value="" className="bg-[#0a0a14]">Choisir une chambre</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id} className="bg-[#0a0a14]">
                  Chambre {room.number} ({room.type})
                </option>
              ))}
            </select>
            {errors.roomId && <p className="text-xs text-danger ml-1">{errors.roomId.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Check-in" type="date" {...register('checkIn')} error={errors.checkIn?.message} />
          <Input label="Check-out" type="date" {...register('checkOut')} error={errors.checkOut?.message} />
        </div>

        <Input label="Notes (optionnel)" {...register('notes')} error={errors.notes?.message} />

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose} type="button">Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Confirmer la Réservation'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
