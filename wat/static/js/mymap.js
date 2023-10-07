(function () {
    'use strict';

    mapboxgl.accessToken = 'pk.eyJ1IjoiY2FyY2hlcjIzOCIsImEiOiJjbG5iZ3ZlN3owaHA1Mm5wMXNjNmpmNzhyIn0.rgfd5ZFRt-FlC9xhL_BYSg';

    const map = new mapboxgl.Map({
        container: 'map',
        //style: 'mapbox://styles/mapbox/streets-v12',
        //style: 'mapbox://styles/mapbox/satellite-v9',˛
        style: 'mapbox://styles/mapbox/dark-v9',
        // center: [7.010738529602536, 43.641541407211754],
        center: [7.010738529602536, 43.641541407211754],
        zoom: 14
    });

    const geolocate = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            }, showAccuracyCircle: true, showUserHeading: true, trackUserLocation: true,
        });
        map.addControl(geolocate, 'top-right');

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
        const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
        const coordsTxt = JSON.stringify(END);
        navigator.clipboard.writeText(coordsTxt).then(r => console.log());
        console.log(coordsTxt);
    });

    // Fired on each Geolocation API position update that returned as success
        geolocate.on('geolocate', async (e) => {

            /*
                e is coords : Coordinates = eg.

                accuracy : 20
                altitude : null
                altitudeAccuracy : null
                heading : null
                latitude : 43.6415469
                longitude : 7.0108263
                speed : null
            */


            const coords = e.coords;
            let lonlat = [coords.longitude, coords.latitude];
            // _blue_geojson_sphere.features[0].geometry.coordinates = lonlat;
            // map.getSource('blue_source').setData(_blue_geojson_sphere);


            // if (_state !== 1) {
            //     lonlat[0] += 0.0001;
            //     lonlat[1] += 0.0001;
            // }

            // let msg = {
            //     "seq": seq, "lo": lonlat[0], "la": lonlat[1], "ts": new Date().getTime() / 3000
            // };


            // await do_chat(msg);


            // await show_interRoute(lonlat, HOME_LatLon, true);

            /*
            console.log("FROM", FROM);
            console.log("TO", TO);
            // test if FROM and TO are defined

            if (FROM != null && TO != null) {
                console.log("FROM", FROM);
                console.log("TO", TO);
                // await show_interRoute(FROM, TO);
            } else {
                console.log("Eiher FROM or TO is null");
                // await show_interRoute(FROM, BLUE_LatLon);
            }*/


            // blue_geojson_cir˛e.features[0].geometry.coordinates = [coords.longitude, coords.latitude];
            // map.getSource('blue_point').setData(blue_geojson_circle);

            // BLUE = [coords.longitude, coords.latitude];

            // await do_chat();

            // getRoute(false); // geolocate.on('geolocate', (e) => {...});

        });

        geolocate.on('trackuserlocationstart', () => {
        });

        geolocate.on('trackuserlocationend', () => {
            /*const bounds = new mapboxgl.LngLatBounds(ROUTE[0], ROUTE[0]);

            // Extend the 'LngLatBounds' to include every coordinate in the bounds result.
            for (const coord of ROUTE) {
                bounds.extend(coord);
            }

            map.fitBounds(bounds, {
                padding: 100
            });*/

        });

        geolocate.on('error', (e) => {
            console.log(e.error);
        });

})();
//
