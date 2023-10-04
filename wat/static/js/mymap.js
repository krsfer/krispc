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

    map.addControl(
        new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true,
            showUserHeading: true
        })
    );

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('click', (e) => {
        const END = Object.keys(e.lngLat).map((key) => e.lngLat[key]);
        const coordsTxt = JSON.stringify(END);
        navigator.clipboard.writeText(coordsTxt).then(r => console.log());
        console.log(coordsTxt);
    });

})();
