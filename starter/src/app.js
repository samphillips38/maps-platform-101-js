/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { Loader } from '@googlemaps/js-api-loader';
import { TemporalHeatMap } from './temporalHeatMap';

const apiOptions = {
   apiKey: "AIzaSyDER-ka5UWK6uHyVXcAh7CT5v3Rinskwmo",
   libraries: ['places', 'visualization', 'geometry']
 }
const loader = new Loader(apiOptions);
loader.load().then(() => {
   console.log('Maps JS API loaded');
   const map = displayMap();
});
var map;
var service;
var infowindow;
function displayMap() {
    // Create map and add to html
    var stepney = new google.maps.LatLng(51.52122599596313, -0.04968704454531369);
    infowindow = new google.maps.InfoWindow();
    const mapOptions = {
        center: stepney,
        zoom: 14
    };
    const mapDiv = document.getElementById('map');
    const map = new google.maps.Map(mapDiv, mapOptions);
    const marker = new google.maps.Marker({map: map, position: stepney}); // Add marker at central location
    // Display heatMap and add markers at all points
    const hm = new TemporalHeatMap(map, (points, weights) => {
        for (var i = 0; i < points.length; i++) {
            const infoWindow = new google.maps.InfoWindow({
                content: `Weights: ${weights[i]}`
            });
            const markerOptions = {
                map: map,
                position: points[i]
            }
            const marker = new google.maps.Marker(markerOptions);
            marker.addListener('click', function() {
                // Open the info window when the marker is clicked
                infoWindow.open(map, marker);
            });
        }
    })
    google.maps.event.addListener(map, 'zoom_changed', () => {
        // Get the current zoom level of the map
        hm.resetWalkingPoints();
    });

    return map;
}