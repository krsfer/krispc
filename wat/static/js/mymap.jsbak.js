(async function () {
    'use strict';

    let pointA = null;

    let contact_position = null;

    let contact_name = null;
    let contact_route = null;

    let map = null; // Define map as a global variable

    let simPoint = null; // Declare simPoint as a global variable

    window.simPoint = null;

    let simulationActive = false; // Declare simulationActive as a global variable

    let contacts_markers = [];
    let contacts_markers_dict = {};

    let monitorTextbox = null;

    let geoTextbox = null;

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

    window.backgroundColor = 'rgba(255, 255, 255, 0.3)';
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

    const selectedStyle = localStorage.getItem('selectedMapStyle') || 'mapbox://styles/mapbox/dark-v9';


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

    function addMarker(map, lngLat, name, address, el) {
        const marker = contacts_markers.find((marker) => {
            return marker.getLngLat().lng === lngLat[0] && marker.getLngLat().lat === lngLat[1];
        }) || new mapboxgl.Marker(el)
            .setLngLat(lngLat)
            .setPopup(
                new mapboxgl.Popup()
                    .setHTML(`<h3>${name}</h3><p>${address}</p>`),
            )
            .addTo(map);

        marker.getElement().style.visibility = "visible";

        marker.getPopup().options.closeButton = false;

        marker.getElement().style.zIndex = 1;

        marker.getElement().style.cursor = 'pointer';

        contacts_markers.push(marker);

        marker.getElement().addEventListener('click', function () {

            const key = `${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`;

            const value = contacts_markers_dict[key];

            contact_name = value; // Update contact_name
            contact_position = lngLat; // Update contact_position

            if (isGeolocating) {
                resetRoutesExceptSelected(map, contact_name);

                getDirections([geo[0], geo[1]], contact_position)
                    .then(({route, distance, durée, eta, address}) => {

                        if (!monitorTextbox)
                            monitorTextbox = new Monitor_textbox(map, window.backgroundColor);

                        displayUpdates(monitorTextbox, distance, durée, eta, address);

                        setTimeout(() => {
                            marker.getPopup().getElement().classList.add("fade-out");
                        }, 500);
                        marker.getPopup().getElement().style.zIndex = 0;


                        const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                        map.getSource(routeName).setData(route.geometry);
                        contact_route = route.geometry.coordinates;
                    });
            } else {
                setTimeout(() => {
                    marker.getPopup().getElement().classList.add("fade-out");
                }, 500);
            }
        });

    }

    function addRouteLayer(map, routeName, route, destination) {
        const routeId = routeName; // Identifier for the route layer and source

        const routeFeature = {
            'type': 'Feature',
            'properties': {},
            'geometry': {
                'type': 'LineString',
                'coordinates': route
            }
        };

        if (!map.getSource(routeId)) {
            map.addSource(routeId, {
                'type': 'geojson',
                'data': routeFeature
            });
        }

        if (!map.getLayer(routeId)) {
            map.addLayer({
                'id': routeId,
                'type': 'line',
                'source': routeId,
                'layout': {},
                'paint': {
                    "line-color": "rgb(255,0,0)",
                    "line-width": 8,
                },
            });

            map.on('mouseenter', routeId, function () {
                map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', routeId, function () {
                map.getCanvas().style.cursor = '';
            });

            map.on('click', routeId, function (e) {
                console.log('Route line clicked:', e);
                map.panTo(destination);
            });
        }
    }

    function createRouteName(contact_name) {
        return contact_name.replace(/\s/g, "_") + "_route";
    }

    function updateContactsAndWarnOnError(name, lngLat, errorMessage, contact) {
        updateContactsJson(name, lngLat).catch((error) => {
            console.warn(`${errorMessage} > ${error.message} <`, contact);
        });
    }

    function addContactMarkers(map) {
        contacts_lst.contacts.forEach((contact) => {
            const routeName = createRouteName(contact.name);

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

            contacts_markers_dict[`${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`] = routeName;
        });

    }

    function addRouteLayers(map) {
        contacts_lst.contacts.forEach((contact) => {
            const routeName = createRouteName(contact.name);

            const startPoint = contact.coords;
            const endPoint = [startPoint[0], startPoint[1] + 0.045045045]; // 5 km to the north
            const numSegments = 50;

            const points = [];

            if (isGeolocating) {
                addRouteLayer(map, routeName, contact_route, startPoint)
            } else
                addRouteLayer(map, routeName, points, startPoint);
        });
    }

    function resetRoutesExceptSelected(map, selectedRouteName) {
        const layers = map.getStyle().layers;

        layers.forEach((layer) => {
            if (layer.id.endsWith('_route') && layer.id !== selectedRouteName) {
                map.getSource(layer.id).setData({
                    'type': 'FeatureCollection',
                    'features': []
                });
            }
        });
    }


    function addMapStyleSelector(map) {
        const select = document.createElement('select');
        select.style.position = 'absolute';
        select.style.top = '10px';

        select.style.right = '50px';

        select.style.backgroundColor = backgroundColor; // 60% transparent background
        select.style.textAlign = 'center';
        select.style.borderRadius = '10px';
        select.style.border = '1px solid lightgrey';
        select.style.zIndex = '10';

        const mapStyles = [
            {name: 'Dark', style: 'mapbox://styles/mapbox/dark-v9'},
            {name: 'Light', style: 'mapbox://styles/mapbox/light-v9'},
            {name: 'Streets', style: 'mapbox://styles/mapbox/streets-v11'},
            {name: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11'},
            {name: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9'}
        ];

        for (const mapStyle of mapStyles) {
            const option = document.createElement('option');
            option.value = mapStyle.style;
            option.text = mapStyle.name;
            select.appendChild(option);
        }

        select.value = selectedStyle;

        map.getContainer().appendChild(select);

        select.addEventListener('change', function () {
            map.setStyle(this.value);

            localStorage.setItem('selectedMapStyle', this.value);
        });
    }

    function removeAllPopups() {
        contacts_markers.forEach((marker) => {
            if (marker.getPopup().isOpen()) {
                marker.togglePopup();
            }
        });
    }

    function initializeMap() {
        mapboxgl.accessToken = window.mapbox_token;

        const map = new mapboxgl.Map({
            container: 'map', // Specify the container ID
            style: selectedStyle, // Specify the initial map style
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

        map.attrControl = new mapboxgl.AttributionControl({
            compact: true,
            customAttribution: "Made with ❤ by <a href='mailto://archer.chris@gmail.com'>C. Archer.</a> D’après une idée" +
                " de P. Ricaud",
        });
        map.addControl(map.attrControl, "bottom-right");


        map.on('click', (e) => {
            const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
            const coordsTxt = JSON.stringify(END);
        });

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

            map.on('move', function () {
                removeAllPopups();
            });
        });

        addMapStyleSelector(map);

        const currentZoom = map.getZoom();

        const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showAccuracyCircle: true,
            showUserLocation: true,
        });
        map.addControl(geolocate, 'top-right');

        class ContactsControl {
            constructor(map, backgroundColor) {
                this.contact_list_toggle_btn = document.createElement("button");
                this.contact_list_toggle_btn.innerText = "Contacts";
                this.contact_list_toggle_btn.classList.add("contacts-button");
                this.contact_list_toggle_btn.style.position = "absolute";
                this.contact_list_toggle_btn.style.top = "10px";
                this.contact_list_toggle_btn.style.left = "10px";
                this.contact_list_toggle_btn.style.borderRadius = "10px";
                this.contact_list_toggle_btn.style.border = "1px solid grey";
                this.contact_list_toggle_btn.style.backgroundColor = backgroundColor;
                this.contact_list_toggle_btn.style.visibility = "visible";

                this.contact_list_toggle_btn.addEventListener("click", () => {
                    this.toggleVisibility()
                });

                map.getContainer().appendChild(this.contact_list_toggle_btn);
            }

            toggleVisibility() {
                console.log("toggleVisibility");


                if (contacts_markers.length === 0) {
                    console.error("markers array is empty");
                } else {
                    contacts_markers.forEach((marker) => {
                        console.log("marker.getElement().id", marker.getElement().id);
                        const visibility = marker.getElement().style.visibility;

                        console.log("visibility before", marker.getElement().style.visibility)

                        if (visibility === "visible") {
                            marker.getElement().style.visibility = "hidden";
                        } else {
                            marker.getElement().style.visibility = "visible";
                        }

                        console.log("visibility after", marker.getElement().style.visibility)
                    });

                }
            }
        }

        let contactsControl = new ContactsControl(map, window.backgroundColor);


        geolocate.on('trackuserlocationend', function () {
            const geolocateButton = document.getElementsByClassName('mapboxgl-ctrl-geolocate')[0];

            const classList = geolocateButton.classList;

            if (!classList.contains('mapboxgl-ctrl-geolocate-active') && !classList.contains('mapboxgl-ctrl-geolocate-background')) {
                isGeolocating = false;
                console.log("isGeolocating set to false", isGeolocating);
            }
        });

        let geo_travelled = []; // Declare geo_travelled as a global variable
        let geo_textbox = null;
        let geo_times = 0; // Declare geo_times as a global variable

        geolocate.on('geolocate', function (e) {
            isGeolocating = true;

            geo = [e.coords.longitude, e.coords.latitude];

            geo_times = geo_times + 1;

            let speed = 'no speed';
            if (e.coords.speed)
                speed = toString(convertMetersPerSecondToKilometersPerHour(e.coords.speed)) + ' km/h'

            let heading = "no heading";
            if (e.coords.heading)
                heading = toString(e.coords.heading) + '°'

            let accuracy = 'no accuracy';
            if (e.coords.accuracy)
                accuracy = e.coords.accuracy + ' m'

            if (!geo_textbox)
                geo_textbox = new Geo_textbox(map, window.backgroundColor);


            if (geo_textbox && speed > 0) {
                setTimeout(() => {
                    geo_textbox.geoTextbox.classList.add("fade-out");
                }, 500)
            } else {
                console.log("geo_textbox does not exist");
            }



            geo_textbox.geoTextbox.innerText = `geo_times: ${geo_times}
                speed: ${speed}
                heading: ${heading}
                accuracy: ${accuracy}`;







            if (contact_position) {
                resetRoutesExceptSelected(map, contact_name);

                getDirections([e.coords.longitude, e.coords.latitude], contact_position)
                    .then(({route, distance, durée, eta, address}) => {

                        if (!monitorTextbox)
                            monitorTextbox = new Monitor_textbox(map, window.backgroundColor);

                        displayUpdates(monitorTextbox, distance, durée, eta, address);


                        const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                        map.getSource(routeName).setData(route.geometry);
                        contact_route = route.geometry.coordinates;
                    });
            }
        });
    }


    initializeMap(); // Call the function to initialize the map

    class Monitor_textbox {
        constructor(map, backgroundColor) {
            this.monitorTextbox = document.createElement("div");
            this.monitorTextbox.classList.add("monitor-textbox");
            this.monitorTextbox.innerText = "";
            this.monitorTextbox.style.backgroundColor = backgroundColor;
            this.monitorTextbox.style.border = "1px solid";
            this.monitorTextbox.style.borderColor = "rgba(194, 181, 181)";
            this.monitorTextbox.style.borderRadius = "10px";
            this.monitorTextbox.style.bottom = "5px";
            this.monitorTextbox.style.textShadow = "1px 1px 1px #ccc";
            this.monitorTextbox.style.color = "rgb(0,0,0)";
            this.monitorTextbox.style.fontSize = '20px';
            this.monitorTextbox.style.lineHeight = "0.9";
            this.monitorTextbox.style.overflow = "auto";
            this.monitorTextbox.style.padding = "10px";
            this.monitorTextbox.style.position = "absolute";
            this.monitorTextbox.style.textAlign = "center";
            this.monitorTextbox.style.right = "5px";
            this.monitorTextbox.style.zIndex = "1";

            map.getContainer().appendChild(this.monitorTextbox);
        }
    }

    class Geo_textbox {
        constructor(map, backgroundColor) {
            this.geoTextbox = document.createElement("div");
            this.geoTextbox.classList.add("geo-textbox");
            this.geoTextbox.innerText = "";
            this.geoTextbox.style.backgroundColor = backgroundColor;
            this.geoTextbox.style.border = "1px solid";
            this.geoTextbox.style.borderColor = "rgba(194, 181, 181)";
            this.geoTextbox.style.borderRadius = "10px";
            this.geoTextbox.style.top = "5px"; // Changed from "bottom: 5px"
            this.geoTextbox.style.textShadow = "1px 1px 1px #ccc";
            this.geoTextbox.style.color = "rgb(0,0,0)";
            this.geoTextbox.style.fontSize = '20px';
            this.geoTextbox.style.lineHeight = "0.9";
            this.geoTextbox.style.overflow = "auto";
            this.geoTextbox.style.padding = "10px";
            this.geoTextbox.style.position = "absolute";
            this.geoTextbox.style.textAlign = "center";
            this.geoTextbox.style.left = "5px";
            this.geoTextbox.style.zIndex = "1";

            map.getContainer().appendChild(this.geoTextbox);
        }
    }


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

        /!*let rte = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [],
            },
        };


        function createMarker(map, lngLat, name, address, el) {
            const marker = contacts_markers.find((marker) => {
                return marker.getLngLat().lng === lngLat[0] && marker.getLngLat().lat === lngLat[1];
            }) || new mapboxgl.Marker(el)
                .setLngLat(lngLat)
                .setPopup(
                    new mapboxgl.Popup()
                        .setHTML(`<h3>${name}</h3><p>${address}</p>`)
                )
                .addTo(map);

            marker.getElement().addEventListener('click', function () {
                console.log(`Marker at ${lngLat} was clicked.`);

                console.log("lngLat", lngLat);
                console.log('contacts_markers_dict', contacts_markers_dict);
                const key = `${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`;
                console.log("contacts_markers_dict[lngLat]", contacts_markers_dict[key]);


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

        contacts_lst.contacts.forEach((contact) => {
            const routeName = contact.name.replace(/\s/g, "_") + "_route";


            if (!map.getSource(routeName)) {

                const startPoint = contact.coords;
                const endPoint = [startPoint[0], startPoint[1] + 0.045045045]; // 5 km to the north
                const numSegments = 50;

                const points = interpolate(startPoint, endPoint, numSegments);

                const dataGeometry = {
                    type: "LineString",
                    coordinates: points
                };


                map.addSource(routeName, {
                    type: "geojson",
                    data: dataGeometry /!*rte.geometry*!/,
                });
            }

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

            const contactName = contact.name.replace(/\s/g, "_") + "_route";
            contacts_markers_dict[`${lngLat[0].toFixed(2)}_${lngLat[1].toFixed(2)}`] = contactName;

        });

        map.getStyle().layers.forEach(layer => {
            if (layer.source) {
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


        map.addControl(new mapboxgl.NavigationControl());

        addMapStyleSelector(map);

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
            const geolocateButton = document.getElementsByClassName('mapboxgl-ctrl-geolocate')[0];

            const classList = geolocateButton.classList;

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

            geo_popup = new mapboxgl.Popup({closeOnClick: true})
                .setLngLat([e.coords.longitude, e.coords.latitude])
                .setHTML(`<h4>geo_times: ${geo_times} speed: ${speed} heading: ${heading} accuracy: ${accuracy}</h4>`)
                .addTo(map);


            if (geo_travelled.length === 0) {
                geo_travelled = [e.coords.longitude, e.coords.latitude];
            } else {
                geo_travelled.push([e.coords.longitude, e.coords.latitude]);
            }

            console.log("fly to", e.coords.longitude, e.coords.latitude);
            map.flyTo({
                center: [e.coords.longitude, e.coords.latitude],
                zoom: 15,
                essential: true, // this animation is considered essential with respect to prefers-reduced-motion
            });

            console.log("contact_position", contact_position);

            if (contact_position) {
                getDirections([e.coords.longitude, e.coords.latitude], contact_position).then(({
                                                                                                   route,
                                                                                                   distance,
                                                                                                   durée,
                                                                                                   eta,
                                                                                                   address
                                                                                               }) => {

                    displayUpdates(mapSimulation, distance, durée, eta, address);
                    console.log("routeName", route.routeName);

                    const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                    map.getSource(routeName).setData(route.geometry);
                });
            }







            if (simulationActive) {
                mapSimulation.toggleSimulation();
            }

            geo = [e.coords.longitude, e.coords.latitude]; // Update geo

            if (isGeolocating) {


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

        startPoint = [6.98799, 43.66121]; // Opio Rond point Coulouche 43.661221, 6.987799
        endPoint = [7.0821, 43.6686]; // La Colle-sur-Loup

        new mapboxgl.Marker({color: "green"}).setLngLat(startPoint).addTo(map);
        new mapboxgl.Marker({color: "red"}).setLngLat(endPoint).addTo(map);
        simMar = new mapboxgl.Marker({color: "blue"}).setLngLat(startPoint).addTo(map);

        const {route, distance, durée, eta, address} = await getDirections(startPoint, endPoint);

        const haversineDis = haversineDistance(startPoint, endPoint);



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

            const mapStyles = [
                {name: 'Dark', style: 'mapbox://styles/mapbox/dark-v9'},
                {name: 'Light', style: 'mapbox://styles/mapbox/light-v9'},
                {name: 'Streets', style: 'mapbox://styles/mapbox/streets-v11'},
                {name: 'Outdoors', style: 'mapbox://styles/mapbox/outdoors-v11'},
                {name: 'Satellite', style: 'mapbox://styles/mapbox/satellite-v9'}
            ];

            for (const mapStyle of mapStyles) {
                const option = document.createElement('option');
                option.value = mapStyle.style;
                option.text = mapStyle.name;
                select.appendChild(option);
            }

            select.value = selectedStyle;

            map.getContainer().appendChild(select);

            select.addEventListener('change', function () {
                map.setStyle(this.value);

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

                monitorTextbox = document.createElement("div");
                monitorTextbox.classList.add("monitor-textbox");
                monitorTextbox.innerText = "";
                monitorTextbox.style.backgroundColor = backgroundColor;
                monitorTextbox.style.border = "1px solid";
                monitorTextbox.style.borderColor = "rgba(194, 181, 181)";
                monitorTextbox.style.borderRadius = "10px";
                monitorTextbox.style.bottom = "5px";
                monitorTextbox.style.color = "rgba(8, 4, 244)";
                monitorTextbox.style.fontSize = '18px';
                monitorTextbox.style.lineHeight = "0.9";
                monitorTextbox.style.overflow = "auto";
                monitorTextbox.style.padding = "10px";
                monitorTextbox.style.position = "absolute";
                monitorTextbox.style.textAlign = "center";
                monitorTextbox.style.left = "50%";
                monitorTextbox.style.transform = "translateX(-50%)";
                monitorTextbox.style.zIndex = "1";

                map.getContainer().appendChild(this.sim_btn);

                map.getContainer().appendChild(monitorTextbox);
            }

            _currentPoints = [];

            toggleSimulation() {


                if (simulationActive) {
                    this.sim_btn.style.backgroundColor = backgroundColor
                    this.savedPoint = simPoint;

                    clearInterval(this.addr_interval); // Stop updating the monitorTextbox
                    clearInterval(this.simulationInterval); // Stop the animation

                    simulationActive = false; // Toggle simulation state
                } else {
                    this.sim_btn.style.backgroundColor = "grey"; // Change button color to grey
                    simulationActive = true; // Toggle simulation state

                    if (this.savedPoint) {
                        simMar.setLngLat(this.savedPoint);
                    }

                    console.log("simRoute layer exists?");

                    let totalDistance = 0;
                    for (let i = 0; i < coordinates.length - 1; i++) {
                        totalDistance += haversineDistance(coordinates[i], coordinates[i + 1]);
                    }

                    const totalTime = totalDistance / 60;

                    const numSegments = 100; // Adjust this value to change the smoothness of the animation
                    const interpolatedCoordinates = [];
                    for (let i = 0; i < coordinates.length - 1; i++) {
                        interpolatedCoordinates.push(...interpolate(coordinates[i], coordinates[i + 1], numSegments));
                    }

                    this.simulationInterval = setInterval(() => {
                        if (!this.startTime) this.startTime = Date.now();
                        this.elapsedTime = (Date.now() - this.startTime) / 3600000;

                        const distance = 60 * this.elapsedTime;

                        this.point = getPointAtDistance(interpolatedCoordinates, distance);

                        simMar.setLngLat(this.point);
                        simPoint = this.point; // Update simPoint
                        window.simPoint = simPoint; // Update window.simPoint


                        if (this.elapsedTime >= totalTime) {
                            clearInterval(this.addr_interval);
                            clearInterval(this.simulationInterval);
                        }
                    }, 100);


                    this.addr_interval = setInterval(async () => {
                        const lnglat = simMar.getLngLat();
                        const strt = lnglat.toArray();

                        this._currentPoints.push(strt)

                        const routeGeometry = {
                            type: "Feature",
                            geometry: {
                                type: "LineString",
                                coordinates: this._currentPoints,
                            },
                        };



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
        constructor(map, backgroundColor) {
            this.contact_list_toggle_btn = document.createElement("button");
            this.contact_list_toggle_btn.innerText = "Contacts";
            this.contact_list_toggle_btn.classList.add("contacts-button");
            this.contact_list_toggle_btn.style.position = "absolute";
            this.contact_list_toggle_btn.style.top = "10px";
            this.contact_list_toggle_btn.style.left = "10px";
            this.contact_list_toggle_btn.style.borderRadius = "10px";
            this.contact_list_toggle_btn.style.border = "1px solid grey";
            this.contact_list_toggle_btn.style.backgroundColor = backgroundColor;
            this.contact_list_toggle_btn.style.visibility = "visible";

            this.contact_list_toggle_btn.addEventListener("click", () => {
                this.toggleVisibility()
            });

            map.getContainer().appendChild(this.contact_list_toggle_btn);
        }

        toggleVisibility() {
            console.log("toggleVisibility");

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
})
();
/*
abcd
efgh
* */
