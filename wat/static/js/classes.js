window.useGooglemaps = null;

class DisplayList_btn {
    constructor() {
        this._container = document.createElement('div');
        this._contactsList_btn = null;
        this._listVisible = false; // Add a state variable to track whether the list is visible
    }

    addControls(map) {
        this._contactsList_btn = this.createButton();
        this._contactsList_btn.onclick = this._toggleList.bind(this);

        map.getContainer().appendChild(this._contactsList_btn);
    }

    onAdd() {
        this._container = this.createContainer();
        this._list = this.createList();
        this.fillContactsList();
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    createButton() {
        const btn = document.createElement('button');
        btn.innerText = 'List contacts';
        btn.style.position = "absolute";
        btn.style.top = "100px";
        btn.style.left = "10px";
        btn.style.borderRadius = "10px";
        btn.style.border = "1px solid grey";
        btn.style.backgroundColor = backgroundColor;
        btn.style.visibility = "visible";
        btn.style.caretColor = "transparent";
        btn.style.color = "rgba(8, 4, 244)";

        return btn;
    }

    createContainer() {
        const container = document.createElement('div');
        container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
        container.style.position = 'absolute';
        container.style.top = '200px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        container.style.borderRadius = '10px';
        return container;
    }

    createList() {
        const list = document.createElement('div');
        list.className = 'name-list';
        list.style.position = 'absolute';
        list.style.bottom = '5vh';
        list.style.left = '50%';
        list.style.transform = 'translateX(-50%)';
        list.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
        list.style.borderRadius = '10px';
        list.style.opacity = 0;

        return list;
    }

    async fillContactsList() {
        window.contacts_list.forEach((contact, index) => {
            const name = contact.name;
            const address = contact.address;
            const coords = contact.coords;

            const el = document.createElement('div');

            el.style.backgroundColor = backgroundColor;
            // Make a bottom border for all but the last list item
            if (index < window.contacts_list.length - 1) {
                el.style.borderBottom = '1px solid';
                el.style.borderBottomColor = 'rgb(240,240,240)';
            }
            // el.style.border = 'none';
            // el.style.borderRadius = '10px';
            el.style.overflow = 'auto';
            el.style.transition = 'bottom 3s';
            el.style.cursor = 'pointer';
            el.style.padding = '1px';
            el.style.margin = '5px';
            el.style.fontSize = '18px';
            el.style.fontFamily = 'monospace';
            el.style.color = 'rgba(8, 4, 244)';
            el.style.lineHeight = '1.0';

            el.innerText = name;

            // Add click event listener to each name. When clicked, the map will fly to the corresponding coordinates
            el.addEventListener('click', async () => {
                map.flyTo({
                    center: coords,
                    zoom: 15,
                    essential: true // this animation is considered essential with respect to prefers-reduced-motion
                });

                await this.fadeInOrOut(this._list, 'out');
            });


            // Add the el to the list container
            this._list.appendChild(el);
        });
    }

    async fadeInOrOut(element, action) {
        return new Promise(resolve => {
            let opacity = action === 'in' ? 0 : 1;
            const interval = setInterval(() => {
                opacity += action === 'in' ? 0.1 : -0.2;
                element.style.opacity = opacity;
                if ((action === 'in' && opacity >= 1) || (action === 'out' && opacity <= 0)) {
                    if (action === 'out') {
                        element.style.visibility = 'hidden';
                    }
                    clearInterval(interval);
                    resolve();
                }
            }, action === 'in' ? 30 : 100);
        });
    }

    async _showList() {
        if (!this._list) {
            this.onAdd(this._map);
        }

        document.body.appendChild(this._list);

        this._list.style.visibility = 'visible';

        await this.fadeInOrOut(this._list, 'in');
    }

    async _toggleList() {
        // console.log('toggle list visible?', this._listVisible);

        if (!this._list) {
            this.onAdd(this._map);
        }

        document.body.appendChild(this._list);

        // Check the _listVisible state variable and call the appropriate fade function
        if (this._listVisible) {
            await this.fadeInOrOut(this._list, 'out');
            this._list.style.visibility = 'hidden';
        } else {
            this._list.style.visibility = 'visible';
            await this.fadeInOrOut(this._list, 'in');
            this._listVisible = !this._listVisible;
        }

        // Toggle the _listVisible state variable
        this._listVisible = !this._listVisible;
    }
}

window.useGooglemaps = async function (lat, lng) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${window.googlemaps_token}`;

    let address = 'No address found';

    // console.log('g_url', url);

    // const response = await fetch(url);
    // const data = await response.json();

    const data = await fetch(url)
        .then(response => response.json());

    // console.log('g_data', data);

    if (data.status === 'OK') {
        // console.log('g_data.results[0].address_components', data.results[0].address_components);
        // console.log('g_data.results[0].address_components[0].long_name', data.results[0].address_components[0].long_name);
        // console.log('g_data.results[0].address_components[1].short_name', data.results[0].address_components[1].short_name);
        // console.log('g_data.results[0].address_components[2].long_name', data.results[0].address_components[2].long_name);

        address = data.results[0].address_components[0].long_name + ' '
            + data.results[0].address_components[1].short_name + ', '
            + data.results[0].address_components[2].long_name;
    }
    return address;
}

class newDisplayAddress_btn {
    constructor() {
        this._container = document.createElement('div');
        this._btn = null;
    }

    addControls(map, simulationActive) {
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

        this._btn.onclick = () => this._showAddress(map, simulationActive);

        map.getContainer().appendChild(this._btn);
    }

    onRemove() {
        this._container.parentNode.removeChild(this._container);
        this._map = undefined;
    }

    //  https://api.mapbox.com/geocoding/v5/mapbox.places/
    //  7.053853491907418
    //  43.6641735454232
    // 43.6641735,7.053853
    //  .json?access_token=pk.eyJ1IjoiY2FyY2hlcjIzOCIsImEiOiJjbG5iZ3ZlN3owaHA1Mm5wMXNjNmpmNzhyIn0.rgfd5ZFRt-FlC9xhL_BYSg

    async _showAddress(map, simulationActive) {
        async function useMapbox(lng, lat) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${window.mapbox_token}`;

            // console.log('url', url);

            const response = await fetch(url);
            const data = await response.json();

            const address = data.features[0].place_name;
            return address;
        }

        if (window.simPoint) { // Check if window.simPoint is not null
            // const address = await useMapbox();
            const address = await window.useGooglemaps(window.simPoint[1], window.simPoint[0]);

            // Set the popup coordinates to the window.simPoint coordinates
            this.popup.setLngLat([window.simPoint[0], window.simPoint[1]])
                .setHTML(address)
                .addTo(map);

            // Fade out the popup instead of closing it
            setTimeout(() => {
                if (simulationActive) {
                    this.popup.getElement().classList.add("fade-out");
                }
            }, 100);
        } else {
            // console.log('window.simPoint is null');
        }
    }
}
