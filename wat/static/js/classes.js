class DisplayList_btn {
    constructor() {
        this._container = document.createElement('div');
        this._contactsList_btn = null;
    }

    addControls(map) {
        this._contactsList_btn = this.createButton();
        this._contactsList_btn.onclick = this._showList.bind(this);
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

    async _showList() {
        if (!this._list) {
            this.onAdd(this._map);
        }

        document.body.appendChild(this._list);

        this._list.style.visibility = 'visible';

        await new Promise(resolve => {
            let opacity = 0;
            const interval = setInterval(() => {
                opacity += 0.1;
                this._list.style.opacity = opacity;
                if (opacity >= 1) {
                    clearInterval(interval);
                    resolve();
                }
            }, 30);
        });
    }

    createButton() {
        const btn = document.createElement('button');
        btn.innerText = 'List contacts';
        btn.style.position = "absolute";
        btn.style.top = "200px";
        btn.style.left = "10px";
        btn.style.borderRadius = "10px";
        btn.style.border = "1px solid grey";
        btn.style.backgroundColor = backgroundColor;
        btn.style.visibility = "visible";
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

                await new Promise(resolve => {
                    let opacity = 1;
                    const interval = setInterval(() => {
                        opacity -= 0.2;
                        this._list.style.opacity = opacity;
                        if (opacity <= 0) {
                            this._list.style.visibility = 'hidden';
                            clearInterval(interval);
                            resolve();
                        }
                    }, 100);
                });
            });


            // Add the el to the list container
            this._list.appendChild(el);
        });
    }
}
