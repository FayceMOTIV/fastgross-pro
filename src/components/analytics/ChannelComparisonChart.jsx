/**
 * Channel Comparison Chart
 * Compare performance across all 6 channels
 */

import { useState, useEffect } from 'react';
import { useOrg } from '../../contexts/OrgContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Instagram,
  Voicemail,
  Send,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

const CHANNEL_COLORS = {
  email: '#4F46E5',
  sms: '#10B981',
  whatsapp: '#25D366',
  instagram: '#E1306C',
  voicemail: '#F59E0B',
  postal: '#3B82F6'
};

const CHANNEL_ICONS = {
  email: Mail,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  instagram: Instagram,
  voicemail: Voicemail,
  postal: Send
};

const CHANNEL_LABELS = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  voicemail: 'Voicemail',
  postal: 'Courrier'
};

export default function ChannelComparisonChart({ days = 30, view = 'bar' }) {
  const { currentOrg } = useOrg();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState(view);

  useEffect(() => {
    if (currentOrg?.id) {
      loadData();
    }
  }, [currentOrg?.id, days]);

  const loadData = async () => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      const analyticsRef = collection(db, 'organizations', currentOrg.id, 'channelAnalytics');
      const q = query(
        analyticsRef,
        where('date', '>=', startDateStr),
        orderBy('date', 'desc'),
        limit(days)
      );

      const snapshot = await getDocs(q);

      // Aggregate data
      const aggregated = {
        email: { sent: 0, delivered: 0, opened: 0, replied: 0, cost: 0 },
        sms: { sent: 0, delivered: 0, replied: 0, optOut: 0, cost: 0 },
        whatsapp: { sent: 0, delivered: 0, read: 0, replied: 0, cost: 0 },
        instagram: { sent: 0, read: 0, replied: 0, cost: 0 },
        voicemail: { sent: 0, delivered: 0, callbacks: 0, cost: 0 },
        postal: { sent: 0, delivered: 0, scanned: 0, cost: 0 }
      };

      snapshot.forEach(doc => {
        const dayData = doc.data();
        const channels = dayData.channels || {};

        for (const [channel, stats] of Object.entries(channels)) {
          if (aggregated[channel]) {
            for (const [key, value] of Object.entries(stats)) {
              if (typeof value === 'number') {
                aggregated[channel][key] = (aggregated[channel][key] || 0) + value;
              }
            }
          }
        }
      });

      // Calculate rates
      const chartData = Object.entries(aggregated).map(([channel, stats]) => {
        const deliveryRate = stats.sent > 0
          ? ((stats.delivered || 0) / stats.sent * 100).toFixed(1)
          : 0;

        const engagementRate = stats.sent > 0
          ? (((stats.opened || stats.read || stats.callbacks || stats.scanned || 0) / stats.sent) * 100).toFixed(1)
          : 0;

        const responseRate = stats.sent > 0
          ? ((stats.replied || stats.callbacks || 0) / stats.sent * 100).toFixed(1)
          : 0;

        return {
          channel,
          name: CHANNEL_LABELS[channel],
          sent: stats.sent || 0,
          delivered: stats.delivered || 0,
          deliveryRate: parseFloat(deliveryRate),
          engagementRate: parseFloat(engagementRate),
          responseRate: parseFloat(responseRate),
          cost: stats.cost || 0
        };
      });

      setData(chartData);
    } catch (error) {
      console.error('Error loading channel data:', error);
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.name}:</span>
            <span className="font-medium">{item.value}{item.unit || ''}</span>
          </div>
        ))}
      </div>
    );
  };

  const radarData = data.map(item => ({
    channel: item.name,
    'Taux livraison': item.deliveryRate,
    'Taux engagement': item.engagementRate,
    'Taux reponse': item.responseRate
  }));

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Performance par canal
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartView('bar')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartView === 'bar'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Barres
          </button>
          <button
            onClick={() => setChartView('radar')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              chartView === 'radar'
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Radar
          </button>
        </div>
      </div>

      {/* Bar Chart */}
      {chartView === 'bar' && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar
                dataKey="sent"
                name="Envoyes"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="delivered"
                name="Delivres"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Radar Chart */}
      {chartView === 'radar' && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E5E7EB" />
              <PolarAngleAxis dataKey="channel" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar
                name="Taux livraison"
                dataKey="Taux livraison"
                stroke="#10B981"
                fill="#10B981"
                fillOpacity={0.3}
              />
              <Radar
                name="Taux engagement"
                dataKey="Taux engagement"
                stroke="#6366F1"
                fill="#6366F1"
                fillOpacity={0.3}
              />
              <Radar
                name="Taux reponse"
                dataKey="Taux reponse"
                stroke="#F59E0B"
                fill="#F59E0B"
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-6 gap-3">
        {data.map(item => {
          const Icon = CHANNEL_ICONS[item.channel];
          return (
            <div
              key={item.channel}
              className="bg-white border border-gray-200 rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: `${CHANNEL_COLORS[item.channel]}15` }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: CHANNEL_COLORS[item.channel] }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700">{item.name}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Envoyes</span>
                  <span className="font-medium">{item.sent}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Reponses</span>
                  <span className="font-medium text-green-600">{item.responseRate}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
