/**
 * Template Name: Gp - v4.9.1
 * Template URL: https://bootstrapmade.com/gp-free-multipurpose-html-bootstrap-template/
 * Author: BootstrapMade.com
 * License: https://bootstrapmade.com/license/
 *
 *
 * https://www.geeksforgeeks.org/javascript-anonymous-functions/
 */

// import {PureCounter} from "../vendor/purecounter/purecounter_vanilla";

(() => {
    "use strict";


    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

    // document.getElementById('submit-id-submit').addEventListener('click', () => {
        // document.getElementById('merci').remove();
        // document.getElementById('cover-spin').style.display = 'block';
    // });

    document.getElementById("carousel__wrapper").addEventListener("click", function () {
        const slides = document.querySelectorAll(".carousel__slide");

        let state;
        slides[0].style.getPropertyValue("animation-play-state") === "paused" ? state = "running" : state = "paused";

        for (let slide of slides) {
            slide.style.setProperty("animation-play-state", state);
        }
    });


    const targetNode = document.getElementById('contact-form-id');
    if (targetNode) {
        const observer = new MutationObserver(function (mutations) {
            console.log('The contents of the div element have changed.');
        });

        observer.observe(targetNode, {childList: true});
    } else {
        console.log('Element «contact-form-id» does not exist!');
    }


    /**
     * Easy selector helper function
     */
    const select = (el, all = false) => {
        el = el.trim()
        if (el === "#0") return;

        if (all) {
            return [...document.querySelectorAll(el)]
        } else {
            return document.querySelector(el)
        }
    }

    /**
     * Easy event listener function
     */
    const on = (type, el, listener, all = false) => {
        let selectEl = select(el, all)
        if (selectEl) {
            if (all) {
                selectEl.forEach(e => e.addEventListener(type, listener))
            } else {
                selectEl.addEventListener(type, listener)
            }
        }
    }

    /**
     * Easy on scroll event listener
     */
    const onscroll = (el, listener) => {
        el.addEventListener('scroll', listener)
    }

    /**
     * Navbar links active state on scroll
     */
    let navbarlinks = select('#navbar .scrollto', true)
    const navbarlinksActive = () => {
        let position = window.scrollY + 200
        navbarlinks.forEach(navbarlink => {
            if (!navbarlink.hash) return
            let section = select(navbarlink.hash)
            if (!section) return
            if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
                navbarlink.classList.add('active')
            } else {
                navbarlink.classList.remove('active')
            }
        })
    }
    window.addEventListener('load', navbarlinksActive)
    onscroll(document, navbarlinksActive)
    /**
     * Scrolls to an element with header offset
     */
    const scrollto = (el) => {
        let header = select('#header')
        let offset = header.offsetHeight

        let elementPos = select(el).offsetTop
        window.scrollTo({
            top: elementPos - offset,
            behavior: 'smooth'
        })
    }

    /**
     * Toggle .header-scrolled class to #header when page is scrolled
     */
    let selectHeader = select('#header')
    if (selectHeader) {
        const headerScrolled = () => {
            if (window.scrollY > 100) {
                selectHeader.classList.add('header-scrolled')
            } else {
                selectHeader.classList.remove('header-scrolled')
            }
        }
        window.addEventListener('load', headerScrolled)
        onscroll(document, headerScrolled)
    }

    /**
     * Back to top button
     */
    let backtotop = select('.back-to-top')
    if (backtotop) {
        const toggleBacktotop = () => {
            if (window.scrollY > 100) {
                backtotop.classList.add('active')
            } else {
                backtotop.classList.remove('active')
            }
        }
        window.addEventListener('load', toggleBacktotop)
        onscroll(document, toggleBacktotop)
    }

    /**
     * Mobile nav toggle
     */
    on('click', '.mobile-nav-toggle', function (e) {
        select('#navbar').classList.toggle('navbar-mobile')
        this.classList.toggle('bi-list')
        this.classList.toggle('bi-x')
    })

    /**
     * Mobile nav dropdowns activate
     */
    on('click', '.navbar .dropdown > a', function (e) {
        if (select('#navbar').classList.contains('navbar-mobile')) {
            e.preventDefault()
            this.nextElementSibling.classList.toggle('dropdown-active')
        }
    }, true)

    /**
     * Scrool with ofset on links with a class name .scrollto
     */
    on('click', '.scrollto', function (e) {
        if (select(this.hash)) {
            e.preventDefault()

            let navbar = select('#navbar')
            if (navbar.classList.contains('navbar-mobile')) {
                navbar.classList.remove('navbar-mobile')
                let navbarToggle = select('.mobile-nav-toggle')
                navbarToggle.classList.toggle('bi-list')
                navbarToggle.classList.toggle('bi-x')
            }
            scrollto(this.hash)
        }
    }, true)

    /**
     * Scroll with ofset on page load with hash links in the url
     */
    window.addEventListener('load', () => {
        if (window.location.hash) {
            if (select(window.location.hash)) {
                scrollto(window.location.hash)
            }
        }
    });

    /**
     * Preloader
     */
    let preloader = select('#preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            preloader.remove()
        });
    }

    /**
     * Clients Slider
     */
    // new Swiper('.clients-slider', {
    //     speed: 400,
    //     loop: true,
    //     autoplay: {
    //         delay: 5000,
    //         disableOnInteraction: false
    //     },
    //     slidesPerView: 'auto',
    //     pagination: {
    //         el: '.swiper-pagination',
    //         type: 'bullets',
    //         clickable: true
    //     },
    //     breakpoints: {
    //         320: {
    //             slidesPerView: 2,
    //             spaceBetween: 40
    //         },
    //         480: {
    //             slidesPerView: 3,
    //             spaceBetween: 60
    //         },
    //         640: {
    //             slidesPerView: 4,
    //             spaceBetween: 80
    //         },
    //         992: {
    //             slidesPerView: 6,
    //             spaceBetween: 120
    //         }
    //     }
    // });

    /**
     * Porfolio isotope and filter
     */
    window.addEventListener('load', () => {
        let portfolioContainer = select('.portfolio-container');
        if (portfolioContainer) {
            let portfolioIsotope = new Isotope(portfolioContainer, {
                itemSelector: '.portfolio-item'
            });

            let portfolioFilters = select('#portfolio-flters li', true);

            on('click', '#portfolio-flters li', function (e) {
                e.preventDefault();
                portfolioFilters.forEach(function (el) {
                    el.classList.remove('filter-active');
                });
                this.classList.add('filter-active');

                portfolioIsotope.arrange({
                    filter: this.getAttribute('data-filter')
                });
                portfolioIsotope.on('arrangeComplete', function () {
                    AOS.refresh()
                });
            }, true);
        }

    });

    /**
     * Initiate portfolio lightbox
     */
    // const portfolioLightbox = GLightbox({
    //     selector: '.portfolio-lightbox'
    // });

    /**
     * Portfolio details slider
     */
    // new Swiper('.portfolio-details-slider', {
    //     speed: 400,
    //     loop: true,
    //     autoplay: {
    //         delay: 5000,
    //         disableOnInteraction: false
    //     },
    //     pagination: {
    //         el: '.swiper-pagination',
    //         type: 'bullets',
    //         clickable: true
    //     }
    // });

    /**
     * Testimonials slider
     */
    // new Swiper('.testimonials-slider', {
    //     speed: 600,
    //     loop: true,
    //     autoplay: {
    //         delay: 5000,
    //         disableOnInteraction: false
    //     },
    //     slidesPerView: 'auto',
    //     pagination: {
    //         el: '.swiper-pagination',
    //         type: 'bullets',
    //         clickable: true
    //     }
    // });

    /**
     * Animation on scroll
     */
    window.addEventListener('load', () => {
        // Get the scroll position from local storage
        let scrollPos = localStorage.getItem('scrollPos');
        if (scrollPos !== null) {
            // Convert the scroll position to an integer
            scrollPos = parseInt(scrollPos, 10);

            // Set the scroll position of the page
            document.body.scrollTop = scrollPos;
            document.documentElement.scrollTop = scrollPos;
        }


        /**************************************************/

        AOS.init({
            duration: 1000,
            easing: "ease-in-out",
            once: true,
            mirror: false
        });
    });

    // Set up the event listener for the "scroll" event
    window.addEventListener('scroll', function () {
        let scrollPos = document.body.scrollTop || document.documentElement.scrollTop;
        localStorage.setItem('scrollPos', scrollPos.toString());
    });


    /**
     * Initiate Pure Counter
     */
    // new PureCounter();

    const orderthisbtns = document.querySelectorAll(".cmd_btn");

    const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.intersectionRatio > 0) {
                    entry.target.style.animation = "shake 0.82s cubic-bezier(.36, .07, .19, .97) both";
                } else {
                    entry.target.style.animation = "none";
                }
            })
        },
        {
            rootMargin: "-10%",
            threshold: 1,
        });

    orderthisbtns.forEach(orderthisbtn => {
        observer.observe(orderthisbtn);
    });


})()

/*
window.onscroll = function (e) { // called when the window is scrolled.
    console.log(document.documentElement.scrollTop);
}
*/

function setCookie(cname, cvalue, exdays) {
    const d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function genEmailMe() {
    const emailTo = "archer.chris@gmail.com";
    const emailSub = "Hello";
    const emailBody = "";

    window.open(
        "mailto:" + emailTo + "?subject=" + emailSub + "&body=" + emailBody
    );
}

function makeBlurb(itemLabel) {
    let blurb;

    if (localStorage.getItem("lang") === "fr") {
        blurb = {
            subject:
                "Devis pour un projet de dépannage. KrisPC Services Informatiques",
            body: `Bonjour, je souhaiterais des informations complémentaires concernant votre annonce «${itemLabel}» `,
            // merci de me recontacter aux coordonnées indiquées
        };
    } else {
        blurb = {
            subject: "Quote request for repair project. KrisPC Computer Services",
            body: `Hello, I would like some more information about your offer: "${itemLabel}".`,
        };
    }

    return blurb;
}

function getOS() {
    const userAgent = window.navigator.userAgent,
        platform = window.navigator?.userAgentData?.platform || window.navigator.platform,
        macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
        windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
        iosPlatforms = ['iPhone', 'iPad', 'iPod'];

    let os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
        os = 'Mac OS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
        os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
        os = 'Windows';
    } else if (/Android/.test(userAgent)) {
        os = 'Android';
    } else if (/Linux/.test(platform)) {
        os = 'Linux';
    }

    return os;
}

function isIOS() {
    return (getOS() === 'Mac OS');
}

function scrolllTo(hash, locale, msg) {

    const targetElement = document.getElementById(hash);
    targetElement.scrollIntoView({
        behavior: 'smooth'
    });


    const preamble = document.getElementById("the-preamble").textContent

    let o_guillenet = '"';
    let f_guillenet = o_guillenet;

    if (locale === "fr") {
        o_guillenet = '«' + String.fromCharCode(0x00A0);
        f_guillenet = String.fromCharCode(0x00A0) + '»';
    }


    document.getElementById("id_message").textContent = preamble + " " + o_guillenet + msg + f_guillenet;
}

function sendSMS(msg) {
    const sep = isIOS() ? "&" : "?";

    window.location = `sms:+33-6-19-67-03-56${sep}body=${msg}`;
}
