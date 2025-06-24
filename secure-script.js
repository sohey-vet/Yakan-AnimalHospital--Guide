class SecureVetHospitalMap {
    constructor() {
        this.map = null;
        this.currentLocation = null;
        this.markers = [];
        this.domElements = this.initializeDOMElements();
        this.apiBaseUrl = window.location.origin + '/api';
    }

    initializeDOMElements() {
        return {
            currentLocationBtn: document.getElementById('currentLocationBtn'),
            locationNameBtn: document.getElementById('locationNameBtn'),
            locationNameInput: document.getElementById('locationNameInput'),
            locationName: document.getElementById('locationName'),
            searchBtn: document.getElementById('searchBtn'),
            loadingArea: document.getElementById('loadingArea'),
            errorArea: document.getElementById('errorArea'),
            errorMessage: document.getElementById('errorMessage'),
            retryBtn: document.getElementById('retryBtn'),
            resultsArea: document.getElementById('resultsArea'),
            hospitalsList: document.getElementById('hospitalsList'),
            shareBtn: document.getElementById('shareBtn'),
            feedbackBtn: document.getElementById('feedbackBtn')
        };
    }

    async initMap() {
        console.log('Initializing secure map...');
        
        const mapElement = document.getElementById('map');
        if (!mapElement) {
            console.error('Map element not found');
            return;
        }
        
        try {
            // Load Google Maps API through secure proxy
            await this.loadGoogleMapsAPI();
            
            this.map = new google.maps.Map(mapElement, {
                zoom: 12,
                center: { lat: 35.6812, lng: 139.7671 },
                styles: [{
                    featureType: 'poi.business',
                    stylers: [{ visibility: 'off' }]
                }]
            });

            document.getElementById('resultsArea').style.display = 'block';
            console.log('Secure map initialized successfully');
            mapElement.style.border = '2px solid #28a745';
            
        } catch (error) {
            console.error('Map initialization error:', error);
            mapElement.innerHTML = '<div style="text-align:center;padding:50px;color:#dc3545;"><h3>⚠️ 地図初期化エラー</h3><p>' + error.message + '</p></div>';
        }
    }

    async loadGoogleMapsAPI() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.google && window.google.maps) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `${this.apiBaseUrl}/maps/js?libraries=places&callback=initSecureMap`;
            script.async = true;
            script.defer = true;
            
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps API'));
            
            document.head.appendChild(script);
        });
    }

    initializeApp() {
        const elements = this.domElements;
        
        elements.currentLocationBtn.addEventListener('click', () => {
            this.setSearchMethod('current');
        });

        elements.locationNameBtn.addEventListener('click', () => {
            this.setSearchMethod('name');
        });

        elements.searchBtn.addEventListener('click', () => {
            this.performSearch();
        });

        elements.retryBtn.addEventListener('click', () => {
            this.hideError();
            this.performSearch();
        });

        elements.shareBtn.addEventListener('click', () => {
            this.shareToTwitter();
        });

        elements.feedbackBtn.addEventListener('click', () => {
            this.openFeedbackForm();
        });

        elements.locationName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
    }

    setSearchMethod(method) {
        const elements = this.domElements;
        
        if (method === 'current') {
            elements.currentLocationBtn.classList.add('active');
            elements.locationNameBtn.classList.remove('active');
            elements.locationNameInput.style.display = 'none';
        } else {
            elements.currentLocationBtn.classList.remove('active');
            elements.locationNameBtn.classList.add('active');
            elements.locationNameInput.style.display = 'block';
            elements.locationName.focus();
        }
    }

    async performSearch() {
        console.log('performSearch called');
        
        if (!this.map) {
            this.showError('地図が初期化されていません。少し待ってから再試行してください。');
            return;
        }
        
        this.hideResults();
        this.hideError();
        this.showLoading();

        if (this.domElements.currentLocationBtn.classList.contains('active')) {
            await this.searchByCurrentLocation();
        } else {
            await this.searchByLocationName();
        }
    }

    async searchByCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('位置情報がサポートされていません。地名で検索してください。');
            return;
        }

        try {
            const position = await this.getCurrentPosition();
            this.currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            this.map.setCenter(this.currentLocation);
            await this.searchHospitals(this.currentLocation);
        } catch (error) {
            let errorMsg = '位置情報の取得に失敗しました。';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = '位置情報の使用が許可されていません。ブラウザの設定を確認してください。';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = '位置情報が取得できません。地名で検索してください。';
                    break;
                case error.TIMEOUT:
                    errorMsg = '位置情報の取得がタイムアウトしました。もう一度お試しください。';
                    break;
            }
            this.showError(errorMsg);
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            });
        });
    }

    async searchByLocationName() {
        let location = this.domElements.locationName.value.trim();
        if (!location) {
            location = '東京';
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/geocode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ address: location })
            });

            const data = await response.json();
            
            if (data.status === 'OK' && data.results[0]) {
                const result = data.results[0];
                this.currentLocation = {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng
                };
                this.map.setCenter(this.currentLocation);
                await this.searchHospitals(this.currentLocation);
            } else {
                this.showError('指定された地名が見つかりません。別の地名をお試しください。');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            this.showError('地名の検索中にエラーが発生しました。');
        }
    }

    async searchHospitals(location) {
        this.clearMarkers();
        console.log('🏥 Starting secure hospital search for location:', location);

        const searchStrategies = [
            {
                name: 'Primary: Type-based search',
                endpoint: '/places/nearbysearch',
                data: {
                    location: location,
                    radius: 10000,
                    type: 'veterinary_care'
                }
            },
            {
                name: 'Secondary: Keyword search',
                endpoint: '/places/nearbysearch',
                data: {
                    location: location,
                    radius: 10000,
                    keyword: '動物病院'
                }
            },
            {
                name: 'Tertiary: Text search',
                endpoint: '/places/textsearch',
                data: {
                    query: '動物病院 獣医',
                    location: location,
                    radius: 15000
                }
            }
        ];

        for (let i = 0; i < searchStrategies.length; i++) {
            const strategy = searchStrategies[i];
            console.log(`🔍 Trying strategy ${i + 1}: ${strategy.name}`);

            try {
                const response = await fetch(`${this.apiBaseUrl}${strategy.endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(strategy.data)
                });

                const data = await response.json();
                
                if (data.status === 'OK' && data.results && data.results.length > 0) {
                    console.log(`🏥 Found ${data.results.length} results with strategy ${i + 1}`);
                    
                    const filteredResults = data.results.filter(place => {
                        const name = place.name.toLowerCase();
                        return (
                            name.includes('動物') || 
                            name.includes('獣医') || 
                            name.includes('ペット') ||
                            name.includes('アニマル') ||
                            (place.types && (
                                place.types.includes('veterinary_care') ||
                                place.types.includes('hospital')
                            ))
                        );
                    });

                    if (filteredResults.length > 0) {
                        filteredResults.sort((a, b) => {
                            const distanceA = this.calculateDistance(location, a.geometry.location);
                            const distanceB = this.calculateDistance(location, b.geometry.location);
                            return distanceA - distanceB;
                        });

                        await this.displayResults(filteredResults, location);
                        return;
                    }
                }
            } catch (error) {
                console.error(`Strategy ${i + 1} failed:`, error);
            }
        }
        
        this.showError('この周辺には動物病院が見つかりませんでした。検索範囲を広げるか、地域の動物医師会などにご確認ください。');
    }

    async displayResults(places, userLocation) {
        this.hideLoading();
        this.showResults();

        this.domElements.hospitalsList.innerHTML = '';

        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            console.log('Processing place:', place.name, 'PlaceID:', place.place_id);
            
            let finalPlace = { ...place };

            // Get detailed information
            if (place.place_id) {
                try {
                    const response = await fetch(`${this.apiBaseUrl}/places/details/${place.place_id}?fields=name,formatted_phone_number,rating,opening_hours,website,vicinity,geometry`);
                    const data = await response.json();
                    
                    if (data.status === 'OK' && data.result) {
                        finalPlace = {
                            ...place,
                            formatted_phone_number: data.result.formatted_phone_number,
                            rating: data.result.rating,
                            opening_hours: data.result.opening_hours,
                            website: data.result.website
                        };
                        
                        if (data.result.formatted_phone_number) {
                            console.log('✅ Real phone number found:', data.result.formatted_phone_number);
                        } else {
                            finalPlace.formatted_phone_number = `03-123-456${i + 7} (サンプル)`;
                        }
                    } else {
                        finalPlace.formatted_phone_number = `03-123-456${i + 7} (サンプル)`;
                    }
                } catch (error) {
                    console.error('Failed to get place details:', error);
                    finalPlace.formatted_phone_number = `03-123-456${i + 7} (サンプル)`;
                }
            }

            if (this.shouldDisplayHospital(finalPlace)) {
                const hospitalCard = this.createHospitalCard(finalPlace, userLocation);
                this.domElements.hospitalsList.appendChild(hospitalCard);
                
                // Add marker
                this.addMapMarker(finalPlace, i);
            }
        }

        // Adjust map bounds
        if (this.markers.length > 0) {
            const bounds = new google.maps.LatLngBounds();
            bounds.extend(userLocation);
            this.markers.forEach(marker => bounds.extend(marker.getPosition()));
            this.map.fitBounds(bounds);
        }
    }

    addMapMarker(place, index) {
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: this.map,
            title: place.name,
            icon: {
                url: 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="30" viewBox="0 0 60 30">
                        <line x1="3" y1="0" x2="3" y2="30" stroke="#666" stroke-width="2"/>
                        <path d="M3 3 L48 3 L52 12 L48 21 L3 21 Z" fill="#dc3545" stroke="white" stroke-width="1"/>
                        <rect x="8" y="8" width="5" height="1.5" fill="white"/>
                        <rect x="9.5" y="6.5" width="1.5" height="5" fill="white"/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(60, 30),
                anchor: new google.maps.Point(3, 30)
            }
        });

        const shortName = place.name.length > 6 ? place.name.substring(0, 6) + '..' : place.name;
        const infoLabel = new google.maps.InfoWindow({
            content: `<div style="font-size: 10px; font-weight: bold; color: #333; background: rgba(255,255,255,0.95); padding: 1px 4px; border-radius: 3px; border: 1px solid #ccc; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${shortName}</div>`,
            position: place.geometry.location,
            disableAutoPan: true,
            pixelOffset: new google.maps.Size(30, -8)
        });
        infoLabel.open(this.map);

        this.markers.push(marker);

        marker.addListener('click', () => {
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style="max-width: 200px;">
                        <h3 style="margin: 0 0 8px 0; font-size: 16px;">${place.name}</h3>
                        <p style="margin: 0; font-size: 14px; color: #666;">${place.vicinity}</p>
                    </div>
                `
            });
            infoWindow.open(this.map, marker);
        });
    }

    createHospitalCard(place, userLocation) {
        const distance = this.calculateDistance(userLocation, place.geometry.location);
        const distanceText = distance < 1 ? `約${Math.round(distance * 1000)}m` : `約${distance.toFixed(1)}km`;

        const card = document.createElement('div');
        card.className = 'hospital-card';
        
        card.innerHTML = `
            <div class="hospital-name">${place.name}</div>
            <div class="hospital-distance">${distanceText}</div>
            <div class="hospital-address">${place.vicinity}</div>
            ${place.rating ? `<div class="hospital-rating">⭐ ${place.rating} / 5.0</div>` : ''}
            <div class="hospital-phone">
                <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="phone-link">
                    📞 ${place.formatted_phone_number || '03-1234-5678 (サンプル)'}
                </a>
            </div>
            <div class="hospital-actions">
                <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="hospital-action-btn phone-btn">
                    📞 電話をかける
                </a>
                <button class="hospital-action-btn map-btn" onclick="openInMaps(${place.geometry.location.lat}, ${place.geometry.location.lng}, '${encodeURIComponent(place.name)}')">
                    🗺️ 地図アプリで開く
                </button>
            </div>
        `;

        return card;
    }

    calculateDistance(pos1, pos2) {
        const lat1 = pos1.lat;
        const lng1 = pos1.lng;
        const lat2 = pos2.lat;
        const lng2 = pos2.lng;

        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    shouldDisplayHospital(place) {
        if (!place.opening_hours) {
            return true;
        }
        
        let isOpen = false;
        if (place.opening_hours.isOpen && typeof place.opening_hours.isOpen === 'function') {
            isOpen = place.opening_hours.isOpen();
        } else if (place.opening_hours.open_now !== undefined) {
            isOpen = place.opening_hours.open_now;
        } else {
            return true;
        }
        
        return isOpen;
    }

    clearMarkers() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
    }

    showLoading() {
        this.domElements.loadingArea.style.display = 'block';
    }

    hideLoading() {
        this.domElements.loadingArea.style.display = 'none';
    }

    showError(message) {
        this.hideLoading();
        this.domElements.errorMessage.textContent = message;
        this.domElements.errorArea.style.display = 'block';
    }

    hideError() {
        this.domElements.errorArea.style.display = 'none';
    }

    showResults() {
        this.domElements.resultsArea.style.display = 'block';
    }

    hideResults() {
        this.domElements.resultsArea.style.display = 'none';
    }

    shareToTwitter() {
        const text = '夜間救急どうぶつ病院マップで緊急時の動物病院を検索しました！';
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        window.open(twitterUrl, '_blank');
    }

    openFeedbackForm() {
        alert('ご意見・ご感想をお聞かせください。\\n\\n情報が古い場合や改善点がございましたら、お知らせください。');
    }
}

// Global variables and functions
let secureVetMapInstance = null;

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    secureVetMapInstance = new SecureVetHospitalMap();
    secureVetMapInstance.initializeApp();
    
    // Auto-initialize map when ready
    secureVetMapInstance.initMap();
});

// Global callback for Google Maps API
function initSecureMap() {
    console.log('Google Maps API loaded via secure proxy');
    if (secureVetMapInstance) {
        // API is loaded, map initialization will continue
    }
}

// Utility functions
function openInMaps(lat, lng, name) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
        window.open(`maps://maps.google.com/maps?daddr=${lat},${lng}&amp;ll=`);
    } else if (isAndroid) {
        window.open(`geo:${lat},${lng}?q=${lat},${lng}(${name})`);
    } else {
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
}

// Make functions globally available
window.initSecureMap = initSecureMap;
window.openInMaps = openInMaps;