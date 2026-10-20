import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { VARIANTS } from '@/lib/variants';
import { BedDouble, Users, Car, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { useAnalyticsStore } from '@/stores/useAnalyticsStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiFetch } from '@/lib/api';

export function DashboardPage() {
  const { metrics, loading, setMetrics, setLoading, setError } = useAnalyticsStore();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initial fetch
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<any>('/analytics/dashboard-summary');
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      }
    };

    if (isAuthenticated && !metrics) {
      fetchMetrics();
    }
  }, [isAuthenticated, metrics, setMetrics, setLoading, setError]);

  if (loading && !metrics) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-gold-500 animate-spin" />
        <span className="ml-3 text-text-muted">Chargement de l'intelligence système...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <motion.div variants={VARIANTS.fadeInUp}>
        <h1 className="text-4xl font-display font-semibold italic text-white mb-2">
          Vue d'ensemble
        </h1>
        <p className="text-text-muted">
          Suivi en temps réel des opérations du Resort.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={VARIANTS.fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Taux d'occupation</CardTitle>
              <div className="h-8 w-8 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                <BedDouble className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-semibold text-white">
                {metrics?.occupancyRate.toFixed(1)}%
              </div>
              <p className="text-sm text-success mt-2 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" /> Live
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={VARIANTS.fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Staff Actif</CardTitle>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-semibold text-white">
                {metrics?.todayAttendance || 0}
              </div>
              <p className="text-sm text-text-muted mt-2">
                Pointages aujourd'hui
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={VARIANTS.fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Parking</CardTitle>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Car className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-semibold text-white">
                {metrics?.parkingOccupancy.occupied} / {metrics?.parkingOccupancy.total}
              </div>
              <p className="text-sm text-text-muted mt-2">
                Places occupées
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={VARIANTS.fadeInUp}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Housekeeping</CardTitle>
              <div className="h-8 w-8 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                <Sparkles className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-semibold text-white">
                {metrics?.housekeepingWorkload || 0}
              </div>
              <p className="text-sm text-warning mt-2">
                Tâches en attente
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={VARIANTS.fadeInUp} className="mt-8">
        <Card className="h-96 flex items-center justify-center border-dashed">
          <div className="text-center">
            <h3 className="text-xl font-display text-white mb-2">Tendances d'Occupation</h3>
            <p className="text-text-muted mb-4">Moteur de visualisation en cours de connexion...</p>
            <Badge variant="outline">Temps Réel Actif</Badge>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
