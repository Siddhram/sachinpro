import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import HospitalMap from './components/HospitalMap';
import HospitalList from './components/HospitalList';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [locationAccuracy, setLocationAccuracy] = useState(null);
  const [locationMethod, setLocationMethod] = useState('');

  // Fetch hospitals based on location
  const fetchNearbyHospitals = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      const response = await fetch(`https://sachinpro-1.onrender.com/api/hospitals?lat=${lat}&lng=${lng}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch nearby hospitals");
      }
      
      const data = await response.json();
      
      if (data.status === "REQUEST_DENIED") {
        throw new Error(`Google API error: ${data.error_message}`);
      }
      
      if (!data.results || data.results.length === 0) {
        setHospitals([]);
        setLoading(false);
        return;
      }
      
      setHospitals(data.results.slice(0, 10)); // Increased to top 10 results
      setLoading(false);
    } catch (error) {
      console.error("Hospital fetch error:", error);
      setError(error.message || "Failed to fetch nearby hospitals.");
      setLoading(false);
    }
  }, []);

  // Function to get precise location using Google Maps Geocoding API
  const refinePreciseLocation = useCallback(async (latitude, longitude) => {
    try {
      const response = await fetch(`https://gmaps-igez.onrender.com/api/geocode?latlng=${latitude},${longitude}`);
      
      if (!response.ok) {
        throw new Error('Failed to refine location');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return { 
          lat: location.lat, 
          lng: location.lng, 
          accuracy: 'high',
          method: 'geocode-api'
        };
      }
      
      return { lat: latitude, lng: longitude, accuracy: 'medium', method: 'geolocation-api' };
    } catch (error) {
      console.warn('Location refinement failed:', error);
      return { lat: latitude, lng: longitude, accuracy: 'medium', method: 'geolocation-api' };
    }
  }, []);

  // Get user location with multiple strategies
  const getUserLocation = useCallback(async () => {
    setLocationLoading(true);
    
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError("Google Maps API key is missing. Please check your environment variables.");
      setLocationLoading(false);
      setLoading(false);
      return;
    }
    
    const locationOptions = { 
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0    
    };
    
    try {
      if (navigator.geolocation) {
        const getPositionPromise = new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, locationOptions);
        });
        
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Location request timed out')), 15000);
        });
        
        const position = await Promise.race([getPositionPromise, timeoutPromise]);
        
        const { latitude, longitude } = position.coords;
        
        // Refine location using Google's geocoding for better accuracy
        const refinedLocation = await refinePreciseLocation(latitude, longitude);
        
        setUserLocation({ 
          lat: refinedLocation.lat, 
          lng: refinedLocation.lng 
        });
        setLocationAccuracy(refinedLocation.accuracy);
        setLocationMethod(refinedLocation.method);
        
        await fetchNearbyHospitals(refinedLocation.lat, refinedLocation.lng);
        setLocationLoading(false);
      } else {
        throw new Error("Geolocation is not supported by your browser.");
      }
    } catch (geoError) {
      console.error("Geolocation high-accuracy error:", geoError);

      // Fallback to IP-based geolocation
      try {
        console.log("Falling back to IP-based geolocation...");
        const response = await fetch('https://gmaps-igez.onrender.com/api/ip-location');
        
        if (!response.ok) {
          throw new Error("IP location service failed");
        }
        
        const ipLocation = await response.json();
        
        if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
          setUserLocation({ 
            lat: ipLocation.latitude, 
            lng: ipLocation.longitude 
          });
          setLocationAccuracy('low');
          setLocationMethod('ip-based');
          
          await fetchNearbyHospitals(ipLocation.latitude, ipLocation.longitude);
        } else {
          throw new Error("Could not determine location from IP");
        }
      } catch (ipError) {
        console.error("IP geolocation error:", ipError);
        setError("Unable to determine your location. Please allow location access or enter your location manually.");
      } finally {
        setLocationLoading(false);
      }
    }
  }, [fetchNearbyHospitals, refinePreciseLocation]);

  // Update location manually
  const updateLocationManually = useCallback(async (address) => {
    try {
      setLocationLoading(true);

      // Geocode the address to coordinates
      const response = await fetch(`https://gmaps-igez.onrender.com/api/geocode-address?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error('Failed to geocode address');
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        
        setUserLocation({ 
          lat: location.lat, 
          lng: location.lng 
        });
        setLocationAccuracy('high');
        setLocationMethod('manual-input');
        
        await fetchNearbyHospitals(location.lat, location.lng);
      } else {
        throw new Error('Could not find location from address');
      }
    } catch (error) {
      console.error("Manual location update error:", error);
      setError("Could not find the location you entered. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  }, [fetchNearbyHospitals]);

  // Refresh user's location
  const refreshLocation = () => {
    setError(null);
    getUserLocation();
  };

  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital);
  };

  // Location accuracy banner message
  const getLocationAccuracyMessage = () => {
    if (!locationAccuracy) return null;
    
    switch (locationAccuracy) {
      case 'high':
        return 'Your location is highly accurate';
      case 'medium':
        return 'Your location is moderately accurate';
      case 'low':
        return 'Your location may not be precise';
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>Nearby Hospitals</h1>
        {locationAccuracy && !locationLoading && (
          <div className={`location-accuracy ${locationAccuracy}`}>
            {getLocationAccuracyMessage()}
          </div>
        )}
      </header>
      
      {locationLoading || loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button className="refresh-location-button" onClick={refreshLocation}>
            Retry with Location Services
          </button>
          <div className="location-manual-entry">
            <p>Or enter your location manually:</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const address = e.target.elements.address.value;
              if (address) updateLocationManually(address);
            }}>
              <input 
                type="text" 
                name="address" 
                placeholder="Enter address, city, or postal code"
                className="location-input"
              />
              <button type="submit" className="submit-location-button">
                Search
              </button>
            </form>
          </div>
        </div>
       ) : (
         <div className="main-content">
           <div className="sidebar">
             <div className="location-controls">
               <button className="refresh-location-button" onClick={refreshLocation}>
                 <span className="refresh-icon">↻</span> Refresh My Location
               </button>
               <form onSubmit={(e) => {
                 e.preventDefault();
                 const address = e.target.elements.address.value;
                 if (address) updateLocationManually(address);
               }} className="manual-location-form">
                 <input 
                   type="text" 
                   name="address" 
                   placeholder="Search different location"
                   className="location-input"
                 />
                 <button type="submit" className="mini-submit-button">
                   Go
                 </button>
               </form>
             </div>
             <HospitalList 
               hospitals={hospitals} 
               userLocation={userLocation} 
               selectedHospital={selectedHospital}
               onHospitalSelect={handleHospitalSelect}
             />
           </div>
           <div className="map-section">
             <HospitalMap 
               userLocation={userLocation} 
               hospitals={hospitals} 
               selectedHospital={selectedHospital}
               onLocationUpdate={(newLocation) => {
                 setUserLocation(newLocation);
                 fetchNearbyHospitals(newLocation.lat, newLocation.lng);
               }}
             />
           </div>
         </div>
       )}
     </div>
   );
}

export default App;
