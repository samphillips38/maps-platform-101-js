export class TemporalHeatMap {
    constructor(map, callback, radius=8000) {
        this.walkingSpeed = 5; // In km/h
        this.max_time = 3200;
        this.points_on_horiz = 90;
        this.relative = false;


        this.map = map;
        this.heatmap = null
        this.stationCoordinates = [map.center];
        this.stationWeights = [0];
        this.walkingCoordinates = [];
        this.walkingWeights = [];
        this.center = map.center;
        this.radius = radius;
        this.getStationData(callback);
    }
    getStationLocations(callback) {
        var request = {
            query: 'transit_station',
            location: this.center,
            radius: this.radius
        };
        // Add markers at all of the stations
        var service = new google.maps.places.PlacesService(this.map);
        service.textSearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (let i = 0; i < results.length; i++) {
                    this.stationCoordinates.push(results[i].geometry.location);
                }
            }
            callback();
        });
    }
    getStationWeights(callback) {
        var service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix(
        {
            origins: [this.center],
            destinations: this.stationCoordinates.slice(1, this.stationCoordinates.length - 1),
            travelMode: 'TRANSIT',
            // transitOptions: TransitOptions
        }, (response, status) => {
            if (status == 'OK') {
                var elements = response.rows[0].elements
                for (let j = 0; j < elements.length; j++) {
                    this.stationWeights.push(elements[j].duration.value);
                }
            }
            callback();
        });
    }
    getStationData(callback) {
        this.getStationLocations((results, status) => {
            this.getStationWeights(() => {
                this.addWalkingPoints()
                this.setHeatMap();
                callback(this.stationCoordinates, this.stationWeights);
            });
        })
    }
    setHeatMap() {
        let heatMapData = this.getHeatMapData();
        let heatmap = new google.maps.visualization.HeatmapLayer({
            data: heatMapData,
            radius: 50,
            // dissipating: false,
            maxIntensity: 1
        });
        heatmap.setMap(this.map);
        this.heatmap = heatmap;
    }
    getWalkingWeight(point) {
        // Find the station that would get you back quickest
        let min_time = 1000000000;
        for (let i=0; i < this.stationWeights.length; i++) {
            let dist = google.maps.geometry.spherical.computeDistanceBetween(this.stationCoordinates[i], point);
            let time = this.stationWeights[i] + (dist / this.walkingSpeed) * 60 * 60 / 1000;
            if (time < min_time) {
                min_time = time;
            }
        }
        // Return shortest time to get to center
        return min_time;
    }
    addWalkingPoints() {
        const bottom_left = this.map.getBounds().getSouthWest();
        const top_right = this.map.getBounds().getNorthEast();

        const min_lat = bottom_left.lat();
        const max_lat = top_right.lat();
        const min_lng = bottom_left.lng();
        const max_lng = top_right.lng();

        // Get the number of points vertically - try to keep density equal horizontally and vertically 
        const top_left = new google.maps.LatLng(top_right.lat(), bottom_left.lng());
        const points_on_vert = Math.round(
            this.points_on_horiz * google.maps.geometry.spherical.computeDistanceBetween(bottom_left, top_left) / google.maps.geometry.spherical.computeDistanceBetween(top_right, top_left)
            );

        // Save weight and position of each point
        for (let i=0; i < this.points_on_horiz; i++) {
            let lng = min_lng + (max_lng - min_lng) * (i / (this.points_on_horiz - 1));
            for (let j=0; j < points_on_vert; j++) {
                let lat = min_lat + (max_lat - min_lat) * (j / (points_on_vert - 1));
                let coord = new google.maps.LatLng(lat, lng);
                let weight = this.getWalkingWeight(coord);

                // Add points
                this.walkingCoordinates.push(coord);
                this.walkingWeights.push(weight);
            }
        }
    }
    // getHeatMapPoints() {
    //     // This function may not be necessary
    //     let heatmapPoints = [];
    //     let dlat = this.lat_offset / this.n_lat;
    //     let dlng = this.lng_offset / this.n_lng;
    //     for (let i=0; i < this.walkingWeights.length; i++) {
    //         let n_points = Math.floor(this.walkingWeights[i] / 10);
    //         let lat_min = this.walkingCoordinates[i].lat() - dlat;
    //         let lat_max = this.walkingCoordinates[i].lat() + dlat;
    //         let lng_min = this.walkingCoordinates[i].lng() - dlng;
    //         let lng_max = this.walkingCoordinates[i].lng() + dlng;
    //         for (let j=0; j < n_points; j++) {
    //             let lat = lat_min + (lat_max - lat_min) * Math.random();
    //             let lng = lng_min + (lng_max - lng_min) * Math.random();
    //             heatmapPoints.push(new google.maps.LatLng(lat, lng));
    //         }
    //     }
    //     return heatmapPoints
    // }
    getHeatMapData() {
        let heatMapData = [];
        // The values will be distributed between 0 and 1, and rounded to 10 dp
        let max_weight = Math.max.apply(null, this.walkingWeights);
        let min_weight = Math.min.apply(null, this.walkingWeights);
        for (let i=0; i < this.walkingWeights.length; i++) {
            let normed = 1 - (this.walkingWeights[i] - min_weight) / (max_weight - min_weight);
            if (this.relative) {
                normed = this.scalingFunc(normed);
            }
            heatMapData.push(
                {
                    location: this.walkingCoordinates[i],
                    weight: normed.toFixed(10)
                }
                );
        }
        return heatMapData;
    }
    resetWalkingPoints() {
        this.heatmap.setData([]);
        this.walkingCoordinates = [];
        this.walkingWeights = [];
        this.addWalkingPoints();
        this.setHeatMap()
    }
    toggleRelative() {
        this.relative = !this.relative;
        this.resetWalkingPoints()
    }
    scalingFunc(x, beta=12) {
        return (Math.exp(beta * x) - 1) / (Math.exp(beta) - 1)
    }
}