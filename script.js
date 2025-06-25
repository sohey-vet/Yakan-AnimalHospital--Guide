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

// Global initMap function for Google Maps callback
function initMap() {
    console.log('initMap called - Google Maps API loaded');
    
    if (vetMapInstance) {
        vetMapInstance.initMap();
    } else {
        console.error('vetMapInstance not found');
    }
}

// Make it globally available
window.initMap = initMap;

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

VetHospitalMap.prototype.searchByCurrentLocation = function() {
    if (!navigator.geolocation) {
        this.showError('位置情報がサポートされていません。地名で検索してください。');
        return;
    }

    const self = this;
    navigator.geolocation.getCurrentPosition(
        function(position) {
            self.currentLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            self.map.setCenter(self.currentLocation);
            self.searchHospitals(self.currentLocation);
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
            self.showError(errorMsg);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
};

VetHospitalMap.prototype.searchByLocationName = function() {
    let location = this.domElements.locationName.value.trim();
    if (!location) {
        location = '東京'; // Default to Tokyo if no input
    }

    const self = this;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: location }, function(results, status) {
        if (status === 'OK' && results[0]) {
            self.currentLocation = results[0].geometry.location;
            self.map.setCenter(self.currentLocation);
            self.searchHospitals(self.currentLocation);
        } else {
            self.showError('指定された地名が見つかりません。別の地名をお試しください。');
        }
    });
};

VetHospitalMap.prototype.searchHospitals = function(location) {
    this.clearMarkers();
    console.log('🏥 Starting hospital search for location:', location);
    
    // 新しい検索ロジック: 時間チェックと営業時間窓の計算
    const sec18 = 18*3600, sec19 = 19*3600, sec9 = 9*3600, sec24 = 24*3600;
    const now = new Date();
    const currentSec = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
    const today = now.getDay();
    let windowStart, windowEnd;

    if (currentSec >= sec18 && currentSec < sec19) {
        // 18:00〜18:59 → 19:00〜翌9:00
        windowStart = sec19;
        windowEnd   = sec9 + sec24;
    } else if (currentSec >= sec19 || currentSec < sec9) {
        // 19:00〜翌8:59 → 今〜翌9:00
        windowStart = currentSec;
        windowEnd   = currentSec < sec9 ? sec9 : sec9 + sec24;
    } else {
        // 夜間外 - テスト用に検索を実行
        console.log('テスト用: 時間外ですが検索を実行します');
        windowStart = sec19;
        windowEnd = sec9 + sec24;
    }

    // Try multiple search strategies focused on emergency and night care
    const searchStrategies = [
        {
            name: 'Primary: Emergency animal hospital search',
            request: {
                location: location,
                radius: 15000,
                query: '夜間救急動物病院 24時間'
            }
        },
        {
            name: 'Secondary: Night animal hospital search',
            request: {
                location: location,
                radius: 20000,
                keyword: '夜間動物病院'
            }
        },
        {
            name: 'Tertiary: Emergency center search',
            request: {
                location: location,
                radius: 25000,
                query: '動物救急センター 救急'
            }
        },
        {
            name: 'Quaternary: 24-hour veterinary search',
            request: {
                location: location,
                radius: 30000,
                keyword: '24時間 動物病院'
            }
        },
        {
            name: 'Fallback: General veterinary search',
            request: {
                location: location,
                radius: 10000,
                type: 'veterinary_care'
            }
        }
    ];

    let searchIndex = 0;
    const self = this;

    function tryNextSearch() {
        if (searchIndex >= searchStrategies.length) {
            self.showError('この周辺には動物病院が見つかりませんでした。検索範囲を広げるか、地域の動物医師会などにご確認ください。');
            return;
        }

        const strategy = searchStrategies[searchIndex];
        console.log(`🔍 Trying strategy ${searchIndex + 1}: ${strategy.name}`);
        console.log('🔍 Search request:', strategy.request);

        // Use textSearch for query-based searches, nearbySearch for others
        const searchMethod = strategy.request.query ? 'textSearch' : 'nearbySearch';
        
        self.service[searchMethod](strategy.request, function(results, status) {
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
                
                // Filter results to strictly include only animal hospitals
                const filteredResults = results.filter(place => {
                    const name = place.name.toLowerCase();
                    const types = place.types || [];
                    
                    // 絶対除外: 人間の医療施設
                    const isHumanMedical = name.includes('病院') && !name.includes('動物') && !name.includes('獣医') && !name.includes('ペット') && !name.includes('アニマル');
                    const isHumanEmergency = (name.includes('救急') || name.includes('emergency')) && !name.includes('動物') && !name.includes('獣医');
                    const isClinic = name.includes('クリニック') && !name.includes('動物') && !name.includes('獣医') && !name.includes('ペット');
                    
                    if (isHumanMedical || isHumanEmergency || isClinic) {
                        console.log('🚫 Human medical facility excluded:', place.name);
                        return false;
                    }
                    
                    // 除外: ペットショップや非医療施設
                    const isNonMedical = name.includes('ペットショップ') || name.includes('専門店') || 
                                        name.includes('トリミング') || name.includes('ホテル') || 
                                        name.includes('美容') || name.includes('サロン') || 
                                        name.includes('ペットフード') || name.includes('用品');
                    
                    if (isNonMedical) {
                        console.log('🚫 Non-medical facility excluded:', place.name);
                        return false;
                    }
                    
                    // 必須条件: 動物医療関連のキーワードが含まれている
                    const hasAnimalKeyword = name.includes('動物') || name.includes('獣医') || 
                                           name.includes('ペット') || name.includes('アニマル') ||
                                           name.includes('どうぶつ');
                    
                    // types.includes('veterinary_care') も許可するが、名前チェックも必要
                    const isVeterinaryType = types.includes('veterinary_care');
                    
                    if (hasAnimalKeyword || isVeterinaryType) {
                        // さらに動物病院であることを確認
                        const isVetHospital = name.includes('病院') || name.includes('クリニック') || 
                                            name.includes('センター') || isVeterinaryType;
                        
                        if (isVetHospital) {
                            console.log('✅ Animal hospital confirmed:', place.name);
                            return true;
                        }
                    }
                    
                    console.log('❌ Not an animal hospital:', place.name);
                    return false;
                });

                console.log(`🏥 Filtered to ${filteredResults.length} veterinary-related results`);

                if (filteredResults.length > 0) {
                    // Sort by priority (emergency first) then by distance
                    filteredResults.sort((a, b) => {
                        const aName = a.name.toLowerCase();
                        const bName = b.name.toLowerCase();
                        
                        // Priority scoring
                        const aIsEmergency = aName.includes('夜間') || aName.includes('救急') || aName.includes('24時間') || aName.includes('緊急');
                        const bIsEmergency = bName.includes('夜間') || bName.includes('救急') || bName.includes('24時間') || bName.includes('緊急');
                        
                        if (aIsEmergency && !bIsEmergency) return -1;
                        if (!aIsEmergency && bIsEmergency) return 1;
                        
                        // If same priority, sort by distance
                        const distanceA = self.calculateDistance(location, a.geometry.location);
                        const distanceB = self.calculateDistance(location, b.geometry.location);
                        return distanceA - distanceB;
                    });

                    self.displayResults(filteredResults, location, windowStart, windowEnd, today);
                    return;
                }
            }
            
            // Try next strategy
            searchIndex++;
            tryNextSearch();
        });
    }

    tryNextSearch();
};

VetHospitalMap.prototype.displayResults = function(places, userLocation, windowStart, windowEnd, today) {
    this.hideLoading();
    this.showResults();

    // Clear previous results
    this.domElements.hospitalsList.innerHTML = '';
    this.clearMarkers();

    // Add markers and create hospital cards
    const self = this;
    places.forEach((place, index) => {
        console.log('Processing place:', place.name, 'PlaceID:', place.place_id);
        
        // Always try to get detailed information first
        if (place.place_id) {
            const request = {
                placeId: place.place_id,
                fields: ['name', 'formatted_phone_number', 'international_phone_number', 'rating', 'opening_hours', 'website', 'vicinity', 'geometry']
            };

            self.service.getDetails(request, (placeDetails, status) => {
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

                // 新しい営業時間チェック
                if (self.shouldDisplayHospitalWithWindow(finalPlace, windowStart, windowEnd, today)) {
                    const hospitalCard = self.createHospitalCard(finalPlace, userLocation);
                    self.domElements.hospitalsList.appendChild(hospitalCard);
                    console.log('📞 Card created for:', finalPlace.name, 'Phone:', finalPlace.formatted_phone_number);
                    
                    // マーカーも作成
                    self.createMarker(finalPlace, index);
                } else {
                    console.log('🔴 Hospital not in time window, not displaying:', finalPlace.name);
                }
            });
        } else {
            console.log('❌ No place_id for:', place.name);
            // No place_id, use sample data
            const fallbackPlace = {
                ...place,
                formatted_phone_number: `03-123-456${index + 7} (サンプル)`
            };
            
            // 新しい営業時間チェック
            if (self.shouldDisplayHospitalWithWindow(fallbackPlace, windowStart, windowEnd, today)) {
                const hospitalCard = self.createHospitalCard(fallbackPlace, userLocation);
                self.domElements.hospitalsList.appendChild(hospitalCard);
                
                // マーカーも作成
                self.createMarker(fallbackPlace, index);
            } else {
                console.log('🔴 Hospital not in time window, not displaying:', fallbackPlace.name);
            }
        }

    });

    // Adjust map bounds to show all markers after all async operations complete
    setTimeout(() => {
        this.adjustMapBounds(userLocation);
    }, 1000);
};

VetHospitalMap.prototype.createMarker = function(place, index) {
    // Add marker to map with mobile-optimized flag icon
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

    // Add hospital name label for mobile - only show short name
    const shortName = place.name.length > 6 ? place.name.substring(0, 6) + '..' : place.name;
    const infoLabel = new google.maps.InfoWindow({
        content: `<div style="font-size: 10px; font-weight: bold; color: #333; background: rgba(255,255,255,0.95); padding: 1px 4px; border-radius: 3px; border: 1px solid #ccc; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">${shortName}</div>`,
        position: place.geometry.location,
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(30, -8)
    });
    infoLabel.open(this.map);

    // Store hospital info for use in click handler
    marker.hospitalInfo = {
        name: place.name,
        vicinity: place.vicinity || place.formatted_address || ''
    };

    this.markers.push(marker);

    // Add click listener for marker
    const self = this;
    marker.addListener('click', function() {
        self.infoWindow.setContent(`
            <div style="max-width: 200px;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px;">${place.name}</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">${place.vicinity}</p>
            </div>
        `);
        self.infoWindow.open(self.map, marker);
    });
};

VetHospitalMap.prototype.adjustMapBounds = function(userLocation) {
    // Adjust map bounds to show all markers
    if (this.markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(userLocation);
        this.markers.forEach(marker => bounds.extend(marker.getPosition()));
        this.map.fitBounds(bounds);
    }
};

VetHospitalMap.prototype.createHospitalCard = function(place, userLocation) {
    const distance = this.calculateDistance(userLocation, place.geometry.location);
    const distanceText = distance < 1 ? `約${Math.round(distance * 1000)}m` : `約${distance.toFixed(1)}km`;

    const card = document.createElement('div');
    card.className = 'hospital-card';
    
    // 営業時間の表示を作成
    let openingHoursHtml = '';
    if (place.opening_hours && place.opening_hours.periods) {
        const hoursText = this.formatOpeningHours(place.opening_hours.periods);
        openingHoursHtml = `
            <div class="hospital-hours">
                <span class="hours-label">🕒 診察時間:</span>
                <div class="hours-text">${hoursText}</div>
            </div>
        `;
    } else {
        openingHoursHtml = `
            <div class="hospital-hours">
                <span class="hours-label">🕒 診察時間:</span>
                <div class="hours-text">営業時間情報なし（お電話でご確認ください）</div>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="hospital-name">${place.name}</div>
        <div class="hospital-distance">${distanceText}</div>
        <div class="hospital-address">${place.vicinity}</div>
        ${openingHoursHtml}
        <div class="hospital-phone">
            <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="phone-link">
                📞 ${place.formatted_phone_number || `03-123-456${Math.floor(Math.random() * 900) + 100} (サンプル)`}
            </a>
        </div>
        <div class="hospital-actions">
            <a href="tel:${place.formatted_phone_number || '03-1234-5678'}" class="hospital-action-btn phone-btn">
                📞 電話をかける
            </a>
            ${place.website ? `<a href="${place.website}" target="_blank" class="hospital-action-btn website-btn">🌐 ホームページ</a>` : ''}
            <button class="hospital-action-btn map-btn" onclick="openInMaps(${place.geometry.location.lat()}, ${place.geometry.location.lng()}, '${encodeURIComponent(place.name)}')">
                🗺️ 地図アプリで開く
            </button>
        </div>
    `;

    return card;
};

VetHospitalMap.prototype.calculateDistance = function(pos1, pos2) {
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
};

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

VetHospitalMap.prototype.clearMarkers = function() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
};

VetHospitalMap.prototype.showLoading = function() {
    this.domElements.loadingArea.style.display = 'block';
};

VetHospitalMap.prototype.hideLoading = function() {
    this.domElements.loadingArea.style.display = 'none';
};

VetHospitalMap.prototype.showError = function(message) {
    this.hideLoading();
    this.domElements.errorMessage.textContent = message;
    this.domElements.errorArea.style.display = 'block';
};

VetHospitalMap.prototype.hideError = function() {
    this.domElements.errorArea.style.display = 'none';
};

VetHospitalMap.prototype.showResults = function() {
    this.domElements.resultsArea.style.display = 'block';
};

VetHospitalMap.prototype.hideResults = function() {
    this.domElements.resultsArea.style.display = 'none';
};

VetHospitalMap.prototype.shareToTwitter = function() {
    const text = '夜間救急どうぶつ病院マップで緊急時の動物病院を検索しました！';
    const url = window.location.href;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank');
};


VetHospitalMap.prototype.shouldDisplayHospitalWithWindow = function(place, windowStart, windowEnd, today) {
    if (!place.opening_hours?.periods) return true; // 営業時間不明の場合は表示
    
    return place.opening_hours.periods.some(p => {
        if (!p.open || !p.close) return false;
        
        const oh = parseInt(p.open.time.slice(0,2),10);
        const om = parseInt(p.open.time.slice(2),10);
        const ch = parseInt(p.close.time.slice(0,2),10);
        const cm = parseInt(p.close.time.slice(2),10);
        
        // 24時間営業の場合（開始時刻と終了時刻が同じ）
        if (oh === ch && om === cm) {
            console.log('🕐 24時間営業病院:', place.name);
            return true;
        }
        
        // 開始時刻が終了時刻より大きい場合（日をまたぐ営業）
        if (oh > ch || (oh === ch && om > cm)) {
            console.log('🌙 深夜営業病院:', place.name, `${oh}:${om.toString().padStart(2,'0')}-${ch}:${cm.toString().padStart(2,'0')}`);
            return true; // 深夜営業は基本的に表示
        }
        
        const openAbs  = ((p.open.day  - today +7)%7)*24*3600 + oh*3600 + om*60;
        const closeAbs = ((p.close.day - today +7)%7)*24*3600 + ch*3600 + cm*60;
        
        const matches = (openAbs < windowEnd) && (closeAbs > windowStart);
        console.log('⏰ 時間チェック:', place.name, `${oh}:${om.toString().padStart(2,'0')}-${ch}:${cm.toString().padStart(2,'0')}`, matches ? '✅' : '❌');
        
        return matches;
    });
};

VetHospitalMap.prototype.formatOpeningHours = function(periods) {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const daySchedule = {};
    
    // periodsを曜日別に整理
    periods.forEach(period => {
        if (period.open && period.close) {
            const day = period.open.day;
            const openTime = period.open.time;
            const closeTime = period.close.time;
            
            // 時間をフォーマット (例: "0900" -> "9:00")
            const formatTime = (time) => {
                const hours = parseInt(time.slice(0, 2), 10);
                const minutes = time.slice(2);
                return minutes === '00' ? `${hours}時` : `${hours}:${minutes}`;
            };
            
            const timeRange = `${formatTime(openTime)}〜${formatTime(closeTime)}`;
            
            if (!daySchedule[day]) {
                daySchedule[day] = [];
            }
            daySchedule[day].push(timeRange);
        }
    });
    
    // 24時間営業チェック
    const is24Hours = periods.some(p => {
        if (p.open && p.close) {
            return p.open.time === p.close.time;
        }
        return false;
    });
    
    if (is24Hours) {
        return '24時間対応';
    }
    
    if (Object.keys(daySchedule).length === 0) {
        return '営業時間不明';
    }
    
    // 同じ時間の曜日をグループ化
    const timeGroups = {};
    Object.entries(daySchedule).forEach(([day, times]) => {
        const timeKey = times.join('・');
        if (!timeGroups[timeKey]) {
            timeGroups[timeKey] = [];
        }
        timeGroups[timeKey].push(parseInt(day));
    });
    
    // 見やすい形式で表示
    const formattedGroups = Object.entries(timeGroups).map(([times, days]) => {
        // 曜日を連続性を考慮してまとめる
        days.sort((a, b) => a - b);
        const dayRanges = [];
        let start = days[0];
        let end = days[0];
        
        for (let i = 1; i <= days.length; i++) {
            if (i < days.length && days[i] === end + 1) {
                end = days[i];
            } else {
                if (start === end) {
                    dayRanges.push(dayNames[start]);
                } else if (end === start + 1) {
                    dayRanges.push(`${dayNames[start]}・${dayNames[end]}`);
                } else {
                    dayRanges.push(`${dayNames[start]}〜${dayNames[end]}`);
                }
                if (i < days.length) {
                    start = end = days[i];
                }
            }
        }
        
        return `${dayRanges.join('・')}: ${times}`;
    });
    
    return formattedGroups.join('<br>');
};

VetHospitalMap.prototype.openFeedbackForm = function() {
    // This would typically open a feedback form or redirect to a feedback page
    alert('ご意見・ご感想をお聞かせください。\n\n情報が古い場合や改善点がございましたら、お知らせください。');
};

console.log('🔥 Script reloaded at Mon Jun 23 12:00:14 JST 2025');
