const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

const FALLBACK_LOCATIONS = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  noida: { lat: 28.5355, lng: 77.3910 },
  gurgaon: { lat: 28.4595, lng: 77.0266 }
};

function geocodeFallback(address) {
  const locationLower = String(address).toLowerCase();
  for (const [key, coords] of Object.entries(FALLBACK_LOCATIONS)) {
    if (locationLower.includes(key)) {
      return { ...coords, address, source: 'fallback' };
    }
  }
  return { lat: 28.6139, lng: 77.2090, address, source: 'fallback-default' };
}

async function geocodeAddress(address) {
  if (!address || !String(address).trim()) {
    throw new Error('Address is required for geocoding');
  }

  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=IN`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.features?.length) {
          const [lng, lat] = data.features[0].center;
          return {
            lat,
            lng,
            address: data.features[0].place_name || address,
            source: 'mapbox'
          };
        }
      } else {
        console.warn('Mapbox forward geocoding HTTP error:', response.status);
      }
    } catch (error) {
      console.warn('Mapbox forward geocoding failed:', error.message);
    }
  }

  return geocodeFallback(address);
}

async function reverseGeocode(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
    throw new Error('Valid latitude and longitude are required');
  }

  if (MAPBOX_TOKEN) {
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${parsedLng},${parsedLat}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        if (data.features?.length) {
          return {
            lat: parsedLat,
            lng: parsedLng,
            address: data.features[0].place_name,
            source: 'mapbox-reverse'
          };
        }
      } else {
        console.warn('Mapbox reverse geocoding HTTP error:', response.status);
      }
    } catch (error) {
      console.warn('Mapbox reverse geocoding failed:', error.message);
    }
  }

  return {
    lat: parsedLat,
    lng: parsedLng,
    address: `${parsedLat.toFixed(4)}, ${parsedLng.toFixed(4)}`,
    source: 'coordinates'
  };
}

async function resolveLocation({ address, coordinates }) {
  if (coordinates?.lat != null && coordinates?.lng != null) {
    const lat = parseFloat(coordinates.lat);
    const lng = parseFloat(coordinates.lng);

    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      if (address && String(address).trim()) {
        return { lat, lng, address: String(address).trim(), source: 'gps' };
      }
      return reverseGeocode(lat, lng);
    }
  }

  return geocodeAddress(address);
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  resolveLocation,
  geocodeFallback
};
