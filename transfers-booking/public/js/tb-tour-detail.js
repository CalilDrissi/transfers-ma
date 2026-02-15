/**
 * Tour detail page — loads trip by slug, renders all sections,
 * gallery lightbox, FAQ accordion, live price calculation, booking.
 */
(function () {
    'use strict';

    window.TB = window.TB || {};

    var cfg, i18n, trip, lightboxImages, lightboxIndex;

    TB.TourDetail = {

        init: function () {
            cfg = (typeof tbConfig !== 'undefined') ? tbConfig : {};
            i18n = cfg.i18n || {};
            lightboxImages = [];
            lightboxIndex = 0;

            var slug = this.getSlug();
            if (!slug) {
                this.showError();
                return;
            }

            this.loadTrip(slug);
            this.initSteppers();
            this.initLightbox();
        },

        getSlug: function () {
            // Try from URL path: /tours/{slug}/
            var path = window.location.pathname.replace(/\/$/, '');
            var parts = path.split('/');
            var slug = parts[parts.length - 1];
            if (slug && slug !== 'tours' && slug !== 'tour-detail') return slug;

            // Try query param
            return new URLSearchParams(window.location.search).get('slug') || '';
        },

        /* ── Load trip ────────────────────────── */

        loadTrip: function (slug) {
            var self = this;

            TB.API._call('get_trip_detail', { _path_suffix: slug + '/' }).then(function (data) {
                trip = data;
                self.hideLoading();
                self.renderTrip(data);
            }).catch(function (err) {
                self.hideLoading();
                self.showError(err.message);
            });
        },

        hideLoading: function () {
            var el = document.getElementById('tb-tour-loading');
            if (el) el.style.display = 'none';
        },

        showError: function (msg) {
            this.hideLoading();
            var el = document.getElementById('tb-tour-error');
            if (el) el.style.display = 'block';
        },

        /* ── Render trip ──────────────────────── */

        renderTrip: function (data) {
            var content = document.getElementById('tb-tour-content');
            if (content) content.style.display = 'block';

            var currency = data.currency || cfg.currencySymbol || 'MAD';

            // Hero
            if (data.featured_image) {
                var heroImg = document.getElementById('tb-tour-hero-img');
                if (heroImg) { heroImg.src = data.featured_image; heroImg.alt = data.name || ''; }
            }

            setText('tb-tour-name', data.name || '');
            setText('tb-tour-type-badge', formatTripType(data.trip_type));
            setText('tb-tour-city-text', data.departure_location || '');

            // Duration
            var durText = '';
            if (data.duration_days && data.duration_days > 0) {
                durText = data.duration_days + ' ' + (data.duration_days > 1 ? (i18n.days || 'days') : (i18n.day || 'day'));
            } else if (data.duration_hours) {
                durText = data.duration_hours + ' ' + (i18n.hours || 'hours');
            }
            setText('tb-tour-duration-text', durText);
            setText('tb-tour-qi-duration-text', durText);

            // Quick info
            var paxText = (data.min_participants || 1) + '-' + (data.max_participants || 20) + ' ' + (i18n.participantsLabel || 'participants');
            setText('tb-tour-qi-pax-text', paxText);

            var cancelText = formatCancellation(data.cancellation_policy);
            setText('tb-tour-qi-cancel-text', cancelText);

            // Description
            var descEl = document.getElementById('tb-tour-description');
            if (descEl && data.description) {
                descEl.innerHTML = escapeHtml(data.description).replace(/\n/g, '<br>');
            }

            // Highlights
            var destinations = data.destinations_list || data.destinations || [];
            if (destinations.length > 0) {
                showSection('tb-tour-highlights-section');
                var hlEl = document.getElementById('tb-tour-highlights');
                if (hlEl) {
                    hlEl.innerHTML = '';
                    for (var h = 0; h < destinations.length; h++) {
                        var item = document.createElement('div');
                        item.className = 'tb-tour-detail__highlight-item';
                        item.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> ' + escapeHtml(destinations[h]);
                        hlEl.appendChild(item);
                    }
                }
            }

            // Itinerary
            if (data.itinerary && data.itinerary.length > 0) {
                showSection('tb-tour-itinerary-section');
                var itEl = document.getElementById('tb-tour-itinerary');
                if (itEl) {
                    itEl.innerHTML = '';
                    for (var s = 0; s < data.itinerary.length; s++) {
                        var stop = data.itinerary[s];
                        var stopEl = document.createElement('div');
                        stopEl.className = 'tb-tour-detail__itinerary-stop';
                        stopEl.innerHTML =
                            '<div class="tb-tour-detail__itinerary-dot">' + (s + 1) + '</div>' +
                            '<div class="tb-tour-detail__itinerary-content">' +
                                '<div class="tb-tour-detail__itinerary-name">' + escapeHtml(stop.name || stop.title || '') + '</div>' +
                                (stop.description ? '<div class="tb-tour-detail__itinerary-desc">' + escapeHtml(stop.description) + '</div>' : '') +
                                (stop.duration ? '<div class="tb-tour-detail__itinerary-duration">' + escapeHtml(stop.duration) + '</div>' : '') +
                            '</div>';
                        itEl.appendChild(stopEl);
                    }
                }
            }

            // Inclusions / Exclusions
            var inclusions = data.inclusions_list || [];
            var exclusions = data.exclusions_list || [];
            if (inclusions.length > 0 || exclusions.length > 0) {
                showSection('tb-tour-incl-excl-section');

                var inclEl = document.getElementById('tb-tour-inclusions');
                if (inclEl && inclusions.length > 0) {
                    inclEl.innerHTML = '';
                    for (var inc = 0; inc < inclusions.length; inc++) {
                        var li = document.createElement('li');
                        li.textContent = inclusions[inc];
                        inclEl.appendChild(li);
                    }
                }

                var exclEl = document.getElementById('tb-tour-exclusions');
                if (exclEl && exclusions.length > 0) {
                    exclEl.innerHTML = '';
                    for (var exc = 0; exc < exclusions.length; exc++) {
                        var li2 = document.createElement('li');
                        li2.textContent = exclusions[exc];
                        exclEl.appendChild(li2);
                    }
                }
            }

            // Gallery
            var images = data.images || [];
            if (images.length > 0) {
                showSection('tb-tour-gallery-section');
                var galEl = document.getElementById('tb-tour-gallery');
                if (galEl) {
                    galEl.innerHTML = '';
                    lightboxImages = [];
                    for (var g = 0; g < images.length; g++) {
                        var imgUrl = images[g].image || images[g];
                        lightboxImages.push(imgUrl);

                        var galleryItem = document.createElement('div');
                        galleryItem.className = 'tb-tour-detail__gallery-item';
                        galleryItem.setAttribute('data-index', g);

                        var galleryImg = document.createElement('img');
                        galleryImg.src = imgUrl;
                        galleryImg.alt = data.name + ' ' + (g + 1);
                        galleryImg.loading = 'lazy';

                        galleryItem.appendChild(galleryImg);
                        galleryItem.addEventListener('click', (function (idx) {
                            return function () { TB.TourDetail.openLightbox(idx); };
                        })(g));

                        galEl.appendChild(galleryItem);
                    }
                }
            }

            // FAQ (from custom_info if available)
            var customInfo = data.custom_info || {};
            var faqs = customInfo.faq || [];
            if (faqs.length > 0) {
                showSection('tb-tour-faq-section');
                var faqEl = document.getElementById('tb-tour-faq');
                if (faqEl) {
                    faqEl.innerHTML = '';
                    for (var q = 0; q < faqs.length; q++) {
                        var faqItem = document.createElement('div');
                        faqItem.className = 'tb-tour-detail__faq-item';
                        faqItem.innerHTML =
                            '<button type="button" class="tb-tour-detail__faq-question">' +
                                '<span>' + escapeHtml(faqs[q].question || faqs[q].q || '') + '</span>' +
                                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                            '</button>' +
                            '<div class="tb-tour-detail__faq-answer">' +
                                '<p>' + escapeHtml(faqs[q].answer || faqs[q].a || '') + '</p>' +
                            '</div>';

                        faqItem.querySelector('.tb-tour-detail__faq-question').addEventListener('click', function () {
                            this.parentElement.classList.toggle('tb-tour-detail__faq-item--open');
                        });

                        faqEl.appendChild(faqItem);
                    }
                }
            }

            // Booking card
            this.renderBookingCard(data, currency);
        },

        /* ── Booking card ─────────────────────── */

        renderBookingCard: function (data, currency) {
            var price = parseFloat(data.price_per_person) || 0;
            var childPrice = parseFloat(data.child_price) || 0;
            var privatePrice = parseFloat(data.private_tour_price) || 0;

            setText('tb-tour-price-value', Math.round(price));
            setText('tb-tour-price-currency', currency);

            var unitText = data.pricing_model === 'per_group' ? ('/' + (i18n.group || 'group')) : ('/' + (i18n.person || 'person'));
            setText('tb-tour-price-unit', unitText);

            // Show private toggle if private price available
            if (privatePrice > 0) {
                var privateField = document.getElementById('tb-tour-private-field');
                if (privateField) privateField.style.display = 'block';
            }

            // Set date min to tomorrow
            var dateInput = document.getElementById('tb-tour-date');
            if (dateInput) {
                var tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                dateInput.min = tomorrow.toISOString().split('T')[0];
            }

            // Mobile bar
            var mobilePrice = document.getElementById('tb-tour-mobile-price');
            if (mobilePrice) mobilePrice.textContent = formatPrice(price, currency);
            var mobileBar = document.getElementById('tb-tour-mobile-bar');
            if (mobileBar) mobileBar.style.display = '';

            // Live price calc
            var self = this;
            this.updateTotal();

            // Listen for changes
            var adults = document.getElementById('tb-tour-adults');
            var children = document.getElementById('tb-tour-children');
            var privateToggle = document.getElementById('tb-tour-private');

            if (privateToggle) {
                privateToggle.addEventListener('change', function () { self.updateTotal(); });
            }

            // Book button
            var bookBtn = document.getElementById('tb-tour-book-btn');
            var mobileBookBtn = document.getElementById('tb-tour-mobile-book-btn');

            var handleBook = function () { self.handleBook(); };
            if (bookBtn) bookBtn.addEventListener('click', handleBook);
            if (mobileBookBtn) mobileBookBtn.addEventListener('click', handleBook);
        },

        updateTotal: function () {
            if (!trip) return;

            var currency = trip.currency || cfg.currencySymbol || 'MAD';
            var adults = parseInt(document.getElementById('tb-tour-adults').textContent, 10) || 1;
            var children = parseInt(document.getElementById('tb-tour-children').textContent, 10) || 0;
            var isPrivate = document.getElementById('tb-tour-private') ? document.getElementById('tb-tour-private').checked : false;

            var total;
            if (isPrivate && parseFloat(trip.private_tour_price) > 0) {
                total = parseFloat(trip.private_tour_price);
            } else if (trip.pricing_model === 'per_group') {
                total = parseFloat(trip.price_per_person) || 0;
            } else {
                var adultPrice = parseFloat(trip.price_per_person) || 0;
                var childPriceVal = parseFloat(trip.child_price) || adultPrice;
                total = (adults * adultPrice) + (children * childPriceVal);
            }

            setText('tb-tour-total', formatPrice(total, currency));
        },

        handleBook: function () {
            var dateInput = document.getElementById('tb-tour-date');
            if (!dateInput || !dateInput.value) {
                dateInput.style.borderColor = '#EF4444';
                dateInput.focus();
                return;
            }
            dateInput.style.borderColor = '';

            var adults = parseInt(document.getElementById('tb-tour-adults').textContent, 10) || 1;
            var children = parseInt(document.getElementById('tb-tour-children').textContent, 10) || 0;
            var isPrivate = document.getElementById('tb-tour-private') ? document.getElementById('tb-tour-private').checked : false;

            var checkoutUrl = cfg.checkoutPageUrl || '/checkout/';
            var sp = new URLSearchParams();
            sp.set('type', 'trip');
            sp.set('trip_id', trip.id);
            sp.set('trip_name', trip.name || '');
            sp.set('date', dateInput.value);
            sp.set('adults', adults);
            sp.set('children', children);
            sp.set('passengers', adults + children);
            sp.set('is_private', isPrivate ? '1' : '0');
            sp.set('price', document.getElementById('tb-tour-total') ? document.getElementById('tb-tour-total').textContent.replace(/[^\d]/g, '') : '0');
            sp.set('currency', trip.currency || cfg.currencySymbol || 'MAD');

            window.location.href = checkoutUrl + '?' + sp.toString();
        },

        /* ── Steppers ─────────────────────────── */

        initSteppers: function () {
            var self = this;
            var buttons = document.querySelectorAll('.tb-tour-detail__stepper-btn');

            for (var i = 0; i < buttons.length; i++) {
                buttons[i].addEventListener('click', function () {
                    var targetId = this.getAttribute('data-target');
                    var action = this.getAttribute('data-action');
                    var valueEl = document.getElementById(targetId);
                    if (!valueEl) return;

                    var current = parseInt(valueEl.textContent, 10) || 0;
                    var isAdults = targetId.indexOf('adults') !== -1;
                    var min = isAdults ? 1 : 0;
                    var max = 20;

                    if (action === 'increase' && current < max) {
                        valueEl.textContent = current + 1;
                    } else if (action === 'decrease' && current > min) {
                        valueEl.textContent = current - 1;
                    }

                    self.updateTotal();
                });
            }
        },

        /* ── Lightbox ─────────────────────────── */

        initLightbox: function () {
            var overlay = document.querySelector('.tb-tour-detail__lightbox-overlay');
            var closeBtn = document.querySelector('.tb-tour-detail__lightbox-close');
            var prevBtn = document.querySelector('.tb-tour-detail__lightbox-prev');
            var nextBtn = document.querySelector('.tb-tour-detail__lightbox-next');

            var self = this;

            if (overlay) overlay.addEventListener('click', function () { self.closeLightbox(); });
            if (closeBtn) closeBtn.addEventListener('click', function () { self.closeLightbox(); });
            if (prevBtn) prevBtn.addEventListener('click', function () { self.lightboxNav(-1); });
            if (nextBtn) nextBtn.addEventListener('click', function () { self.lightboxNav(1); });

            document.addEventListener('keydown', function (e) {
                var lb = document.getElementById('tb-tour-lightbox');
                if (!lb || lb.style.display === 'none') return;
                if (e.key === 'Escape') self.closeLightbox();
                if (e.key === 'ArrowLeft') self.lightboxNav(-1);
                if (e.key === 'ArrowRight') self.lightboxNav(1);
            });
        },

        openLightbox: function (index) {
            lightboxIndex = index;
            var lb = document.getElementById('tb-tour-lightbox');
            var img = document.getElementById('tb-tour-lightbox-img');
            if (lb && img && lightboxImages[index]) {
                img.src = lightboxImages[index];
                lb.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        },

        closeLightbox: function () {
            var lb = document.getElementById('tb-tour-lightbox');
            if (lb) lb.style.display = 'none';
            document.body.style.overflow = '';
        },

        lightboxNav: function (dir) {
            lightboxIndex += dir;
            if (lightboxIndex < 0) lightboxIndex = lightboxImages.length - 1;
            if (lightboxIndex >= lightboxImages.length) lightboxIndex = 0;

            var img = document.getElementById('tb-tour-lightbox-img');
            if (img && lightboxImages[lightboxIndex]) {
                img.src = lightboxImages[lightboxIndex];
            }
        }
    };

    /* ── Helpers ──────────────────────────────── */

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function showSection(id) {
        var el = document.getElementById(id);
        if (el) el.style.display = 'block';
    }

    function formatTripType(type) {
        var map = {
            'day_trip': 'Day Trip',
            'half_day': 'Half Day',
            'multi_day': 'Multi-Day',
            'private': 'Private',
            'group': 'Group'
        };
        return map[type] || type;
    }

    function formatCancellation(policy) {
        var map = {
            'flexible': 'Free cancellation',
            'moderate': 'Moderate cancellation',
            'strict': 'Strict cancellation',
            'non_refundable': 'Non-refundable'
        };
        return map[policy] || 'Free cancellation';
    }

    function formatPrice(amount, currency) {
        var num = Math.round(parseFloat(amount));
        if (isNaN(num)) return '--';
        var cfg2 = (typeof tbConfig !== 'undefined') ? tbConfig : {};
        var pos = cfg2.currencyPosition || 'after';
        if (pos === 'before') return currency + ' ' + num;
        return num + ' ' + currency;
    }

    function escapeHtml(str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    /* ── Boot ─────────────────────────────────── */

    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('tb-tour-detail')) {
            TB.TourDetail.init();
        }
    });

})();
