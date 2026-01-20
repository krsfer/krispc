// alert("This file is not used anymore. It is kept for reference only.");

function hello() {
    console.log("Hello from the functions.js file");
}

export {hello}

// function getLngLatFromAddress_mapbox(address) {
//     // Use the Mapbox Geocoding API to get the longitude and latitude from the address
//     return fetch(
//         `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
//             address
//         )}.json?access_token=${window.mapbox_token}`
//     )
//         .then((response) => response.json())
//         .then((data) => {
//             // The API returns an array of possible matches, we'll just take the first one
//             return data.features[0].geometry.coordinates;
//         });
// }
//
// function getLngLatFromAddress(address) {
//     // Use the Nominatim API to get the longitude and latitude from the address
//     const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
//         address
//     )}`;
//     return fetch(url)
//         .then((response) => {
//             if (!response.ok) {
//                 throw new Error(`HTTP error! status: ${response.status}`);
//             }
//             return response.json();
//         })
//         .then((data) => {
//             if (data.length === 0) {
//                 throw new Error('No matches found for this address:');
//             }
//             // The API returns an array of possible matches, we'll just take the first one
//             return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
//         });
// }
//
// async function getAddressFromLngLat_gouv(startLat, startLng) {
//     // Use the Gouv API to get the longitude and latitude from the address.
//     // For example https://api-adresse.data.gouv.fr/reverse/?lon=6.98799&lat=43.66121&type=street&limit=1
//     const url = `https://api-adresse.data.gouv.fr/reverse/?lon=${startLng}&lat=${startLat}&type=street&limit=1`;
//     try {
//         const response = await fetch(url);
//         const data = await response.json();
//         if (data.features.length === 0) {
//             throw new Error('No matches found for this address:');
//         }
//         // Get housenumber if it exists
//         let housenumber = ''
//         if (data.features[0].properties.housenumber) {
//             housenumber = data.features[0].properties.housenumber + " ";
//         }
//         // Ensure housenumber is a string
//         housenumber = housenumber.toString();
//
//         // Append housenumber in front of the label of the first match
//         return housenumber + ' ' + data.features[0].properties.label;
//
//     } catch (error) {
//         console.warn("Error getting address:", error);
//         console.warn(url);
//     }
// }
//
// function convertDistance(distance) {
//     if (distance >= 1000) {
//         return (distance / 1000).toFixed(1) + " km";
//     } else {
//         return distance.toFixed(0) + " m";
//     }
// };
//
// function convertDuration(durationInSeconds) {
//     const hours = Math.floor(durationInSeconds / 3600);
//     const minutes = Math.floor((durationInSeconds % 3600) / 60);
//     const seconds = Math.floor(durationInSeconds % 60);
//     return {hours, minutes, seconds};
// }
//
// function formatDuration(hours, minutes, seconds) {
//     let durée = "";
//     if (hours > 0) {
//         durée += hours.toString().padStart(2, '0') + ':';
//     }
//     if (minutes > 0 || hours > 0) {
//         durée += minutes.toString().padStart(2, '0') + ':';
//     }
//     durée += seconds.toString().padStart(2, '0');
//     return durée;
// }
//
// /**
//  * @param {Array<number>} startPoint - The starting point of the route. It's an array where the first element is the longitude and the second element is the latitude.
//  * @param {Array<number>} endPoint - The end point of the route. It's an array where the first element is the longitude and the second element is the latitude.
//  * @returns {Promise<Object>} A promise that resolves to an object containing the route, distance, estimate time of
//  * arrival (durée) and the current strating point address.
//  */
// async function getDirections(startPoint, endPoint) {
//     const startLng = startPoint[0];
//     const startLat = startPoint[1];
//     const endLng = endPoint[0];
//     const endLat = endPoint[1];
//
//     const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
//
//     try {
//         const response = await fetch(url);
//         const data = await response.json();
//
//         if (!data.routes || data.routes.length === 0) {
//             throw new Error("No routes found");
//         }
//
//         // Inline useGooglemaps function
//         const googleMapsUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${startLat},${startLng}&key=${window.googlemaps_token}`;
//         let address = 'No address found';
//         const googleMapsData = await fetch(googleMapsUrl).then(response => response.json());
//         if (googleMapsData.status === 'OK') {
//             address = googleMapsData.results[0].address_components[0].long_name + ' '
//                 + googleMapsData.results[0].address_components[1].short_name + ', '
//                 + googleMapsData.results[0].address_components[2].long_name;
//         }
//
//         const route = data.routes[0];
//         let distance = convertDistance(route.distance);
//         let {hours, minutes, seconds} = convertDuration(route.duration);
//         let durée = formatDuration(hours, minutes, seconds);
//
//         let eta = new Date();
//         eta.setHours(eta.getHours() + hours);
//         eta.setMinutes(eta.getMinutes() + minutes);
//         eta.setSeconds(eta.getSeconds() + seconds);
//         eta = eta.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
//
//         return {route, distance, durée, eta, address};
//
//     } catch (error) {
//         console.error("Error getting directions:", error);
//         console.error(url);
//     }
// }
//
// /*
// async function updateRoute(simPoint, marPoint) {
//     // Check if simPoint and marPoint are not null
//     if (simPoint && marPoint) {
//         // Fetch the fastest route from simPoint to marPoint
//         const {route, distance, durée, address} = await getDirections(simPoint, marPoint);
//         // Update the monitorTextbox
//         displayUpdates(mapSimulation, distance, durée, address);
//
//         let distance = route["distance"];
//         // Convert distance from meters to kilometers, rounded to I decimal place, or meters if less than 1 kilometer
//         if (distance >= 1000) {
//             distance = (distance / 1000).toFixed(1) + " km";
//         } else {
//             distance = distance.toFixed(0) + " m";
//         }
//
//         // Set variable called durée to the value of a function that accepts route duration and returns the estimated
//         // time of arrival
//         let durée = getETA(route["duration"]);
//
//         displayUpdates(mapSimulation, distance, durée);
//
//         // Update the monitorTextbox with the estimated time of arrival
//
//         // If a route layer already exists, update its data source
//         if (map.getLayer("route")) {
//             map.getSource("route").setData(route.route.geometry);
//         } else {
//             // If the route layer does not exist, add it
//             map.addLayer({
//                 id: "route",
//                 type: "line",
//                 source: {
//                     type: "geojson",
//                     data: route.geometry,
//                 },
//                 paint: {
//                     "line-color": "rgba(183, 0, 0, 1)",
//                     "line-width": 2,
//                 },
//             });
//         }
//     }
// }
// */
//
// function lerp(start, end, t) {
//     return start * (1 - t) + end * t;
// }
//
// function xdisplayUpdates(mapSimulation, distance, durée, eta, address) {
//     // Update the monitorTextbox with the distance, duration, and address
//
//     // Remove numéro de département from address if address is not null it contains the numéro
//     if (address) {
//         const regex = / \b\d{5}\b /g;
//         address = address.replace(regex, ',');
//     } else {
//         address = 'nono';
//     }
//
//     mapSimulation.updateMonitorTextbox(
//         `${distance}\nDuration ${durée}\neta ${eta}\n${address}`
//     );
// }
//
// window.convertMetersPerSecondToKilometersPerHour = function (metersPerSecond) {
//     const ret = (parseFloat(metersPerSecond) * 3.6).toFixed(0) + " km/h"
//     return ret;
// }
//
// // window.createOrUpdateLineLayer = function (map, routeName, route, line_width, line_color) {
// //     console.log('createOrUpdateLineLayer', routeName, route, line_width, line_color);
// //     if (map.getLayer(routeName)) {
// //         map.getSource(routeName).setData(route.geometry);
// //     } else {
// //         // Otherwise, add a new georoute layer
// //         console.error('DoNothing???');
// //     }
// // }
