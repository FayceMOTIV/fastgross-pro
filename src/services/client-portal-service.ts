/**
 * Service Portail Client B2B
 * Gestion du catalogue, panier, commandes et factures côté client
 */

// ===== TYPES =====

export interface ClientProfile {
  id: string;
  name: string;
  type: string;
  siret: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    notes?: string;
  };
  priceGrid: string;
  discountPercent: number;
  paymentTerms: number; // jours
  creditLimit: number;
  commercialId: string;
  commercialName: string;
  commercialPhone: string;
  createdAt: Date;
}

export interface ClientCatalogProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  image?: string;
  unit: string;
  minQuantity: number;
  basePrice: number;
  clientPrice: number;
  discountPercent: number;
  hasPromo: boolean;
  promoPrice?: number;
  promoLabel?: string;
  promoEndDate?: Date;
  inStock: boolean;
  stockLevel: 'high' | 'medium' | 'low' | 'out';
}

export interface CartItem {
  productId: string;
  product: ClientCatalogProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountPercent: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  itemCount: number;
}

export interface OrderOptions {
  deliveryDate: Date;
  deliverySlot: 'morning' | 'afternoon';
  notes?: string;
}

export interface ClientOrder {
  id: string;
  number: string;
  date: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivering' | 'delivered' | 'cancelled';
  items: CartItem[];
  subtotal: number;
  discount: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  deliveryDate: Date;
  deliverySlot: string;
  deliveryNotes?: string;
  deliveredAt?: Date;
  deliveredBy?: string;
  signature?: string;
}

export interface DeliveryTracking {
  orderId: string;
  status: ClientOrder['status'];
  driverName?: string;
  driverPhone?: string;
  driverLocation?: { lat: number; lng: number };
  eta?: Date;
  timeline: {
    status: string;
    label: string;
    timestamp?: Date;
    completed: boolean;
  }[];
}

export interface ClientInvoice {
  id: string;
  number: string;
  date: Date;
  dueDate: Date;
  orderId: string;
  orderNumber: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  totalHT: number;
  tva: number;
  totalTTC: number;
  paidAmount: number;
  remainingAmount: number;
  paidAt?: Date;
  paymentMethod?: string;
  daysOverdue?: number;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  discountPercent: number;
  startDate: Date;
  endDate: Date;
  categoryIds?: string[];
  productIds?: string[];
}

export interface ClientPortalHome {
  client: ClientProfile;
  quickOrder: {
    usualProducts: ClientCatalogProduct[];
    lastOrderProducts: ClientCatalogProduct[];
  };
  stats: {
    pendingOrders: number;
    inDelivery: number;
    unpaidInvoices: number;
    unpaidAmount: number;
  };
  promotions: Promotion[];
  recentOrders: ClientOrder[];
}

// ===== CATEGORIES =====

export const PRODUCT_CATEGORIES = [
  { id: 'all', label: 'Tous', icon: '📦' },
  { id: 'huiles', label: 'Huiles', icon: '🛢️' },
  { id: 'surgeles', label: 'Surgelés', icon: '🧊' },
  { id: 'fromages', label: 'Fromages', icon: '🧀' },
  { id: 'sauces', label: 'Sauces', icon: '🥫' },
  { id: 'boissons', label: 'Boissons', icon: '🥤' },
  { id: 'emballages', label: 'Emballages', icon: '📦' },
  { id: 'viandes', label: 'Viandes', icon: '🥩' },
  { id: 'pains', label: 'Pains', icon: '🍞' },
] as const;

// ===== MOCK DATA =====

const mockClient: ClientProfile = {
  id: 'cli-001',
  name: 'Kebab du Coin',
  type: 'Fast-food',
  siret: '12345678901234',
  email: 'contact@kebabducoin.fr',
  phone: '04 91 12 34 56',
  address: {
    street: '23 Rue de la République',
    city: 'Marseille',
    postalCode: '13001',
    notes: 'Sonner 2x, code portail 4521',
  },
  priceGrid: 'Gold',
  discountPercent: 10,
  paymentTerms: 30,
  creditLimit: 5000,
  commercialId: 'com-001',
  commercialName: 'Hamza Karim',
  commercialPhone: '06 12 34 56 78',
  createdAt: new Date('2023-06-15'),
};

const mockProducts: ClientCatalogProduct[] = [
  {
    id: 'prod-001',
    name: 'Huile friture pro 10L',
    description: 'Huile végétale haute température pour friture professionnelle',
    category: 'huiles',
    unit: 'bidon',
    minQuantity: 1,
    basePrice: 27.90,
    clientPrice: 24.90,
    discountPercent: 10,
    hasPromo: false,
    inStock: true,
    stockLevel: 'high',
  },
  {
    id: 'prod-002',
    name: 'Frites allumettes 5kg',
    description: 'Frites surgelées préfrites, cuisson rapide',
    category: 'surgeles',
    unit: 'sac',
    minQuantity: 1,
    basePrice: 13.90,
    clientPrice: 12.50,
    discountPercent: 10,
    hasPromo: false,
    inStock: true,
    stockLevel: 'medium',
  },
  {
    id: 'prod-003',
    name: 'Cheddar tranché 1kg',
    description: 'Fromage cheddar en tranches pour burgers',
    category: 'fromages',
    unit: 'paquet',
    minQuantity: 1,
    basePrice: 9.90,
    clientPrice: 8.90,
    discountPercent: 10,
    hasPromo: true,
    promoPrice: 8.19,
    promoLabel: '-8% PROMO',
    promoEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    inStock: true,
    stockLevel: 'high',
  },
  {
    id: 'prod-004',
    name: 'Sauce burger 500ml',
    description: 'Sauce signature pour burgers gourmets',
    category: 'sauces',
    unit: 'flacon',
    minQuantity: 1,
    basePrice: 5.50,
    clientPrice: 5.00,
    discountPercent: 10,
    hasPromo: true,
    promoPrice: 4.50,
    promoLabel: '-10% PROMO SAUCES',
    promoEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    inStock: true,
    stockLevel: 'high',
  },
  {
    id: 'prod-005',
    name: 'Viande kebab 5kg',
    description: 'Broche de viande kebab tradition',
    category: 'viandes',
    unit: 'pièce',
    minQuantity: 1,
    basePrice: 45.00,
    clientPrice: 40.50,
    discountPercent: 10,
    hasPromo: false,
    inStock: true,
    stockLevel: 'high',
  },
  {
    id: 'prod-006',
    name: 'Pain pita x50',
    description: 'Pain pita frais pour kebabs et sandwichs',
    category: 'pains',
    unit: 'paquet',
    minQuantity: 1,
    basePrice: 12.00,
    clientPrice: 10.80,
    discountPercent: 10,
    hasPromo: false,
    inStock: true,
    stockLevel: 'medium',
  },
  {
    id: 'prod-007',
    name: 'Sauce algérienne 5L',
    description: 'Sauce algérienne crémeuse en grand format',
    category: 'sauces',
    unit: 'bidon',
    minQuantity: 1,
    basePrice: 18.00,
    clientPrice: 16.20,
    discountPercent: 10,
    hasPromo: true,
    promoPrice: 14.58,
    promoLabel: '-10% PROMO SAUCES',
    promoEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    inStock: true,
    stockLevel: 'high',
  },
  {
    id: 'prod-008',
    name: 'Boisson cola 1.5L x6',
    description: 'Pack de 6 bouteilles cola',
    category: 'boissons',
    unit: 'pack',
    minQuantity: 1,
    basePrice: 8.00,
    clientPrice: 7.20,
    discountPercent: 10,
    hasPromo: false,
    inStock: true,
    stockLevel: 'low',
  },
  {
    id: 'prod-009',
    name: 'Barquettes alu x100',
    description: 'Barquettes aluminium pour plats à emporter',
    category: 'emballages',
    unit: 'carton',
    minQuantity: 1,
    basePrice: 15.00,
    clientPrice: 13.50,
    discountPercent: 10,
    hasPromo: false,
    inStock: false,
    stockLevel: 'out',
  },
  {
    id: 'prod-010',
    name: 'Sauce harissa 500ml',
    description: 'Sauce harissa traditionnelle',
    category: 'sauces',
    unit: 'flacon',
    minQuantity: 1,
    basePrice: 4.50,
    clientPrice: 4.05,
    discountPercent: 10,
    hasPromo: true,
    promoPrice: 3.65,
    promoLabel: '-10% PROMO SAUCES',
    promoEndDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    inStock: true,
    stockLevel: 'high',
  },
];

const mockOrders: ClientOrder[] = [
  {
    id: 'ord-001',
    number: 'CMD-2024-0923',
    date: new Date(),
    status: 'delivering',
    items: [
      {
        productId: 'prod-001',
        product: mockProducts[0],
        quantity: 2,
        unitPrice: 24.90,
        totalPrice: 49.80,
      },
      {
        productId: 'prod-002',
        product: mockProducts[1],
        quantity: 5,
        unitPrice: 12.50,
        totalPrice: 62.50,
      },
    ],
    subtotal: 181.87,
    discount: 18.19,
    totalHT: 163.68,
    tva: 32.74,
    totalTTC: 196.42,
    deliveryDate: new Date(),
    deliverySlot: 'Après-midi (14h-18h)',
    deliveryNotes: 'Sonner 2x, code 4521',
  },
  {
    id: 'ord-002',
    number: 'CMD-2024-0915',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    status: 'delivered',
    items: [
      {
        productId: 'prod-005',
        product: mockProducts[4],
        quantity: 4,
        unitPrice: 40.50,
        totalPrice: 162.00,
      },
      {
        productId: 'prod-006',
        product: mockProducts[5],
        quantity: 3,
        unitPrice: 10.80,
        totalPrice: 32.40,
      },
    ],
    subtotal: 245.00,
    discount: 24.50,
    totalHT: 220.50,
    tva: 44.10,
    totalTTC: 264.60,
    deliveryDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    deliverySlot: 'Matin (8h-12h)',
    deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    deliveredBy: 'Karim L.',
  },
  {
    id: 'ord-003',
    number: 'CMD-2024-0908',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    status: 'delivered',
    items: [
      {
        productId: 'prod-001',
        product: mockProducts[0],
        quantity: 3,
        unitPrice: 24.90,
        totalPrice: 74.70,
      },
    ],
    subtotal: 189.00,
    discount: 18.90,
    totalHT: 170.10,
    tva: 34.02,
    totalTTC: 204.12,
    deliveryDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    deliverySlot: 'Matin (8h-12h)',
    deliveredAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    deliveredBy: 'Omar S.',
  },
];

const mockInvoices: ClientInvoice[] = [
  {
    id: 'inv-001',
    number: 'F-2024-0892',
    date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    orderId: 'ord-old-001',
    orderNumber: 'CMD-2024-0856',
    status: 'overdue',
    totalHT: 741.67,
    tva: 148.33,
    totalTTC: 890.00,
    paidAmount: 0,
    remainingAmount: 890.00,
    daysOverdue: 15,
  },
  {
    id: 'inv-002',
    number: 'F-2024-0845',
    date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    orderId: 'ord-old-002',
    orderNumber: 'CMD-2024-0812',
    status: 'paid',
    totalHT: 380.00,
    tva: 76.00,
    totalTTC: 456.00,
    paidAmount: 456.00,
    remainingAmount: 0,
    paidAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
    paymentMethod: 'Virement',
  },
  {
    id: 'inv-003',
    number: 'F-2024-0812',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    orderId: 'ord-old-003',
    orderNumber: 'CMD-2024-0789',
    status: 'paid',
    totalHT: 519.58,
    tva: 103.92,
    totalTTC: 623.50,
    paidAmount: 623.50,
    remainingAmount: 0,
    paidAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
    paymentMethod: 'CB',
  },
];

const mockPromotions: Promotion[] = [
  {
    id: 'promo-001',
    title: '-10% sur toutes les sauces',
    description: 'Profitez de 10% de réduction sur toute la gamme de sauces',
    discountPercent: 10,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    categoryIds: ['sauces'],
  },
  {
    id: 'promo-002',
    title: '-8% sur le cheddar',
    description: 'Promotion spéciale sur le cheddar tranché',
    discountPercent: 8,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    productIds: ['prod-003'],
  },
];

// Cart storage (in-memory for demo)
let clientCart: Cart = {
  items: [],
  subtotal: 0,
  discount: 0,
  discountPercent: 10,
  totalHT: 0,
  tva: 0,
  totalTTC: 0,
  itemCount: 0,
};

// ===== HELPER FUNCTIONS =====

function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateCart(items: CartItem[], discountPercent: number): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const discount = subtotal * (discountPercent / 100);
  const totalHT = subtotal - discount;
  const tva = totalHT * 0.20;
  const totalTTC = totalHT + tva;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items,
    subtotal,
    discount,
    discountPercent,
    totalHT,
    tva,
    totalTTC,
    itemCount,
  };
}

// ===== PORTAL HOME =====

export async function getClientPortalHome(_clientId: string): Promise<ClientPortalHome> {
  await simulateDelay(300);

  const unpaidInvoices = mockInvoices.filter(i => i.status === 'overdue' || i.status === 'pending');

  return {
    client: mockClient,
    quickOrder: {
      usualProducts: mockProducts.slice(0, 4),
      lastOrderProducts: mockProducts.slice(0, 3),
    },
    stats: {
      pendingOrders: mockOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length,
      inDelivery: mockOrders.filter(o => o.status === 'delivering').length,
      unpaidInvoices: unpaidInvoices.length,
      unpaidAmount: unpaidInvoices.reduce((sum, i) => sum + i.remainingAmount, 0),
    },
    promotions: mockPromotions,
    recentOrders: mockOrders.slice(0, 3),
  };
}

// ===== CATALOGUE =====

export async function getClientCatalog(
  clientId: string,
  category?: string,
  search?: string
): Promise<ClientCatalogProduct[]> {
  await simulateDelay(300);

  let products = [...mockProducts];

  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }

  if (search) {
    const query = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  return products;
}

export async function getProductDetails(
  clientId: string,
  productId: string
): Promise<ClientCatalogProduct | null> {
  await simulateDelay(200);
  return mockProducts.find(p => p.id === productId) || null;
}

// ===== PANIER =====

export async function getCart(_clientId: string): Promise<Cart> {
  await simulateDelay(100);
  return clientCart;
}

export async function addToCart(
  clientId: string,
  productId: string,
  quantity: number
): Promise<Cart> {
  await simulateDelay(200);

  const product = mockProducts.find(p => p.id === productId);
  if (!product) throw new Error('Produit non trouvé');

  const existingIndex = clientCart.items.findIndex(i => i.productId === productId);
  const price = product.hasPromo && product.promoPrice ? product.promoPrice : product.clientPrice;

  if (existingIndex >= 0) {
    const newQuantity = clientCart.items[existingIndex].quantity + quantity;
    clientCart.items[existingIndex] = {
      ...clientCart.items[existingIndex],
      quantity: newQuantity,
      totalPrice: price * newQuantity,
    };
  } else {
    clientCart.items.push({
      productId,
      product,
      quantity,
      unitPrice: price,
      totalPrice: price * quantity,
    });
  }

  clientCart = calculateCart(clientCart.items, mockClient.discountPercent);
  return clientCart;
}

export async function updateCartItem(
  clientId: string,
  productId: string,
  quantity: number
): Promise<Cart> {
  await simulateDelay(200);

  if (quantity <= 0) {
    return removeFromCart(clientId, productId);
  }

  const itemIndex = clientCart.items.findIndex(i => i.productId === productId);
  if (itemIndex >= 0) {
    const item = clientCart.items[itemIndex];
    clientCart.items[itemIndex] = {
      ...item,
      quantity,
      totalPrice: item.unitPrice * quantity,
    };
    clientCart = calculateCart(clientCart.items, mockClient.discountPercent);
  }

  return clientCart;
}

export async function removeFromCart(clientId: string, productId: string): Promise<Cart> {
  await simulateDelay(200);

  clientCart.items = clientCart.items.filter(i => i.productId !== productId);
  clientCart = calculateCart(clientCart.items, mockClient.discountPercent);

  return clientCart;
}

export async function clearCart(_clientId: string): Promise<Cart> {
  await simulateDelay(100);

  clientCart = {
    items: [],
    subtotal: 0,
    discount: 0,
    discountPercent: mockClient.discountPercent,
    totalHT: 0,
    tva: 0,
    totalTTC: 0,
    itemCount: 0,
  };

  return clientCart;
}

// ===== COMMANDES =====

export async function createOrder(
  clientId: string,
  options: OrderOptions
): Promise<ClientOrder> {
  await simulateDelay(500);

  if (clientCart.items.length === 0) {
    throw new Error('Le panier est vide');
  }

  const order: ClientOrder = {
    id: `ord-${Date.now()}`,
    number: `CMD-2024-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
    date: new Date(),
    status: 'pending',
    items: [...clientCart.items],
    subtotal: clientCart.subtotal,
    discount: clientCart.discount,
    totalHT: clientCart.totalHT,
    tva: clientCart.tva,
    totalTTC: clientCart.totalTTC,
    deliveryDate: options.deliveryDate,
    deliverySlot: options.deliverySlot === 'morning' ? 'Matin (8h-12h)' : 'Après-midi (14h-18h)',
    deliveryNotes: options.notes,
  };

  mockOrders.unshift(order);
  await clearCart(clientId);

  return order;
}

export async function getOrders(
  clientId: string,
  filter?: 'all' | 'pending' | 'delivered'
): Promise<ClientOrder[]> {
  await simulateDelay(300);

  let orders = [...mockOrders];

  if (filter === 'pending') {
    orders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  } else if (filter === 'delivered') {
    orders = orders.filter(o => o.status === 'delivered');
  }

  return orders;
}

export async function getOrderDetails(
  clientId: string,
  orderId: string
): Promise<ClientOrder | null> {
  await simulateDelay(200);
  return mockOrders.find(o => o.id === orderId) || null;
}

export async function reorder(clientId: string, orderId: string): Promise<Cart> {
  await simulateDelay(300);

  const order = mockOrders.find(o => o.id === orderId);
  if (!order) throw new Error('Commande non trouvée');

  for (const item of order.items) {
    await addToCart(clientId, item.productId, item.quantity);
  }

  return clientCart;
}

// ===== SUIVI LIVRAISON =====

export async function trackDelivery(orderId: string): Promise<DeliveryTracking> {
  await simulateDelay(300);

  const order = mockOrders.find(o => o.id === orderId);
  if (!order) throw new Error('Commande non trouvée');

  const isDelivering = order.status === 'delivering';

  return {
    orderId,
    status: order.status,
    driverName: isDelivering ? 'Ahmed B.' : undefined,
    driverPhone: isDelivering ? '06 98 76 54 32' : undefined,
    driverLocation: isDelivering ? { lat: 43.2955, lng: 5.3745 } : undefined,
    eta: isDelivering ? new Date(Date.now() + 25 * 60 * 1000) : undefined,
    timeline: [
      { status: 'pending', label: 'Commande reçue', timestamp: order.date, completed: true },
      {
        status: 'confirmed',
        label: 'Commande confirmée',
        timestamp: new Date(order.date.getTime() + 30 * 60 * 1000),
        completed: order.status !== 'pending',
      },
      {
        status: 'preparing',
        label: 'En préparation',
        timestamp: new Date(order.date.getTime() + 60 * 60 * 1000),
        completed: ['preparing', 'shipped', 'delivering', 'delivered'].includes(order.status),
      },
      {
        status: 'shipped',
        label: 'Expédiée',
        timestamp: new Date(order.date.getTime() + 4 * 60 * 60 * 1000),
        completed: ['shipped', 'delivering', 'delivered'].includes(order.status),
      },
      {
        status: 'delivering',
        label: 'En livraison',
        timestamp: isDelivering ? new Date(Date.now() - 20 * 60 * 1000) : undefined,
        completed: ['delivering', 'delivered'].includes(order.status),
      },
      {
        status: 'delivered',
        label: 'Livrée',
        timestamp: order.deliveredAt,
        completed: order.status === 'delivered',
      },
    ],
  };
}

export function subscribeToDeliveryUpdates(
  orderId: string,
  callback: (update: DeliveryTracking) => void
): () => void {
  const interval = setInterval(async () => {
    const tracking = await trackDelivery(orderId);
    callback(tracking);
  }, 10000);

  return () => clearInterval(interval);
}

// ===== FACTURES =====

export async function getInvoices(
  clientId: string,
  filter?: 'all' | 'pending' | 'paid'
): Promise<ClientInvoice[]> {
  await simulateDelay(300);

  let invoices = [...mockInvoices];

  if (filter === 'pending') {
    invoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue');
  } else if (filter === 'paid') {
    invoices = invoices.filter(i => i.status === 'paid');
  }

  return invoices;
}

export async function getInvoiceDetails(
  clientId: string,
  invoiceId: string
): Promise<ClientInvoice | null> {
  await simulateDelay(200);
  return mockInvoices.find(i => i.id === invoiceId) || null;
}

export async function downloadInvoicePDF(invoiceId: string): Promise<string> {
  await simulateDelay(500);
  // In real app, would return a download URL
  return `/api/invoices/${invoiceId}/pdf`;
}

export async function initiatePayment(
  invoiceId: string,
  method: 'card' | 'transfer'
): Promise<{ redirectUrl: string }> {
  await simulateDelay(300);
  // In real app, would initiate payment flow
  return { redirectUrl: `/payment/${invoiceId}?method=${method}` };
}

// ===== COMPTE =====

export async function getClientProfile(_clientId: string): Promise<ClientProfile> {
  await simulateDelay(200);
  return mockClient;
}

export async function updateClientProfile(
  clientId: string,
  data: Partial<ClientProfile>
): Promise<ClientProfile> {
  await simulateDelay(300);
  Object.assign(mockClient, data);
  return mockClient;
}

export async function updateDeliveryAddress(
  clientId: string,
  address: ClientProfile['address']
): Promise<ClientProfile> {
  await simulateDelay(300);
  mockClient.address = address;
  return mockClient;
}

export async function changePassword(
  _clientId: string,
  _oldPassword: string,
  _newPassword: string
): Promise<void> {
  await simulateDelay(500);
  // In real app, would validate and update password
}

// ===== ORDER STATUS HELPERS =====

export const ORDER_STATUS_LABELS: Record<ClientOrder['status'], { label: string; color: string; icon: string }> = {
  pending: { label: 'En attente', color: 'text-gray-600', icon: '⏳' },
  confirmed: { label: 'Confirmée', color: 'text-blue-600', icon: '✓' },
  preparing: { label: 'En préparation', color: 'text-amber-600', icon: '📦' },
  shipped: { label: 'Expédiée', color: 'text-purple-600', icon: '📤' },
  delivering: { label: 'En livraison', color: 'text-blue-600', icon: '🚚' },
  delivered: { label: 'Livrée', color: 'text-green-600', icon: '✅' },
  cancelled: { label: 'Annulée', color: 'text-red-600', icon: '❌' },
};

export const INVOICE_STATUS_LABELS: Record<ClientInvoice['status'], { label: string; color: string; bgColor: string }> = {
  pending: { label: 'À payer', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  paid: { label: 'Payée', color: 'text-green-600', bgColor: 'bg-green-100' },
  overdue: { label: 'En retard', color: 'text-red-600', bgColor: 'bg-red-100' },
  partial: { label: 'Paiement partiel', color: 'text-orange-600', bgColor: 'bg-orange-100' },
};
