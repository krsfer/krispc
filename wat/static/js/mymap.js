(async function () {
    'use strict';

    // Define pointA as a global variable
    let pointA = null;

    // Define marPoint as a global variable
    let marPoint = null;

    let map = null; // ??

    let simPoint = null; // Declare simPoint as a global variable

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

    let backgroundColor = 'rgba(255, 255, 255, 0.3)';

    const getAccessToken = async () => {
        const response = await fetch('mapbox_token');
        const data = await response.json();
        return data.token;
    };

    window.mapbox_token = await getAccessToken();

    // Get the selected style from local storage, or use a default style if no style is saved
    const selectedStyle = localStorage.getItem('selectedMapStyle') || 'mapbox://styles/mapbox/dark-v9';

    map = new mapboxgl.Map({
        accessToken: window.mapbox_token,
        container: 'map',
        style: selectedStyle,
        center: [6.9237, 43.6634], // Grasse 43.6634° N, 6.9237
        zoom: 7
    });

    map.on('load', async function () {
        fetch("contacts_json")
            .then((response) => response.json())
            .then((data) => {
                const contacts = data.contacts;

                // data is an array of objects with "name" and "address" properties
                contacts.forEach((contact) => {
                    // console.log("contact", contact);
                    // console.log("contact.name", contact.name);
                    // console.log('contact.address', contact.address);
                    // console.log('contact.coords', contact.coords);
                    // console.log('contact.coords.length', contact.coords.length);
                    let lngLat;
                    if (contact.coords.length !== 0) {
                        lngLat = contact.coords;
                        const marker = addMarkerToMap(map, lngLat, contact.name, contact.address);
                        contacts_markers.push(marker);
                    } else {
                        getLngLatFromAddress(contact.address)
                            .then((lngLat) => {
                                const marker = addMarkerToMap(map, lngLat, contact.name, contact.address);
                                contacts_markers.push(marker);
                                updateContactsJson(contact.name, lngLat);
                            }).catch((error) => {
                            console.warn('!!An error occurred using nominatim: >' + error.message + '<', contact);
                            getLngLatFromAddress_mapbox(contact.address)
                                .then((lngLat) => {
                                    const marker = addMarkerToMap(map, lngLat, contact.name, contact.address);
                                    contacts_markers.push(marker);
                                    updateContactsJson(contact.name, lngLat);
                                }).catch((error) => {
                                console.warn('!!An error occurred using mapbox: >' + error.message + '<', contact);
                            });
                        })
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
            console.log('geolocate end');
            // After adding the control, you can access the button element
            const geolocateButton = document.getElementsByClassName('mapboxgl-ctrl-geolocate')[0];
            console.log("geolocateButton", geolocateButton);

            // Now you can get the class list of the button
            const classList = geolocateButton.classList;

            // If the class list contains neither 'mapboxgl-ctrl-geolocate-active'
            // nor 'mapboxgl-ctrl-geolocate-background' then set isGeolocating to false
            if (!classList.contains('mapboxgl-ctrl-geolocate-active') && !classList.contains('mapboxgl-ctrl-geolocate-background')) {
                isGeolocating = false;
                console.log("isGeolocating set to false", isGeolocating);
            }
        });

        geolocate.on('geolocate', function (e) {
            console.log('success. found you!');
            console.log('Coordinates: ', e.coords.longitude, e.coords.latitude);
            console.log("marPoint", marPoint);
            console.log("is sim active", simulationActive);

            isGeolocating = true;
            console.log("isGeolocating set to true", isGeolocating);

            // If simulationActive is true, stop the simulation
            if (simulationActive) {
                mapSimulation.toggleSimulation();
            }
            // Remove the simulation route
            // if (map.getLayer("fixedRoute")) {
            //     map.removeLayer("fixedRoute");
            //     map.removeSource("fixedRoute"); // Also remove the source associated with the layer
            // }

            geo = [e.coords.longitude, e.coords.latitude]; // Update geo

            if (marPoint) {
                // Fetch the fastest  route from geolocated position to marPoint in pink with a width of 2px, or
                // updat the route if it already exists on the map
                getDirections(geo, marPoint).then((route) => {
                    if (map.getLayer("georoute")) {
                        map.getSource("georoute").setData(route.route.geometry);
                    } else {
                        map.addLayer({
                            id: "georoute",
                            type: "line",
                            source: {
                                type: "geojson",
                                data: route.route.geometry,
                            },
                            paint: {
                                "line-color": "rgba(255, 0, 255, 0.50)",
                                "line-width": 6,
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

        let displayAddressBtn = new DisplayAddress_btn();
        displayAddressBtn.addControls(map);


        // Initialize markers
        const startPoint = [6.98799, 43.66121]; // Opio Rond point Coulouche 43.661221, 6.987799
        const endPoint = [7.0821, 43.6686]; // La Colle-sur-Loup

        new mapboxgl.Marker({color: "green"}).setLngLat(startPoint).addTo(map);
        new mapboxgl.Marker({color: "red"}).setLngLat(endPoint).addTo(map);
        // Show a marker called simMar at startPoint
        simMar = new mapboxgl.Marker({color: "blue"}).setLngLat(startPoint).addTo(map);

        // Fetch and display the fastest route between startPoint and endPoint
        const route = await getDirections(startPoint, endPoint);

        map.addLayer({
            id: "fixedRoute",
            type: "line",
            source: {
                type: "geojson",
                data: route.route.geometry,
            },
            paint: {
                "line-color": "rgba(0, 0, 255, 0.50)",
                "line-width": 6,
            },
        });
        map.setLayoutProperty('fixedRoute', 'visibility', 'none');

        fixedRouteSource = map.getSource('fixedRoute');
        routeSource = map.getSource('route');
        georouteSource = map.getSource('georoute');

        // Calculate and set the bounding box of the route
        coordinates = route.route.geometry.coordinates;

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

    map.on('click', (e) => {
        const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
        const coordsTxt = JSON.stringify(END);
        navigator.clipboard.writeText(coordsTxt).then(r => console.log());
        console.log("Map clicked at:", coordsTxt);
    });

    map.on('styledata', function () {
        // console.log("map.getStyle().layers", map.getStyle().layers);
        // console.log("map.getStyle().sources", map.getStyle().sources);
        // console.log("map.getStyle().metadata", map.getStyle().metadata);
        // console.log("map.getStyle().glyphs", map.getStyle().glyphs);
        // console.log("map.getStyle().transition", map.getStyle().transition);
        // console.log("map.getStyle().light", map.getStyle().light);
        // console.log("map.getStyle().sprite", map.getStyle().sprite);
        // console.log("map.getStyle().version", map.getStyle().version);
        // console.log("map.getStyle().name", map.getStyle().name);
        // show map.getLayer('route')
        // console.log("map.getLayer('route')", map.getLayer('route'));
        // console.log("map.getLayer('georoute')", map.getLayer('georoute'));
        // console.log("map.getLayer('fixedRoute')", map.getLayer('fixedRoute'));


        // Check if the route layer exists
        /*if (!map.getLayer('route')) {
            // If the route layer does not exist, add it
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: route.route.geometry,
                },
                paint: {
                    'line-color': 'rgba(183, 0, 0, 1)',
                    'line-width': 2,
                },
            });
        }*/

        /*// Check if the georoute layer exists
        if (!map.getLayer('georoute')) {
            // If the georoute layer does not exist, add it
            map.addLayer({
                id: 'georoute',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: georoute.geometry,
                },
                paint: {
                    'line-color': 'rgba(255, 0, 255, 1)',
                    'line-width': 2,
                },
            });
        }*/

        // Test if routeSource is null
        // if (routeSource !== null) {
        //     // if route layer exists, replace its source, otherwise add it
        //     if (map.getLayer('route')) {
        //         map.getSource('route').setData(routeSource._data);
        //     } else {
        //         map.addLayer({
        //             id: 'route',
        //             type: 'line',
        //             source: {
        //                 type: 'geojson',
        //                 data: routeSource._data,
        //             },
        //             paint: {
        //                 'line-color': 'rgba(183, 0, 0, 1)',
        //                 'line-width': 2,
        //             },
        //         });
        //     }
        // }

        // Test if georouteSource is null
        // if (georouteSource !== null) {
        //     // if georoute layer exists, replace its source, otherwise add it
        //     if (map.getLayer('georoute')) {
        //         map.getSource('georoute').setData(georouteSource._data);
        //     } else {
        //         map.addLayer({
        //             id: 'georoute',
        //             type: 'line',
        //             source: {
        //                 type: 'geojson',
        //                 data: georouteSource._data,
        //             },
        //             paint: {
        //                 'line-color': 'rgba(255, 0, 255, 1)',
        //                 'line-width': 2,
        //             },
        //         });
        //     }
        // }

        // Test if fixedRouteSource is null
        if (fixedRouteSource === null) {
            console.log("fixedRouteSource is null");
        } else {
            // if fixedRoute layer exists, replace its source, otherwise add it
            if (map.getLayer('fixedRoute')) {
                map.getSource('fixedRoute').setData(fixedRouteSource._data);
            } else {
                map.addLayer({
                    id: 'fixedRoute',
                    type: 'line',
                    source: {
                        type: 'geojson',
                        data: fixedRouteSource._data,
                    },
                    paint: {
                        'line-color': 'RGB(0, 0, 255, 1)',
                        'line-width': 2,
                    },
                });
            }
        }


    });

    function addMarkerToMap(map, lngLat, name, address) {
        // Create a new marker and add it to the map
        const marker = new mapboxgl.Marker()
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
                getDirections(geo, marPoint).then(({route, distance, eta}) => {
                    // Now you can use route, distance, and eta
                    console.log("route", route);
                    console.log("distance", distance);
                    console.log("eta", eta);
                    if (map.getLayer("georoute")) {
                        // Remove the georoute layer
                        map.removeLayer("georoute");
                        map.removeSource("georoute"); // Also remove the source associated with the layer
                    }
                    // Add new route layer
                    map.addLayer({
                        id: "georoute",
                        type: "line",
                        source: {
                            type: "geojson",
                            data: route.route.geometry,
                        },
                        paint: {
                            "line-color": "rgba(255, 0, 255)",
                            "line-width": 6,
                        },
                    });
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
    console.log("csrftoken", csrftoken);

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
            monitorTextbox = null;
            this.simulationInterval = null;
            this.simMar = new mapboxgl.Marker({color: "#FF8C00"});
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

            // Create the monitorTextbox
            monitorTextbox = document.createElement("div");
            monitorTextbox.style.position = "absolute";
            monitorTextbox.style.zIndex = "1";
            monitorTextbox.style.bottom = "0px";
            monitorTextbox.style.left = "50%";
            monitorTextbox.style.transform = "translateX(-50%)";
            monitorTextbox.style.backgroundColor = backgroundColor; // 60% transparent background
            monitorTextbox.style.color = "rgba(66, 3, 3, 1)";
            // monitorTextbox.style.fontSize = '16px';
            // monitorTextbox.style.fontWeight = 'bold';
            monitorTextbox.style.fontFamily = "monospace";
            monitorTextbox.style.textAlign = "center";
            monitorTextbox.style.borderRadius = "10px";
            monitorTextbox.style.border = "1px solid lightgrey";
            // monitorTextbox.style.width = '200px';
            // monitorTextbox.style.height = '100px';
            monitorTextbox.style.lineHeight = "1.5";
            monitorTextbox.style.overflow = "auto";
            monitorTextbox.style.padding = "10px";
            monitorTextbox.innerText = "";
            monitorTextbox.style.padding = "10px";

            // Append the button to the map's container
            map.getContainer().appendChild(this.simButton);

            // Append the monitorTextbox to the map's container
            map.getContainer().appendChild(monitorTextbox);
        }

        toggleSimulation() {
            if (simulationActive) {
                this.simButton.style.backgroundColor = backgroundColor
                clearInterval(this.simulationInterval); // Stop the animation
                simulationActive = false; // Toggle simulation state

                // Hide the fixedRoute layer when the simulation is not active
                // if (map.getLayer('fixedRoute')) {
                //     map.setLayoutProperty('fixedRoute', 'visibility', 'none');
                // }
            } else {
                this.simButton.style.backgroundColor = "grey"; // Change button color to grey
                simulationActive = true; // Toggle simulation state

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
                    const elapsedTime = (Date.now() - this.startTime) / 3600000;

                    // Calculate the distance the marker should have moved by this time
                    const distance = 60 * elapsedTime;

                    // Get the point at this distance along the interpolated line
                    const point = getPointAtDistance(interpolatedCoordinates, distance);

                    // Move the marker to this point
                    simMar.setLngLat(point);
                    simPoint = point; // Update simPoint

                    // If the marker has reached the end of the line, stop the animation
                    if (elapsedTime >= totalTime) {
                        clearInterval(this.simulationInterval);
                    }
                }, 100);
            }
        }

        getDistance(pointA, pointB) {
            const R = 6371; // Radius of the earth in km
            const dLat = this.deg2rad(pointB[1] - pointA[1]);
            const dLng = this.deg2rad(pointB[0] - pointA[0]);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.deg2rad(pointA[1])) * Math.cos(this.deg2rad(pointB[1])) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c; // Distance in km
            return distance;
        }

        deg2rad(deg) {
            return deg * (Math.PI / 180);
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

})
();
//
