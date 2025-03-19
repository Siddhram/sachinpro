const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

console.log('Environment variables:', {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY ? 'Set (length: ' + process.env.GOOGLE_MAPS_API_KEY.length + ')' : 'Missing',
    PORT: process.env.PORT
  });

// Endpoint to fetch nearby hospitals
app.get('/api/hospitals', async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }
      
      const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      
      if (!API_KEY) {
        return res.status(500).json({ error: 'Google Maps API key is not configured' });
      }
      
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json`,
        {
          params: {
            location: `${lat},${lng}`,
            radius: 5000, // 5km radius
            type: 'hospital',
            key: API_KEY
          }
        }
      );
      
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching nearby hospitals:', error.message);
      res.status(500).json({ error: 'Failed to fetch nearby hospitals' });
    }
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API key status: ${process.env.GOOGLE_MAPS_API_KEY ? 'Configured' : 'Missing'}`);
});