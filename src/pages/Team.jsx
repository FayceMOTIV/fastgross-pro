import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Crown,
  Shield,
  User,
  Eye,
  Edit3,
  Trash2,
  X,
  Check,
  Clock,
  Send,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { useOrg } from '@/contexts/OrgContext'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions, RoleGuard } from '@/hooks/usePermissions'
import { useTeamMembers, useInvitations } from '@/hooks/useFirestore'
import { ROLES } from '@/services/permissions'
import {
  createInvitation,
  cancelInvitation,
  resendInvitation,
  removeMember,
  updateMemberRole,
} from '@/services/organization'
import toast from 'react-hot-toast'

// Role icons
const roleIcons = {
  owner: Crown,
  admin: Shield,
  manager: Users,
  member: User,
  viewer: Eye,
}

export default function Team() {
  const { currentOrg, members: orgMembers, ROLES: orgRoles } = useOrg()
  const { user } = useAuth()
  const { canInviteMembers, canManageTeam, isOwner, isAdmin, assignableRoles } = usePermissions()
  const { members: firestoreMembers, loading: membersLoading } = useTeamMembers()
  const { invitations: firestoreInvitations, loading: invitationsLoading } = useInvitations()

  // Use Firestore data
  const members = firestoreMembers
  const invitations = firestoreInvitations
  const loading = membersLoading || invitationsLoading
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  // Filter members
  const filteredMembers = (members || []).filter(
    (member) =>
      searchQuery === '' ||
      member.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const [inviting, setInviting] = useState(false)

  const handleInvite = async () => {
    if (!currentOrg?.id || !inviteEmail) return
    setInviting(true)
    try {
      await createInvitation(currentOrg.id, user, {
        email: inviteEmail,
        role: inviteRole,
      })
      toast.success('Invitation envoyee')
      setInviteModalOpen(false)
      setInviteEmail('')
      setInviteRole('member')
    } catch (err) {
      console.error('Error sending invitation:', err)
      toast.error("Erreur lors de l'envoi de l'invitation")
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (invitation) => {
    if (!currentOrg?.id) return
    try {
      await cancelInvitation(currentOrg.id, invitation.id)
      toast.success('Invitation annulee')
    } catch (err) {
      console.error('Error cancelling invitation:', err)
      toast.error("Erreur lors de l'annulation")
    }
  }

  const handleResendInvitation = async (invitation) => {
    if (!currentOrg?.id) return
    try {
      await resendInvitation(currentOrg.id, invitation.id)
      toast.success('Invitation renvoyee')
    } catch (err) {
      console.error('Error resending invitation:', err)
      toast.error('Erreur lors du renvoi')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Equipe</h1>
          <p className="text-dark-400 mt-1">Gerez les membres de votre organisation</p>
        </div>
        {canInviteMembers && (
          <button
            onClick={() => setInviteModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Inviter un membre
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-brand-400" />
            <span className="text-xs text-dark-400">Membres</span>
          </div>
          <p className="text-2xl font-bold text-white">{members.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-dark-400">Admins</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {members.filter((m) => m.role === 'admin' || m.role === 'owner').length}
          </p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-dark-400">Invitations</span>
          </div>
          <p className="text-2xl font-bold text-white">{invitations.length}</p>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-dark-400">Actifs aujourd'hui</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {
              members.filter((m) => {
                const lastActive = m.lastActiveAt
                const today = new Date()
                return lastActive && lastActive.toDateString() === today.toDateString()
              }).length
            }
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="glass-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
      </div>

      {/* Members List */}
      <div className="glass-card divide-y divide-dark-800">
        {filteredMembers.map((member, index) => {
          const roleInfo = ROLES[member.role]
          const RoleIcon = roleIcons[member.role] || User
          const isCurrentUser = member.uid === user?.uid

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 flex items-center gap-4 hover:bg-dark-800/30 transition-colors"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400/20 to-blue-400/20 flex items-center justify-center text-lg font-bold text-brand-400 border border-brand-500/20 flex-shrink-0">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.displayName}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  getInitials(member.displayName)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{member.displayName}</span>
                  {isCurrentUser && (
                    <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-medium">
                      Vous
                    </span>
                  )}
                </div>
                <p className="text-sm text-dark-400 truncate">{member.email}</p>
              </div>

              {/* Role */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${roleInfo?.bg || 'bg-dark-800'} border ${roleInfo?.border || 'border-dark-700'}`}
              >
                <RoleIcon className={`w-4 h-4 ${roleInfo?.color || 'text-dark-400'}`} />
                <span className={`text-sm font-medium ${roleInfo?.color || 'text-dark-400'}`}>
                  {roleInfo?.label || member.role}
                </span>
              </div>

              {/* Last active */}
              <div className="hidden md:block text-right">
                <p className="text-xs text-dark-500">Derniere activite</p>
                <p className="text-sm text-dark-400">
                  {formatDistanceToNow(member.lastActiveAt, { addSuffix: true, locale: fr })}
                </p>
              </div>

              {/* Actions */}
              {canManageTeam && !isCurrentUser && member.role !== 'owner' && (
                <button className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-dark-300">Invitations en attente</h2>
          <div className="glass-card divide-y divide-dark-800">
            {invitations.map((invite) => {
              const roleInfo = ROLES[invite.role]
              const RoleIcon = roleIcons[invite.role] || User

              return (
                <div key={invite.id} className="p-4 flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-dark-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{invite.email}</p>
                    <p className="text-sm text-dark-400">
                      Invite par {invite.invitedBy.displayName} •{' '}
                      {formatDistanceToNow(invite.createdAt, { addSuffix: true, locale: fr })}
                    </p>
                  </div>

                  {/* Role */}
                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${roleInfo?.bg || 'bg-dark-800'} border ${roleInfo?.border || 'border-dark-700'}`}
                  >
                    <RoleIcon className={`w-4 h-4 ${roleInfo?.color || 'text-dark-400'}`} />
                    <span className={`text-sm font-medium ${roleInfo?.color || 'text-dark-400'}`}>
                      {roleInfo?.label || invite.role}
                    </span>
                  </div>

                  {/* Status */}
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-medium">
                    En attente
                  </span>

                  {/* Actions */}
                  {canInviteMembers && (
                    <div className="flex items-center gap-1">
                      <button
                        className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-brand-400 transition-colors"
                        title="Renvoyer"
                        onClick={() => handleResendInvitation(invite)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 rounded-lg hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-colors"
                        title="Annuler"
                        onClick={() => handleCancelInvitation(invite)}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
            onClick={() => setInviteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-dark-800">
                <h2 className="text-lg font-bold text-white">Inviter un membre</h2>
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemple.com"
                    className="input-field w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Role</label>
                  <div className="space-y-2">
                    {Object.entries(ROLES)
                      .filter(([key]) => key !== 'owner')
                      .map(([key, role]) => (
                        <label
                          key={key}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                            inviteRole === key
                              ? `${role.bg} ${role.border}`
                              : 'bg-dark-800/50 border-dark-700 hover:border-dark-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={key}
                            checked={inviteRole === key}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="sr-only"
                          />
                          {(() => {
                            const RoleIcon = roleIcons[key]
                            return <RoleIcon className={`w-5 h-5 ${role.color}`} />
                          })()}
                          <div className="flex-1">
                            <p className="font-medium text-white">{role.label}</p>
                            <p className="text-xs text-dark-400">{role.description}</p>
                          </div>
                          {inviteRole === key && <Check className="w-5 h-5 text-brand-400" />}
                        </label>
                      ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-dark-800">
                <button
                  onClick={() => setInviteModalOpen(false)}
                  className="btn-ghost"
                  disabled={inviting}
                >
                  Annuler
                </button>
                <button
                  onClick={handleInvite}
                  disabled={!inviteEmail || inviting}
                  className="btn-primary flex items-center gap-2"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {inviting ? 'Envoi...' : "Envoyer l'invitation"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
