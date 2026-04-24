(function () {
    'use strict';

    var PLUGIN_NAME = 'RatingSort';
    var PLUGIN_VERSION = '1.0.0';

    // ── Utility ──────────────────────────────────────────────────────────────

    function getRating(item) {
        // Lampa stores ratings in different fields depending on source
        var vote = parseFloat(
            item.vote_average ||
            (item.rating && item.rating.imdb) ||
            (item.rating && item.rating.tmdb) ||
            item.imdb_id_rating ||
            0
        );
        return isNaN(vote) ? 0 : vote;
    }

    function sortByRating(items) {
        return items.slice().sort(function (a, b) {
            return getRating(b) - getRating(a);
        });
    }

    function addRatingBadge(element, rating) {
        if (!element || rating <= 0) return;
        if (element.querySelector('.rs-badge')) return;

        var color = rating >= 7 ? '#4caf50' : rating >= 5 ? '#ff9800' : '#f44336';
        var badge = document.createElement('div');
        badge.className = 'rs-badge';
        badge.style.cssText = [
            'position:absolute',
            'top:6px',
            'right:6px',
            'background:' + color,
            'color:#fff',
            'font-size:13px',
            'font-weight:600',
            'padding:2px 7px',
            'border-radius:4px',
            'z-index:10',
            'pointer-events:none',
            'box-shadow:0 1px 4px rgba(0,0,0,.5)'
        ].join(';');
        badge.textContent = rating.toFixed(1);

        var wrap = element.querySelector('.card--poster, .card__poster, .poster');
        if (wrap) {
            var pos = getComputedStyle(wrap).position;
            if (pos === 'static') wrap.style.position = 'relative';
            wrap.appendChild(badge);
        }
    }

    // ── Sort button UI ────────────────────────────────────────────────────────

    var sortActive = false;

    function toggleSortButton(active) {
        sortActive = active;
        var btn = document.getElementById('rs-sort-btn');
        if (btn) {
            btn.style.background = active ? 'rgba(76,175,80,.85)' : 'rgba(0,0,0,.65)';
            btn.title = active ? 'Сортування: за рейтингом (вкл)' : 'Сортування: за рейтингом (викл)';
        }
    }

    function createSortButton() {
        if (document.getElementById('rs-sort-btn')) return;

        var btn = document.createElement('button');
        btn.id = 'rs-sort-btn';
        btn.title = 'Сортування: за рейтингом (викл)';
        btn.innerHTML = '&#9733; Рейтинг';
        btn.style.cssText = [
            'position:fixed',
            'bottom:24px',
            'right:24px',
            'z-index:9999',
            'background:rgba(0,0,0,.65)',
            'color:#fff',
            'border:1px solid rgba(255,255,255,.25)',
            'border-radius:6px',
            'padding:8px 16px',
            'font-size:14px',
            'cursor:pointer',
            'transition:background .2s',
            'backdrop-filter:blur(4px)'
        ].join(';');

        btn.addEventListener('click', function () {
            sortActive = !sortActive;
            toggleSortButton(sortActive);
            applySortToCurrentView();
        });

        document.body.appendChild(btn);
    }

    // ── Core: apply sort to whatever list is visible ──────────────────────────

    function applySortToCurrentView() {
        // Works with Lampa's card grid (.items-list, .selectbox-list, .catalog__items)
        var selectors = [
            '.items-list',
            '.selectbox-list',
            '.catalog__items',
            '.full-start__buttons',
            '.category-full',
        ];

        selectors.forEach(function (sel) {
            var container = document.querySelector(sel);
            if (!container) return;

            var cards = Array.from(
                container.querySelectorAll('.card, .selectbox-item, [data-vote]')
            );
            if (!cards.length) return;

            var rated = cards.map(function (el) {
                var vote =
                    parseFloat(el.dataset.vote || 0) ||
                    parseFloat((el.querySelector('.card__vote, .vote') || {}).textContent || 0) ||
                    0;
                return { el: el, vote: isNaN(vote) ? 0 : vote };
            });

            if (sortActive) {
                rated.sort(function (a, b) { return b.vote - a.vote; });
            }

            // Re-insert in new order (or original order if sort off)
            var fragment = document.createDocumentFragment();
            rated.forEach(function (item) {
                fragment.appendChild(item.el);
                if (sortActive && item.vote > 0) {
                    addBadgeToCard(item.el, item.vote);
                }
            });
            container.appendChild(fragment);
        });
    }

    function addBadgeToCard(el, vote) {
        if (el.querySelector('.rs-badge')) return;
        var color = vote >= 7 ? '#4caf50' : vote >= 5 ? '#ff9800' : '#f44336';
        var badge = document.createElement('span');
        badge.className = 'rs-badge';
        badge.style.cssText = [
            'position:absolute',
            'top:6px',
            'right:6px',
            'background:' + color,
            'color:#fff',
            'font-size:12px',
            'font-weight:700',
            'padding:2px 6px',
            'border-radius:4px',
            'z-index:10',
            'pointer-events:none'
        ].join(';');
        badge.textContent = vote.toFixed(1);

        // Find the poster wrapper inside the card
        var poster = el.querySelector('.card--poster') ||
                     el.querySelector('.card__poster') ||
                     el.querySelector('img');
        var target = poster ? poster.parentElement || poster : el;
        if (getComputedStyle(target).position === 'static') {
            target.style.position = 'relative';
        }
        target.appendChild(badge);
    }

    // ── Hook into Lampa events ────────────────────────────────────────────────

    function hookLampa() {
        if (typeof Lampa === 'undefined') {
            setTimeout(hookLampa, 500);
            return;
        }

        // Lampa.Listener — subscribe to page/component changes
        if (Lampa.Listener && Lampa.Listener.follow) {
            Lampa.Listener.follow('full', function (e) {
                // 'full' fires when a catalog/collection page fully renders
                if (e.type === 'complite' || e.type === 'complete') {
                    if (sortActive) {
                        setTimeout(applySortToCurrentView, 300);
                    }
                }
            });
        }

        // Also hook into catalog component if available
        if (Lampa.Component && Lampa.Component.add) {
            try {
                Lampa.Component.add('rating_sort_hook', {
                    onCreate: function () {
                        if (sortActive) setTimeout(applySortToCurrentView, 400);
                    }
                });
            } catch (e) { /* silent */ }
        }

        // Sort API results before they reach the UI
        if (Lampa.Arrays && Lampa.Arrays.extend) {
            var originalExtend = Lampa.Arrays.extend;
            Lampa.Arrays.extend = function (target, items) {
                if (sortActive && Array.isArray(items)) {
                    items = sortByRating(items);
                }
                return originalExtend.call(this, target, items);
            };
        }

        // Hook catalog network response
        if (Lampa.Api && Lampa.Api.results) {
            var originalResults = Lampa.Api.results;
            Lampa.Api.results = function (data) {
                if (sortActive && data && Array.isArray(data.results)) {
                    data.results = sortByRating(data.results);
                }
                return originalResults.apply(this, arguments);
            };
        }

        createSortButton();
        console.log('[' + PLUGIN_NAME + '] v' + PLUGIN_VERSION + ' завантажено');
    }

    // ── MutationObserver: react when new cards appear ─────────────────────────

    var observer = new MutationObserver(function (mutations) {
        if (!sortActive) return;
        var needsSort = mutations.some(function (m) {
            return m.addedNodes.length > 0;
        });
        if (needsSort) {
            clearTimeout(observer._timer);
            observer._timer = setTimeout(applySortToCurrentView, 250);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // ── Lampa plugin manifest ─────────────────────────────────────────────────

    var plugin = {
        name: PLUGIN_NAME,
        version: PLUGIN_VERSION,
        description: 'Сортує фільми та серіали за рейтингом від вищого до нижчого',
        author: 'Custom',
        start: hookLampa
    };

    // Register with Lampa if available, otherwise self-start
    if (typeof Lampa !== 'undefined' && Lampa.Plugin) {
        Lampa.Plugin.add(plugin);
    } else {
        document.addEventListener('DOMContentLoaded', hookLampa);
        setTimeout(hookLampa, 1000);
    }

})();
