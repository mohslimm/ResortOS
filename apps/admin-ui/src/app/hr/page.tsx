import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHrStore } from '@/stores/useHrStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Clock, Fingerprint } from 'lucide-react';
import { VARIANTS } from '@/lib/variants';
import { format } from 'date-fns';

export default function HrPage() {
  const { employeesState, attendanceState, fetchEmployees, fetchAttendance, checkIn, checkOut } = useHrStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployees();
      fetchAttendance();
    }
  }, [isAuthenticated, fetchEmployees, fetchAttendance]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cormorant text-3xl text-text-primary italic mb-2">Ressources Humaines</h1>
        <p className="font-outfit text-text-muted">Gestion du personnel et pointages journaliers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* EMPLOYEES */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-gold-500" />
            <h2 className="font-outfit text-xl font-medium text-text-primary">Staff Actif</h2>
          </div>
          <AsyncBoundary state={employeesState}>
            {(employees) => (
              <motion.div 
                className="grid gap-4"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {employees.filter(e => e.isActive).map(emp => (
                  <motion.div key={emp.id} variants={VARIANTS.fadeInUp}>
                    <Card className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500 font-bold font-cormorant text-xl">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-outfit font-medium text-text-primary">
                            {emp.firstName} {emp.lastName}
                          </div>
                          <div className="text-xs text-text-muted">{emp.position} • {emp.department}</div>
                        </div>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => checkIn(emp.id)}>
                        <Fingerprint className="h-4 w-4 mr-2" />
                        Pointer
                      </Button>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AsyncBoundary>
        </section>

        {/* ATTENDANCE (Pointages du jour) */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-gold-500" />
            <h2 className="font-outfit text-xl font-medium text-text-primary">Pointages du jour</h2>
          </div>
          <AsyncBoundary state={attendanceState}>
            {(attendance) => (
              <motion.div 
                className="grid gap-4"
                variants={VARIANTS.staggerContainer}
                initial="initial"
                animate="animate"
              >
                {attendance.map(log => (
                  <motion.div key={log.id} variants={VARIANTS.fadeInUp}>
                    <Card className="p-4 flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-outfit font-medium text-text-primary">
                            {log.employee.firstName} {log.employee.lastName}
                          </div>
                          <div className="text-xs text-text-muted">{log.employee.department}</div>
                        </div>
                        <Badge variant={log.checkOut ? 'default' : 'success'}>
                          {log.checkOut ? 'Terminé' : 'En poste'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-text-muted bg-black/20 p-2 rounded-md border border-white/5">
                        <div className="flex items-center gap-1">
                          <span className="text-success">In:</span>
                          {format(new Date(log.checkIn), 'HH:mm')}
                        </div>
                        {log.checkOut && (
                          <div className="flex items-center gap-1">
                            <span className="text-danger">Out:</span>
                            {format(new Date(log.checkOut), 'HH:mm')}
                          </div>
                        )}
                      </div>

                      {!log.checkOut && (
                        <div className="flex justify-end mt-2 border-t border-border-subtle pt-3">
                          <Button size="sm" onClick={() => checkOut(log.id)}>
                            Check-out
                          </Button>
                        </div>
                      )}
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
