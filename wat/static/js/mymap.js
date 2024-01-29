(async function () {
    'use strict';

    // Define pointA as a global variable
    let pointA = null;

    // Define contact_position as a global variable
    let contact_position = null;

    // Define contact_name as a global variable
    let contact_name = null;
    let contact_route = null;

    let map = null; // Define map as a global variable

    let simPoint = null; // Declare simPoint as a global variable

    window.simPoint = null;

    let simulationActive = false; // Declare simulationActive as a global variable

    let contacts_markers = [];
    let contacts_markers_dict = {};

    let monitorTextbox = null;

    let mapSimulation = null;

    let isGeolocating = false;

    let geo = [];

    let i = 0; // Define i in an outer scope
    let t = 0; // Define t in an outer scope

    let startPoint = null;
    let endPoint = null;


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


    const response = await fetch('contacts_json');
    const contacts_lst = await response.json();


    const getAccessToken = async (token_id) => {
        const response = await fetch(token_id);
        const data = await response.json();
        return data.token;
    };

    window.mapbox_token = await getAccessToken('mapbox_token');
    window.googlemaps_token = await getAccessToken('googlemaps_token');

    // Get the selected style from local storage, or use a default style if no style is saved
    const selectedStyle = localStorage.getItem('selectedMapStyle') || 'mapbox://styles/mapbox/dark-v9';

    // Start. ###################### Add a contact route layer to the map

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

    // Function to add a contact marker to the map
    function addMarker(map, lngLat, name, address, el) {
        // If the marker already exists, return it, else create it
        const marker = contacts_markers.find((marker) => {
            return marker.getLngLat().lng === lngLat[0] && marker.getLngLat().lat === lngLat[1];
        }) || new mapboxgl.Marker(el)
            .setLngLat(lngLat)
            // .setPopup(
            //     new mapboxgl.Popup()
            //         .setHTML(`<h3>${name}</h3><p>${address}</p>`)
            // )
            .addTo(map);

        // Add click event listener to the marker
        marker.getElement().addEventListener('click', function () {
            console.log(`Marker at ${lngLat} was clicked.`);

            console.log("lngLat", lngLat);
            console.log('contacts_markers_dict', contacts_markers_dict);
            // create key from lngLat rounded to 2 decimals
            const key = `${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`;
            console.log("contacts_markers_dict[lngLat]", contacts_markers_dict[key]);


            //  _content.id

            // show the marker id
            console.log("marker.getElement().id", marker.getElement().id);

            // get value using key
            const value = contacts_markers_dict[key];

            contact_name = value; // Update contact_name
            contact_position = lngLat; // Update contact_position
        });

    }

    // Function to add the route layer and its source to the map
    function addRouteLayer(map, routeName, route) {
        const routeId = routeName; // Identifier for the route layer and source

        // Define the route as a GeoJSON Feature
        const routeFeature = {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': route
            }
        };

        // Check if the source already exists, and if not, add it
        if (!map.getSource(routeId)) {
            map.addSource(routeId, {
                'type': 'geojson',
                'data': routeFeature
            });
        }

        // Check if the layer already exists, and if not, add it
        if (!map.getLayer(routeId)) {
            map.addLayer({
                'id': routeId,
                'type': 'line',
                'source': routeId,
                'layout': {},
                'paint': {
                    'line-color': 'rgba(114,30,30,0.75)',
                    'line-width': 8
                }
            });
        }
    }

    // End. ####################### Add a contact route layer to the map
    // Start. ####################### Add all contact route layers to the map
    function createRouteName(contact_name) {
        return contact_name.replace(/\s/g, "_") + "_route";
    }

    function updateContactsAndWarnOnError(name, lngLat, errorMessage, contact) {
        updateContactsJson(name, lngLat).catch((error) => {
            console.warn(`${errorMessage} > ${error.message} <`, contact);
        });
    }

    function addContactMarkers(map) {
        // Iterate through the contacts_lst array
        contacts_lst.contacts.forEach((contact) => {
            // Remove spaces from the contact name and concatenate it with the word "_route"
            const routeName = createRouteName(contact.name);

            // Create a marker element
            const el = document.createElement('div');
            el.className = 'marker';

            let lngLat;
            if (contact.coords.length !== 0) {
                lngLat = contact.coords;
                addMarker(map, lngLat, contact.name, contact.address, el);
            } else {
                getLngLatFromAddress(contact.address)
                    .then((lngLat) => {
                        addMarker(map, lngLat, contact.name, contact.address, el);
                        updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using nominatim:', contact);
                    })
                    .catch((error) => {
                        console.warn('!!An error occurred using nominatim: >' + error.message + '<', contact);
                        getLngLatFromAddress_mapbox(contact.address)
                            .then((lngLat) => {
                                addMarker(map, lngLat, contact.name, contact.address, el);
                                updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using mapbox:', contact);
                            });
                    });
            }

            // Push the contact.name  to the contacts_markers_dict array useng lngLat rounded to 2 decimals as key
            contacts_markers_dict[`${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`] = routeName;
        });

    }

    function addRouteLayers(map) {
        // Iterate through the contacts_lst array. For each contact, use addRouteLayer to add a route layer to the map
        console.log("contact name", contact_name);
        contacts_lst.contacts.forEach((contact) => {
            // Remove spaces from the contact name and concatenate it with the word "_route"
            const routeName = createRouteName(contact.name);


            // if (isGeolocating) {
            //     console.log("contact name", contact.name);
            // }


            const startPoint = contact.coords;
            const endPoint = [startPoint[0], startPoint[1] + 0.045045045]; // 5 km to the north
            const numSegments = 50;

            const points = interpolate(startPoint, endPoint, numSegments);

            if (isGeolocating) {
                addRouteLayer(map, routeName, contact_route)
            } else
                addRouteLayer(map, routeName, points);
        });
    }

    function resetRoutesExceptSelected(map, selectedRouteName) {
        // Get all layers from the map
        const layers = map.getStyle().layers;

        // Iterate over all layers
        layers.forEach((layer) => {
            // Check if the layer is a route and is not the selected route
            if (layer.id.endsWith('_route') && layer.id !== selectedRouteName) {
                // Set source to an empty GeoJSON FeatureCollection instead of removing the source from the map
                map.getSource(layer.id).setData({
                    'type': 'FeatureCollection',
                    'features': []
                });
            }
        });
    }

// End. ######################### Add all contact route layers to the map

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

        // Append the select element to the map's container
        map.getContainer().appendChild(select);

        // Add an event listener to change the map style when a different option is selected
        select.addEventListener('change', function () {
            map.setStyle(this.value);

            // Save the selected style in local storage
            localStorage.setItem('selectedMapStyle', this.value);
        });
    }

// Function to initialize the map and add the route layer
    function initializeMap() {
        mapboxgl.accessToken = window.mapbox_token;

        const map = new mapboxgl.Map({
            container: 'map', // Specify the container ID
            style: selectedStyle, // Specify the initial map style
            // center: [6.9237, 43.6634], // Grasse 43.6634° N, 6.9237
            center: [7.008715192368488, 43.64163999646119], // Valbonne 43.64163999646119, 7.008715192368488
            zoom: 11 // Set the initial zoom level
        });

        map.on('load', function () {
            addContactMarkers(map); // Add the contact markers when the map initially loads
            addRouteLayers(map); // Add the route layer when the map initially loads
        });

        map.on('style.load', function () {
            addContactMarkers(map); // Add the contact markers when the map initially loads
            addRouteLayers(map); // Re-add the route layer every time the map style changes and is fully loaded
        });

        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

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
            customAttribution: "Made with ❤ by <a href='mailto://archer.chris@gmail.com'>C. Archer.</a> D’après une idée" +
                " de P. Ricaud",
        });
        map.addControl(map.attrControl, "bottom-right");


        map.on('click', (e) => {
            const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
            const coordsTxt = JSON.stringify(END);
            navigator.clipboard.writeText(coordsTxt).then(r => console.log());
            console.log("Map clicked at:", coordsTxt);
        });

        // Detect long press on map
        map.on('mousedown', (e) => {
            i = 0;
            t = 0;
            const timer = setInterval(() => {
                i++;
                if (i === 10) {
                    console.log("long press");
                    clearInterval(timer);
                    const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
                    const coordsTxt = JSON.stringify(END);
                    navigator.clipboard.writeText(coordsTxt).then(r => console.log());
                    console.log("Map longpressed at:", coordsTxt);
                }
            }, 100);
            map.on('mouseup', () => {
                clearInterval(timer);
            });
        });

        // Add style selector control to the map
        addMapStyleSelector(map);

        // Add geolocation control to the map
        const currentZoom = map.getZoom();
        // console.log("########### currentZoom", currentZoom);

        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            fitBoundsOptions: {
                zoom: 11,
                maxZoom: 11
            },
            trackUserLocation: true,
            showAccuracyCircle: true,
            showUserLocation: true,
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

        let geo_travelled = []; // Declare geo_travelled as a global variable
        // let geo_popup = null; // Declare geo_popup as a global variable
        let geo_times = 0; // Declare geo_times as a global variable

        geolocate.on('geolocate', function (e) {
            isGeolocating = true;

            geo_times = geo_times + 1;

            let speed = 'no speed';
            if (e.coords.speed)
                speed = toString(convertMetersPerSecondToKilometersPerHour(e.coords.speed)) + ' km/h'

            let heading = 0;
            if (e.coords.heading)
                heading = toString(e.coords.heading) + '°'

            let accuracy = 'no accuracy';
            if (e.coords.accuracy)
                accuracy = e.coords.accuracy + ' m'


            // if (geo_popup) {
            //     setTimeout(() => {
            //         if (isGeolocating) {
            //             geo_popup.getElement().classList.add("fade-out");
            //         }
            //     }, 500)
            //     geo_popup.remove();
            // }

            // Popup at the marker to show speed, heading and accuracy
            // geo_popup = new mapboxgl.Popup({closeOnClick: true})
            //     .setLngLat([e.coords.longitude, e.coords.latitude])
            //     .setHTML(`<h4>geo_times: ${geo_times} speed: ${speed} heading: ${heading} accuracy: ${accuracy}</h4>`)
            //     .addTo(map);


            // Set the current position into the geo_travelled array if its length is 0 else purh it
            // if (geo_travelled.length === 0) {
            //     geo_travelled = [e.coords.longitude, e.coords.latitude];
            // } else {
            //     geo_travelled.push([e.coords.longitude, e.coords.latitude]);
            // }

            // Zoom to the geolocated position
            // console.log("fly to", e.coords.longitude, e.coords.latitude);
            // map.flyTo({
            //     center: [e.coords.longitude, e.coords.latitude],
            //     zoom: 15,
            //     essential: true, // this animation is considered essential with respect to prefers-reduced-motion
            // });

            // Get the route from the geolocated position to the selected contact_position
            console.log("contact_position", contact_position);

            if (contact_position) {
                // Hide all contact route layers
                resetRoutesExceptSelected(map, contact_name);

                getDirections([e.coords.longitude, e.coords.latitude], contact_position)
                    .then(({route, distance, durée, eta, address}) => {

                        // Update the monitorTextbox
                        // displayUpdates(mapSimulation, distance, durée, eta, address);

                        // console log selected contact’s name
                        console.log("################### contact_name", contact_name);
                        console.warn("routeName", contact_name);
                        // resetRoutesExceptSelected(map, contact_name);


                        // Use contact_position as key to get the routeName from contacts_markers_dict
                        const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                        map.getSource(routeName).setData(route.geometry);
                        contact_route = route.geometry.coordinates;
                    });
            }
        });
    }


    initializeMap(); // Call the function to initialize the map


    /*map = new mapboxgl.Map({
        accessToken: window.mapbox_token,
        container: 'map',
        style: selectedStyle,
        center: [6.9237, 43.6634], // Grasse 43.6634° N, 6.9237
        zoom: 7,
    });*/

    /*map.on('style.load', function () {
        console.log("style.load loading");
        if (!map.hasImage('custom-marker')) {

            console.log("styledata. loading image for custom-marker");

            map.loadImage(bb, function (error, image) {
                if (error) throw error;

                if (!map.hasImage('custom-marker'))
                    map.addImage('custom-marker', image);

                if (!map.getSource('custom_marker_layer')) {
                    map.addSource('custom_marker_layer', {
                        'type': 'geojson',
                        'data': {
                            'type': 'FeatureCollection',
                            'features': [{
                                'type': 'Feature',
                                'properties': {},
                                'geometry': {
                                    'type': 'Point',
                                    'coordinates': [7.008715192368488, 43.64163999646119] // Valbonne 7.008715192368488, 43.64163999646119
                                }
                            }]
                        }
                    });
                }

                if (!map.getLayer('custom_marker_layer')) {
                    console.log("adding custom_marker_layer");
                    map.addLayer({
                        'id': 'custom_marker_layer',
                        'type': 'symbol',
                        'source': 'custom_marker_layer',
                        'layout': {
                            'icon-image': 'custom-marker',
                            'icon-size': 1
                        }
                    });
                }
            });
        }

        // Create  rte which represents an empty route in geojon object format
        /!*let rte = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [],
            },
        };


        function createMarker(map, lngLat, name, address, el) {
            // If the marker already exists, return it, else create it
            const marker = contacts_markers.find((marker) => {
                return marker.getLngLat().lng === lngLat[0] && marker.getLngLat().lat === lngLat[1];
            }) || new mapboxgl.Marker(el)
                .setLngLat(lngLat)
                .setPopup(
                    new mapboxgl.Popup()
                        .setHTML(`<h3>${name}</h3><p>${address}</p>`)
                )
                .addTo(map);

            // Add click event listener to the marker
            marker.getElement().addEventListener('click', function () {
                console.log(`Marker at ${lngLat} was clicked.`);

                console.log("lngLat", lngLat);
                console.log('contacts_markers_dict', contacts_markers_dict);
                // create key from lngLat rounded to 2 decimals
                const key = `${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`;
                console.log("contacts_markers_dict[lngLat]", contacts_markers_dict[key]);

                //  _content.id

                // show the marker id
                console.log("marker.getElement().id", marker.getElement().id);

                contact_position = lngLat; // Update contact_position
            });

        }

        function updateContactsAndWarnOnError(name, lngLat, errorMessage, contact) {
            updateContactsJson(name, lngLat).catch((error) => {
                console.warn(`${errorMessage} > ${error.message} <`, contact);
            });
        }

        function updateContactsJson(name, lngLat) {
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

        // Iterate through the contacts_lst array
        contacts_lst.contacts.forEach((contact) => {
            // Remove spaces from the contact name and concatenate it with the word "_route"
            const routeName = contact.name.replace(/\s/g, "_") + "_route";


            //Create source for the route if the sousrce does not exist
            if (!map.getSource(routeName)) {

                const startPoint = contact.coords;
                const endPoint = [startPoint[0], startPoint[1] + 0.045045045]; // 5 km to the north
                const numSegments = 50;

                const points = interpolate(startPoint, endPoint, numSegments);

                const dataGeometry = {
                    type: "LineString",
                    coordinates: points
                };


                // Add the route as a source to the map if it does not exist
                map.addSource(routeName, {
                    type: "geojson",
                    data: dataGeometry /!*rte.geometry*!/,
                });
            }

            // Add the route as a layer to the map if it does not exist
            if (!map.getLayer(routeName)) {
                map.addLayer({
                    id: routeName,
                    type: "line",
                    source: routeName,
                    paint: {
                        "line-color": "rgba(120,0,121,0.6)",
                        "line-width": parseInt(line_width / 3),
                    },
                })
            }

            map.setLayoutProperty(routeName, 'visibility', 'visible');

            const el = document.createElement('div');
            el.className = 'marker';

            let lngLat;
            if (contact.coords.length !== 0) {
                lngLat = contact.coords;
                createMarker(map, lngLat, contact.name, contact.address, el);
            } else {
                getLngLatFromAddress(contact.address)
                    .then((lngLat) => {
                        createMarker(map, lngLat, contact.name, contact.address, el);
                        updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using nominatim:', contact);
                    })
                    .catch((error) => {
                        console.warn('!!An error occurred using nominatim: >' + error.message + '<', contact);
                        getLngLatFromAddress_mapbox(contact.address)
                            .then((lngLat) => {
                                createMarker(map, lngLat, contact.name, contact.address, el);
                                updateContactsAndWarnOnError(contact.name, lngLat, '!!An error occurred using mapbox:', contact);
                            });
                    });
            }

            // Replace spaces in the contact name with underscores
            const contactName = contact.name.replace(/\s/g, "_") + "_route";
            // Push the contact.name  to the contacts_markers_dict array useng lngLat rounded to 2 decimals as key
            contacts_markers_dict[`${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`] = contactName;

            // createOrUpdateLineLayer(map, contactName, rte, line_width, "rgb(120,0,121)");
        });

        // Re-add any existing route layers
        map.getStyle().layers.forEach(layer => {
            if (layer.source) {
                // Add layer if it does not exist
                if (!map.getLayer(layer.id)) {
                    map.addLayer(layer);
                }
            }
        });*!/

    });*/

    /*map.on("style.load", function () {
        console.log("style loading");
    });*/

    /*map.on('load', async function () {

        let geo_travelled = []; // Declare geo_travelled as a global variable
        let geo_popup = null; // Declare geo_popup as a global variable
        let geo_times = 0; // Declare geo_times as a global variable


        // Add zoom and rotation controls to the map.
        map.addControl(new mapboxgl.NavigationControl());

        addMapStyleSelector(map);

        // Add geolocation control to the map
        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showAccuracyCircle: true,
            showUserLocation: true,
        });
        map.addControl(geolocate, 'top-right');

        geolocate.on('trackuserlocationstart', function () {
        });

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

            geo_times = geo_times + 1;

            let speed = 'no speed';
            if (e.coords.speed)
                speed = toString(convertMetersPerSecondToKilometersPerHour(e.coords.speed)) + ' km/h'

            let heading = 0;
            if (e.coords.heading)
                heading = toString(e.coords.heading) + '°'

            let accuracy = 'no accuracy';
            if (e.coords.accuracy)
                accuracy = e.coords.accuracy + ' m'


            if (geo_popup) {
                setTimeout(() => {
                    if (isGeolocating) {
                        geo_popup.getElement().classList.add("fade-out");
                    }
                }, 500)
                geo_popup.remove();
            }

            // Popup at the marker to show speed, heading and accuracy
            geo_popup = new mapboxgl.Popup({closeOnClick: true})
                .setLngLat([e.coords.longitude, e.coords.latitude])
                .setHTML(`<h4>geo_times: ${geo_times} speed: ${speed} heading: ${heading} accuracy: ${accuracy}</h4>`)
                .addTo(map);


            // Set the current position into the geo_travelled array if its length is 0 else purh it
            if (geo_travelled.length === 0) {
                geo_travelled = [e.coords.longitude, e.coords.latitude];
            } else {
                geo_travelled.push([e.coords.longitude, e.coords.latitude]);
            }

            // Zoom to the geolocated position
            console.log("fly to", e.coords.longitude, e.coords.latitude);
            map.flyTo({
                center: [e.coords.longitude, e.coords.latitude],
                zoom: 15,
                essential: true, // this animation is considered essential with respect to prefers-reduced-motion
            });

            // Get the route from the geolocated position to the selected contact_position
            console.log("contact_position", contact_position);

            if (contact_position) {
                getDirections([e.coords.longitude, e.coords.latitude], contact_position).then(({
                                                                                                   route,
                                                                                                   distance,
                                                                                                   durée,
                                                                                                   eta,
                                                                                                   address
                                                                                               }) => {

                    // Update the monitorTextbox
                    displayUpdates(mapSimulation, distance, durée, eta, address);
                    // console log selected contact’s routeName
                    console.log("routeName", route.routeName);

                    // Use contact_position as key to get the routeName from contacts_markers_dict
                    const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                    map.getSource(routeName).setData(route.geometry);
                });
            }


            // Convert geo_travelled to route.geometry.coordinates format
            // const routeGeometry = {
            //     type: "Feature",
            //     geometry: {
            //         type: "LineString",
            //         coordinates: geo_travelled,
            //     },
            // };

            // Update the line with id `travelled` described by this._currentPoint array, if the line exists, else
            // create it
            // const routeName = "contactRoute";
            // console.log("routeGeometry", routeGeometry);
            // createOrUpdateLineLayer(map, routeName, routeGeometry, line_width, "rgba(255,255,255,0.68)");

            // Update the marker's rotation
            // map.setLayoutProperty('custom_marker_layer', 'icon-rotate', heading);

            // Update the marker's position
            // map.getSource('custom_marker_layer').setData({
            //     'type': 'FeatureCollection',
            //     'features': [{
            //         'type': 'Feature',
            //         'geometry': {
            //             'type': 'Point',
            //             'coordinates': [e.coords.longitude, e.coords.latitude]
            //         }
            //     }]
            // });


            // If simulationActive is true, stop the simulation
            if (simulationActive) {
                mapSimulation.toggleSimulation();
            }

            geo = [e.coords.longitude, e.coords.latitude]; // Update geo

            if (isGeolocating) {

                // Close the selected marker’s popup
                // contacts_markers.forEach((marker) => {
                //     if (marker.getPopup().isOpen()) {
                //         marker.togglePopup();
                //     }
                // });

                // Fetch the fastest  route from geolocated position to contact_position in pink with a width of 2px, or
                // updat the route if it already exists on the map
                // getDirections(geo, contact_position).then(({route, distance, durée, eta, address}) => {
                //
                //     // Update the monitorTextbox
                //     displayUpdates(mapSimulation, distance, durée, eta, address);
                //
                //     let routeGeometrySource = route.route ? route.route : route;
                //
                //     const routeName = "simRoute"
                //     createOrUpdateLineLayer(map, routeName,routeGeometrySource, line_width, "rgb(120,0,121)");
                //
                // });
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
        console.log("contacts_lst", contacts_lst);

        // Initialize markers
        startPoint = [6.98799, 43.66121]; // Opio Rond point Coulouche 43.661221, 6.987799
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

        // map.addLayer({
        //     id: "simRoute",
        //     type: "line",
        //     source: {
        //         type: "geojson",
        //         data: route.geometry,
        //     },
        //     paint: {
        //             "line-color": "rgb(255,0,0)",
        //         "line-width": line_width,
        //     },
        // });
        // map.setLayoutProperty('simRoute', 'visibility', 'none');

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
    });*/

    /*let attributionControl = null;

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
        customAttribution: "Made with ❤ by <a href='mailto://archer.chris@gmail.com'>C. Archer.</a> D’après une idée" +
            " de P. Ricaud",
    });
    map.addControl(map.attrControl, "bottom-right");


    map.on('click', (e) => {
        const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
        const coordsTxt = JSON.stringify(END);
        navigator.clipboard.writeText(coordsTxt).then(r => console.log());
        console.log("Map clicked at:", coordsTxt);
    });

    // Detect long press on map
    map.on('mousedown', (e) => {
        i = 0;
        t = 0;
        const timer = setInterval(() => {
            i++;
            if (i === 10) {
                console.log("long press");
                clearInterval(timer);
                const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
                const coordsTxt = JSON.stringify(END);
                navigator.clipboard.writeText(coordsTxt).then(r => console.log());
                console.log("Map longpressed at:", coordsTxt);
            }
        }, 100);
        map.on('mouseup', () => {
            clearInterval(timer);
        });
    });*/

    /*

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

            // Append the select element to the map's container
            map.getContainer().appendChild(select);

            // Add an event listener to change the map style when a different option is selected
            select.addEventListener('change', function () {
                map.setStyle(this.value);

                // Save the selected style in local storage
                localStorage.setItem('selectedMapStyle', this.value);
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
                this.sim_btn = null;
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
                this.sim_btn = document.createElement("button");
                this.sim_btn.innerText = "sim";
                this.sim_btn.classList.add("sim-button");
                this.sim_btn.style.position = "absolute";
                this.sim_btn.style.zIndex = "1";
                this.sim_btn.style.top = "10px";
                this.sim_btn.style.left = "10px";
                this.sim_btn.style.borderRadius = "10px";
                this.sim_btn.style.border = "1px solid grey";
                this.sim_btn.style.backgroundColor = backgroundColor; // Set initial button color
                this.sim_btn.addEventListener("click", () => this.toggleSimulation());
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
                map.getContainer().appendChild(this.sim_btn);

                // Append the monitorTextbox to the map's container
                map.getContainer().appendChild(monitorTextbox);
            }

            _currentPoints = [];

            toggleSimulation() {


                if (simulationActive) {
                    this.sim_btn.style.backgroundColor = backgroundColor
                    // Save the current position
                    this.savedPoint = simPoint;

                    clearInterval(this.addr_interval); // Stop updating the monitorTextbox
                    clearInterval(this.simulationInterval); // Stop the animation

                    simulationActive = false; // Toggle simulation state
                } else {
                    this.sim_btn.style.backgroundColor = "grey"; // Change button color to grey
                    simulationActive = true; // Toggle simulation state

                    // Restore the saved position
                    if (this.savedPoint) {
                        simMar.setLngLat(this.savedPoint);
                    }

                    // Show the simRoute layer when the simulation is active
                    console.log("simRoute layer exists?");
                    // if (map.getLayer('simRoute')) {
                    //     console.log("simRoute layer exists. Make it visible");
                    //     map.setLayoutProperty('simRoute', 'visibility', 'visible');
                    // }

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

                        // Pan to the marker's location
                        // if (!isGeolocating)
                        //     map.panTo(this.point);

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

                        // Save the current position by pushing it to this._currentPoints array
                        this._currentPoints.push(strt)

                        // Convert this._currentPoints to route.geometry.coordinates format
                        const routeGeometry = {
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: this._currentPoints,
                            },
                        };

                        // Update the line with id `traversed` described by this._currentPoints array, if the line
                        // exists, else create it. Use createOrUpdateLineLayer()
                        // const routeName = "traversed"
                        // createOrUpdateLineLayer(map, routeName, routeGeometry, line_width, "rgba(255,255,255,0.7)");


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
        }
    */

    class ContactsControl {
        constructor() {
            this.contact_list_toggle_btn = null;
        }

        addControls(map) {
            this.contact_list_toggle_btn = document.createElement("button");
            this.contact_list_toggle_btn.innerText = "Contacts";
            this.contact_list_toggle_btn.classList.add("contacts-button");
            this.contact_list_toggle_btn.style.position = "absolute";
            this.contact_list_toggle_btn.style.top = "40px";
            this.contact_list_toggle_btn.style.left = "10px";
            this.contact_list_toggle_btn.style.borderRadius = "10px";
            this.contact_list_toggle_btn.style.border = "1px solid grey";
            this.contact_list_toggle_btn.style.backgroundColor = backgroundColor;
            this.contact_list_toggle_btn.style.visibility = "visible";

            this.contact_list_toggle_btn.addEventListener("click", () => {
                this.toggleVisibility();
            });

            // Append the button to the map's container
            map.getContainer().appendChild(this.contact_list_toggle_btn);
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

                this.contact_list_toggle_btn.style.backgroundColor = anyVisible ? 'grey' : backgroundColor;
            }
        }
    }

    class DisplayAddress_btn {
        constructor() {
            this._container = document.createElement('div');
            this.sim_address_btn = null;
        }

        addControls(map) {
            this.sim_address_btn = document.createElement('button');
            this.sim_address_btn.innerText = 'Address';
            this.sim_address_btn.classList.add = 'address-button';
            this.sim_address_btn.style.position = "absolute";
            this.sim_address_btn.style.top = "70px";
            this.sim_address_btn.style.left = "10px";
            this.sim_address_btn.style.borderRadius = "10px";
            this.sim_address_btn.style.border = "1px solid grey";
            this.sim_address_btn.style.backgroundColor = backgroundColor;
            this.sim_address_btn.style.visibility = "visible";


            this._container.appendChild(this.sim_address_btn);
            // this.popup = new mapboxgl.Popup({
            //     closeButton: false,
            //     closeOnClick: true
            // });

            this.sim_address_btn.onclick = this._showAddress.bind(this);

            map.getContainer().appendChild(this.sim_address_btn);
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
                // this.popup.setLngLat([simPoint[0], simPoint[1]])
                //     .setHTML(address)
                //     .addTo(map);

                // Fade out the popup instead of closing it
                // setTimeout(() => {
                //     if (simulationActive) {
                //         this.popup.getElement().classList.add("fade-out");
                //     }
                // }, 500);
            } else {
                console.log('simPoint is null');
            }
        }
    }
})
();
