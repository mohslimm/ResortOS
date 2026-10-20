import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHousekeepingStore } from '@/stores/useHousekeepingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { AsyncBoundary } from '@/components/ui/AsyncBoundary';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sparkles, CheckCircle, Clock } from 'lucide-react';
import { VARIANTS } from '@/lib/variants';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function HousekeepingPage() {
  const { tasksState, fetchTasks, updateStatus } = useHousekeepingStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'danger';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'success';
      case 'IN_PROGRESS': return 'warning';
      case 'PENDING': return 'default';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-cormorant text-3xl text-text-primary italic mb-2">Housekeeping</h1>
        <p className="font-outfit text-text-muted">Gestion des tâches de ménage et statuts des chambres.</p>
      </div>

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-gold-500" />
          <h2 className="font-outfit text-xl font-medium text-text-primary">Tâches en cours</h2>
        </div>
        
        <AsyncBoundary state={tasksState}>
          {(tasks) => (
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={VARIANTS.staggerContainer}
              initial="initial"
              animate="animate"
            >
              {tasks.map(task => (
                <motion.div key={task.id} variants={VARIANTS.fadeInUp}>
                  <Card className="p-5 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-outfit text-xl font-bold text-text-primary">
                          Chambre {task.room.number}
                        </div>
                        <div className="text-xs text-text-muted flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(task.createdAt), 'HH:mm - dd MMM', { locale: fr })}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={getStatusColor(task.status) as any}>{task.status}</Badge>
                        <Badge variant={getPriorityColor(task.priority) as any} className="text-[10px]">
                          Prio: {task.priority}
                        </Badge>
                      </div>
                    </div>
                    
                    {task.notes && (
                      <div className="bg-black/20 p-3 rounded-md text-sm text-text-muted mb-4 border border-white/5">
                        {task.notes}
                      </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-border-subtle flex gap-2 justify-end">
                      {task.status === 'PENDING' && (
                        <Button size="sm" onClick={() => updateStatus(task.id, 'IN_PROGRESS')}>
                          Démarrer
                        </Button>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(task.id, 'DONE')} className="text-success border-success/30 hover:bg-success/10">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Terminé
                        </Button>
                      )}
                      {task.status === 'DONE' && (
                        <div className="text-sm text-success flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> Chambre libérée
                        </div>
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
  );
}
