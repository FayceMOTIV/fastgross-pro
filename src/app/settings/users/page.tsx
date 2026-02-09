'use client';

import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  Truck,
  Briefcase,
  BarChart3,
  Store,
  Save,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  UserRole,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  DEFAULT_ZONES,
  CreateUserData,
  UpdateUserData,
  UserWithRole,
} from '@/types/roles';

// Mock data utilisateurs
const MOCK_USERS: UserWithRole[] = [
  {
    uid: '1',
    email: 'admin@distram.fr',
    displayName: 'Administrateur',
    role: 'admin',
    permissions: ROLE_PERMISSIONS.admin,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date(),
  },
  {
    uid: '2',
    email: 'manager@distram.fr',
    displayName: 'Sophie Martin',
    role: 'manager',
    permissions: ROLE_PERMISSIONS.manager,
    isActive: true,
    createdAt: new Date('2024-02-15'),
    lastLoginAt: new Date(),
  },
  {
    uid: '3',
    email: 'ahmed@distram.fr',
    displayName: 'Ahmed Benali',
    role: 'livreur',
    permissions: ROLE_PERMISSIONS.livreur,
    assignedZone: 'marseille-nord',
    vehicleInfo: { type: 'Camionnette', plate: 'AB-123-CD', model: 'Renault Master' },
    isActive: true,
    createdAt: new Date('2024-03-10'),
    lastLoginAt: new Date(),
  },
  {
    uid: '4',
    email: 'hamza@distram.fr',
    displayName: 'Hamza Karim',
    role: 'commercial',
    permissions: ROLE_PERMISSIONS.commercial,
    assignedZone: 'marseille-sud',
    assignedClients: ['client1', 'client2', 'client3'],
    managerId: '2',
    isActive: true,
    createdAt: new Date('2024-04-01'),
    lastLoginAt: new Date(),
  },
  {
    uid: '5',
    email: 'sarah@distram.fr',
    displayName: 'Sarah Dubois',
    role: 'commercial',
    permissions: ROLE_PERMISSIONS.commercial,
    assignedZone: 'aix',
    assignedClients: ['client4', 'client5'],
    managerId: '2',
    isActive: true,
    createdAt: new Date('2024-05-15'),
    lastLoginAt: new Date(),
  },
  {
    uid: '6',
    email: 'youssef@distram.fr',
    displayName: 'Youssef Benali',
    role: 'livreur',
    permissions: ROLE_PERMISSIONS.livreur,
    assignedZone: 'marseille-centre',
    vehicleInfo: { type: 'Camionnette', plate: 'EF-456-GH', model: 'Fiat Ducato' },
    isActive: false,
    createdAt: new Date('2024-03-20'),
    lastLoginAt: new Date('2024-10-01'),
  },
];

// Icône par rôle
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ROLE_ICONS: Record<UserRole, typeof Shield> = {
  admin: Shield,
  manager: BarChart3,
  commercial: Briefcase,
  livreur: Truck,
  client: Store,
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithRole[]>(MOCK_USERS);
  const [filteredUsers, setFilteredUsers] = useState<UserWithRole[]>(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);

  // Filtrer les utilisateurs
  useEffect(() => {
    let result = users;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    // Filtre par rôle
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      result = result.filter((u) => u.isActive === isActive);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistiques
  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    byRole: Object.keys(ROLE_LABELS).reduce((acc, role) => {
      acc[role as UserRole] = users.filter((u) => u.role === role).length;
      return acc;
    }, {} as Record<UserRole, number>),
  };

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleToggleStatus = (user: UserWithRole) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.uid === user.uid ? { ...u, isActive: !u.isActive } : u
      )
    );
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      setUsers((prev) => prev.filter((u) => u.uid !== userId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestion des Utilisateurs
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez les comptes et les accès de votre équipe
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-muted-foreground">Actifs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {stats.byRole.commercial || 0}
            </div>
            <div className="text-sm text-muted-foreground">Commerciaux</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {stats.byRole.livreur || 0}
            </div>
            <div className="text-sm text-muted-foreground">Livreurs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {stats.byRole.manager || 0}
            </div>
            <div className="text-sm text-muted-foreground">Managers</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par nom ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les rôles</SelectItem>
                {Object.entries(ROLE_LABELS).map(([role, info]) => (
                  <SelectItem key={role} value={role}>
                    <span className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actifs</SelectItem>
                <SelectItem value="inactive">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Statut</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="hidden md:table-cell">Zone</TableHead>
                <TableHead className="hidden lg:table-cell">Dernière connexion</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const roleInfo = ROLE_LABELS[user.role];
                  // const __RoleIcon = ROLE_ICONS[user.role];
                  const zone = DEFAULT_ZONES.find((z) => z.id === user.assignedZone);

                  return (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <span
                          className={cn(
                            'inline-block w-3 h-3 rounded-full',
                            user.isActive ? 'bg-green-500' : 'bg-red-500'
                          )}
                          title={user.isActive ? 'Actif' : 'Inactif'}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
                            {user.displayName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('gap-1', roleInfo.color)}
                        >
                          <span>{roleInfo.icon}</span>
                          <span>{roleInfo.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {zone ? (
                          <span className="text-sm">{zone.name}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Jamais'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                              {user.isActive ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Désactiver
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activer
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => handleDeleteUser(user.uid)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Modal */}
      <UserFormModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSave={(data) => {
          // Type assertion for create mode - data includes all fields
          const createData = data as CreateUserData;
          const newUser: UserWithRole = {
            uid: `new-${Date.now()}`,
            email: createData.email,
            displayName: createData.displayName,
            role: createData.role,
            permissions: ROLE_PERMISSIONS[createData.role],
            assignedZone: createData.assignedZone,
            assignedClients: createData.assignedClients,
            managerId: createData.managerId,
            vehicleInfo: createData.vehicleInfo,
            isActive: true,
            createdAt: new Date(),
          };
          setUsers((prev) => [...prev, newUser]);
          setIsCreateModalOpen(false);
        }}
      />

      {/* Edit User Modal */}
      {selectedUser && (
        <UserFormModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          user={selectedUser}
          onSave={(data) => {
            // Type assertion for edit mode
            const updateData = data as UpdateUserData;
            setUsers((prev) =>
              prev.map((u) =>
                u.uid === selectedUser.uid
                  ? {
                      ...u,
                      ...updateData,
                      permissions: ROLE_PERMISSIONS[updateData.role || u.role],
                    }
                  : u
              )
            );
            setIsEditModalOpen(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
}

// Modal de création/édition d'utilisateur
interface UserFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserWithRole;
  onSave: (data: CreateUserData | UpdateUserData) => void;
}

function UserFormModal({ open, onOpenChange, user, onSave }: UserFormModalProps) {
  const isEdit = !!user;
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    displayName: user?.displayName || '',
    role: user?.role || ('commercial' as UserRole),
    assignedZone: user?.assignedZone || '',
    managerId: user?.managerId || '',
    vehicleType: user?.vehicleInfo?.type || '',
    vehiclePlate: user?.vehicleInfo?.plate || '',
    vehicleModel: user?.vehicleInfo?.model || '',
    isActive: user?.isActive ?? true,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        displayName: user.displayName,
        role: user.role,
        assignedZone: user.assignedZone || '',
        managerId: user.managerId || '',
        vehicleType: user.vehicleInfo?.type || '',
        vehiclePlate: user.vehicleInfo?.plate || '',
        vehicleModel: user.vehicleInfo?.model || '',
        isActive: user.isActive,
      });
    } else {
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: 'commercial',
        assignedZone: '',
        managerId: '',
        vehicleType: '',
        vehiclePlate: '',
        vehicleModel: '',
        isActive: true,
      });
    }
  }, [user, open]);

  const handleSubmit = () => {
    const data: any = {
      email: formData.email,
      displayName: formData.displayName,
      role: formData.role,
      isActive: formData.isActive,
    };

    if (!isEdit && formData.password) {
      data.password = formData.password;
    }

    if (formData.assignedZone) {
      data.assignedZone = formData.assignedZone;
    }

    if (formData.managerId) {
      data.managerId = formData.managerId;
    }

    if (formData.role === 'livreur' && formData.vehiclePlate) {
      data.vehicleInfo = {
        type: formData.vehicleType,
        plate: formData.vehiclePlate,
        model: formData.vehicleModel,
      };
    }

    onSave(data);
  };

  const showZoneField = formData.role === 'commercial' || formData.role === 'livreur';
  const showVehicleFields = formData.role === 'livreur';
  // const __showManagerField = formData.role === 'commercial' || formData.role === 'livreur';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEdit ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Modifiez les informations de l\'utilisateur'
              : 'Créez un nouveau compte utilisateur'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nom complet</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Jean Dupont"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="jean@distram.fr"
            />
          </div>

          {/* Password (only for new users) */}
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Role */}
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([role, info]) => (
                  <SelectItem key={role} value={role}>
                    <span className="flex items-center gap-2">
                      <span>{info.icon}</span>
                      <span>{info.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zone */}
          {showZoneField && (
            <div className="space-y-2">
              <Label htmlFor="zone">Zone assignée</Label>
              <Select
                value={formData.assignedZone}
                onValueChange={(value) => setFormData({ ...formData, assignedZone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une zone" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_ZONES.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Vehicle info for livreur */}
          {showVehicleFields && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm">Informations véhicule</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="vehicleType">Type</Label>
                  <Input
                    id="vehicleType"
                    value={formData.vehicleType}
                    onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                    placeholder="Camionnette"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vehiclePlate">Immatriculation</Label>
                  <Input
                    id="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={(e) => setFormData({ ...formData, vehiclePlate: e.target.value })}
                    placeholder="AB-123-CD"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="vehicleModel">Modèle</Label>
                <Input
                  id="vehicleModel"
                  value={formData.vehicleModel}
                  onChange={(e) => setFormData({ ...formData, vehicleModel: e.target.value })}
                  placeholder="Renault Master"
                />
              </div>
            </div>
          )}

          {/* Status (edit only) */}
          {isEdit && (
            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Select
                value={formData.isActive ? 'active' : 'inactive'}
                onValueChange={(value) =>
                  setFormData({ ...formData, isActive: value === 'active' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Actif
                    </span>
                  </SelectItem>
                  <SelectItem value="inactive">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Inactif
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="h-4 w-4 mr-2" />
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
