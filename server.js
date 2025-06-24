const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://maps.gstatic.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://streetviewpixels-pa.googleapis.com"],
            connectSrc: ["'self'", "https://maps.googleapis.com"],
            frameSrc: ["'none'"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// Serve static files from root directory for development
app.use(express.static('./', {
    index: false,
    setHeaders: (res, path) => {
        // Don't serve sensitive files
        if (path.includes('.env') || path.includes('server.js') || path.includes('node_modules')) {
            res.status(403).end();
            return;
        }
    }
}));

// Google Maps API Proxy Endpoints
app.get('/api/maps/js', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const libraries = req.query.libraries || 'places';
        const callback = req.query.callback || 'initMap';
        
        const fetch = (await import('node-fetch')).default;
        const apiUrl = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=${libraries}&callback=${callback}`;
        
        const response = await fetch(apiUrl);
        const jsContent = await response.text();
        
        res.set('Content-Type', 'application/javascript');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(jsContent);
        
    } catch (error) {
        console.error('Maps JS API Error:', error);
        res.status(500).json({ error: 'Failed to load Maps API' });
    }
});

// Places API Proxy
app.post('/api/places/nearbysearch', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { location, radius, type, keyword } = req.body;
        
        // Input validation
        if (!location || !location.lat || !location.lng) {
            return res.status(400).json({ error: 'Invalid location' });
        }

        const fetch = (await import('node-fetch')).default;
        let apiUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?key=${apiKey}&location=${location.lat},${location.lng}&radius=${radius || 10000}`;
        
        if (type) apiUrl += `&type=${type}`;
        if (keyword) apiUrl += `&keyword=${encodeURIComponent(keyword)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Places API Error:', error);
        res.status(500).json({ error: 'Failed to search places' });
    }
});

// Places Text Search API Proxy
app.post('/api/places/textsearch', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { query, location, radius } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        const fetch = (await import('node-fetch')).default;
        let apiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${apiKey}&query=${encodeURIComponent(query)}`;
        
        if (location && location.lat && location.lng) {
            apiUrl += `&location=${location.lat},${location.lng}`;
        }
        if (radius) {
            apiUrl += `&radius=${radius}`;
        }
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Places Text Search API Error:', error);
        res.status(500).json({ error: 'Failed to search places' });
    }
});

// Place Details API Proxy
app.get('/api/places/details/:placeId', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { placeId } = req.params;
        const fields = req.query.fields || 'name,formatted_phone_number,rating,opening_hours,website,vicinity,geometry';
        
        const fetch = (await import('node-fetch')).default;
        const apiUrl = `https://maps.googleapis.com/maps/api/place/details/json?key=${apiKey}&place_id=${placeId}&fields=${fields}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Place Details API Error:', error);
        res.status(500).json({ error: 'Failed to get place details' });
    }
});

// Geocoding API Proxy
app.post('/api/geocode', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        const fetch = (await import('node-fetch')).default;
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${apiKey}&address=${encodeURIComponent(address)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        res.json(data);
        
    } catch (error) {
        console.error('Geocoding API Error:', error);
        res.status(500).json({ error: 'Failed to geocode address' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV 
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
    console.log(`🚀 Secure vet hospital map server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔒 API key configured: ${process.env.GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'}`);
});

module.exports = app;