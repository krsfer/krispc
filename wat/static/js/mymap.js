(function () {
    "use strict";

    const backgroundColor = "rgba(255, 255, 255, 0.6)"; // 60% transparent white background
    let geoLngLat = null; // Variable to store the geolocate coordinates
    let monitorTextbox = null; // Variable to store the monitor textbox instance
    let contactsTextbox = null; // Variable to store the contacts textbox instance
    let contacts = null; // Variable to store the contacts data

    class MapInitializer {
        constructor(containerId, style, center, zoom) {
            this.initMap(containerId, style, center, zoom);
        }

        convertDistance(distance) {
            if (distance >= 1000) {
                return (distance / 1000).toFixed(1) + " km";
            } else {
                return distance.toFixed(0) + " m";
            }
        }

        convertDuration(durationInSeconds) {
            const hours = Math.floor(durationInSeconds / 3600);
            const minutes = Math.floor((durationInSeconds % 3600) / 60);
            const seconds = Math.floor(durationInSeconds % 60);
            return {hours, minutes, seconds};
        }

        formatDuration(hours, minutes, seconds) {
            let durée = "";
            if (hours > 0) {
                durée += hours.toString().padStart(2, '0') + ':';
            }
            if (minutes > 0 || hours > 0) {
                durée += minutes.toString().padStart(2, '0') + ':';
            }
            durée += seconds.toString().padStart(2, '0');
            return durée;
        }


        async initMap(containerId, style, center, zoom) {
            const mapboxToken = await this.getAccessToken("mapbox_token");
            mapboxgl.accessToken = mapboxToken;

            this.map = new mapboxgl.Map({
                container: containerId,
                style: style,
                center: center,
                zoom: zoom
            });

            this.map.on("load", () => {
                this.addMapControls();
                this.modifyAttributionControl();
                const start = [7.008715192368488, 43.64163999646119];
                const end = [6.993073, 43.675819];
            });

            // Close the contacts list when the map is clicked
            this.map.on('click', () => {
                // if (contactsTextbox) {
                //     contactsTextbox.container.style.transform = "translateX(-90%)";
                //     contactsTextbox.container.style.overflowY = "hidden";
                //     contactsTextbox.container.childNodes.forEach((element) => {
                //         element.style.visibility = "hidden";
                //     });
                //     contactsTextbox.container.style.backgroundColor = "rgba(255, 255, 255, 0.9)";
                // }

                this.resetGeocoderInput();
                this.resetContactsTextbox();
            });


            this.initWakeLock();


            // Listen for style load event to reapply the route layer when the style changes
            this.map.on('style.load', () => {

                let mapStyle = this.map.getStyle();
                let geolocationUserIcon = document.querySelector('.mapboxgl-user-location-dot');
                if (geolocationUserIcon) {
                    if (mapStyle.name.includes("Dark")) {
                        geolocationUserIcon.classList.remove('compass-image_black');
                        geolocationUserIcon.classList.add('compass-image_white');
                    } else {
                        geolocationUserIcon.classList.remove('compass-image_white');
                        geolocationUserIcon.classList.add('compass-image_black');
                    }
                }

                this.reAddRouteLayer('route');

                // Recreate the original route with id 'original_route' and source 'original_route' using the routeData
                // stored in mapInitializer
                if (this.routeData) {
                    const start = this.routeData.start;
                    const end = this.routeData.end;

                    if (this.map.getSource('original_route')) {
                        this.map.removeLayer('original_route');
                        this.map.removeSource('original_route');
                    }

                    // Displace the original route geometry by 0.0005 degrees in the longitude direction
                    this.routeData.route.geometry.coordinates = this.routeData.route.geometry.coordinates.map((coord) => {
                        return [coord[0] + 0.0005, coord[1]];
                    });

                    // Use route.geometry to  recreate the original route source and layer
                    this.map.addSource('original_route', {
                        'type': 'geojson',
                        'data': this.routeData.route.geometry
                    });

                    // Add the original route layer
                    this.map.addLayer({
                        'id': 'original_route',
                        'type': 'line',
                        'source': 'original_route',
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': 'rgba(0,255,21,0.26)',
                            'line-width': 8
                        }
                    });
                }
            });


            // Start. Mock locations to simulate tracking (e.g., a path around a small area)
            // Mock locations to simulate tracking (e.g., a path around a small area)
            function generateCirclePoints(centerLat, centerLng, radiusInKm, numPoints) {
                const points = [];
                const earthRadiusInKm = 6371;
                const radiusInDegrees = radiusInKm / earthRadiusInKm;

                for (let i = 0; i < numPoints; i++) {
                    const angle = (i * 360 / numPoints) * Math.PI / 180; // Convert angle to radians
                    const lat = centerLat + (radiusInDegrees * Math.sin(angle)) * (180 / Math.PI);
                    const lng = centerLng + (radiusInDegrees * Math.cos(angle)) * (180 / Math.PI) / Math.cos(centerLat * Math.PI / 180);

                    points.push({coords: [lng, lat], heading: i * 360 / numPoints});
                }

                return points;
            }

            // Valbonne's approximate center
            const valbonneCenter = {lat: 43.6415, lng: 7.0092};
            const locations = generateCirclePoints(valbonneCenter.lat, valbonneCenter.lng, 2, 100);

            let currentIndex = 0;

            // Create a mock marker for the location
            // const mock_marker = new mapboxgl.Marker()
            //     .setLngLat(locations[currentIndex]['coords'])
            //     .addTo(this.map);


            // Function to simulate geolocation change
            function simulateGeolocationChange() {
                if (currentIndex >= locations.length) {
                    currentIndex = 0; // Loop back to the start
                }

                const [lng, lat] = locations[currentIndex++]['coords'];

                // compass.setRotation(90); // Rotate the compass to the new heading (90 degrees in this case)

                // Update the map view to the new location
                // map.flyTo({
                //     center: [lng, lat],
                //     essential: true, // this animation is considered essential with respect to prefers-reduced-motion
                // });


                // Update mock marker  position
                mock_marker.setLngLat([lng, lat]);

                let geolocationUserIcon = document.querySelector('.mapboxgl-user-location-dot');
                if (geolocationUserIcon) {
                    // Get the heading from valbonne to the current location without using turf.js
                    const heading = `rotate(${90 - locations[currentIndex - 1]['heading']}deg)`;

                    // Set the rotation of the geolocationUserIcon to the current location heading
                    geolocationUserIcon.style.transform = heading;
                }

                // Schedule the next location update
                setTimeout(simulateGeolocationChange, 1000); // Update location every 2 seconds
                currentIndex++;
            }

            // // Start simulating geolocation tracking //////////////////////////////
            // simulateGeolocationChange();

        }

        async getAccessToken(tokenId) {
            const response = await fetch(tokenId);
            const data = await response.json();
            return data.token;
        }

        async initWakeLock() {
            if ("wakeLock" in navigator) {
                try {
                    this.wakeLock = await navigator.wakeLock.request("screen");

                    this.wakeLock.addEventListener("release", () => {
                    });

                    document.addEventListener("visibilitychange", async () => {
                        if (document.visibilityState === "visible" && this.wakeLock !== null) {
                            this.wakeLock = await navigator.wakeLock.request("screen");
                        }
                    });
                } catch (err) {
                    console.error(`WakeLock failed: ${err.message}`);
                }
            }
        }

        initGeocoder() {
            const geocoder = new MapboxGeocoder({
                accessToken: mapboxgl.accessToken,
                mapboxgl: mapboxgl,
                marker: true,
                collapsed: true, // Start in a collapsed state if true
            });

            // Custom code to style and add sliding effect to the geocoder
            const geocoderContainer = geocoder.onAdd(this.map);
            // geocoderContainer.classList.add('geocoder-slide');

            geocoderContainer.addEventListener('mouseenter', function () {
                console.log('mouseenter');
                // this.classList.add('expanded');
            });

            geocoderContainer.addEventListener('mouseleave', function () {
                console.log('mouseleave');
                // if (!this.querySelector('.mapboxgl-ctrl-geocoder--input').value) {
                // this.classList.remove('expanded');
                // }
            });

            geocoder.on('clear', function () {
                console.log('Geocoder cleared');
            });

            geocoder.on('result', () => {
                this.resetGeocoderInput();
            });

            this.map.addControl(geocoder, 'top-right');
        }


        resetGeocoderInput() {
            let geocoderInput = document.querySelector('.mapboxgl-ctrl-geocoder--input');
            if (geocoderInput.classList.contains('show')) {
                geocoderInput.classList.remove('show');
                geocoderInput.value = '';
            }
        }

        resetContactsTextbox() {
            let contactsTextbox = document.querySelector('.contacts-textbox');
            if (contactsTextbox)
                contactsTextbox.style.visibility = "hidden";
        }

        addMapControls() {
            let styleControl = new StyleControl();
            this.map.addControl(styleControl, 'top-left');

            let originalRoute = null;

            // Initialize the geocoder after the map is set up
            this.initGeocoder();

            // Add navigation control (zoom in/out)
            this.map.addControl(new mapboxgl.NavigationControl(), "top-right");

            monitorTextbox = new Monitor_textbox(this.map, backgroundColor);
            this.map.addControl(monitorTextbox, 'top-left');

            // contactsTextbox = new Contacts_textbox(map, backgroundColor);
            // this.map.addControl(contactsTextbox);

            // Add GeolocateControl
            const geolocate = new mapboxgl.GeolocateControl({
                positionOptions: {
                    enableHighAccuracy: true,
                },
                trackUserLocation: true,
                showAccuracyCircle: true,
                showUserLocation: true,
            });
            this.map.addControl(geolocate, "top-right");


            // Add geolocate event listener
            geolocate.on("geolocate", async (e) => {
                geoLngLat = e.coords; // Store the geolocate coordinates in the global variable

                if (this.markerManager.lastClickedMarkerLngLat) {
                    const start = [e.coords.longitude, e.coords.latitude];
                    const end = [this.markerManager.lastClickedMarkerLngLat.lng, this.markerManager.lastClickedMarkerLngLat.lat];
                    await this.addRouteLayer(start, end, 'route');

                    // Set originalRoute to the routeData if originalRoute is not defined
                    if (!originalRoute) {
                        originalRoute = this.routeData;
                    }

                    // Draw the original route defined by route field in originalRoute
                    if (originalRoute) {
                        if (this.map.getSource('original_route')) {
                            this.map.removeLayer('original_route');
                            this.map.removeSource('original_route');
                        }

                        // Displace the original route geometry by 0.0005 degrees in the longitude direction
                        originalRoute.route.geometry.coordinates = originalRoute.route.geometry.coordinates.map((coord) => {
                            return [coord[0] + 0.0005, coord[1]];
                        });

                        this.map.addSource('original_route', {
                            'type': 'geojson',
                            'data': originalRoute.route.geometry
                        });

                        this.map.addLayer({
                            'id': 'original_route',
                            'type': 'line',
                            'source': 'original_route',
                            'layout': {
                                'line-join': 'round',
                                'line-cap': 'round'
                            },
                            'paint': {
                                'line-color': 'rgba(255,165,0,0.26)',
                                'line-width': 8
                            }
                        });
                    }

                    // Draw the original route defined by originalRoute
                    // if (originalRoute) {
                    //     if (map.getSource('original_route')) {
                    //         map.removeLayer('original_route');
                    //         map.removeSource('original_route');
                    //     }
                    //
                    //     map.addSource('original_route', {
                    //         'type': 'geojson',
                    //         'data': originalRoute
                    //     });
                    //
                    //     map.addLayer({
                    //         'id': 'original_route',
                    //         'type': 'line',
                    //         'source': 'original_route',
                    //         'layout': {
                    //             'line-join': 'round',
                    //             'line-cap': 'round'
                    //         },
                    //         'paint': {
                    //             'line-color': '#888',
                    //             'line-width': 8
                    //         }
                    //     });
                    // }
                }

                let geolocationUserIcon = document.querySelector('.mapboxgl-user-location-dot');
                // Check if the geolocationUserIcon has class mapboxgl-user-location-dot. If yes, remove the default
                // blue dot
                if (geolocationUserIcon) {
                    geolocationUserIcon.style.backgroundColor = backgroundColor;
                }


                let mapStyle = this.map.getStyle();
                if (geolocationUserIcon) {
                    if (mapStyle.name.includes("Dark")) {
                        geolocationUserIcon.classList.remove('compass-image_black');
                        geolocationUserIcon.classList.add('compass-image_white');
                    } else {
                        geolocationUserIcon.classList.remove('compass-image_white');
                        geolocationUserIcon.classList.add('compass-image_black');
                    }
                }

                // geolocationUserIcon.style.backgroundColor = backgroundColor;
                // Set the opacity to 0.3
                // geolocationUserIcon.style.opacity = "0.3";


                // Set the rotation of the compass to the current heading of the device if e.coords.heading is defined
                if (e.coords.heading) {
                    console.log("Heading:", e.coords.heading);
                    // compass.setRotation(e.coords.heading);
                    // rotate the geolocationUserIcon to match the heading of the device
                    geolocationUserIcon.style.transform = `rotate(${e.coords.heading}deg)`;
                }
            });

            // Add trackUserLocation event listener
            geolocate.on("trackuserlocationstart", () => {
                console.log("trackuserlocationstart");
            });

            geolocate.on("trackuserlocationend", () => {
                console.log("trackuserlocationend");
            });

            geolocate.on("error", (e) => {
                console.error("Geolocate1 error:", e);
            });

            geolocate.on("geolocateerror", (e) => {
                console.error("Geolocate2 error:", e);
            });


            // Add FullscreenControl
            this.map.addControl(new mapboxgl.FullscreenControl(), "bottom-right");

            // Add ScaleControl
            this.map.addControl(new mapboxgl.ScaleControl({
                maxWidth: 80,
                unit: "metric",
                style: {
                    bottom: 20,
                    left: 20,
                    border: '1px solid black',
                    padding: '5px',
                    color: 'black'
                }
            }), "bottom-right");

            // Add StyleControl
            new StyleControl(this.map);


            let geocoderIcon = document.querySelector('.mapboxgl-ctrl-geocoder--icon.mapboxgl-ctrl-geocoder--icon-search');
            geocoderIcon.style.zIndex = "9999"; // Set a high value to bring it to the front
            let geocoderInput = document.querySelector('.mapboxgl-ctrl-geocoder--input');

            // Add or remove the mapboxgl-ctrl-geocoder--collapsed" of the geocoder input
            geocoderIcon.addEventListener('click', function () {
                console.log('geocoderIcon clicked');
                geocoderInput.classList.toggle('mapboxgl-ctrl-geocoder--collapsed');
                geocoderInput.classList.toggle('show');
                if (geocoderInput.classList.contains('show')) {
                    geocoderInput.focus();
                }
            });

            const contactsIcon = new ContactsTextboxIcon();
            this.map.addControl(contactsIcon, 'top-right');

            // Add MarkerManager
            this.markerManager = new MarkerManager(this.map, this);
            // this.markerManager.addMarker([7.008715192368488, 43.64163999646119], "Valbonne", "Valbonne, France", document.getElementById("marker"));
            this.markerManager.addContactMarkers('contacts_json'); // Pass the URL or path to your contacts.json
        }

        modifyAttributionControl() {
            // Find and remove existing attribution control
            let attributionControl = this.map._controls.find(control => control instanceof mapboxgl.AttributionControl);
            if (attributionControl) {
                this.map.removeControl(attributionControl);
            } else {
            }

            // Create and add new custom attribution control
            const customAttribution = "Made with ❤ by <a href='mailto://archer.chris@gmail.com'><u>C. Archer.</u></a> D’après une idée de P. Ricaud";
            const newAttributionControl = new mapboxgl.AttributionControl({
                compact: true,
                customAttribution: customAttribution,
            });
            this.map.addControl(newAttributionControl, "bottom-right");
        }

        // Function to add the route layer
        async addRouteLayer(start, end, routeId) {
            const startLng = start[0];
            const startLat = start[1];
            const endLng = end[0];
            const endLat = end[1];

            const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;


            // Fetch the route from OSRM
            const response = await fetch(url);
            const data = await response.json();

            // Extract the route geometry
            const route = data.routes[0];
            const route_geometry = route.geometry;

            let distance = this.convertDistance(route.distance);
            let {hours, minutes, seconds} = this.convertDuration(route.duration);
            let durée = this.formatDuration(hours, minutes, seconds);

            let eta = new Date();
            eta.setHours(eta.getHours() + hours);
            eta.setMinutes(eta.getMinutes() + minutes);
            eta.setSeconds(eta.getSeconds() + seconds);
            eta = eta.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});


            // // Use googleMapsUrl to get address
            const googlemaps_token = await this.getAccessToken("googlemaps_token")
            const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${startLat},${startLng}&key=${googlemaps_token}`;
            let address = 'No address found';
            const googleMapsData = await fetch(googleMapsUrl).then(response => response.json());
            if (googleMapsData.status === 'OK') {
                address = googleMapsData.results[0].address_components[0].long_name + ' '
                    + googleMapsData.results[0].address_components[1].short_name + ', '
                    + googleMapsData.results[0].address_components[2].long_name;
            }

            if (!monitorTextbox)
                monitorTextbox = new Monitor_textbox(this.map, window.backgroundColor);

            displayUpdates(distance, durée, eta, address);

            // Store the route data... route, distance, durée, eta, address
            this.routeData = {
                start: start,
                end: end,
                route: route,
                distance: distance,
                durée: durée,
                eta: eta,
                address: address
            };
            // console.log("routeData:", this.routeData);

            // Add the route as a source and layer if it doesn't already exist
            if (!this.map.getSource(routeId)) {
                this.map.addSource(routeId, {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': route_geometry
                    }
                });

                this.map.addLayer({
                    'id': routeId,
                    'type': 'line',
                    'source': routeId,
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': 'rgba(208,79,9,0.7)', // Transparent orange color rgba(255, 165, 0, 0.5)
                        // 'line-opacity': 0.5, // Transparency level
                        'line-width': 8
                    }
                });

                this.map.on('click', routeId, (e) => {
                    // Fly to the end of the route
                    this.map.flyTo({
                        center: this.routeData.end, // Use the end coordinates stored in routeData
                        zoom: 15, // Set the zoom level to 15
                        essential: true // This animation is considered essential with respect to prefers-reduced-motion
                    });
                });

                this.map.on('mouseenter', routeId, () => {
                    this.map.getCanvas().style.cursor = 'pointer';
                });

                this.map.on('mouseleave', routeId, () => {
                    this.map.getCanvas().style.cursor = '';
                });

                // Zoom to the route bounds
                const bounds = new mapboxgl.LngLatBounds();
                bounds.extend([startLng, startLat]);
                bounds.extend([endLng, endLat]);
                this.map.fitBounds(bounds, {padding: 50});
            } else {
                // If the source exists, just update its data
                this.map.getSource(routeId).setData({
                    'type': 'Feature',
                    'properties': {},
                    'geometry': route_geometry
                });

                // // Initialize variables at the beginning of the function
                // let distance = '0 m'; // Default value for distance
                // let duration = 0; // Default value for duration
                // let eta = ''; // Default value for estimated time of arrival
                // let address = 'No address found'; // Default default value for address
                // let durée = '00:00:00'; // Default value for duration in HH:MM:SS format

                return this.routeData;
            }

            function convertDistance(distance) {
                if (distance >= 1000) {
                    return (distance / 1000).toFixed(1) + " km";
                } else {
                    return distance.toFixed(0) + " m";
                }
            }

            function convertDuration(durationInSeconds) {
                const hours = Math.floor(durationInSeconds / 3600);
                const minutes = Math.floor((durationInSeconds % 3600) / 60);
                const seconds = Math.floor(durationInSeconds % 60);
                return {hours, minutes, seconds};
            }

            function formatDuration(hours, minutes, seconds) {
                let durée = "";
                if (hours > 0) {
                    durée += hours.toString().padStart(2, '0') + ':';
                }
                if (minutes > 0 || hours > 0) {
                    durée += minutes.toString().padStart(2, '0') + ':';
                }
                durée += seconds.toString().padStart(2, '0');
                return durée;
            }

            function displayUpdates(distance, durée, eta, address) {
                monitorTextbox.innerText = `Distance: ${distance}\nDurée: ${durée}\nETA: ${eta}\nAddress: ${address}`;

                // Remove numéro de département from address if address is not null it contains the numéro
                if (address) {
                    const regex = / \b\d{5}\b /g;
                    address = address.replace(regex, ",");
                } else {
                    address = "nono";
                }

                const txt2 = `Dist#${distance}#;Dur#${durée}#;eta#${eta}#red;address#${address}#`;

                debugDBmgr_0("");
                const htm = applyColorToText(debugDBmgr_0(txt2));

                // console.log('htm', htm);

                monitorTextbox.container.innerHTML = htm;
                // Set width of the monitor textbox to xxx
                monitorTextbox.container.style.width = "50%";
            }

            function applyColorToText(txt) {
                const lines = txt.split("\n");
                let result = "";
                for (let line of lines) {

                    // console.log('line', line);

                    const parts = line.split("#");

                    if (parts.length === 2) {

                        const [key, value] = parts;
                        result += `<span>${value}</span>`;

                    } else if (parts.length === 3) {

                        const [key, value, color] = parts;

                        let fontsize = "1em";
                        if (key === "eta") {
                            fontsize = "1.5em";
                        }

                        result += `<span style="font-size: ${fontsize}; color:${color};">${value}</span>`;

                        if (line === lines[lines.length - 2]) {
                            result += '<br>';
                        } else {
                            result += '&nbsp;';
                        }

                    }
                }
                return result;
            }

            function debugDBmgr_0(fields) {
                // console.log('fields', fields);
                // console.log('is fields empty', fields === '');

                let debugDB = {}; // Ensure debugDB is defined in the function scope

                const fieldArray = fields.split(/;|\r?\n/);
                // console.log('fieldArray', fieldArray);

                fieldArray.forEach((field) => {
                    let parts = field.split("#");

                    let k = parts[0];
                    let v = parts[1];
                    let c = parts[2];

                    // console.log('k', k);
                    // console.log('v', v);
                    // console.log('c', c);

                    if (k === "" || k === undefined) {
                        delete debugDB[k]; // If v is empty or undefined, delete the key k from debugDB
                    } else {
                        if (c) {
                            // console.log('c is defined');
                            debugDB[`${k}`] = v + "#" + c;
                            // console.log('debugDB', debugDB);
                            // console.log('debugDB[k]', debugDB[k]);
                        } else {
                            debugDB[k] = v; // No color definition, so add or update k with v in debugDB as before
                        }
                    }
                });

                const default_color = "black";

                return Object.entries(debugDB)
                    .map(([key, value]) => {
                        const val = value.split("#");
                        if (val) {
                            const color = val[1];
                            if (color) {
                                return `${key}#${val[0]}#${color}`;
                            } else {
                                return `${key}#${val[0]}#${default_color}`;
                            }
                            return `${key}#${val[0]}${color}`; // Add color to the key#val[0 pair
                        } else {
                            return `${key}#${val[0]}#${default_color}`; // No $color in key, so return as before
                        }
                    })
                    .join("\n");
            }
        }

        // Add this function to re-add the route layer
        reAddRouteLayer(route) {
            // Check if the route data exists and the map has been initialized
            if (this.routeData && this.map) {
                // Check if the route layer exists
                if (this.map.getLayer(route)) {
                    // Remove the existing route layer
                    this.map.removeLayer(route);
                }

                // Check if the route source exists
                if (this.map.getSource(route)) {
                    // Remove the existing route source
                    this.map.removeSource(route);
                }

                // Re-add the route layer with the updated route data
                this.addRouteLayer(this.routeData.start, this.routeData.end, route);
            }
        }
    }

    class StyleControl {
        constructor(map) {
            this.map = map;
            this.mapStyles = [
                {name: "Dark", style: "mapbox://styles/mapbox/dark-v9"},
                {name: "Light", style: "mapbox://styles/mapbox/light-v9"},
                {name: "Streets", style: "mapbox://styles/mapbox/streets-v11"},
                {name: "Outdoors", style: "mapbox://styles/mapbox/outdoors-v11"},
                {name: "Satellite", style: "mapbox://styles/mapbox/satellite-v9"}
            ];

            this.container = null;
            ;
        }

        onAdd(map) {
            this.map = map;
            this.container = document.createElement('div');
            this.container.className = 'mapboxgl-ctrl';
            const select = document.createElement("select");
            // select.style.position = "absolute";
            select.style.top = "10px";
            select.style.right = "200px";
            select.style.backgroundColor = backgroundColor; // 60% transparent background
            select.style.textAlign = "center";
            select.style.borderRadius = "10px";
            select.style.border = "1px solid lightgrey";
            select.style.zIndex = "10";

            this.mapStyles.forEach(style => {
                const option = document.createElement("option");
                option.value = style.style;
                option.text = style.name;
                select.appendChild(option);
            });

            const selectedStyle = localStorage.getItem("selectedMapStyle") || this.mapStyles[0].style;
            select.value = selectedStyle;

            select.addEventListener("change", () => {
                this.map.setStyle(select.value);
                localStorage.setItem("selectedMapStyle", select.value);
            });

            this.container.appendChild(select);
            return this.container;
        }

        onRemove() {
            this.container.parentNode.removeChild(this.container);
            this.map = undefined;
        }
    }

    class MarkerManager {
        constructor(map, mapInitializer) {
            this.map = map;
            this.mapInitializer = mapInitializer;
            this.markers = []; // Array to store all marker instances
            this.lastClickedMarkerLngLat = null; // To store the lngLat of the last clicked marker
        }

        addMarker(lngLat, name, address, element) {
            // Check if a marker at the given position already exists
            let marker = this.markers.find(marker =>
                marker.getLngLat().lng === lngLat[0] && marker.getLngLat().lat === lngLat[1]
            );

            // If no existing marker is found, create a new marker
            if (!marker) {
                const el = document.createElement('div');

                marker = new mapboxgl.Marker({
                    element: element,
                    draggable: true // Make the marker draggable
                })
                    .setLngLat(lngLat)
                    .setPopup(new mapboxgl.Popup({className: 'popup-class'}).setHTML(`<h3>${name}</h3><p>${address}</p>`))
                    .addTo(this.map);

                // Add  'popup-class' to the popup

                marker.on('dragstart', this.onDragStart.bind(this, marker));
                marker.on('dragend', this.onDragEnd.bind(this, marker));

                // Add click event listener to the marker
                marker.getElement().addEventListener('click', async () => {
                    if (this.lastClickedMarkerLngLat && !geoLngLat) {
                        // Add route from the last clicked marker to the clicked marker
                        const start = [this.lastClickedMarkerLngLat.lng, this.lastClickedMarkerLngLat.lat];
                        const end = [marker.getLngLat().lng, marker.getLngLat().lat];

                        this.lastClickedMarkerLngLat = null;

                        this.mapInitializer.addRouteLayer(start, end, 'route');
                    } else {
                        // Remove originalRoute if it exists and a layer called 'original_route' exists
                        if (this.mapInitializer.routeData) {
                            if (this.map.getSource('original_route')) {
                                this.map.removeLayer('original_route');
                                this.map.removeSource('original_route');
                                this.mapInitializer.routeData = null;
                            }
                        }

                        this.lastClickedMarkerLngLat = marker.getLngLat();

                        // Add route from geoLngLat  position to the clicked marker
                        if (geoLngLat) {
                            const start = [geoLngLat.longitude, geoLngLat.latitude];
                            const end = [this.lastClickedMarkerLngLat.lng, this.lastClickedMarkerLngLat.lat];

                            const res = await this.mapInitializer.addRouteLayer(start, end, 'route');

                            // How to recreate the original route with id 'original_route' and source
                            // 'original_route' using the routeData stored in mapInitializer
                            if (res) {
                                const start = res.start;
                                const end = res.end;

                                if (this.map.getSource('original_route')) {
                                    this.map.removeLayer('original_route');
                                    this.map.removeSource('original_route');
                                }

                                // Displace the original route geometry by 0.0005 degrees in the longitude direction
                                res.route.geometry.coordinates = res.route.geometry.coordinates.map((coord) => {
                                    return [coord[0] + 0.0005, coord[1]];
                                });
                                // Use route.geometry to  recreate the original route source and layer
                                this.map.addSource('original_route', {
                                    'type': 'geojson',
                                    'data': res.route.geometry
                                });
                                // Add the original route layer
                                this.map.addLayer({
                                    'id': 'original_route',
                                    'type': 'line',
                                    'source': 'original_route',
                                    'layout': {
                                        'line-join': 'round',
                                        'line-cap': 'round'
                                    },
                                    'paint': {
                                        'line-color': 'rgba(0,255,21,0.26)',
                                        'line-width': 8
                                    }
                                });
                            }


                        }
                    }

                });

                // Store the marker for future reference
                this.markers.push(marker);
            }

            // Set custom properties for the marker
            marker.contact_name = name.replace(/\u00A0/g, " "); // Replace nbsp with space in name
            marker.contact_position = lngLat;
        }

        zoomToContact(lngLat) {
            this.map.flyTo({
                center: lngLat,
                zoom: 15,
                essential: true
            });
        }

        onDragStart(marker) {
            marker.originalLngLat = marker.getLngLat();
        }

        onDragEnd(marker) {
            const lngLat = marker.getLngLat();
            // let lngLat = marker.getLngLat();
            const some_name = marker.contact_name;


            // Optionally, update marker position in your data source
            let myModal = new bootstrap.Modal(document.getElementById('exampleModal'), {});
            // Remove hidden class from modal
            myModal._element.classList.remove('hidden');
            myModal.show();

            let confirmButton = document.getElementById('confirmButton');
            let cancelButton = document.getElementById('cancelButton');
            let closeButton = document.getElementById('closeButton');

            function handleClick() {
                myModal.hide();
                if (marker.originalLngLat) {
                    marker.setLngLat(marker.originalLngLat); // Restore the original marker position
                    marker.originalLngLat = null; // Reset originalLngLat after restoration
                }
            }

            // Get the CSRF token from the cookie
            function getCookie(name) {
                let cookieValue = null;
                if (document.cookie && document.cookie !== "") {
                    const cookies = document.cookie.split(";");
                    for (let i = 0; i < cookies.length; i++) {
                        const cookie = cookies[i].trim();
                        // Does this cookie string begin with the name we want?
                        if (cookie.substring(0, name.length + 1) === name + "=") {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            }


            let csrftoken = getCookie("csrftoken");

            function updateContactsJson(name, lngLat) {
                fetch("update_contacts_json", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRFToken": csrftoken,
                    },
                    body: JSON.stringify({
                        name: name,
                        coords: lngLat,
                    }),
                })
                    .then((response) => response.json())
                    .then((data) => console.log(data))
                    .catch((error) => {
                        console.error("Error:", error);
                    });
            }

            cancelButton.addEventListener('click', handleClick);
            closeButton.addEventListener('click', handleClick);

            confirmButton.addEventListener('click', () => {
                myModal.hide();

                // Call updateContactsJson to update the contact information
                updateContactsJson(some_name, marker.getLngLat());

                marker.originalLngLat = null; // Reset originalLngLat after successful update
            });
        }


        // Method to remove a marker from the map and the internal array
        removeMarker(marker) {
            const index = this.markers.indexOf(marker);
            if (index > -1) {
                marker.remove(); // Remove the marker from the map
                this.markers.splice(index, 1); // Remove the marker from the array
            }
        }

        // Method to update a marker's position and/or other properties
        updateMarker(marker, lngLat, name, address) {
            marker.setLngLat(lngLat);
            marker.setPopup(new mapboxgl.Popup().setHTML(`<h3>${name}</h3><p>${address}</p>`));
            // Update custom properties if needed
            marker.contact_name = name;
            marker.contact_position = lngLat;
        }

        async addContactMarkers(contactsUrl) {
            try {
                const response = await fetch(contactsUrl);
                const data = await response.json();
                contacts = data.contacts;

                contacts.forEach(contact => {
                    const el = document.createElement('div');
                    el.className = this.getMarkerClassByTags(contact.tags);

                    const lngLat = contact.coords;

                    if (lngLat && lngLat.length === 2) {
                        this.addMarker(lngLat, contact.name, contact.address, el);
                    } else {
                        console.error('Invalid coordinates for contact:', contact.name);
                    }

                    const contactDiv = document.createElement('div');
                    contactDiv.className = 'card'; // Bootstrap card class
                    contactDiv.innerHTML = `
                        <div class="card-body">
                            <h5 class="card-title">${contact.name}</h5>
                            <h6 class="card-text">${contact.address}</h6>
                        </div>`;
                    // Hide the contactDiv by default
                    // contactDiv.style.visibility = "hidden";
                    document.querySelector('.contacts-textbox').appendChild(contactDiv);

                    // Add event listener to the card-body
                    contactDiv.querySelector('.card-body').addEventListener('click', () => {
                        this.zoomToContact(contact.coords);

                        // Remove the 'selected-contact' class from all contacts
                        document.querySelectorAll('.contacts-textbox .card').forEach(card => {
                            card.classList.remove('selected-contact');
                        });

                        // Add the 'selected-contact' class to the clicked contact
                        contactDiv.classList.add('selected-contact');

                        // Add route from geoLngLat  position to the clicked contact
                        if (geoLngLat) {
                            const start = [geoLngLat.longitude, geoLngLat.latitude];
                            const end = contact.coords;
                            this.mapInitializer.addRouteLayer(start, end, 'route');
                        }

                        // Scroll the clicked contact to the middle of the contacts-textbox
                        contactDiv.scrollIntoView({block: 'center', behavior: 'smooth'});

                    });
                });

            } catch
                (error) {
                console.error('Failed to load contacts:', error);
            }
        }

        getMarkerClassByTags(tags) {
            if (tags.includes('home')) {
                return 'home-marker';
            } else if (tags.includes('private')) {
                return 'private-marker';
            } else if (tags.includes('work')) {
                return 'work-marker';
            } else {
                return 'contact-marker';
            }
        }

        // Additional methods for marker management can be added here, e.g., getMarkerById, showAllMarkers, hideAllMarkers, etc.
    }

    class Monitor_textbox {
        constructor(map, backgroundColor) {
            this.map = map;
            this.monitorTextbox = document.createElement("div");
            this.monitorTextbox.classList.add("monitor-textbox");

            this.container = null;
        }

        onAdd() {
            this.container = document.createElement('div');
            this.container.className = 'monitor-textbox mapboxgl-ctrl';
            this.container.style.backgroundColor = backgroundColor;
            this.container.innerText = '';

            this.container.style.border = "1px solid";
            this.container.style.borderColor = "rgba(194, 181, 181)";
            this.container.style.borderRadius = "10px";
            this.container.style.textShadow = "1px 1px 1px #ccc";
            this.container.style.fontSize = "large";
            this.container.style.lineHeight = "0.9";

            this.container.style.color = "rgb(0,0,0)";
            // this.container.style.overflow = "auto";,
            this.container.style.textAlign = "center";
            this.container.style.zIndex = "1";
            this.container.style.width = "50%";

            return this.container;
        }

        remove() {
            this.container.parentNode.removeChild(this.container);
            this.map = undefined;
        }
    }

    class Contacts_textbox {
        constructor(map, backgroundColor) {
            this.map = map;
            this.contactsTextbox = document.createElement("div");
            this.contactsTextbox.classList.add("contacts-textbox");

            // Set id to Contacts_textbox
            this.contactsTextbox.id = "contacts_textbox";

            this.container = null;
        }

        onAdd() {
            this.container = document.createElement('div');
            this.container.className = 'contacts-textbox mapboxgl-ctrl';
            this.container.style.backgroundColor = backgroundColor;
            this.container.innerText = '';

            // Set the position of the container
            this.container.style.transform = "translate(-105%, -6%)";

            // Set overflow te auto
            this.container.style.overflow = "auto";

            // Set vertical scroll bar
            this.container.style.overflowY = "scroll";

            this.container.style.border = "1px solid";
            this.container.style.borderColor = "rgba(194, 181, 181)";
            this.container.style.borderRadius = "10px";
            this.container.style.fontSize = "large";
            this.container.style.lineHeight = "0.9";

            this.container.style.color = "rgb(0,0,0)";
            this.container.style.textAlign = "center";
            this.container.style.zIndex = "1";
            this.container.style.width = "50%";

            this.container.style.maxHeight = "300px"; // Limit the max height of the container

            // Set the visibility of the container to hidden
            this.container.style.visibility = "hidden";

            // Add the event listener
            this.container.addEventListener('click', (event) => {
            });

            return this.container;
        }

        remove() {
            this.container.parentNode.removeChild(this.container);
            this.map = undefined;
        }
    }

    class ContactsTextboxIcon {
        constructor(map) {
            this._map = map;
            this.contactsTextbox = new Contacts_textbox(map, backgroundColor); // Create an instance of Contacts_textbox
            this._container = null;
        }

        onAdd() {
            this._container = document.createElement('div');
            this._container.className = 'mapboxgl-ctrl contacts-textbox-icon';
            this._container.onclick = this._onClick.bind(this);

            // Append the Contacts_textbox to the container
            this._container.appendChild(this.contactsTextbox.onAdd());

            return this._container;
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
        }

        _onClick(event) {
            // Remove the width of  the contacts textbox
            this.contactsTextbox.container.style.width = '200px'; // or 'initial'

            // Set the height of the contacts textbox to 350px
            this.contactsTextbox.container.style.height = '350px';

            // Toggle the contacts textbox visibility
            if (this.contactsTextbox.container.style.visibility === "hidden") {
                this.contactsTextbox.container.style.visibility = "visible";
            } else {
                this.contactsTextbox.container.style.visibility = "hidden";
            }
        }
    }


    window.addEventListener("beforeunload", () => {
        if (mapInitializer.wakeLock) {
            mapInitializer.wakeLock.release();
            mapInitializer.wakeLock = null;
        }
    });

    // Add event listener to release the WakeLock when the page is closed
    window.addEventListener("unload", () => {
        if (mapInitializer.wakeLock) {
            mapInitializer.wakeLock.release();
            mapInitializer.wakeLock = null;
        }
    });

    const selectedStyle = localStorage.getItem("selectedMapStyle") || "mapbox://styles/mapbox/streets-v11";

    const mapInitializer = new MapInitializer(
        "map",
        selectedStyle,
        [7.008715192368488, 43.64163999646119], // Center coordinates for Valbonne
        11 // Initial zoom level
    );
})();


/*
1. Map Initialization: Extract the map initialization logic into a function or class that handles creating the
 map,
 setting its initial state, and loading the base map style.

2. Marker Management: Create a module for handling all marker-related functionalities, including adding, removing, and
 updating markers on the map.

3. Geolocation Handling: Isolate the geolocation functionality into its module, focusing on acquiring the user's
 location, tracking changes, and updating the map view accordingly.

// TODO Let’s do step 4. 'UI Components: For UI elements like buttons, textboxes, and modals, create a UI module that manages creating,
    updating, and handling events for these components.'

// TODO Let’s do step 5. 'Utility Functions: Group utility functions like getCookie, interpolate, and any other helper functions that are
    used across multiple parts of the application into a utilities module.'

// TODO Let’s do step 6. 'WakeLock Management: Since WakeLock is a specific feature that might not be directly related to map
    functionalities, consider creating a separate module to handle requesting and releasing the WakeLock.'

// TODO Let’s do step 7. 'Contacts Management: If the script involves managing contacts (as suggested by variables like contacts_lst and
    functions for updating contacts), consider creating a contacts module to handle all operations related to contacts.'

// TODO Let’s do step 8. Event Handling: 'Consolidate event listeners and their callbacks into a module or integrate them into the
     relevant modules mentioned above, ensuring that each module manages its events.'
* */

/**
 * 1. Map Initialization
 * 2. Marker Management
 * 3. Geolocation Handling
 * 4. UI Components/
 * 5. Utility Functions
 * 6. WakeLock Management
 * 7. Contacts Management
 * 8. Event Handling
 * */
