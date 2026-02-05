/**
 * Service Livreur - Gestion des livraisons terrain
 * Mobile-only interface pour les chauffeurs-livreurs
 */

// ===== TYPES =====

export interface DeliveryStop {
  id: string;
  orderId: string;
  sequence: number;
  client: {
    id: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string;
    notes?: string;
    location: { lat: number; lng: number };
  };
  items: { name: string; quantity: number; unit: string }[];
  totalAmount: number;
  paymentStatus: 'paid' | 'to_collect_cash' | 'to_collect_card' | 'to_collect_check';
  status: 'pending' | 'in_progress' | 'arrived' | 'delivered' | 'failed';
  estimatedArrival?: Date;
  actualArrival?: Date;
  signature?: string;
  photos?: string[];
  failReason?: string;
  failDetails?: string;
  deliveryNotes?: string;
  receiverName?: string;
}

export interface DriverDay {
  date: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  deliveries: DeliveryStop[];
  stats: {
    total: number;
    completed: number;
    failed: number;
    remaining: number;
  };
  route?: {
    totalDistance: number;
    totalDuration: number;
    geometry: string;
  };
}

export interface DriverStatus {
  status: 'online' | 'pause' | 'offline';
  lastUpdate: Date;
  location?: { lat: number; lng: number };
}

export interface CompletionData {
  receiverName: string;
  signature: string;
  photos?: string[];
  notes?: string;
  paymentCollected?: number;
  paymentMethod?: 'cash' | 'card' | 'check';
}

export interface FailureData {
  reason: string;
  details?: string;
  photos: string[];
}

export interface Message {
  id: string;
  from: 'driver' | 'dispatch';
  content: string;
  timestamp: Date;
  read: boolean;
  type: 'text' | 'image' | 'location';
  imageUrl?: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleId: string;
  vehicleType: string;
  licensePlate: string;
  joinedAt: Date;
  stats: {
    today: {
      deliveries: number;
      completed: number;
      failed: number;
      distance: number;
    };
    week: {
      deliveries: number;
      completed: number;
      failed: number;
      distance: number;
    };
    month: {
      deliveries: number;
      successRate: number;
      avgRating: number;
      distance: number;
    };
  };
}

export const FAIL_REASONS = [
  { id: 'absent', label: 'Client absent', icon: '🚫', requirePhoto: true },
  { id: 'closed', label: 'Établissement fermé', icon: '🔒', requirePhoto: true },
  { id: 'wrong_address', label: 'Adresse incorrecte', icon: '📍', requirePhoto: false },
  { id: 'refused', label: 'Livraison refusée', icon: '✋', requirePhoto: false },
  { id: 'damaged', label: 'Marchandise endommagée', icon: '📦', requirePhoto: true },
  { id: 'incomplete', label: 'Commande incomplète', icon: '❓', requirePhoto: false },
  { id: 'payment_issue', label: 'Problème paiement', icon: '💳', requirePhoto: false },
  { id: 'access_issue', label: 'Accès impossible', icon: '🚧', requirePhoto: true },
  { id: 'other', label: 'Autre (préciser)', icon: '📝', requirePhoto: false },
] as const;

export const QUICK_MESSAGES = [
  "Je suis en route",
  "Livraison effectuée",
  "Client absent",
  "Besoin d'aide",
  "Retard prévu ~15min",
  "Problème véhicule",
  "Pause déjeuner",
  "Retour dépôt",
] as const;

// ===== MOCK DATA =====

const mockDeliveries: DeliveryStop[] = [
  {
    id: 'del-001',
    orderId: 'CMD-2024-0891',
    sequence: 1,
    client: {
      id: 'cli-001',
      name: 'Kebab du Coin',
      address: '23 Rue de la République',
      city: 'Marseille',
      postalCode: '13001',
      phone: '04 91 12 34 56',
      notes: 'Livrer côté cuisine',
      location: { lat: 43.2965, lng: 5.3698 },
    },
    items: [
      { name: 'Huile friture 10L', quantity: 3, unit: 'bidons' },
      { name: 'Viande kebab 5kg', quantity: 4, unit: 'pièces' },
      { name: 'Pain pita x50', quantity: 2, unit: 'paquets' },
    ],
    totalAmount: 387.50,
    paymentStatus: 'paid',
    status: 'delivered',
    estimatedArrival: new Date(new Date().setHours(10, 30)),
    actualArrival: new Date(new Date().setHours(10, 45)),
    receiverName: 'Karim',
    signature: 'data:image/png;base64,mock',
  },
  {
    id: 'del-002',
    orderId: 'CMD-2024-0892',
    sequence: 2,
    client: {
      id: 'cli-002',
      name: 'Pizza Express',
      address: '45 Avenue du Prado',
      city: 'Marseille',
      postalCode: '13008',
      phone: '04 91 23 45 67',
      location: { lat: 43.2725, lng: 5.3934 },
    },
    items: [
      { name: 'Farine pizza 25kg', quantity: 2, unit: 'sacs' },
      { name: 'Sauce tomate 5L', quantity: 4, unit: 'bidons' },
      { name: 'Mozzarella 2.5kg', quantity: 6, unit: 'pièces' },
    ],
    totalAmount: 523.80,
    paymentStatus: 'paid',
    status: 'delivered',
    estimatedArrival: new Date(new Date().setHours(11, 15)),
    actualArrival: new Date(new Date().setHours(11, 30)),
    receiverName: 'Marco',
    signature: 'data:image/png;base64,mock',
  },
  {
    id: 'del-003',
    orderId: 'CMD-2024-0893',
    sequence: 3,
    client: {
      id: 'cli-003',
      name: 'Burger House',
      address: '12 Rue de la Paix',
      city: 'Marseille',
      postalCode: '13001',
      phone: '04 91 34 56 78',
      notes: 'Sonner 2x, code 4521',
      location: { lat: 43.2955, lng: 5.3745 },
    },
    items: [
      { name: 'Huile friture 10L', quantity: 2, unit: 'bidons' },
      { name: 'Frites surgelées 5kg', quantity: 5, unit: 'sacs' },
      { name: 'Cheddar tranché 1kg', quantity: 3, unit: 'paquets' },
      { name: 'Sauces assorties', quantity: 10, unit: 'flacons' },
    ],
    totalAmount: 458.90,
    paymentStatus: 'paid',
    status: 'in_progress',
    estimatedArrival: new Date(new Date().setHours(14, 45)),
  },
  {
    id: 'del-004',
    orderId: 'CMD-2024-0894',
    sequence: 4,
    client: {
      id: 'cli-004',
      name: 'Snack Gourmet',
      address: '45 Avenue des Fleurs',
      city: 'Marseille',
      postalCode: '13005',
      phone: '04 91 45 67 89',
      location: { lat: 43.2895, lng: 5.3912 },
    },
    items: [
      { name: 'Pain burger x30', quantity: 2, unit: 'cartons' },
      { name: 'Steak haché 100g', quantity: 50, unit: 'pièces' },
      { name: 'Bacon tranché 1kg', quantity: 3, unit: 'paquets' },
    ],
    totalAmount: 234.50,
    paymentStatus: 'to_collect_card',
    status: 'pending',
    estimatedArrival: new Date(new Date().setHours(15, 15)),
  },
  {
    id: 'del-005',
    orderId: 'CMD-2024-0895',
    sequence: 5,
    client: {
      id: 'cli-005',
      name: 'Fast Chicken',
      address: '8 Boulevard Central',
      city: 'Marseille',
      postalCode: '13003',
      phone: '04 91 56 78 90',
      notes: 'Parking derrière',
      location: { lat: 43.3025, lng: 5.3802 },
    },
    items: [
      { name: 'Poulet pané 2kg', quantity: 10, unit: 'sacs' },
      { name: 'Panure extra crispy', quantity: 4, unit: 'seaux' },
      { name: 'Huile friture 10L', quantity: 2, unit: 'bidons' },
    ],
    totalAmount: 412.30,
    paymentStatus: 'to_collect_cash',
    status: 'pending',
    estimatedArrival: new Date(new Date().setHours(15, 45)),
  },
  {
    id: 'del-006',
    orderId: 'CMD-2024-0896',
    sequence: 6,
    client: {
      id: 'cli-006',
      name: 'Tacos Factory',
      address: '67 Rue Saint-Ferréol',
      city: 'Marseille',
      postalCode: '13001',
      phone: '04 91 67 89 01',
      location: { lat: 43.2945, lng: 5.3765 },
    },
    items: [
      { name: 'Tortillas x100', quantity: 3, unit: 'cartons' },
      { name: 'Viande hachée 5kg', quantity: 4, unit: 'barquettes' },
      { name: 'Sauce algérienne 5L', quantity: 2, unit: 'bidons' },
    ],
    totalAmount: 289.90,
    paymentStatus: 'paid',
    status: 'pending',
    estimatedArrival: new Date(new Date().setHours(16, 15)),
  },
  {
    id: 'del-007',
    orderId: 'CMD-2024-0897',
    sequence: 7,
    client: {
      id: 'cli-007',
      name: 'Sushi Corner',
      address: '34 Quai du Port',
      city: 'Marseille',
      postalCode: '13002',
      phone: '04 91 78 90 12',
      notes: 'Attention produits frais - garder au frais',
      location: { lat: 43.2952, lng: 5.3682 },
    },
    items: [
      { name: 'Riz sushi 10kg', quantity: 2, unit: 'sacs' },
      { name: 'Saumon frais 2kg', quantity: 3, unit: 'pièces' },
      { name: 'Nori x100', quantity: 2, unit: 'paquets' },
    ],
    totalAmount: 567.80,
    paymentStatus: 'to_collect_check',
    status: 'pending',
    estimatedArrival: new Date(new Date().setHours(16, 45)),
  },
  {
    id: 'del-008',
    orderId: 'CMD-2024-0898',
    sequence: 8,
    client: {
      id: 'cli-008',
      name: 'Pasta Bella',
      address: '89 Cours Julien',
      city: 'Marseille',
      postalCode: '13006',
      phone: '04 91 89 01 23',
      location: { lat: 43.2935, lng: 5.3845 },
    },
    items: [
      { name: 'Pâtes fraîches 5kg', quantity: 4, unit: 'cartons' },
      { name: 'Parmesan AOP 1kg', quantity: 2, unit: 'pièces' },
      { name: 'Huile olive 5L', quantity: 3, unit: 'bidons' },
    ],
    totalAmount: 378.40,
    paymentStatus: 'paid',
    status: 'pending',
    estimatedArrival: new Date(new Date().setHours(17, 15)),
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    from: 'dispatch',
    content: 'Bonjour ! Bonne journée de livraisons 🚚',
    timestamp: new Date(new Date().setHours(8, 0)),
    read: true,
    type: 'text',
  },
  {
    id: 'msg-002',
    from: 'driver',
    content: 'Merci ! Je commence la tournée',
    timestamp: new Date(new Date().setHours(8, 30)),
    read: true,
    type: 'text',
  },
  {
    id: 'msg-003',
    from: 'dispatch',
    content: 'Client Burger House a appelé - ils attendent la livraison avant 15h si possible',
    timestamp: new Date(new Date().setHours(13, 45)),
    read: true,
    type: 'text',
  },
  {
    id: 'msg-004',
    from: 'driver',
    content: "OK j'y serai vers 14h45",
    timestamp: new Date(new Date().setHours(13, 50)),
    read: true,
    type: 'text',
  },
];

const driverStatus: DriverStatus = {
  status: 'online',
  lastUpdate: new Date(),
  location: { lat: 43.2965, lng: 5.3698 },
};

let currentDeliveries = [...mockDeliveries];
let currentMessages = [...mockMessages];

// ===== JOURNÉE =====

export async function getDriverDay(driverId: string, date?: Date): Promise<DriverDay> {
  await simulateDelay(300);

  const deliveries = currentDeliveries;
  const completed = deliveries.filter(d => d.status === 'delivered').length;
  const failed = deliveries.filter(d => d.status === 'failed').length;

  return {
    date: date || new Date(),
    status: completed === 0 ? 'not_started' :
            completed === deliveries.length ? 'completed' : 'in_progress',
    deliveries,
    stats: {
      total: deliveries.length,
      completed,
      failed,
      remaining: deliveries.length - completed - failed,
    },
    route: {
      totalDistance: 42.5, // km
      totalDuration: 180, // minutes
      geometry: 'encoded_polyline_here',
    },
  };
}

export async function startDay(_driverId: string): Promise<void> {
  await simulateDelay(200);
  driverStatus.status = 'online';
  driverStatus.lastUpdate = new Date();
}

export async function endDay(_driverId: string): Promise<void> {
  await simulateDelay(200);
  driverStatus.status = 'offline';
  driverStatus.lastUpdate = new Date();
}

// ===== LIVRAISONS =====

export async function getDeliveries(_driverId: string, _date?: Date): Promise<DeliveryStop[]> {
  await simulateDelay(300);
  return currentDeliveries;
}

export async function getDeliveryDetail(deliveryId: string): Promise<DeliveryStop | null> {
  await simulateDelay(200);
  return currentDeliveries.find(d => d.id === deliveryId) || null;
}

export async function startDelivery(deliveryId: string): Promise<void> {
  await simulateDelay(200);
  const index = currentDeliveries.findIndex(d => d.id === deliveryId);
  if (index !== -1) {
    // Reset any other in_progress delivery
    currentDeliveries = currentDeliveries.map(d =>
      d.status === 'in_progress' ? { ...d, status: 'pending' as const } : d
    );
    currentDeliveries[index] = {
      ...currentDeliveries[index],
      status: 'in_progress',
    };
  }
}

export async function arriveAtDelivery(deliveryId: string): Promise<void> {
  await simulateDelay(200);
  const index = currentDeliveries.findIndex(d => d.id === deliveryId);
  if (index !== -1) {
    currentDeliveries[index] = {
      ...currentDeliveries[index],
      status: 'arrived',
      actualArrival: new Date(),
    };
  }
}

export async function completeDelivery(deliveryId: string, data: CompletionData): Promise<void> {
  await simulateDelay(500);
  const index = currentDeliveries.findIndex(d => d.id === deliveryId);
  if (index !== -1) {
    currentDeliveries[index] = {
      ...currentDeliveries[index],
      status: 'delivered',
      actualArrival: currentDeliveries[index].actualArrival || new Date(),
      signature: data.signature,
      photos: data.photos,
      deliveryNotes: data.notes,
      receiverName: data.receiverName,
    };
  }
}

export async function failDelivery(deliveryId: string, data: FailureData): Promise<void> {
  await simulateDelay(500);
  const index = currentDeliveries.findIndex(d => d.id === deliveryId);
  if (index !== -1) {
    currentDeliveries[index] = {
      ...currentDeliveries[index],
      status: 'failed',
      actualArrival: new Date(),
      failReason: data.reason,
      failDetails: data.details,
      photos: data.photos,
    };
  }
}

// ===== GPS & TRACKING =====

let trackingInterval: NodeJS.Timeout | null = null;

export function startLocationTracking(driverId: string, onUpdate?: (location: { lat: number; lng: number }) => void): void {
  if (trackingInterval) return;

  trackingInterval = setInterval(() => {
    // Simulate location updates
    if (driverStatus.location) {
      driverStatus.location = {
        lat: driverStatus.location.lat + (Math.random() - 0.5) * 0.001,
        lng: driverStatus.location.lng + (Math.random() - 0.5) * 0.001,
      };
      driverStatus.lastUpdate = new Date();
      onUpdate?.(driverStatus.location);
    }
  }, 5000);
}

export function stopLocationTracking(): void {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
}

export async function updateDriverStatus(driverId: string, status: 'online' | 'pause' | 'offline'): Promise<void> {
  await simulateDelay(200);
  driverStatus.status = status;
  driverStatus.lastUpdate = new Date();
}

export async function getDriverStatus(_driverId: string): Promise<DriverStatus> {
  await simulateDelay(100);
  return { ...driverStatus };
}

// ===== NAVIGATION =====

export function openInMaps(location: { lat: number; lng: number }, address: string): void {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}&destination_place_id=${encodedAddress}`;
  window.open(url, '_blank');
}

export function openInWaze(location: { lat: number; lng: number }): void {
  const url = `https://waze.com/ul?ll=${location.lat},${location.lng}&navigate=yes`;
  window.open(url, '_blank');
}

export function callClient(phone: string): void {
  window.location.href = `tel:${phone.replace(/\s/g, '')}`;
}

// ===== MESSAGES =====

export async function sendMessage(driverId: string, content: string, type: 'text' | 'image' = 'text', imageUrl?: string): Promise<Message> {
  await simulateDelay(300);

  const newMessage: Message = {
    id: `msg-${Date.now()}`,
    from: 'driver',
    content,
    timestamp: new Date(),
    read: true,
    type,
    imageUrl,
  };

  currentMessages.push(newMessage);

  // Simulate dispatch auto-response for some messages
  if (content.toLowerCase().includes('aide') || content.toLowerCase().includes('help')) {
    setTimeout(() => {
      currentMessages.push({
        id: `msg-${Date.now() + 1}`,
        from: 'dispatch',
        content: 'Un responsable va vous rappeler dans quelques minutes.',
        timestamp: new Date(),
        read: false,
        type: 'text',
      });
    }, 2000);
  }

  return newMessage;
}

export async function getMessages(_driverId: string): Promise<Message[]> {
  await simulateDelay(200);
  return [...currentMessages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function subscribeToMessages(_driverId: string, callback: (msg: Message) => void): () => void {
  const interval = setInterval(() => {
    const unreadMessages = currentMessages.filter(m => !m.read && m.from === 'dispatch');
    unreadMessages.forEach(msg => {
      msg.read = true;
      callback(msg);
    });
  }, 3000);

  return () => clearInterval(interval);
}

export async function markMessagesAsRead(_driverId: string): Promise<void> {
  await simulateDelay(100);
  currentMessages = currentMessages.map(m => ({ ...m, read: true }));
}

// ===== PROFIL =====

export async function getDriverProfile(driverId: string): Promise<DriverProfile> {
  await simulateDelay(300);

  return {
    id: driverId,
    name: 'Ahmed Benali',
    phone: '06 12 34 56 78',
    email: 'ahmed.benali@fastgross.pro',
    vehicleId: 'VEH-003',
    vehicleType: 'Renault Master',
    licensePlate: 'AB-123-CD',
    joinedAt: new Date('2023-03-15'),
    stats: {
      today: {
        deliveries: 8,
        completed: 2,
        failed: 0,
        distance: 28,
      },
      week: {
        deliveries: 42,
        completed: 40,
        failed: 2,
        distance: 185,
      },
      month: {
        deliveries: 142,
        successRate: 98.5,
        avgRating: 4.8,
        distance: 720,
      },
    },
  };
}

// ===== UTILS =====

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Payment status labels
export const PAYMENT_STATUS_LABELS: Record<DeliveryStop['paymentStatus'], { label: string; color: string; icon: string }> = {
  paid: { label: 'Déjà payé', color: 'text-green-600', icon: '✅' },
  to_collect_cash: { label: 'Espèces à encaisser', color: 'text-amber-600', icon: '💵' },
  to_collect_card: { label: 'CB à encaisser', color: 'text-blue-600', icon: '💳' },
  to_collect_check: { label: 'Chèque à récupérer', color: 'text-purple-600', icon: '📝' },
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStop['status'], { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'En attente', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: '⏳' },
  in_progress: { label: 'En cours', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: '🚗' },
  arrived: { label: 'Arrivé', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: '📍' },
  delivered: { label: 'Livré', color: 'text-green-600', bgColor: 'bg-green-100', icon: '✅' },
  failed: { label: 'Échec', color: 'text-red-600', bgColor: 'bg-red-100', icon: '❌' },
};
