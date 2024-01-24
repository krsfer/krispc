(async function () {
    'use strict';

    // Define pointA as a global variable
    let pointA = null;

    // Define marPoint as a global variable
    let marPoint = null;

    let map = null; // Define map as a global variable

    let simPoint = null; // Declare simPoint as a global variable

    window.simPoint = null;

    let simulationActive = false; // Declare simulationActive as a global variable

    let contacts_markers = [];

    let monitorTextbox = null;

    let mapSimulation = null;

    let isGeolocating = false;

    let geo = [];

    let i = 0; // Define i in an outer scope
    let t = 0; // Define t in an outer scope

    let fixedRouteSource = null;
    let routeSource = null;
    let georouteSource = null;

    let endPoint = null;

    window.contacts_list = null;

    /*
        The smaller the following speed value, the slower the simulation will be, because it takes more iteration
         to move from the start point to the end point. Conversely, the larger the speed value, the faster the
          simulation will be.
        The speed value is the amount of distance the marker moves between each iteration. For example, if the speed
        value is 0.01, then the marker moves 1% of the distance between the start point and the end point between each
        iteration. If the speed value is 0.1, then the marker moves 10% of the distance between the start point and the
        end point between each iteration.
        A speed of 0 would mean the marker doesn't move at all.
        A speed of 1 would mean the marker immediately jumps to the next point in the coordinates array in each iteration.
        */
    const speed = 0.05; // Define speed in an outer scope (adjust this value to change the speed of the animation)

    let coordinates = null; // Define coordinates in an outer scope

    let simMar = null; // Define simMar in an outer scope

    window.backgroundColor = 'rgba(255, 255, 255, 0.7)';
    const line_width = 12;

    const bb = document.getElementById('blue_ball').value; // eg. /static/watapp/img/blue_ball.png
    const gb = document.getElementById('green_ball').value;

    const getAccessToken = async (token_id) => {
        const response = await fetch(token_id);
        const data = await response.json();
        return data.token;
    };

    window.mapbox_token = await getAccessToken('mapbox_token');
    window.googlemaps_token = await getAccessToken('googlemaps_token');

    // Get the selected style from local storage, or use a default style if no style is saved
    const selectedStyle = localStorage.getItem('selectedMapStyle') || 'mapbox://styles/mapbox/dark-v9';

    map = new mapboxgl.Map({
        accessToken: window.mapbox_token,
        container: 'map',
        style: selectedStyle,
        center: [6.9237, 43.6634], // Grasse 43.6634° N, 6.9237
        zoom: 7,
    });

    map.on('load', async function () {

        console.log("map.on('load')");
        // Add an image to use as a custom marker
        map.loadImage(bb, function (error, image) {

            if (error) throw error;
            map.addImage('custom-marker', image);

            // Add a layer to use the image to represent the data
            map.addLayer({
                'id': 'custom_marker_layer',
                'type': 'symbol',
                'source': {
                    'type': 'geojson',
                    'data': {
                        'type': 'FeatureCollection',
                        'features': [{
                            'type': 'Feature',
                            'properties': {},
                            'geometry': {
                                'type': 'Point',
                                'coordinates': [7.008, 43.64163999646119] // Valbonne 7.008715192368488, 43.64163999646119
                            }
                        }]
                    }
                },
                'layout': {
                    'icon-image': 'custom-marker',
                    'icon-size': 1
                }
            });
        });

        fetch("contacts_json")
            .then((response) => response.json())
            .then((data) => {
                contacts_list = data.contacts;

                // Add the control to the map
                // const displayListControl = new DisplayList_btn(contacts_list);
                // map.addControl(displayListControl, 'bottom-left');


                function createMarkerAndPush(map, lngLat, name, address, el) {
                    const marker = addMarkerToMap(map, lngLat, name, address, el);
                    contacts_markers.push(marker);
                    return marker;
                }

                function updateContactsAndWarnOnError(name, lngLat, errorMessage, contact) {
                    updateContactsJson(name, lngLat).catch((error) => {
                        console.warn(`${errorMessage} > ${error.message} <`, contact);
                    });
                }

                // data is an array of objects with "name" and "address" properties
                contacts_list.forEach((contact) => {
                    const el = document.createElement('div');
                    el.className = 'marker';

                    let lngLat;
                    if (contact.coords.length !== 0) {
                        lngLat = contact.coords;
                        createMarkerAndPush(map, lngLat, contact.name, contact.address, el);
                    } else {
                        getLngLatFromAddress(contact.address)
                            .then((lngLat) => {
                                createMarkerAndPush(map, lngLat, contact.name, contact.address, el);
                                updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using nominatim:', contact);
                            })
                            .catch((error) => {
                                console.warn('!!An error occurred using nominatim: >' + error.message + '<', contact);
                                getLngLatFromAddress_mapbox(contact.address)
                                    .then((lngLat) => {
                                        createMarkerAndPush(map, lngLat, contact.name, contact.address, el);
                                        updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using mapbox:', contact);
                                    });
                            });
                    }
                });
            });

        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

        addMapStyleSelector(map);

        // Add geolocation control to the map
        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        });
        map.addControl(geolocate, 'top-right');

        geolocate.on('trackuserlocationend', function () {
            // After adding the control, access the button element
            const geolocateButton = document.getElementsByClassName('mapboxgl-ctrl-geolocate')[0];

            // Get the class list of the button
            const classList = geolocateButton.classList;

            // If the class list contains neither 'mapboxgl-ctrl-geolocate-active'
            // nor 'mapboxgl-ctrl-geolocate-background' then set isGeolocating to false
            if (!classList.contains('mapboxgl-ctrl-geolocate-active') && !classList.contains('mapboxgl-ctrl-geolocate-background')) {
                isGeolocating = false;
                console.log("isGeolocating set to false", isGeolocating);
            }
        });

        geolocate.on('geolocate', function (e) {
            isGeolocating = true;

            const bearing = e.coords.heading; // Get the heading from geolocation

            // Update the marker's rotation
            map.setLayoutProperty('custom_marker_layer', 'icon-rotate', bearing);

            // Update the marker's position
            map.getSource('custom_marker_layer').setData({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Point',
                        'coordinates': [e.coords.longitude, e.coords.latitude]
                    }
                }]
            });


            // If simulationActive is true, stop the simulation
            if (simulationActive) {
                mapSimulation.toggleSimulation();
            }

            geo = [e.coords.longitude, e.coords.latitude]; // Update geo

            if (marPoint) {
                // Fetch the fastest  route from geolocated position to marPoint in pink with a width of 2px, or
                // updat the route if it already exists on the map
                getDirections(geo, marPoint).then(({route, distance, durée, eta, address}) => {

                    // Update the monitorTextbox
                    displayUpdates(mapSimulation, distance, durée, eta, address);

                    if (map.getLayer("georoute")) {
                        if (route.route.geometry) {
                            console.log("route.route.geometry", route.route.geometry);
                            map.getSource("georoute").setData(route.route.geometry);
                        } else {
                            console.log("route.geometry", route.geometry);
                            map.getSource("georoute").setData(route.geometry);
                        }
                    } else {
                        map.addLayer({
                            id: "georoute",
                            type: "line",
                            source: {
                                type: "geojson",
                                data: route.geometry,
                            },
                            paint: {
                                "line-color": "rgba(255, 0, 255, 0.50)",
                                "line-width": line_width,
                            },
                        });
                    }
                });
            }
        });


        mapSimulation = new MapSimulation_btn();
        mapSimulation.addControls(map);

        let contactsControl = new ContactsControl();
        contactsControl.addControls(map);

        let displayAddressBtn = new newDisplayAddress_btn();
        displayAddressBtn.addControls(map);

        let displayListBtn = new DisplayList_btn();
        displayListBtn.addControls(map);
        console.log("contacts_list", contacts_list);

        // Initialize markers
        const startPoint = [6.98799, 43.66121]; // Opio Rond point Coulouche 43.661221, 6.987799
        endPoint = [7.0821, 43.6686]; // La Colle-sur-Loup

        new mapboxgl.Marker({color: "green"}).setLngLat(startPoint).addTo(map);
        new mapboxgl.Marker({color: "red"}).setLngLat(endPoint).addTo(map);
        // Show a marker called simMar at startPoint
        simMar = new mapboxgl.Marker({color: "blue"}).setLngLat(startPoint).addTo(map);

        // Fetch and display the fastest route between startPoint and endPoint
        const {route, distance, durée, eta, address} = await getDirections(startPoint, endPoint);

        // get haversine distance between startPoint and endPoint
        const haversineDis = haversineDistance(startPoint, endPoint);

        // Update the monitorTextbox
        // displayUpdates(mapSimulation, distance, durée, eta, address);

        map.addLayer({
            id: "fixedRoute",
            type: "line",
            source: {
                type: "geojson",
                data: route.geometry,
            },
            paint: {
                "line-color": "rgba(0, 0, 255, 0.50)",
                "line-width": line_width,
            },
        });
        map.setLayoutProperty('fixedRoute', 'visibility', 'none');

        fixedRouteSource = map.getSource('fixedRoute');
        routeSource = map.getSource('route');
        georouteSource = map.getSource('georoute');

        // Calculate and set the bounding box of the route
        coordinates = route.geometry.coordinates;

        const bbox = coordinates.reduce(
            (bounds, coord) => {
                return {
                    minX: Math.min(bounds.minX, coord[0]),
                    minY: Math.min(bounds.minY, coord[1]),
                    maxX: Math.max(bounds.maxX, coord[0]),
                    maxY: Math.max(bounds.maxY, coord[1]),
                };
            },
            {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity}
        );

        // Make the map fly to the bounding box of the route
        map.fitBounds(
            [
                [bbox.minX, bbox.minY],
                [bbox.maxX, bbox.maxY],
            ],
            {padding: 50}
        );
    });

    let attributionControl = null;

    for (const control of map._controls) {
        if (control instanceof mapboxgl.AttributionControl) {
            attributionControl = control;
            break;
        }
    }
    if (attributionControl) {
        map.removeControl(attributionControl);
    } else {
        console.log("Attribution control not found.");
    }

    // Show attribution control values in console log
    map.attrControl = new mapboxgl.AttributionControl({
        compact: true,
        customAttribution: "Made with ❤ by <a href='mailto://archer.chris@gmail.com'>C. Archer</a> D’après une idée" +
            " de P. Ricaud",
    });
    map.addControl(map.attrControl, "bottom-right");


    map.on('click', (e) => {
        const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
        const coordsTxt = JSON.stringify(END);
        navigator.clipboard.writeText(coordsTxt).then(r => console.log());
        console.log("Map clicked at:", coordsTxt);
    });

    function addMarkerToMap(map, lngLat, name, address, el) {
        // Create a new marker and add it to the map
        const marker = new mapboxgl.Marker(el)
            .setLngLat(lngLat)
            .setPopup(
                new mapboxgl.Popup().setHTML(`<h3>${name}</h3><p>${address}</p>`)
            ) // add popup
            .addTo(map);

        // Add click event listener to the marker
        marker.getElement().addEventListener("click", async () => {
            marPoint = [lngLat[0], lngLat[1]]; // Update marPoint

            // If geolocation is active, get directions from current location to marker
            if (isGeolocating) {
                console.log("geolocation is active, get directions from current location to marker");
                getDirections(geo, marPoint).then(({route, distance, durée, eta, address}) => {

                    // Update the monitorTextbox
                    displayUpdates(mapSimulation, distance, durée, eta, address);

                    // If the fixedRoute layer exists, update the source data
                    if (map.getLayer("georoute")) {
                        map.getSource("georoute").setData(route.geometry);
                    } else {
                        // Otherwise, add a new georoute layer
                        map.addLayer({
                            id: "georoute",
                            type: "line",
                            source: {
                                type: "geojson",
                                data: route.geometry,
                            },
                            paint: {
                                "line-color": "rgba(0, 0, 255, 0.50)",
                                "line-width": ine_width,
                            },
                        });
                    }
                });
            }

            // Start the fade-out  (apply css) effect after n milliseconds
            setTimeout(() => {
                marker.getPopup().getElement().classList.add("fade-out");
            }, 100);
        });
        return marker;
    }

    function haversineDistance(coord1, coord2) {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(coord2[1] - coord1[1]);
        const dLng = deg2rad(coord2[0] - coord1[0]);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(coord1[1])) * Math.cos(deg2rad(coord2[1])) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in km
        return distance;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    function getPointAtDistance(coords, distance) {
        let coveredDistance = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const segmentDistance = haversineDistance(coords[i], coords[i + 1]);
            if (coveredDistance + segmentDistance > distance) {
                const remainingDistance = distance - coveredDistance;
                const fraction = remainingDistance / segmentDistance;
                const lng = coords[i][0] + fraction * (coords[i + 1][0] - coords[i][0]);
                const lat = coords[i][1] + fraction * (coords[i + 1][1] - coords[i][1]);
                return [lng, lat];
            }
            coveredDistance += segmentDistance;
        }
        return coords[coords.length - 1];
    }

    function interpolate(pointA, pointB, numSegments) {
        const dx = (pointB[0] - pointA[0]) / numSegments;
        const dy = (pointB[1] - pointA[1]) / numSegments;
        const points = [];
        for (let i = 0; i <= numSegments; i++) {
            const x = pointA[0] + dx * i;
            const y = pointA[1] + dy * i;
            points.push([x, y]);
        }
        return points;
    }

    function addMapStyleSelector(map) {
        // Create the select element
        const select = document.createElement('select');
        select.style.position = 'absolute';
        select.style.top = '10px';
        select.style.left = '50%';
        select.style.transform = 'translateX(-50%)';
        select.style.backgroundColor = backgroundColor; // 60% transparent background
        select.style.textAlign = 'center';
        select.style.borderRadius = '10px';
        select.style.border = '1px solid lightgrey';
        select.style.zIndex = '1';

        // Define the map styles
        const mapStyles = [
            {name: 'Dark', style: 'mapbox://styles/mapbox/dark-v9'},
            {name: 'Light', style: 'mapbox://styles/mapbox/light-v9'},
            {name: 'Streets', style: 'mapbox://styles/mapbox/streets-v11'},
            {name: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11'},
            {name: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9'}
        ];

        // Create an option element for each map style
        for (const mapStyle of mapStyles) {
            const option = document.createElement('option');
            option.value = mapStyle.style;
            option.text = mapStyle.name;
            select.appendChild(option);
        }

        // Set the selected option to the one that matches the selectedStyle
        select.value = selectedStyle;

        // Add an event listener to change the map style when a different option is selected
        select.addEventListener('change', function () {
            map.setStyle(this.value);
            // Save the selected style in local storage
            localStorage.setItem('selectedMapStyle', this.value);
        });

        // Append the select element to the map's container
        map.getContainer().appendChild(select);
    }

    function updateContactsJson(name, lngLat) {
        // console.log("updateContactsJson");
        // console.log("name", name);
        // console.log("lngLat", lngLat);
        fetch('update_contacts_json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken,
            },
            body: JSON.stringify({
                name: name,
                coords: lngLat,
            }),
        })
            .then(response => response.json())
            .then(data => console.log(data))
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    let csrftoken = getCookie('csrftoken');

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            let cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                let cookie = cookies[i].trim();
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    class MapSimulation_btn {
        constructor() {
            simulationActive = false;
            this.simButton = null;
            this.coordinates = null;
            this.startTime = null;
            this.elapsedTime = null;
            monitorTextbox = null;
            this.simulationInterval = null;
            this.addr_interval = null;
            this.simMar = new mapboxgl.Marker({color: "#FF8C00"});
            this.savedPoint = null; // Declare savedPoint as a global variable
        }

        addControls(map) {
            this.simButton = document.createElement("button");
            this.simButton.innerText = "sim";
            this.simButton.classList.add("sim-button");
            this.simButton.style.position = "absolute";
            this.simButton.style.zIndex = "1";
            this.simButton.style.top = "10px";
            this.simButton.style.left = "10px";
            this.simButton.style.borderRadius = "10px";
            this.simButton.style.border = "1px solid grey";
            this.simButton.style.backgroundColor = backgroundColor; // Set initial button color
            this.simButton.addEventListener("click", () => this.toggleSimulation());
            this.point = null;

            // Create the monitorTextbox
            monitorTextbox = document.createElement("div");
            // monitorTextbox.style.fontWeight = 'bold';
            // monitorTextbox.style.height = '100px';
            // monitorTextbox.style.width = '200px';
            monitorTextbox.classList.add("monitor-textbox");
            monitorTextbox.innerText = "";
            monitorTextbox.style.backgroundColor = backgroundColor;
            monitorTextbox.style.border = "1px solid";
            monitorTextbox.style.borderColor = "rgba(194, 181, 181)";
            monitorTextbox.style.borderRadius = "10px";
            monitorTextbox.style.bottom = "5px";
            monitorTextbox.style.color = "rgba(8, 4, 244)";
            // monitorTextbox.style.fontFamily = "monospace";
            monitorTextbox.style.fontSize = '18px';
            monitorTextbox.style.lineHeight = "0.9";
            monitorTextbox.style.overflow = "auto";
            monitorTextbox.style.padding = "10px";
            monitorTextbox.style.position = "absolute";
            monitorTextbox.style.textAlign = "center";
            monitorTextbox.style.left = "50%";
            monitorTextbox.style.transform = "translateX(-50%)";
            monitorTextbox.style.zIndex = "1";

            // Append the button to the map's container
            map.getContainer().appendChild(this.simButton);

            // Append the monitorTextbox to the map's container
            map.getContainer().appendChild(monitorTextbox);
        }

        toggleSimulation() {


            if (simulationActive) {
                this.simButton.style.backgroundColor = backgroundColor
                // Save the current position
                this.savedPoint = simPoint;

                clearInterval(this.addr_interval); // Stop updating the monitorTextbox
                clearInterval(this.simulationInterval); // Stop the animation

                simulationActive = false; // Toggle simulation state
            } else {
                this.simButton.style.backgroundColor = "grey"; // Change button color to grey
                simulationActive = true; // Toggle simulation state

                // Restore the saved position
                if (this.savedPoint) {
                    simMar.setLngLat(this.savedPoint);
                }

                // Show the fixedRoute layer when the simulation is active
                if (map.getLayer('fixedRoute')) {
                    map.setLayoutProperty('fixedRoute', 'visibility', 'visible');
                }

                // Calculate the total distance of the route in kilometers
                let totalDistance = 0;
                for (let i = 0; i < coordinates.length - 1; i++) {
                    totalDistance += haversineDistance(coordinates[i], coordinates[i + 1]);
                }

                // Calculate the total time it would take to traverse the route at 60 km/h
                const totalTime = totalDistance / 60;

                // Interpolate additional points for a smoother animation
                const numSegments = 100; // Adjust this value to change the smoothness of the animation
                const interpolatedCoordinates = [];
                for (let i = 0; i < coordinates.length - 1; i++) {
                    interpolatedCoordinates.push(...interpolate(coordinates[i], coordinates[i + 1], numSegments));
                }

                // Start the animation
                this.simulationInterval = setInterval(() => {
                    // Calculate the elapsed time since the start of the animation in hours
                    if (!this.startTime) this.startTime = Date.now();
                    this.elapsedTime = (Date.now() - this.startTime) / 3600000;

                    // Calculate the distance the marker should have moved by this time
                    const distance = 60 * this.elapsedTime;

                    // Get the point at this distance along the interpolated line
                    this.point = getPointAtDistance(interpolatedCoordinates, distance);

                    // Move the marker to this point
                    simMar.setLngLat(this.point);
                    // console.log("simMar", simMar.getLngLat());
                    simPoint = this.point; // Update simPoint
                    window.simPoint = simPoint; // Update window.simPoint

                    // If the marker has reached the end of the line, stop the animation
                    if (this.elapsedTime >= totalTime) {
                        clearInterval(this.addr_interval);
                        clearInterval(this.simulationInterval);
                    }
                }, 100);


                // Update the monitorTextbox every 3 seconds
                this.addr_interval = setInterval(async () => {
                    // Get lnglat[] from simMar
                    const lnglat = simMar.getLngLat();
                    const strt = lnglat.toArray();

                    getDirections(strt, endPoint)
                        .then(({route, distance, durée, eta, address}) => {
                            displayUpdates(mapSimulation, distance, durée, eta, address);
                        })
                        .catch(error => {
                            console.error("Error getting directions:", error);
                        });


                }, 5000);

            }
        }

        updateMonitorTextbox(text) {
            monitorTextbox.innerText = text;
        }
    }

    class ContactsControl {
        constructor() {
            this.controlButton = null;
        }

        addControls(map) {
            this.controlButton = document.createElement("button");
            this.controlButton.innerText = "Contacts";
            this.controlButton.classList.add("contacts-button");
            this.controlButton.style.position = "absolute";
            this.controlButton.style.top = "40px";
            this.controlButton.style.left = "10px";
            this.controlButton.style.borderRadius = "10px";
            this.controlButton.style.border = "1px solid grey";
            this.controlButton.style.backgroundColor = backgroundColor;
            this.controlButton.style.visibility = "visible";

            this.controlButton.addEventListener("click", () => {
                this.toggleVisibility();
            });

            // Append the button to the map's container
            map.getContainer().appendChild(this.controlButton);
        }

        toggleVisibility() {
            console.log("toggleVisibility");
            // Toggle visibility of contact markers

            // Test if markers array is empty
            if (contacts_markers.length === 0) {
                console.error("markers array is empty");
            } else {
                let anyVisible = true;
                contacts_markers.forEach((marker) => {
                    marker._element.hidden = !marker._element.hidden;
                    anyVisible = marker._element.hidden;
                });

                this.controlButton.style.backgroundColor = anyVisible ? 'grey' : backgroundColor;
            }
        }
    }

    class DisplayAddress_btn {
        constructor() {
            this._container = document.createElement('div');
            this._btn = null;
        }

        addControls(map) {
            this._btn = document.createElement('button');
            this._btn.innerText = 'Address';
            this._btn.classList.add = 'address-button';
            this._btn.style.position = "absolute";
            this._btn.style.top = "70px";
            this._btn.style.left = "10px";
            this._btn.style.borderRadius = "10px";
            this._btn.style.border = "1px solid grey";
            this._btn.style.backgroundColor = backgroundColor;
            this._btn.style.visibility = "visible";


            this._container.appendChild(this._btn);
            this.popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false
            });

            this._btn.onclick = this._showAddress.bind(this);

            map.getContainer().appendChild(this._btn);
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
        }

        async _showAddress() {
            if (simPoint) { // Check if simPoint is not null
                const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${simPoint[0]},${simPoint[1]}.json?access_token=${window.mapbox_token}`);
                const data = await response.json();
                const address = data.features[0].place_name;

                // Set the popup coordinates to the simPoint coordinates
                this.popup.setLngLat([simPoint[0], simPoint[1]])
                    .setHTML(address)
                    .addTo(map);

                // Fade out the popup instead of closing it
                setTimeout(() => {
                    if (simulationActive) {
                        this.popup.getElement().classList.add("fade-out");
                    }
                }, 100);
            } else {
                console.log('simPoint is null');
            }
        }
    }
})();
