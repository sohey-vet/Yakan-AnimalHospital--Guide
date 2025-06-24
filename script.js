class VetHospitalMap {
    constructor() {
        this.map = null;
        this.service = null;
        this.infoWindow = null;
        this.currentLocation = null;
        this.markers = [];
        this.domElements = this.initializeDOMElements();
        this.searchStrategies = this.initializeSearchStrategies();
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

    initializeSearchStrategies() {
        return [
            {
                name: 'Primary: Type-based search',
                getRequest: (location) => ({
                    location: location,
                    radius: 10000,
                    type: 'veterinary_care'
                })
            },
            {
                name: 'Secondary: Keyword search',
                getRequest: (location) => ({
                    location: location,
                    radius: 10000,
                    keyword: '動物病院'
                })
            },
            {
                name: 'Tertiary: Text search',
                getRequest: (location) => ({
                    location: location,
                    radius: 15000,
                    query: '動物病院 獣医'
                })
            }
        ];
    }
}

let vetMapInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    vetMapInstance = new VetHospitalMap();
    vetMapInstance.initializeApp();
});

VetHospitalMap.prototype.initMap = function() {
    console.log('initMap called - Google Maps API loaded');
    
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }
    
    try {
        this.map = new google.maps.Map(mapElement, {
            zoom: 12,
            center: { lat: 35.6812, lng: 139.7671 },
            styles: [{
                featureType: 'poi.business',
                stylers: [{ visibility: 'off' }]
            }]
        });

        document.getElementById('resultsArea').style.display = 'block';
        this.service = new google.maps.places.PlacesService(this.map);
        this.infoWindow = new google.maps.InfoWindow();
        
        console.log('Map initialized successfully');
        mapElement.style.border = '2px solid #28a745';
        
    } catch (error) {
        console.error('Map initialization error:', error);
        mapElement.innerHTML = '<div style="text-align:center;padding:50px;color:#dc3545;"><h3>⚠️ 地図初期化エラー</h3><p>' + error.message + '</p></div>';
    }
};

window.initMap = function() {
    if (vetMapInstance) {
        vetMapInstance.initMap();
    }
};

VetHospitalMap.prototype.initializeApp = function() {
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
};

VetHospitalMap.prototype.setSearchMethod = function(method) {
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
};

VetHospitalMap.prototype.performSearch = function() {
    console.log('performSearch called');
    
    if (!window.google || !window.google.maps) {
        this.showError('Google Maps APIが読み込まれていません。ページを再読み込みしてください。');
        return;
    }
    
    if (!this.map) {
        this.showError('地図が初期化されていません。少し待ってから再試行してください。');
        return;
    }
    
    this.hideResults();
    this.hideError();
    this.showLoading();

    if (this.domElements.currentLocationBtn.classList.contains('active')) {
        this.searchByCurrentLocation();
    } else {
        this.searchByLocationName();
    }
};

/**
 * Search for hospitals using device's current location
 * Uses geolocation API to get coordinates and search nearby hospitals
 */
function searchByCurrentLocation() {
    if (!navigator.geolocation) {
        showError('位置情報がサポートされていません。地名で検索してください。');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            map.setCenter(currentLocation);
            searchHospitals(currentLocation);
        },
        function(error) {
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
            showError(errorMsg);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

/**
 * Search for hospitals by location name
 * Uses geocoding to convert location name to coordinates
 */
function searchByLocationName() {
    let location = locationName.value.trim();
    if (!location) {
        location = '東京'; // Default to Tokyo if no input
    }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location }, function(results, status) {
        if (status === 'OK' && results[0]) {
            currentLocation = results[0].geometry.location;
            map.setCenter(currentLocation);
            searchHospitals(currentLocation);
        } else {
            showError('指定された地名が見つかりません。別の地名をお試しください。');
        }
    });
}

/**
 * Search for hospitals using Google Places API
 * @param {google.maps.LatLng|Object} location - Search center location
 */
function searchHospitals(location) {
    clearMarkers();
    console.log('🏥 Starting hospital search for location:', location);

    // Try multiple search strategies
    const searchStrategies = [
        {
            name: 'Primary: Type-based search',
            request: {
                location: location,
                radius: 10000,
                type: 'veterinary_care'
            }
        },
        {
            name: 'Secondary: Keyword search',
            request: {
                location: location,
                radius: 10000,
                keyword: '動物病院'
            }
        },
        {
            name: 'Tertiary: Text search',
            request: {
                location: location,
                radius: 15000,
                query: '動物病院 獣医'
            }
        }
    ];

    let searchIndex = 0;

    function tryNextSearch() {
        if (searchIndex >= searchStrategies.length) {
            showError('この周辺には動物病院が見つかりませんでした。検索範囲を広げるか、地域の動物医師会などにご確認ください。');
            return;
        }

        const strategy = searchStrategies[searchIndex];
        console.log(`🔍 Trying strategy ${searchIndex + 1}: ${strategy.name}`);
        console.log('🔍 Search request:', strategy.request);

        // Use textSearch for query-based searches, nearbySearch for others
        const searchMethod = strategy.request.query ? 'textSearch' : 'nearbySearch';
        
        service[searchMethod](strategy.request, function(results, status) {
            console.log(`🔍 Strategy ${searchIndex + 1} results:`, status, results?.length || 0, 'results');
            
            if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                // Log first few results to see what data we have
                console.log('🏥 Found hospitals:');
                results.slice(0, 5).forEach((place, idx) => {
                    console.log(`  ${idx + 1}. ${place.name}`);
                    console.log(`     Rating: ${place.rating || 'N/A'}`);
                    console.log(`     Types: ${place.types?.join(', ') || 'N/A'}`);
                    console.log(`     Place ID: ${place.place_id}`);
                });
                
                // Filter results to ensure they're actually veterinary related
                const filteredResults = results.filter(place => {
                    const name = place.name.toLowerCase();
                    const types = place.types || [];
                    return (
                        name.includes('動物') || 
                        name.includes('獣医') || 
                        name.includes('ペット') ||
                        name.includes('アニマル') ||
                        types.includes('veterinary_care') ||
                        types.includes('hospital')
                    );
                });

                console.log(`🏥 Filtered to ${filteredResults.length} veterinary-related results`);

                if (filteredResults.length > 0) {
                    // Sort by distance
                    filteredResults.sort((a, b) => {
                        const distanceA = calculateDistance(location, a.geometry.location);
                        const distanceB = calculateDistance(location, b.geometry.location);
                        return distanceA - distanceB;
                    });

                    displayResults(filteredResults, location);
                    return;
                }
            }
            
            // Try next strategy
            searchIndex++;
            tryNextSearch();
        });
    }

    tryNextSearch();
}

/**
 * Display search results on map and in list
 * @param {Array} places - Array of place objects from Places API
 * @param {google.maps.LatLng|Object} userLocation - User's location
 */
function displayResults(places, userLocation) {
    hideLoading();
    showResults();

    // Clear previous results
    hospitalsList.innerHTML = '';

    // Add markers and create hospital cards
    places.forEach((place, index) => {
        console.log('Processing place:', place.name, 'PlaceID:', place.place_id);
        
        // Always try to get detailed information first
        if (place.place_id) {
            const request = {
                placeId: place.place_id,
                fields: ['name', 'formatted_phone_number', 'international_phone_number', 'rating', 'opening_hours', 'website', 'vicinity', 'geometry']
            };

            service.getDetails(request, (placeDetails, status) => {
                console.log('📞 getDetails result for', place.name, ':', status);
                if (placeDetails) {
                    console.log('📞 Full place details:', placeDetails);
                    console.log('📞 Available fields:', Object.keys(placeDetails));
                    console.log('📞 formatted_phone_number:', placeDetails.formatted_phone_number);
                    console.log('📞 international_phone_number:', placeDetails.international_phone_number);
                }
                
                let finalPlace;
                if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                    // Try multiple phone number fields
                    const phoneNumber = placeDetails.formatted_phone_number || 
                                      placeDetails.international_phone_number;
                    
                    finalPlace = {
                        ...place,
                        formatted_phone_number: phoneNumber,
                        rating: placeDetails.rating,
                        opening_hours: placeDetails.opening_hours,
                        website: placeDetails.website
                    };
                    
                    if (phoneNumber) {
                        console.log('✅ Real phone number found:', phoneNumber);
                    } else {
                        console.log('❌ No phone number fields available in API response');
                        console.log('📞 All available fields:', Object.keys(placeDetails));
                        // Use sample only if no real number
                        finalPlace.formatted_phone_number = `03-123-456${index + 7} (サンプル)`;
                    }
                } else {
                    console.log('❌ getDetails failed, status:', status);
                    // Log more detailed error information
                    const statusMessages = {
                        'INVALID_REQUEST': 'Invalid request - check place_id and fields',
                        'OVER_QUERY_LIMIT': 'API quota exceeded - check billing',
                        'REQUEST_DENIED': 'Request denied - check API key permissions',
                        'UNKNOWN_ERROR': 'Unknown error occurred',
                        'ZERO_RESULTS': 'No results found for this place_id',
                        'NOT_FOUND': 'Place not found'
                    };
                    console.log('❌ Status details:', statusMessages[status] || status);
                    
                    // Fallback to basic data with sample phone
                    finalPlace = {
                        ...place,
                        formatted_phone_number: `03-123-456${index + 7} (サンプル)`
                    };
                }

                // 営業時間チェック: open_now=falseの病院は非表示
                if (shouldDisplayHospital(finalPlace)) {
                    const hospitalCard = createHospitalCard(finalPlace, userLocation);
                    hospitalsList.appendChild(hospitalCard);
                    console.log('📞 Card created for:', finalPlace.name, 'Phone:', finalPlace.formatted_phone_number);
                } else {
                    console.log('🔴 Hospital closed, not displaying:', finalPlace.name);
                    return; // 営業時間外の病院はマーカーも作成しない
                }
            });
        } else {
            console.log('❌ No place_id for:', place.name);
            // No place_id, use sample data
            const fallbackPlace = {
                ...place,
                formatted_phone_number: `03-123-456${index + 7} (サンプル)`
            };
            
            // 営業時間チェック: open_now=falseの病院は非表示
            if (shouldDisplayHospital(fallbackPlace)) {
                const hospitalCard = createHospitalCard(fallbackPlace, userLocation);
                hospitalsList.appendChild(hospitalCard);
            } else {
                console.log('🔴 Hospital closed, not displaying:', fallbackPlace.name);
                return; // 営業時間外の病院はマーカーも作成しない
            }
        }

        // 営業時間チェック: 表示対象の病院のみマーカーを作成
        if (!shouldDisplayHospital(place)) {
            return; // 営業時間外の病院はマーカーを作成しない
        }

        // Add marker to map with mobile-optimized flag icon
        const marker = new google.maps.Marker({
            position: place.geometry.location,
            map: map,
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

        // Add hospital name label for mobile - only show short name
        const shortName = place.name.length > 6 ? place.name.substring(0, 6) + '..' : place.name;
        const infoLabel = new google.maps.InfoWindow({
            content: `<div style="font-size: 10px; font-weight: bold; color: #333; background: rgba(255,255,255,0.95); padding: 1px 4px; border-radius: 3px; border: 1px solid #ccc; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${shortName}</div>`,
            position: place.geometry.location,
            disableAutoPan: true,
            pixelOffset: new google.maps.Size(30, -8)
        });
        infoLabel.open(map);

        // Store hospital info for use in click handler
        marker.hospitalInfo = {
            name: place.name,
            vicinity: place.vicinity || place.formatted_address || ''
        };

        markers.push(marker);

        // Add click listener for marker
        marker.addListener('click', function() {
            infoWindow.setContent(`
                <div style="max-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px;">${place.name}</h3>
                    <p style="margin: 0; font-size: 14px; color: #666;">${place.vicinity}</p>
                </div>
            `);
            infoWindow.open(map, marker);
        });
    });

    // Adjust map bounds to show all markers
    if (markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userLocation);
        markers.forEach(marker => bounds.extend(marker.getPosition()));
        map.fitBounds(bounds);
    }
}

/**
 * Create hospital card element for display
 * @param {Object} place - Place object from Places API
 * @param {google.maps.LatLng|Object} userLocation - User's location
 * @return {HTMLElement} Hospital card element
 */
function createHospitalCard(place, userLocation) {
    const distance = calculateDistance(userLocation, place.geometry.location);
    const distanceText = distance < 1 ? `約${Math.round(distance * 1000)}m` : `約${distance.toFixed(1)}km`;

    const card = document.createElement('div');
    card.className = 'hospital-card';
    
    // 営業時間の表示は削除
    
    card.innerHTML = `
        <div class="hospital-name">${place.name}</div>
        <div class="hospital-distance">${distanceText}</div>
        <div class="hospital-address">${place.vicinity}</div>
        ${place.rating ? `<div class="hospital-rating">⭐ ${place.rating} / 5.0</div>` : ''}
        <div class="hospital-phone">
            <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="phone-link">
                📞 ${place.formatted_phone_number || `03-123-456${index + 7} (サンプル)`}
            </a>
        </div>
        <div class="hospital-actions">
            <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="hospital-action-btn phone-btn">
                📞 電話をかける
            </a>
            <button class="hospital-action-btn map-btn" onclick="openInMaps(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${encodeURIComponent(place.name)}')">
                🗺️ 地図アプリで開く
            </button>
        </div>
    `;

    return card;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} pos1 - First position with lat/lng
 * @param {Object} pos2 - Second position with lat/lng
 * @return {number} Distance in kilometers
 */
function calculateDistance(pos1, pos2) {
    const lat1 = typeof pos1.lat === 'function' ? pos1.lat() : pos1.lat;
    const lng1 = typeof pos1.lng === 'function' ? pos1.lng() : pos1.lng;
    const lat2 = typeof pos2.lat === 'function' ? pos2.lat() : pos2.lat;
    const lng2 = typeof pos2.lng === 'function' ? pos2.lng() : pos2.lng;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

/**
 * Initiate phone call to hospital
 * @param {string} phoneNumber - Hospital phone number
 */
function callHospital(phoneNumber) {
    window.location.href = `tel:${phoneNumber}`;
}

/**
 * Open location in device's maps app
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} name - Location name
 */
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

/**
 * Clear all markers from the map
 */
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

/**
 * Show loading indicator
 */
function showLoading() {
    loadingArea.style.display = 'block';
}

/**
 * Hide loading indicator
 */
function hideLoading() {
    loadingArea.style.display = 'none';
}

/**
 * Show error message to user
 * @param {string} message - Error message to display
 */
function showError(message) {
    hideLoading();
    errorMessage.textContent = message;
    errorArea.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
    errorArea.style.display = 'none';
}

/**
 * Show search results area
 */
function showResults() {
    resultsArea.style.display = 'block';
}

/**
 * Hide search results area
 */
function hideResults() {
    resultsArea.style.display = 'none';
}

/**
 * Share app to Twitter with predefined message
 */
function shareToTwitter() {
    const text = '夜間救急どうぶつ病院マップで緊急時の動物病院を検索しました！';
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
}

/**
 * Check if a hospital should be displayed based on opening hours
 * @param {Object} place - Place object from Places API
 * @return {boolean} True if hospital should be displayed
 */
function shouldDisplayHospital(place) {
    // If no opening hours info, display it (営業時間不明)
    if (!place.opening_hours) {
        return true;
    }
    
    // Check if hospital is open
    let isOpen = false;
    if (place.opening_hours.isOpen && typeof place.opening_hours.isOpen === 'function') {
        isOpen = place.opening_hours.isOpen();
    } else if (place.opening_hours.open_now !== undefined) {
        isOpen = place.opening_hours.open_now;
    } else {
        // If we can't determine status, show it
        return true;
    }
    
    // Only display if open or if status is unknown
    return isOpen;
}

/**
 * Open feedback form for user input
 */
function openFeedbackForm() {
    // This would typically open a feedback form or redirect to a feedback page
    alert('ご意見・ご感想をお聞かせください。\n\n情報が古い場合や改善点がございましたら、お知らせください。');
}

console.log('🔥 Script reloaded at Mon Jun 23 12:00:14 JST 2025');
