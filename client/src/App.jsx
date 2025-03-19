import React, { useState, useEffect } from 'react';
import './App.css';
import HospitalMap from './components/HospitalMap';
import HospitalList from './components/HospitalList';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [userLocation, setUserLocation] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  
  useEffect(() => {
    // Check if Google Maps API key is available
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      setError("Google Maps API key is missing. Please check your environment variables.");
      setLoading(false);
      return;
    }
    
    // Get user's current location with high accuracy
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Location obtained:", latitude, longitude);
          setUserLocation({ lat: latitude, lng: longitude });
          fetchNearbyHospitals(latitude, longitude);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setError("Unable to access your location. Please enable location services.");
          setLoading(false);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
    }
  }, []);
  
  const fetchNearbyHospitals = async (lat, lng) => {
    try {
      // In development, this uses the Vite proxy configured in vite.config.js
      const response = await fetch(`/api/hospitals?lat=${lat}&lng=${lng}`);
      
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
      
      setHospitals(data.results.slice(0, 5)); // Get the top 5 results
      setLoading(false);
    } catch (error) {
      console.error("Hospital fetch error:", error);
      setError(error.message || "Failed to fetch nearby hospitals.");
      setLoading(false);
    }
  };

  const handleHospitalSelect = (hospital) => {
    setSelectedHospital(hospital);
  };

  return (
    <div className="app-container">
      <header>
        <h1>Nearby Hospitals</h1>
      </header>
      
      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="main-content">
          <div className="sidebar">
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
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;