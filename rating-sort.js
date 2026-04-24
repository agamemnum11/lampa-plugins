(function () {
    'use strict';

    var PLUGIN_NAME = 'RatingSort';
    var PLUGIN_VERSION = '2.0.0';
    var sortActive = false;

    // ── Витягнути рейтинг з картки ────────────────────────────────────────────

    function getVoteFromCard(el) {
        // 1) data-атрибути
        var v = parseFloat(el.dataset.vote || el.dataset.rating || 0);
        if (v > 0) return v;

        // 2) Текст всередині картки (.card__vote, .vote, .card__rating)
        var voteEl = el.querySelector('.card__vote') ||
                     el.querySelector('.vote') ||
                     el.querySelector('.card__rating') ||
                     el.querySelector('[class*="vote"]') ||
                     el.querySelector('[class*="rating"]');
        if (voteEl) {
            v = parseFloat(voteEl.textContent.trim());
            if (v > 0) return v;
        }

        // 3) Будь-який елемент з числом у форматі X.X
        var allSpans = el.querySelectorAll('span, div');
        for (var i = 0; i < allSpans.length; i++) {
            var txt = allSpans[i].textContent.trim();
            var match = txt.match(/^(\d+\.\d+)$/);
            if (match) {
                v = parseFloat(match[1]);
                if (v > 0 && v <= 10) return v;
            }
        }

        return 0;
    }

    // ── Відсортувати картки у контейнері ──────────────────────────────────────

    function sortContainer(container) {
        if (!container) return;

        var cards = Array.from(container.children).filter(function (el) {
            return el.classList.contains('card') ||
                   el.classList.contains('item') ||
                   el.querySelector('.card__poster') ||
                   el.querySelector('.card__vote') ||
                   el.querySelector('[class*="vote"]');
        });

        if (cards.length < 2) return;

        var rated = cards.map(function (el) {
            return { el: el, vote: getVoteFromCard(el) };
        });

        rated.sort(function (a, b) { return b.vote - a.vote; });

        rated.forEach(function (item) {
            container.appendChild(item.el);
        });
    }

    // ── Знайти всі контейнери і відсортувати ──────────────────────────────────

    function applySort() {
        if (!sortActive) return;

        var containers = document.querySelectorAll(
            '.items-list, .catalog__items, .selectbox-list, ' +
            '.category-full__content, .full-start__items, ' +
            '.scroll__body, [class*="items"], [class*="catalog"]'
        );

        containers.forEach(function (container) {
            var hasVotes = container.querySelector(
                '.card__vote, .vote, [class*="vote"], [class*="rating"]'
            );
            if (hasVotes) sortContainer(container);
        });
    }

    // ── Кнопка ────────────────────────────────────────────────────────────────

    function createButton() {
        if (document.getElementById('rs-btn')) return;

        var btn = document.createElement('div');
        btn.id = 'rs-btn';
        btn.textContent = '★ Рейтинг';
        btn.style.cssText = [
            'position:fixed',
            'bottom:20px',
            'right:20px',
            'z-index:99999',
            'background:rgba(20,20,20,.9)',
            'color:#fff',
            'border:2px solid rgba(255,255,255,.3)',
            'border-radius:8px',
            'padding:10px 20px',
            'font-size:15px',
            'font-weight:600',
            'cursor:pointer',
            'user-select:none',
            'transition:all .2s'
        ].join(';');

        btn.addEventListener('click', function () {
            sortActive = !sortActive;
            btn.style.background = sortActive
                ? 'rgba(76,175,80,.95)'
                : 'rgba(20,20,20,.9)';
            btn.style.borderColor = sortActive
                ? '#4caf50'
                : 'rgba(255,255,255,.3)';
            btn.textContent = sortActive ? '★ Сортування: ВКЛ' : '★ Рейтинг';
            if (sortActive) applySort();
        });

        document.body.appendChild(btn);
    }

    // ── Підписка на події Lampa ───────────────────────────────────────────────

    function hookLampa() {
        if (typeof Lampa === 'undefined') {
            setTimeout(hookLampa, 300);
            return;
        }

        createButton();

        if (Lampa.Listener) {
            Lampa.Listener.follow('full', function () {
                if (sortActive) setTimeout(applySort, 500);
            });
        }

        if (Lampa.Arrays && Lampa.Arrays.extend) {
            var _extend = Lampa.Arrays.extend;
            Lampa.Arrays.extend = function (target, items) {
                if (sortActive && Array.isArray(items) && items.length) {
                    items = items.slice().sort(function (a, b) {
                        var ra = parseFloat(a.vote_average || (a.rating && a.rating.tmdb) || 0);
                        var rb = parseFloat(b.vote_average || (b.rating && b.rating.tmdb) || 0);
                        return rb - ra;
                    });
                }
                return _extend.call(this, target, items);
            };
        }

        var timer;
        var obs = new MutationObserver(function (muts) {
            if (!sortActive) return;
            var hasCards = muts.some(function (m) {
                return Array.from(m.addedNodes).some(function (n) {
                    return n.nodeType === 1 && (
                        n.classList.contains('card') ||
                        (n.querySelector && n.querySelector('.card__vote, [class*="vote"]'))
                    );
                });
            });
            if (hasCards) {
                clearTimeout(timer);
                timer = setTimeout(applySort, 400);
            }
        });

        obs.observe(document.body, { childList: true, subtree: true });

        console.log('[RatingSort] v' + PLUGIN_VERSION + ' готовий');
    }

    if (typeof Lampa !== 'undefined' && Lampa.Plugin) {
        Lampa.Plugin.add({
            name: 'rating_sort',
            version: PLUGIN_VERSION,
            description: 'Сортування фільмів за рейтингом',
            type: 'other',
            start: hookLampa
        });
    } else {
        window.addEventListener('load', hookLampa);
        setTimeout(hookLampa, 800);
    }

})();
