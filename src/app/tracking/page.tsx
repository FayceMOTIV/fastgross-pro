"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Truck, Clock, CheckCircle2, Package } from "lucide-react";
import { PhonePreviewButton } from "@/components/ui/phone-preview";

type DeliveryStatus = "pickup" | "transit" | "arriving" | "delivered";

// Mock data for active deliveries
interface Delivery {
  id: string;
  driverName: string;
  driverInitials: string;
  driverColor: string;
  clientName: string;
  address: string;
  status: DeliveryStatus;
  eta: string;
  progress: number;
  orderNumber: string;
}

const mockDeliveries: Delivery[] = [
  {
    id: "del1",
    driverName: "Karim Mansouri",
    driverInitials: "KM",
    driverColor: "from-violet-500 to-purple-600",
    clientName: "Jean Martin",
    address: "123 Rue de la Paix, Paris",
    status: "transit",
    eta: "15 min",
    progress: 65,
    orderNumber: "#12345",
  },
  {
    id: "del2",
    driverName: "Sophie Bernard",
    driverInitials: "SB",
    driverColor: "from-blue-500 to-cyan-600",
    clientName: "Marie Dubois",
    address: "45 Avenue des Champs, Lyon",
    status: "pickup",
    eta: "8 min",
    progress: 30,
    orderNumber: "#12346",
  },
  {
    id: "del3",
    driverName: "Thomas Petit",
    driverInitials: "TP",
    driverColor: "from-emerald-500 to-teal-600",
    clientName: "Pierre Leroy",
    address: "78 Boulevard Victor, Marseille",
    status: "arriving",
    eta: "3 min",
    progress: 90,
    orderNumber: "#12347",
  },
  {
    id: "del4",
    driverName: "Julie Martin",
    driverInitials: "JM",
    driverColor: "from-rose-500 to-pink-600",
    clientName: "Anne Moreau",
    address: "12 Rue du Commerce, Toulouse",
    status: "delivered",
    eta: "Delivered",
    progress: 100,
    orderNumber: "#12348",
  },
  {
    id: "del5",
    driverName: "Lucas Garcia",
    driverInitials: "LG",
    driverColor: "from-amber-500 to-orange-600",
    clientName: "Claire Simon",
    address: "56 Place de la République, Nice",
    status: "transit",
    eta: "22 min",
    progress: 45,
    orderNumber: "#12349",
  },
  {
    id: "del6",
    driverName: "Emma Rousseau",
    driverInitials: "ER",
    driverColor: "from-indigo-500 to-blue-600",
    clientName: "Laurent Blanc",
    address: "89 Rue Nationale, Nantes",
    status: "pickup",
    eta: "12 min",
    progress: 20,
    orderNumber: "#12350",
  },
];

const statusConfig: Record<DeliveryStatus, { label: string; color: string }> = {
  pickup: {
    label: "Pickup",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  transit: {
    label: "In Transit",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  arriving: {
    label: "Arriving",
    color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  },
  delivered: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
};

export default function TrackingPage() {
  const [deliveries, setDeliveries] = useState(mockDeliveries);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setDeliveries((prev) =>
        prev.map((delivery) => {
          if (delivery.status === "delivered") return delivery;

          const newProgress = Math.min(100, delivery.progress + Math.random() * 2);
          let newStatus: DeliveryStatus = delivery.status;

          if (newProgress >= 100) {
            newStatus = "delivered";
          } else if (newProgress >= 85) {
            newStatus = "arriving";
          } else if (newProgress >= 40) {
            newStatus = "transit";
          }

          return {
            ...delivery,
            progress: newProgress,
            status: newStatus,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const stats = {
    active: deliveries.filter((d) => d.status !== "delivered").length,
    driversOnline: new Set(deliveries.map((d) => d.driverName)).size,
    completedToday: deliveries.filter((d) => d.status === "delivered").length,
    avgDeliveryTime: "28 min",
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Real-Time Delivery Tracking
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Monitor all active deliveries and driver locations
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="relative">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Live Tracking Active
            </span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Deliveries</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <Truck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Drivers Online</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.driversOnline}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Package className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed Today</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.completedToday}
                </p>
              </div>
              <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Delivery Time</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.avgDeliveryTime}
                </p>
              </div>
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Active Deliveries */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Active Deliveries
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                  >
                    {/* Driver Info */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${delivery.driverColor} flex items-center justify-center text-white font-semibold text-sm shadow-lg`}
                      >
                        {delivery.driverInitials}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {delivery.driverName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {delivery.orderNumber}
                        </p>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          statusConfig[delivery.status].color
                        }`}
                      >
                        {statusConfig[delivery.status].label}
                      </span>
                    </div>

                    {/* Client Info */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {delivery.clientName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {delivery.address}
                      </p>
                    </div>

                    {/* ETA */}
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        ETA: <span className="font-medium">{delivery.eta}</span>
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 dark:text-gray-400">Progress</span>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {Math.round(delivery.progress)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            delivery.status === "delivered"
                              ? "bg-emerald-500"
                              : delivery.status === "arriving"
                              ? "bg-violet-500"
                              : delivery.status === "transit"
                              ? "bg-blue-500"
                              : "bg-amber-500"
                          }`}
                          style={{ width: `${delivery.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-full min-h-[600px]">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Live Driver Locations
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Real-time tracking of all active drivers
                </p>
              </div>

              <div className="relative h-full min-h-[540px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
                {/* Map Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-4">
                      <svg
                        className="w-16 h-16 text-gray-400 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    </div>
                    <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Map loads here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Interactive map with driver markers
                    </p>
                  </div>
                </div>

                {/* Simulated Driver Markers */}
                <div className="absolute top-1/4 left-1/4">
                  <div className="relative">
                    <div className="animate-ping absolute h-6 w-6 rounded-full bg-blue-400 opacity-75"></div>
                    <div className="relative h-6 w-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <Truck className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>

                <div className="absolute top-1/2 right-1/3">
                  <div className="relative">
                    <div className="animate-ping absolute h-6 w-6 rounded-full bg-amber-400 opacity-75"></div>
                    <div className="relative h-6 w-6 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <Truck className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-1/3 left-1/2">
                  <div className="relative">
                    <div className="animate-ping absolute h-6 w-6 rounded-full bg-violet-400 opacity-75"></div>
                    <div className="relative h-6 w-6 rounded-full bg-violet-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <Truck className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>

                <div className="absolute top-1/3 right-1/4">
                  <div className="relative">
                    <div className="animate-ping absolute h-6 w-6 rounded-full bg-emerald-400 opacity-75"></div>
                    <div className="relative h-6 w-6 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center">
                      <Truck className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-6 left-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Status Legend
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Pickup</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">In Transit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Arriving</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Time Display */}
                <div className="absolute top-6 right-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg px-4 py-2 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {currentTime.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <PhonePreviewButton />
    </AppLayout>
  );
}
