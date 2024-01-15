function getLngLatFromAddress_mapbox(address) {
    // Use the Mapbox Geocoding API to get the longitude and latitude from the address
    return fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            address
        )}.json?access_token=${window.mapbox_token}`
    )
        .then((response) => response.json())
        .then((data) => {
            // The API returns an array of possible matches, we'll just take the first one
            return data.features[0].geometry.coordinates;
        });
}

function getLngLatFromAddress(address) {
    // Use the Nominatim API to get the longitude and latitude from the address
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
    )}`;
    return fetch(url)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            if (data.length === 0) {
                throw new Error('No matches found for this address:');
            }
            // The API returns an array of possible matches, we'll just take the first one
            return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        });
}

/**
 * @param {Array<number>} startPoint - The starting point of the route. It's an array where the first element is the longitude and the second element is the latitude.
 * @param {Array<number>} endPoint - The end point of the route. It's an array where the first element is the longitude and the second element is the latitude.
 * @returns {Promise<Object>} A promise that resolves to an object containing the route, distance, and estimated time of arrival (eta).
 */
async function getDirections(startPoint, endPoint) {
    const startLng = startPoint[0];
    const startLat = startPoint[1];
    const endLng = endPoint[0];
    const endLat = endPoint[1];

// Use OSRM routing API
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;

    try {
        const response = await fetch(url);
        const data = await response.json();


        if (!data.routes || data.routes.length === 0) {
            throw new Error("No routes found");
        }

        const route = data.routes[0];

        // Convert the distance from meters to kilometers, rounded to 1 decimal place, or meters if less than 1 kilometer
        let distance = route.distance;
        if (distance >= 1000) {
            distance = (distance / 1000).toFixed(1) + " km";
        } else {
            distance = distance.toFixed(0) + " m";
        }

        // Convert the duration from seconds to a more human-readable format
        // Convert the duration from seconds to a more human-readable format
        const durationInSeconds = route.duration;
        const hours = Math.floor(durationInSeconds / 3600);
        const minutes = Math.floor((durationInSeconds % 3600) / 60);
        const seconds = Math.floor(durationInSeconds % 60);

        let eta = "";

        if (hours > 0) {
            eta += hours.toString().padStart(2, '0') + ':';
        }

        if (minutes > 0 || hours > 0) {
            eta += minutes.toString().padStart(2, '0') + ':';
        }

        eta += seconds.toString().padStart(2, '0');


        return {route, distance, eta};

        // ...
    } catch (error) {
        console.error("Error getting directions:", error);
    }
}

async function updateRoute(simPoint, marPoint) {
    // Check if simPoint and marPoint are not null
    if (simPoint && marPoint) {
        // Fetch the fastest route from simPoint to marPoint
        const route = await getDirections(simPoint, marPoint);

        let distance = route["distance"];
        // Convert distance from meters to kilometers, rounded to I decimal place, or meters if less than 1 kilometer
        if (distance >= 1000) {
            distance = (distance / 1000).toFixed(1) + " km";
        } else {
            distance = distance.toFixed(0) + " m";
        }

        // Set variable called eta to the value of a function that accepts route duration and returns the estimated time of arrival
        let eta = getETA(route["duration"]);

        mapSimulation.updateMonitorTextbox('ETA:' + eta + '\nDistance:' + distance);


        // Update the monitorTextbox with the estimated time of arrival

        // If a route layer already exists, update its data source
        if (map.getLayer("route")) {
            map.getSource("route").setData(route.geometry);
        } else {
            // If the route layer does not exist, add it
            map.addLayer({
                id: "route",
                type: "line",
                source: {
                    type: "geojson",
                    data: route.geometry,
                },
                paint: {
                    "line-color": "rgba(183, 0, 0, 1)",
                    "line-width": 2,
                },
            });
        }
    }
}

function lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }
