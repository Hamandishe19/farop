"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Crosshair, Loader2, MapPin, X } from "lucide-react";
import { mapsUrl, type MapLocation } from "@/lib/whatsapp";

/** Map opens here when the customer has not set a pin yet (central Harare). */
const DEFAULT_CENTRE: MapLocation = { lat: -17.8292, lng: 31.0522 };

const pinIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.4 12 30 12 30s12-9.6 12-18.3C24 5.2 18.6 0 12 0z" fill="#5b6b54"/><circle cx="12" cy="11.5" r="4.5" fill="#fbf8f3"/></svg>`;

/**
 * Optional delivery pin for an order. The customer can use their current
 * location or tap / drag a pin on an OpenStreetMap map. Leaflet and the map
 * tiles only load once the map is opened.
 */
export function LocationPicker({
  value,
  onChange,
}: {
  value?: MapLocation;
  onChange: (location: MapLocation | undefined) => void;
}) {
  const [mapOpen, setMapOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string>();

  function locateCustomer() {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser can't share your location. Choose the spot on the map instead.");
      setMapOpen(true);
      return;
    }
    setLocating(true);
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        onChange({ lat: position.coords.latitude, lng: position.coords.longitude });
        setMapOpen(true);
      },
      (error) => {
        setLocating(false);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? "Location access was blocked. Choose the spot on the map instead, or allow location access in your browser settings."
            : "We couldn't find your location. Choose the spot on the map instead.",
        );
        setMapOpen(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div>
      <p className="mb-1.5 text-sm text-charcoal">
        Delivery location on map <span className="text-muted">(optional)</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={locateCustomer}
          disabled={locating}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm text-charcoal transition-colors hover:border-brown/40 disabled:opacity-60"
        >
          {locating ? <Loader2 size={15} aria-hidden="true" className="animate-spin" /> : <Crosshair size={15} aria-hidden="true" />}
          {locating ? "Finding you…" : "Use my current location"}
        </button>
        {!mapOpen && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm text-charcoal transition-colors hover:border-brown/40"
          >
            <MapPin size={15} aria-hidden="true" />
            Choose on map
          </button>
        )}
      </div>

      {geoError && <p className="mt-2 text-xs text-danger">{geoError}</p>}

      {mapOpen && (
        <div className="mt-3">
          <LeafletPicker value={value} onChange={onChange} />
          <p className="mt-1.5 text-xs text-muted">Tap the map or drag the pin to your delivery spot.</p>
        </div>
      )}

      {value && (
        <p role="status" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-charcoal">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} aria-hidden="true" className="text-sage-deep" />
            Pin set
          </span>
          <a href={mapsUrl(value)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-brown">
            Check on Google Maps
          </a>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="inline-flex items-center gap-0.5 text-muted hover:text-danger"
          >
            <X size={13} aria-hidden="true" />
            Remove pin
          </button>
        </p>
      )}
    </div>
  );
}

function LeafletPicker({
  value,
  onChange,
}: {
  value?: MapLocation;
  onChange: (location: MapLocation) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const placeRef = useRef<(location: MapLocation) => void>(() => {});
  const onChangeRef = useRef(onChange);
  const initialRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Create the map once; Leaflet needs `window`, so it is imported here.
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((module) => {
      const L = module.default ?? module;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = initialRef.current ?? DEFAULT_CENTRE;
      const map = L.map(containerRef.current, { scrollWheelZoom: false }).setView(
        [start.lat, start.lng],
        initialRef.current ? 17 : 12,
      );
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const icon = L.divIcon({ html: pinIcon, className: "", iconSize: [32, 40], iconAnchor: [16, 40] });
      placeRef.current = (location) => {
        if (markerRef.current) {
          markerRef.current.setLatLng([location.lat, location.lng]);
          return;
        }
        const marker = L.marker([location.lat, location.lng], { draggable: true, icon, keyboard: true, title: "Delivery location" }).addTo(map);
        marker.on("dragend", () => {
          const { lat, lng } = marker.getLatLng();
          onChangeRef.current({ lat, lng });
        });
        markerRef.current = marker;
      };

      if (initialRef.current) placeRef.current(initialRef.current);
      map.on("click", (event) => onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng }));
      mapRef.current = map;
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Keep the pin in sync with the chosen location (e.g. after "Use my current location").
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    placeRef.current(value);
    if (!map.getBounds().contains([value.lat, value.lng])) map.setView([value.lat, value.lng], 17);
  }, [value]);

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label="Map for choosing your delivery location"
      className="relative z-0 h-64 w-full overflow-hidden rounded-lg border border-line bg-cream"
    />
  );
}
