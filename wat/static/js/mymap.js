(async function () {
    'use strict';

    // Start. wakelock ///////////////////////////
    const canWakeLock = () => 'wakeLock' in navigator;

    let wakelock;

    async function lockWakeState() {
        if (!canWakeLock()) return;
        try {
            wakelock = await navigator.wakeLock.request();
            console.log('WakeLock state:', wakelock.released ? 'released' : 'active');

            wakelock.addEventListener('release', () => {
                console.log('WakeLock state: released');
            });
        } catch (e) {
            console.error('Failed to lock wake state with reason:', e.message);
        }
    }

    function releaseWakeState() {
        if (wakelock) wakelock.release();
        wakelock = null;
    }

    await lockWakeState();
    const duration = 1000 * 60 * 30; // 30 minutes
    setTimeout(releaseWakeState, duration);

    // End. wakelock ///////////////////////////

    window.addEventListener('beforeunload', function (e) {
        e.preventDefault();
        releaseWakeState();
        e.returnValue = '';
    });

    let contact_position = null;
    let contact_name = null;
    let contact_route = null;
    let contacts_markers = [];
    let contacts_markers_dict = {};
    let monitorTextbox = null;
    let debug_textbox = null;
    let isGeolocating = false;
    let geo = [];
    let i = 0;
    let t = 0;

    window.backgroundColor = 'rgba(255, 255, 255, 0.3)';

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


    /* This function takes in three parameters: "pointA", "pointB", and "numSegments". It is used to interpolate between two points,
    "pointA" and "pointB", by dividing the distance between them into a specified number of segments. */
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
        }) || new mapboxgl.Marker({
            element: el,
            draggable: true  // Make the marker draggable
        })
            .setLngLat(lngLat)
            .setPopup(
                new mapboxgl.Popup()
                    .setHTML(`<h3>${name}</h3><p>${address}</p>`),
            )
            .addTo(map);

        // Add event listeners for the dragstart and dragend events
        marker.on('dragstart', function () {
            console.log('Marker drag start');
        });

        marker.on('dragend', function () {
            console.log('Marker drag end');
            lngLat = marker.getLngLat();
            console.log('New marker position:', lngLat);
        });

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
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    "line-color": "rgba(0,255,0,0.4)",
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
                // zoom to instead of pante
                map.flyTo({
                    center: destination,
                    essential: true
                });
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

            // resetRoutesExceptSelected(map, routeName);
            // Remove all route layers

            const layers = map.getStyle().layers;
            layers.forEach((layer) => {
                if (layer.id.endsWith('_route')) {
                    map.getSource(layer.id).setData({
                        'type': 'FeatureCollection',
                        'features': []
                    });
                }
            });


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

    const state = {
        map: null
    };


    function initializeMap() {
        console.log("initializeMap");

        const a = 0;
        const b = convertMetersPerSecondToKilometersPerHour(parseFloat(a))

        // console.log("b", b);

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
            if (!debug_textbox)
                debug_textbox = new Debug_textbox(map, window.backgroundColor);
            debug_textbox.addText(debugDBmgr("progress: Map loaded"));
        });
        map.on('style.load', function () {
            addContactMarkers(map); // Add the contact markers when the map initially loads
            addRouteLayers(map); // Re-add the route layer every time the map style changes and is fully loaded
            if (!debug_textbox)
                debug_textbox = new Debug_textbox(map, window.backgroundColor);
        });
        map.on('click', (e) => {
            const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
            const coordsTxt = JSON.stringify(END);
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
            map.on('move', function () {
                removeAllPopups();
            });
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

        class Display_contacts_markers_btn {
            constructor(map, backgroundColor) {
                this.map = map;
                this.button = document.createElement('button');
                this.button.innerText = 'Display Contacts';
                this.button.style.backgroundColor = backgroundColor;
                this.button.style.position = 'absolute';
                this.button.style.top = '10px';
                this.button.style.left = '10px';
                this.button.style.borderRadius = '10px';
                this.button.style.border = '1px solid';
                this.button.style.borderColor = 'rgba(194, 181, 181)';

                this.button.addEventListener('click', this.toggle_contacts_markers_visibility.bind(this));
                map.getContainer().appendChild(this.button);
            }

            toggle_contacts_markers_visibility() {
                contacts_lst.contacts.forEach((contact) => {
                    const marker = contacts_markers.find((marker) => {
                        return marker.getLngLat().lng === contact.coords[0] && marker.getLngLat().lat === contact.coords[1];
                    });
                    if (marker) {
                        const visibility = marker.getElement().style.visibility;
                        marker.getElement().style.visibility = visibility === 'visible' ? 'hidden' : 'visible';
                    }
                });
            }
        }

        let displaylistbtn = new Display_contacts_markers_btn(map, window.backgroundColor);

        class ContactsTextbox {
            constructor(map, backgroundColor) {
                this.map = map;
                this.textbox = document.createElement('div');
                this.textbox.style.backgroundColor = backgroundColor;
                this.textbox.style.position = 'absolute';
                this.textbox.style.bottom = '10px';
                this.textbox.style.left = '10px';
                // this.textbox.style.transform = 'translateX(-50%)';
                this.textbox.style.padding = '10px';
                this.textbox.style.borderRadius = '10px';
                this.textbox.style.border = '1px solid lightgrey';
                this.textbox.style.textAlign = 'center';
                this.textbox.style.whiteSpace = 'normal';
                this.textbox.style.maxWidth = '100%';
                this.textbox.style.width = 'auto';
                this.textbox.style.overflow = 'auto'; // Add a scrollbar when the content overflows
                this.textbox.style.maxHeight = '200px'; // Limit the max height of the textbox
                this.textbox.style.overflowY = 'scroll'; // Add a scrollbar when the content overflows
                this.textbox.className = 'ContactsTextbox';
                this.textbox.style.visibility = 'visible';
                this.textbox.style.transition = 'transform 0.3s ease-out';
                // add translateX(-100%) to hide the textbox
                this.textbox.style.transform = 'translateX(-100%)';

                map.getContainer().appendChild(this.textbox);
            }

            updateContacts(contacts) {
                this.textbox.innerHTML = ''; // Clear the textbox
                contacts.forEach((contact, index) => {

                    // replace spaces in contact.name with nbsp
                    contact.name = contact.name.replace(/\s/g, '\u00A0');
                    // contact.name = contact.name.replace(/\s/g, '_');

                    // Highlight the selected contact and reset the others
                    if (contact.name === contact_name) {
                        contactElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                    }

                    const contactElement = document.createElement('span');
                    contactElement.innerText = contact.name;
                    contactElement.style.cursor = 'pointer';
                    contactElement.style.marginRight = '0px';


                    // Display contacts list vertically
                    contactElement.style.display = 'block';
                    contactElement.style.marginBottom = '10px';


                    contactElement.addEventListener('click', () => {
                        contact_position = contact.coords;

                        this.map.flyTo({
                            center: contact_position,
                            essential: true
                        });

                        // Highlight the selected contact and reset the others if any is highlighted
                        if (contactElement.style.backgroundColor === 'rgba(255, 255, 255, 0.3)') {
                            contactElement.style.backgroundColor = 'rgba(255, 255, 255, 0)';
                        } else {
                            this.textbox.childNodes.forEach((element) => {
                                element.style.backgroundColor = 'rgba(255, 255, 255, 0)';
                            });
                            contactElement.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                        }

                        if (isGeolocating) {
                            resetRoutesExceptSelected(map, contact.name);
                            getDirections([geo[0], geo[1]], contact.coords)
                                .then(({route, distance, durée, eta, address}) => {
                                    if (!monitorTextbox)
                                        monitorTextbox = new Monitor_textbox(map, window.backgroundColor);
                                    displayUpdates(monitorTextbox, distance, durée, eta, address);

                                    const routeName = contacts_markers_dict[`${contact_position[0].toFixed(2)}_${contact_position[1].toFixed(2)}`];
                                    map.getSource(routeName).setData(route.geometry);
                                    contact_route = route.geometry.coordinates;
                                });
                        } else {
                            const marker = contacts_markers.find((marker) => {
                                if (marker.getLngLat().lng === contact.coords[0] && marker.getLngLat().lat === contact.coords[1]) {
                                    setTimeout(() => {
                                        marker.getPopup().getElement().classList.add("fade-out");
                                    }, 500);
                                    return marker.getLngLat().lng === contact.coords[0] && marker.getLngLat().lat === contact.coords[1];
                                } else {
                                    removeAllPopups();
                                }
                            });

                            // if (marker.getPopup().getElement().classList) {
                            //     setTimeout(() => {
                            //         marker.getPopup().getElement().classList.add("fade-out");
                            //     }, 500);
                            // }
                        }

                        contact_position = contact.coords;

                        const marker = contacts_markers.find((marker) => {
                            return marker.getLngLat().lng === contact.coords[0] && marker.getLngLat().lat === contact.coords[1];
                        });
                        if (marker) {
                            // check if the popup is open
                            if (marker.getPopup().isOpen()) {
                                marker.togglePopup(); // Close the popup
                            } else {
                                // Open the popup
                                marker.togglePopup();
                                if (marker.getPopup().getElement.classList) {
                                    setTimeout(() => {
                                        marker.getPopup().getElement().classList.add("fade-out"); // Fade out the popup after 500ms
                                    }, 500);
                                }
                            }
                        }
                    });
                    this.textbox.appendChild(contactElement);
                });
            }
        }

        let contactsTextbox = new ContactsTextbox(map, window.backgroundColor);
        contactsTextbox.updateContacts(contacts_lst.contacts);

        class ToggleListButton {
            constructor(map, backgroundColor, contactsTextbox) {
                this.map = map;
                this.contactsTextbox = contactsTextbox;
                this.button = document.createElement('button');
                this.button.innerText = 'Toggle List';
                this.button.style.backgroundColor = backgroundColor;
                this.button.style.position = 'absolute';
                this.button.style.top = '40px';
                this.button.style.left = '10px';
                this.button.style.borderRadius = '10px';
                this.button.style.border = '1px solid';
                this.button.style.borderColor = 'rgba(194, 181, 181)';
                this.button.addEventListener('click', this.toggleContactsTextboxVisibility.bind(this));
                map.getContainer().appendChild(this.button);
            }

            toggleContactsTextboxVisibility() {
                // Check if the textbox is visible
                if (this.contactsTextbox.textbox.style.transform === 'translateX(0%)') {
                    // If it is visible, translate it to the left out of the viewport
                    this.contactsTextbox.textbox.style.transform = 'translateX(-100%)';
                } else {
                    // If it is not visible, translate it to the right until it is visible
                    this.contactsTextbox.textbox.style.transform = 'translateX(0%)';
                }
            }
        }

        let toggleListButton = new ToggleListButton(map, window.backgroundColor, contactsTextbox);


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
            console.log("geolocate event", e);
            isGeolocating = true;
            geo = [e.coords.longitude, e.coords.latitude];
            geo_times = geo_times + 1;

            let speed = 'no speed';


            if (e.coords.speed)
                // ensure e.coords.speed is numeric
                speed = convertMetersPerSecondToKilometersPerHour(e.coords.speed)

            let heading = "no heading";
            console.log("e.coords.heading", e.coords.heading);
            if (e.coords.heading) {
                // ensure e.coords.heading is numeric
                const headingnum = parseFloat(e.coords.heading);
                console.log("headingnum", headingnum);

                heading = toString(headingnum) + '°'
            }

            if (!debug_textbox)
                debug_textbox = new Debug_textbox(map, window.backgroundColor);
            debug_textbox.addText(debugDBmgr(`progress:, e_heading: ${e.coords.heading}, heading: ${heading}`));

            let accuracy = 'no accuracy';
            if (e.coords.accuracy)
                accuracy = (e.coords.accuracy.toFixed(1)) + ' m'

            if (!geo_textbox)
                geo_textbox = new Geo_textbox(map, window.backgroundColor);
            if (geo_textbox && speed > 0) {
                setTimeout(() => {
                    geo_textbox.geoTextbox.classList.add("fade-out");
                }, 500)
            } else {
                console.log("geo_textbox does not exist");
            }
            geo_textbox.geoTextbox.innerText = `n: ${geo_times}
            speed: ${speed}
            heading: ${heading}
            accuracy: ${accuracy}`;

            if (contact_position) {
                resetRoutesExceptSelected(map, contact_name);
                // append the current position to the geo_travelled array
                geo_travelled.push([e.coords.longitude, e.coords.latitude]);
                // if the length of the geo_travelled array is greater than 1, draw the geo_travelled  route


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
            this.monitorTextbox.style.top= "50vh";
            this.monitorTextbox.style.transform = "translateY(-50%)"; // Move the textbox up by half of its height
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
            // set width to 30% of the viewport width
            this.monitorTextbox.style.width = "30%";
            map.getContainer().appendChild(this.monitorTextbox);
        }
    }

    class Debug_textbox {
        constructor(map, backgroundColor) {
            this.debugTextbox = document.createElement("div");
            this.debugTextbox.classList.add("debux-textbox");
            this.debugTextbox.innerText = "xxxxxx";
            this.debugTextbox.style.backgroundColor = backgroundColor;
            this.debugTextbox.style.border = "1px solid";
            this.debugTextbox.style.borderColor = "rgba(194, 181, 181)";
            this.debugTextbox.style.borderRadius = "10px";
            this.debugTextbox.style.bottom = "5px";
            this.debugTextbox.style.textShadow = "1px 1px 1px #ccc";
            this.debugTextbox.style.color = "rgb(0,0,0)";
            this.debugTextbox.style.fontSize = '20px';
            this.debugTextbox.style.lineHeight = "0.9";
            this.debugTextbox.style.overflow = "auto";
            this.debugTextbox.style.padding = "10px";
            this.debugTextbox.style.position = "absolute";
            this.debugTextbox.style.textAlign = "center";
            this.debugTextbox.style.left = "50%";
            this.debugTextbox.style.transform = "translateX(-50%)";
            this.debugTextbox.style.zIndex = "1";
            this.debugTextbox.style.cursor = 'default';
            this.debugTextbox.style.transition = "bottom 0.3s";

            // Add the CSS rule for hover
            this.debugTextbox.style.cursor = 'default';

            map.getContainer().appendChild(this.debugTextbox);

            // On click, hide the debug textbox by sliding  it mostlly out of  the bottom of the viewport until the
            // top 5px remain visible  or show it by moving it up so that the bottom of the textbox is 5px up from
            // the bottom margin of the viewport

            this.debugTextbox.addEventListener('click', () => {
                // Get the current bottom value
                let currentBottom = this.debugTextbox.style.bottom;

                // Toggle between 5px and -n%
                let textboxHeight = this.debugTextbox.offsetHeight;

                if (currentBottom === "5px") {
                    this.debugTextbox.style.bottom = `-${textboxHeight - 15}px`;
                } else {
                    this.debugTextbox.style.bottom = "5px";
                }

                // Animate the transition over 3 seconds
                this.debugTextbox.style.transition = "bottom 0.5s";

            });

            this.debugTextbox.addEventListener('mouseover', () => {
                this.debugTextbox.style.cursor = 'pointer';
            });
            this.debugTextbox.addEventListener('mouseout', () => {
                this.debugTextbox.style.cursor = 'default';
            });

            // Create a funcsion to handle adding text to the debug textbox
            this.addText = function (text) {
                console.log("text", text);
                this.debugTextbox.innerText = text;
            }
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
            this.geoTextbox.style.top = "70px"; // Changed from "bottom: 5px"
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

    // Assuming debugDB is a global dictionary
    let debugDB = {};

    function debugDBmgr(fields) {
        if (fields === '') {
            debugDB = {};
        } else {
            const fieldArray = fields.split(/,|\r?\n/);

            fieldArray.forEach(field => {
                const indexOfColon = field.indexOf(':');
                const k = indexOfColon !== -1 ? field.substring(0, indexOfColon) : field;
                const v = indexOfColon !== -1 ? field.substring(indexOfColon + 1) : undefined;

                if (v === '' || v === undefined) {
                    // If v is empty or undefined, delete the key k from debugDB
                    delete debugDB[k];
                } else {
                    // Otherwise, add or update k with v in debugDB
                    debugDB[k] = v;
                }
            });
        }

        // Directly convert debugDB to string format, as keys with empty or undefined values have been filtered already
        return Object.entries(debugDB)
            .map(([key, value]) => `${key}:${value}`)
            .join('\r\n');
    }

    // Subsequent calls to debugDBmgr can be made with different parameters to modify debugDB
    // Example usage
    // console.log(debugDBmgr('username:admin,password:1234'));

    // console.log(debugDBmgr("key1:value1, key2: value2"));
    // console.log(debugDBmgr("key3:value3\nkey4:value4"));
    console.log(debugDBmgr("key3:value999\nkey4:"));
    console.log(debugDBmgr(""));

})();
