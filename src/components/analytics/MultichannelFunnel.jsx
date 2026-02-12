/**
 * Multichannel Funnel
 * Visualize prospect journey across channels
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  ArrowDown,
  Users,
  Send,
  Eye,
  MessageSquare,
  Calendar,
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export default function MultichannelFunnel({ days = 30 }) {
  const { currentOrg } = useOrg();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('funnel');

  useEffect(() => {
    if (currentOrg?.id) {
      loadFunnelData();
    }
  }, [currentOrg?.id, days]);

  const loadFunnelData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get interactions
      const interactionsRef = collection(db, 'organizations', currentOrg.id, 'interactions');
      const q = query(
        interactionsRef,
        where('createdAt', '>=', startDate),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);

      // Aggregate by prospect
      const prospectJourneys = {};
      const channelStats = {
        email: { sent: 0, opened: 0, replied: 0 },
        sms: { sent: 0, delivered: 0, replied: 0 },
        whatsapp: { sent: 0, read: 0, replied: 0 },
        instagram: { sent: 0, read: 0, replied: 0 },
        voicemail: { sent: 0, delivered: 0, callbacks: 0 },
        postal: { sent: 0, delivered: 0, scanned: 0 }
      };

      snapshot.forEach(doc => {
        const interaction = doc.data();
        const prospectId = interaction.prospectId;
        const channel = interaction.channel;
        const direction = interaction.direction;

        if (!prospectJourneys[prospectId]) {
          prospectJourneys[prospectId] = {
            channels: new Set(),
            touchpoints: 0,
            engaged: false,
            replied: false,
            converted: false
          };
        }

        if (direction === 'out') {
          prospectJourneys[prospectId].channels.add(channel);
          prospectJourneys[prospectId].touchpoints++;

          if (channelStats[channel]) {
            channelStats[channel].sent++;

            if (interaction.opened || interaction.read) {
              prospectJourneys[prospectId].engaged = true;
            }

            if (interaction.status === 'delivered') {
              channelStats[channel].delivered = (channelStats[channel].delivered || 0) + 1;
            }

            if (interaction.opened) {
              channelStats[channel].opened = (channelStats[channel].opened || 0) + 1;
            }
          }
        }

        if (direction === 'in') {
          prospectJourneys[prospectId].replied = true;
          if (channelStats[channel]) {
            channelStats[channel].replied++;
          }
        }

        if (interaction.type === 'voicemail_callback') {
          channelStats.voicemail.callbacks++;
          prospectJourneys[prospectId].replied = true;
        }

        if (interaction.converted || interaction.type === 'postal_qr_scan') {
          prospectJourneys[prospectId].converted = true;
        }
      });

      // Calculate funnel stages
      const prospects = Object.values(prospectJourneys);
      const totalProspects = prospects.length || 1;
      const contacted = prospects.filter(p => p.touchpoints > 0).length;
      const multichannel = prospects.filter(p => p.channels.size > 1).length;
      const engaged = prospects.filter(p => p.engaged).length;
      const replied = prospects.filter(p => p.replied).length;
      const converted = prospects.filter(p => p.converted).length;

      // Build funnel data
      const funnelData = [
        { name: 'Prospects', value: totalProspects, fill: '#6366F1' },
        { name: 'Contactes', value: contacted, fill: '#8B5CF6' },
        { name: 'Multi-canal', value: multichannel, fill: '#A78BFA' },
        { name: 'Engages', value: engaged, fill: '#C4B5FD' },
        { name: 'Reponses', value: replied, fill: '#DDD6FE' },
        { name: 'Convertis', value: converted, fill: '#EDE9FE' }
      ];

      setData({
        funnel: funnelData,
        channels: channelStats,
        totals: {
          prospects: totalProspects,
          contacted,
          multichannel,
          engaged,
          replied,
          converted
        },
        rates: {
          contactRate: ((contacted / totalProspects) * 100).toFixed(1),
          multichannelRate: ((multichannel / contacted || 1) * 100).toFixed(1),
          engagementRate: ((engaged / contacted || 1) * 100).toFixed(1),
          replyRate: ((replied / contacted || 1) * 100).toFixed(1),
          conversionRate: ((converted / contacted || 1) * 100).toFixed(1)
        }
      });
    } catch (error) {
      console.error('Error loading funnel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-gray-500 py-8">
        Pas de donnees disponibles
      </div>
    );
  }

  const stages = [
    { key: 'prospects', label: 'Prospects', icon: Users, color: 'indigo' },
    { key: 'contacted', label: 'Contactes', icon: Send, color: 'violet' },
    { key: 'multichannel', label: 'Multi-canal', icon: TrendingUp, color: 'purple' },
    { key: 'engaged', label: 'Engages', icon: Eye, color: 'fuchsia' },
    { key: 'replied', label: 'Reponses', icon: MessageSquare, color: 'pink' },
    { key: 'converted', label: 'Convertis', icon: CheckCircle, color: 'rose' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Funnel Multichannel
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('funnel')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === 'funnel'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Entonnoir
          </button>
          <button
            onClick={() => setViewMode('steps')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              viewMode === 'steps'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Etapes
          </button>
        </div>
      </div>

      {/* Funnel Chart View */}
      {viewMode === 'funnel' && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <FunnelChart>
              <Tooltip
                formatter={(value, name) => [`${value} prospects`, name]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px'
                }}
              />
              <Funnel
                dataKey="value"
                data={data.funnel}
                isAnimationActive
              >
                <LabelList
                  position="center"
                  fill="#fff"
                  stroke="none"
                  dataKey="name"
                  fontSize={12}
                  fontWeight={500}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Steps View */}
      {viewMode === 'steps' && (
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const value = data.totals[stage.key];
            const prevValue = index > 0 ? data.totals[stages[index - 1].key] : value;
            const dropRate = prevValue > 0 ? (((prevValue - value) / prevValue) * 100).toFixed(0) : 0;
            const width = data.totals.prospects > 0
              ? (value / data.totals.prospects) * 100
              : 0;

            return (
              <div key={stage.key}>
                {index > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <ArrowDown className="w-5 h-5 text-gray-400" />
                    <span className="text-xs text-gray-500 ml-2">
                      -{dropRate}%
                    </span>
                  </div>
                )}
                <div className="relative">
                  <div
                    className={`bg-${stage.color}-100 rounded-lg p-4 transition-all`}
                    style={{ width: `${Math.max(width, 20)}%` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${stage.color}-200 rounded-lg`}>
                        <Icon className={`w-5 h-5 text-${stage.color}-700`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{value}</p>
                        <p className="text-sm text-gray-600">{stage.label}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conversion Rates */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{data.rates.contactRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Taux contact</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-violet-600">{data.rates.multichannelRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Multi-canal</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{data.rates.engagementRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Engagement</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-fuchsia-600">{data.rates.replyRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Reponses</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-pink-600">{data.rates.conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Conversion</p>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="font-medium text-gray-700 mb-3">Repartition par canal</h4>
        <div className="grid grid-cols-6 gap-3">
          {Object.entries(data.channels).map(([channel, stats]) => {
            const responseKey = channel === 'voicemail' ? 'callbacks' :
                              channel === 'postal' ? 'scanned' : 'replied';
            const responses = stats[responseKey] || 0;
            const responseRate = stats.sent > 0 ? ((responses / stats.sent) * 100).toFixed(1) : 0;

            return (
              <div key={channel} className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 capitalize">{channel}</p>
                <p className="font-semibold text-gray-900">{stats.sent}</p>
                <p className="text-xs text-green-600">{responseRate}% rep.</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
