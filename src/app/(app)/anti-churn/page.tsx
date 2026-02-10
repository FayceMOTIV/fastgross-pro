'use client';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  Users,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DEMO_CLIENTS } from '@/data/demo-clients';

export default function AntiChurnPage() {

  // Clients à risque (score > 50)
  const clientsAtRisk = DEMO_CLIENTS
    .filter(c => c.riskScore >= 50)
    .sort((a, b) => b.riskScore - a.riskScore);

  const criticalClients = clientsAtRisk.filter(c => c.riskScore >= 70);
  const highRiskClients = clientsAtRisk.filter(c => c.riskScore >= 50 && c.riskScore < 70);

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'bg-red-100 text-red-800 border-red-300';
    if (score >= 50) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return 'Critique';
    if (score >= 50) return 'Élevé';
    if (score >= 30) return 'Modéré';
    return 'Faible';
  };

  return (
    <div className="min-h-screen">
      <Header
        title="IA Détection Décrochage"
        subtitle="Détectez et retenez vos clients à risque"
      />

      <div className="p-6">
        {/* Hero */}
        <Card className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-1">Détection de décrochage activée</h2>
                <p className="text-red-100">
                  L'IA analyse vos clients en continu et détecte les signaux de départ 30 jours avant
                </p>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <TrendingDown className="w-5 h-5" />
                <span className="font-medium">-40% de churn</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{criticalClients.length}</p>
              <p className="text-sm text-gray-500">Critiques</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-600">{highRiskClients.length}</p>
              <p className="text-sm text-gray-500">Risque élevé</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {DEMO_CLIENTS.filter(c => c.riskScore < 30).length}
              </p>
              <p className="text-sm text-gray-500">Clients fidèles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-600">{DEMO_CLIENTS.length}</p>
              <p className="text-sm text-gray-500">Total clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Critical alerts */}
        {criticalClients.length > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Alertes critiques - Action immédiate requise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {criticalClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="font-bold text-red-600">{client.riskScore}%</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.nom}</p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{client.ville}</span>
                          <span>•</span>
                          <span>CA: {formatCurrency(client.caAnnuel)}/an</span>
                          <span>•</span>
                          <span className="text-red-600">{client.evolution}% vs N-1</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Phone className="w-4 h-4" />
                        Appeler
                      </Button>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 gap-1">
                        <Sparkles className="w-4 h-4" />
                        Plan de rétention
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All at-risk clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              Tous les clients à surveiller ({clientsAtRisk.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CA Annuel</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Évolution</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score Risque</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Signaux</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {clientsAtRisk.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{client.nom}</p>
                          <p className="text-sm text-gray-500">{client.ville}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{client.type}</Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatCurrency(client.caAnnuel)}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 ${client.evolution < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          <TrendingDown className={`w-4 h-4 ${client.evolution >= 0 ? 'rotate-180' : ''}`} />
                          {client.evolution}%
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getRiskColor(client.riskScore)}`}>
                          {client.riskScore}% - {getRiskLabel(client.riskScore)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {client.evolution < -10 && (
                            <Badge variant="danger" className="text-xs">CA en baisse</Badge>
                          )}
                          {client.riskScore >= 60 && (
                            <Badge variant="warning" className="text-xs">Inactivité</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm">
                            <Phone className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
