import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  Target,
  Beaker,
  Trophy,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Tab options
const TABS = [
  { id: 'global', label: 'Global' },
  { id: 'b2b', label: 'B2B' },
  { id: 'b2c', label: 'B2C' },
]

// Mock data
const LEADS_PAR_SOURCE = {
  global: [
    { name: 'LinkedIn', leads: 203, color: '#0077B5' },
    { name: 'Google Maps', leads: 156, color: '#EA4335' },
    { name: 'Societe.com', leads: 128, color: '#6366F1' },
    { name: 'Leboncoin', leads: 89, color: '#F97316' },
    { name: 'SIRENE', leads: 89, color: '#10B981' },
    { name: 'SeLoger', leads: 67, color: '#3B82F6' },
    { name: 'Mairies', leads: 56, color: '#EF4444' },
    { name: 'BOAMP', leads: 45, color: '#1D4ED8' },
    { name: 'Pappers', leads: 67, color: '#8B5CF6' },
    { name: 'Infogreffe', leads: 34, color: '#14B8A6' },
  ],
  b2b: [
    { name: 'LinkedIn', leads: 203, color: '#0077B5' },
    { name: 'Google Maps', leads: 156, color: '#EA4335' },
    { name: 'Societe.com', leads: 128, color: '#6366F1' },
    { name: 'SIRENE', leads: 89, color: '#10B981' },
    { name: 'Pappers', leads: 67, color: '#8B5CF6' },
    { name: 'BOAMP', leads: 45, color: '#1D4ED8' },
    { name: 'Infogreffe', leads: 34, color: '#14B8A6' },
  ],
  b2c: [
    { name: 'Leboncoin', leads: 89, color: '#F97316' },
    { name: 'SeLoger', leads: 67, color: '#3B82F6' },
    { name: 'Mairies', leads: 56, color: '#EF4444' },
    { name: 'PAP', leads: 34, color: '#6366F1' },
    { name: 'Permis', leads: 23, color: '#14B8A6' },
  ],
}

const CONTACT_PAR_CANAL = [
  { name: 'Email', value: 45, color: '#4F6EF7' },
  { name: 'SMS', value: 22, color: '#10B981' },
  { name: 'WhatsApp', value: 18, color: '#25D366' },
  { name: 'Telephone', value: 12, color: '#F59E0B' },
  { name: 'Courrier', value: 3, color: '#8B5CF6' },
]

const SCORE_EVOLUTION = [
  { semaine: 'S1', score: 52 },
  { semaine: 'S2', score: 58 },
  { semaine: 'S3', score: 55 },
  { semaine: 'S4', score: 63 },
  { semaine: 'S5', score: 67 },
  { semaine: 'S6', score: 71 },
  { semaine: 'S7', score: 69 },
  { semaine: 'S8', score: 74 },
]

const AB_TESTS = [
  { id: '1', name: 'Objet email BOAMP', variante: 'A: Direct vs B: Question', status: 'running', leads: 120, winner: null },
  { id: '2', name: 'Timing contact B2C', variante: 'A: J+1 vs B: J+3', status: 'running', leads: 85, winner: null },
  { id: '3', name: 'Canal initial Pro', variante: 'A: Email vs B: LinkedIn', status: 'completed', leads: 200, winner: 'B' },
]

const TOP_SOURCES = [
  { name: 'LinkedIn', tauxReponse: 18.5 },
  { name: 'BOAMP', tauxReponse: 15.2 },
  { name: 'Leboncoin', tauxReponse: 12.8 },
  { name: 'Societe.com', tauxReponse: 11.3 },
  { name: 'Google Maps', tauxReponse: 9.7 },
]

const CustomTooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid rgba(79, 110, 247, 0.15)',
  borderRadius: '12px',
  padding: '10px 14px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function IntentHunterStats() {
  const [activeTab, setActiveTab] = useState('global')

  const barData = LEADS_PAR_SOURCE[activeTab] || LEADS_PAR_SOURCE.global

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/app/intent-hunter"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold text-text">Statistiques Intent Hunter</h1>
          <p className="text-sm text-text-muted">Performance et analyses</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-text shadow-sm'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart: leads par source */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-accent" />
            <h2 className="section-title">Leads par source</h2>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79, 110, 247, 0.06)" />
                <XAxis type="number" tick={{ fill: '#8F95B2', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: '#111827', fontSize: 12 }}
                  width={75}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="leads" radius={[0, 6, 6, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Pie chart: taux contact par canal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="section-title">Taux contact par canal</h2>
          </div>
          <div style={{ height: 300 }} className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={CONTACT_PAR_CANAL}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value}%)`}
                  labelLine={{ stroke: '#8F95B2' }}
                >
                  {CONTACT_PAR_CANAL.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CustomTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Line chart: evolution score moyen */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="section-title">Evolution score moyen</h2>
          </div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={SCORE_EVOLUTION}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(79, 110, 247, 0.06)" />
                <XAxis
                  dataKey="semaine"
                  tick={{ fill: '#8F95B2', fontSize: 12 }}
                />
                <YAxis
                  domain={[40, 80]}
                  tick={{ fill: '#8F95B2', fontSize: 12 }}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4F6EF7"
                  strokeWidth={3}
                  dot={{ fill: '#4F6EF7', r: 5 }}
                  activeDot={{ r: 7, stroke: '#4F6EF7', strokeWidth: 2, fill: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* A/B tests + Top sources */}
        <div className="space-y-6">
          {/* A/B Tests */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Beaker className="w-5 h-5 text-accent" />
              <h2 className="section-title">A/B Tests en cours</h2>
            </div>
            <div className="space-y-3">
              {AB_TESTS.map((test) => (
                <div key={test.id} className="p-3 rounded-lg bg-surface-hover border border-gray-100">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium text-text">{test.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        test.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {test.status === 'running' ? 'En cours' : 'Termine'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{test.variante}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-text-muted">{test.leads} leads</span>
                    {test.winner && (
                      <span className="text-xs font-medium text-emerald-600">
                        Gagnant: {test.winner}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Top 5 sources par taux reponse */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="section-title">Top 5 sources par taux reponse</h2>
            </div>
            <div className="space-y-3">
              {TOP_SOURCES.map((source, index) => (
                <div key={source.name} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-amber-100 text-amber-700'
                        : index === 1
                          ? 'bg-gray-200 text-gray-600'
                          : index === 2
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text">{source.name}</span>
                      <span className="text-sm font-bold text-accent">{source.tauxReponse}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-accent h-1.5 rounded-full"
                        style={{ width: `${(source.tauxReponse / 20) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
