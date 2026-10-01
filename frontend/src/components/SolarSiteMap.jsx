import React, { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Crosshair, Compass } from 'lucide-react';

export default function SolarSiteMap({ customer }) {
  const [mapType, setMapType] = useState('street'); // 'street' or 'satellite'

  // Extract address details
  const addressQuery = customer?.installationAddress || customer?.address || `${customer?.city || ''}, ${customer?.district || ''}, Tamil Nadu, India`;
  const customerName = customer?.fullName || 'Customer';
  const customerId = customer?.customerId || 'N/A';

  // Check if explicit latitude & longitude are available
  const hasCoords = customer?.latitude && customer?.longitude;
  const lat = customer?.latitude || 11.1271; // Default Tamil Nadu center
  const lng = customer?.longitude || 78.6569;

  // Google Maps turn-by-turn driving directions URL
  const googleMapsNavUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressQuery)}`;

  // Google Maps search/view URL
  const googleMapsViewUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;

  // OpenStreetMap embedded iframe URL (100% Free, no API key needed)
  const osmEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(addressQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  return (
    <div className="glass-premium rounded-3xl p-6 shadow-sm space-y-4 overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Solar Rooftop Site & GPS Navigation</h3>
            <p className="text-[11px] text-slate-500">Live geolocation of installation roof for site visits</p>
          </div>
        </div>

        {/* Action Button: Open Turn-by-Turn GPS Navigation */}
        <div className="flex items-center gap-2">
          <a
            href={googleMapsNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all"
            title="Open Turn-by-Turn GPS Driving Directions in Google Maps"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Start GPS Navigation</span>
          </a>
          <a
            href={googleMapsViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            title="View on Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* MAP VIEWER CONTAINER */}
      <div className="relative w-full h-64 sm:h-72 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-900">
        <iframe
          title={`Solar Installation Site - ${customerName}`}
          src={osmEmbedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          allowFullScreen
        ></iframe>

        {/* Floating Location Badge */}
        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs shadow-lg max-w-[80%]">
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 flex-shrink-0" />
            <span className="font-bold text-slate-800 dark:text-white truncate">
              {customer?.installationAddress || customer?.address || 'Site Address'}
            </span>
          </div>
          {hasCoords && (
            <p className="text-[10px] text-slate-500 font-mono mt-0.5 ml-5">
              Lat: {Number(lat).toFixed(4)}, Lng: {Number(lng).toFixed(4)}
            </p>
          )}
        </div>
      </div>

      {/* FOOTER METADATA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
        <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
          <span className="text-[10px] uppercase font-bold text-slate-400">Installation Address</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate" title={customer?.installationAddress || customer?.address}>
            {customer?.installationAddress || customer?.address || '—'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
          <span className="text-[10px] uppercase font-bold text-slate-400">District & State</span>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
            {customer?.district || customer?.city || 'Tamil Nadu'}, {customer?.state || 'TN'}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
          <span className="text-[10px] uppercase font-bold text-slate-400">GPS Site Status</span>
          <div className="flex items-center space-x-1.5 mt-0.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Rooftop Geocoded</span>
          </div>
        </div>
      </div>

    </div>
  );
}
