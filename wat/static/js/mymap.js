class MapInitializer {
    constructor(containerId, style, center, zoom) {
        this.initMap(containerId, style, center, zoom);
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
            console.log("Map loaded");
            this.addMapControls();
            this.modifyAttributionControl();
            const start = [7.008715192368488, 43.64163999646119];
            const end = [6.993073, 43.675819];
            this.addRouteLayer(start, end);
        });

        this.initWakeLock();

        // Listen for style load event to reapply the route layer when the style changes
        this.map.on('style.load', () => {
            console.log('Map style changed');
            // const start = [7.008715192368488, 43.64163999646119];
            // const end = [6.993073, 43.675819];
            // this.addRouteLayer(start, end); // Reapply the route layer
            this.reAddRouteLayer(); // Re-add the route layer
        });
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
                console.log("WakeLock is active");

                this.wakeLock.addEventListener("release", () => {
                    console.log("WakeLock was released");
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

    addMapControls() {
        // Add navigation control (zoom in/out)
        this.map.addControl(new mapboxgl.NavigationControl(), "top-right");

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
        geolocate.on("geolocate", (e) => {
            console.log("Geolocated:", e.coords);
            if (this.markerManager.lastClickedMarkerLngLat) {
                const start = [e.coords.longitude, e.coords.latitude];
                const end = [this.markerManager.lastClickedMarkerLngLat.lng, this.markerManager.lastClickedMarkerLngLat.lat];
                this.addRouteLayer(start, end);
            }
        });

        // Add FullscreenControl
        this.map.addControl(new mapboxgl.FullscreenControl(), "top-right");

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

        // Add MarkerManager
        this.markerManager = new MarkerManager(this.map);
        // this.markerManager.addMarker([7.008715192368488, 43.64163999646119], "Valbonne", "Valbonne, France", document.getElementById("marker"));
        this.markerManager.addContactMarkers('contacts_json'); // Pass the URL or path to your contacts.json
    }

    modifyAttributionControl() {
        // Find and remove existing attribution control
        let attributionControl = this.map._controls.find(control => control instanceof mapboxgl.AttributionControl);
        if (attributionControl) {
            this.map.removeControl(attributionControl);
        } else {
            console.log("Attribution control not found.");
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
    async addRouteLayer(start, end) {
        const startLng = start[0];
        const startLat = start[1];
        const endLng = end[0];
        const endLat = end[1];

        // Fetch the route from OSRM
        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`);
        const data = await response.json();

        // Extract the route geometry
        const route = data.routes[0];
        const route_geometry = route.geometry;

        // Add the route as a source and layer if it doesn't already exist
        if (!this.map.getSource('route')) {
            this.map.addSource('route', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': route_geometry
                }
            });

            this.map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#00ff00', // Transparent green color
                    'line-opacity': 0.5, // Transparency level
                    'line-width': 5
                }
            });
        } else {
            // If the source exists, just update its data
            this.map.getSource('route').setData({
                'type': 'Feature',
                'properties': {},
                'geometry': route_geometry
            });

            // Initialize variables at the beginning of the function
            let distance = '0 m'; // Default value for distance
            let duration = 0; // Default value for duration
            let eta = ''; // Default value for estimated time of arrival
            let address = 'No address found'; // Default default value for address
            let durée = '00:00:00'; // Default value for duration in HH:MM:SS format

            // Store the route data
            this.routeData = {
                start: start,
                end: end,
                route: route,
                distance: distance,
                durée: durée,
                eta: eta,
                address: address
            };

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

        let distance = convertDistance(route.distance);
        let {hours, minutes, seconds} = convertDuration(route.duration);
        let durée = formatDuration(hours, minutes, seconds);

        let eta = new Date();
        eta.setHours(eta.getHours() + hours);
        eta.setMinutes(eta.getMinutes() + minutes);
        eta.setSeconds(eta.getSeconds() + seconds);
        eta = eta.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

        // Use googleMapsUrl to get address
        const googlemaps_token = await this.getAccessToken("googlemaps_token")
        const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${startLat},${startLng}&key=${googlemaps_token}`;
        let address = 'No address found';
        const googleMapsData = await fetch(googleMapsUrl).then(response => response.json());
        if (googleMapsData.status === 'OK') {
            address = googleMapsData.results[0].address_components[0].long_name + ' '
                + googleMapsData.results[0].address_components[1].short_name + ', '
                + googleMapsData.results[0].address_components[2].long_name;
        }

        console.log({route, distance, durée, eta, address});
        return {route, distance, durée, eta, address};

    }

    // Add this function to re-add the route layer
    reAddRouteLayer() {
        // Check if the route data exists and the map has been initialized
        if (this.routeData && this.map) {
            // Check if the route layer exists
            if (this.map.getLayer('route')) {
                // Remove the existing route layer
                this.map.removeLayer('route');
            }

            // Check if the route source exists
            if (this.map.getSource('route')) {
                // Remove the existing route source
                this.map.removeSource('route');
            }

            // Re-add the route layer with the updated route data
            this.addRouteLayer(this.routeData.start, this.routeData.end);
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

        this.init();
    }

    init() {
        const select = document.createElement("select");
        select.style.position = "absolute";
        select.style.top = "10px";
        select.style.right = "50px";
        select.style.backgroundColor = "rgba(255, 255, 255, 0.6)"; // 60% transparent background
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

        this.map.getContainer().appendChild(select);
    }
}

class MarkerManager {
    constructor(map) {
        this.map = map;
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
            marker = new mapboxgl.Marker({
                element: element,
                draggable: true // Make the marker draggable
            })
                .setLngLat(lngLat)
                .setPopup(new mapboxgl.Popup().setHTML(`<h3>${name}</h3><p>${address}</p>`))
                .addTo(this.map);

            marker.on('dragstart', this.onDragStart.bind(this, marker));
            marker.on('dragend', this.onDragEnd.bind(this, marker));

            // Add click event listener to the marker
            marker.getElement().addEventListener('click', () => {
                this.lastClickedMarkerLngLat = marker.getLngLat();

                console.log('Contact name:', marker.contact_name);
                console.log('Clicked marker lngLat:', this.lastClickedMarkerLngLat);

                // Here you can also trigger the geolocate event or any other logic needed
            });

            // Store the marker for future reference
            this.markers.push(marker);
        }

        // Set custom properties for the marker
        marker.contact_name = name.replace(/\u00A0/g, " "); // Replace nbsp with space in name
        marker.contact_position = lngLat;
    }

    onDragStart(marker) {
        marker.originalLngLat = marker.getLngLat();
        console.log('Drag start:', marker.originalLngLat);
    }

    onDragEnd(marker) {
        const lngLat = marker.getLngLat();
        // let lngLat = marker.getLngLat();
        const some_name = marker.contact_name;

        console.log('Drag end:', lngLat);

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
            const contacts = data.contacts;

            contacts.forEach(contact => {
                const el = document.createElement('div');
                el.className = this.getMarkerClassByTags(contact.tags);

                // Assuming lngLat is directly available on the contact object
                const lngLat = contact.coords;

                if (lngLat && lngLat.length === 2) {
                    this.addMarker(lngLat, contact.name, contact.address, el);
                } else {
                    console.error('Invalid coordinates for contact:', contact.name);
                }
            });
        } catch (error) {
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

window.addEventListener("beforeunload", () => {
    if (mapInitializer.wakeLock) {
        mapInitializer.wakeLock.release();
        mapInitializer.wakeLock = null;
    }
});

// Usage
const selectedStyle = localStorage.getItem("selectedMapStyle") || "mapbox://styles/mapbox/streets-v11";
const mapInitializer = new MapInitializer(
    "map",
    selectedStyle,
    [7.008715192368488, 43.64163999646119], // Center coordinates for Valbonne
    11 // Initial zoom level
);

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
/*
Let’s do step 3 : `Geolocation Handling: Isolate the geolocation functionality into its module, focusing on acquiring the user's location,
tracking changes, and updating the map view accordingly.` On geolocate track success, if a marker is selected,
fetch and display the fastest route between the geolocated current lnglat and the selected marker’s lnglat. setSelectedMarker is done
when the user clicks on a marker.
async function getDirections uses `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
* */
