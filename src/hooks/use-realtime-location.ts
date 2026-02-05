"use client";

import { useEffect, useCallback, useRef } from "react";
import { ref, onValue, set, off, DataSnapshot } from "firebase/database";
import { realtimeDb } from "@/lib/firebase";
import { useTrackingStore } from "@/stores";
import type { DriverLocation } from "@/types";

const DRIVERS_PATH = "drivers";
const UPDATE_INTERVAL = 5000; // 5 seconds

export function useRealtimeLocation(userId?: string) {
  const {
    drivers,
    selectedDriver,
    isTracking,
    updateDriver,
    selectDriver,
    setTracking,
    clearDrivers,
  } = useTrackingStore();

  const watchId = useRef<number | null>(null);

  // Subscribe to all drivers' locations
  useEffect(() => {
    const driversRef = ref(realtimeDb, DRIVERS_PATH);

    const handleValue = (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([id, location]) => {
          updateDriver(id, location as DriverLocation);
        });
      }
    };

    onValue(driversRef, handleValue);

    return () => {
      off(driversRef);
    };
  }, [updateDriver]);

  // Start tracking current user's location
  const startTracking = useCallback(() => {
    if (!userId || !navigator.geolocation) {
      console.error("Geolocation not available");
      return;
    }

    setTracking(true);

    const updateLocation = (position: GeolocationPosition) => {
      const location: DriverLocation = {
        id: userId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: position.coords.speed || undefined,
        heading: position.coords.heading || undefined,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        status: "online",
      };

      // Update in Firebase Realtime Database
      const driverRef = ref(realtimeDb, `${DRIVERS_PATH}/${userId}`);
      set(driverRef, location);

      // Update local store
      updateDriver(userId, location);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error("Geolocation error:", error);
      // Update status to offline on error
      const driverRef = ref(realtimeDb, `${DRIVERS_PATH}/${userId}`);
      set(driverRef, {
        id: userId,
        lat: 0,
        lng: 0,
        timestamp: Date.now(),
        status: "offline",
      });
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Watch position changes
    watchId.current = navigator.geolocation.watchPosition(
      updateLocation,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: UPDATE_INTERVAL,
      }
    );
  }, [userId, setTracking, updateDriver]);

  // Stop tracking
  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setTracking(false);

    // Set status to offline in Firebase
    if (userId) {
      const driverRef = ref(realtimeDb, `${DRIVERS_PATH}/${userId}`);
      set(driverRef, {
        id: userId,
        lat: 0,
        lng: 0,
        timestamp: Date.now(),
        status: "offline",
      });
    }
  }, [userId, setTracking]);

  // Set driver status
  const setDriverStatus = useCallback(
    (status: DriverLocation["status"]) => {
      if (!userId) return;

      const currentLocation = drivers[userId];
      if (currentLocation) {
        const updatedLocation = { ...currentLocation, status };
        const driverRef = ref(realtimeDb, `${DRIVERS_PATH}/${userId}`);
        set(driverRef, updatedLocation);
        updateDriver(userId, updatedLocation);
      }
    },
    [userId, drivers, updateDriver]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return {
    drivers: Object.values(drivers),
    selectedDriver,
    isTracking,
    startTracking,
    stopTracking,
    selectDriver,
    setDriverStatus,
    clearDrivers,
  };
}

// Hook for getting distance between two points
export function useDistance(
  point1?: { lat: number; lng: number },
  point2?: { lat: number; lng: number }
): number | null {
  if (!point1 || !point2) return null;

  // Haversine formula
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) *
      Math.cos(toRad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Hook for estimating arrival time
export function useEstimatedArrival(
  distanceKm: number | null,
  speedKmh: number = 30
): number | null {
  if (distanceKm === null) return null;
  return Math.round((distanceKm / speedKmh) * 60); // Minutes
}
