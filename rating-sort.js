(function () {
    'use strict';

    var VERSION = '3.0.0';
    var sortActive = false;

    // ── Витягнути рейтинг з картки ────────────────────────────────────────────
    // Реальний клас в Lampa: .card__vote

    function getVote(cardEl) {
        var voteEl = cardEl.querySelector('.card__vote');
        if (voteEl) {
            var v = parseFloat(voteEl.textContent.trim());
            if (!isNaN(v) && v > 0) return v;
        }
        return 0;
    }

    // ── Відсортувати один горизонтальний ряд ──────────────────────────────────
    // Контейнер: .items-line__body > .scroll > .scroll__body
    // Картки всередині: .card

    function sortScrollBody(scrollBody) {
        var cards = Array.from(scrollBody.querySelectorAll(':scope > .card'));
        if (cards.length < 2) return;

        var withRating = cards.map(function (el) {
            return { el: el, vote: getVote(el) };
        });

        withRating.sort(function (a, b) { return b.vote - a.vote; });

        withRating.forEach(function (item) {
            scrollBody.appendChild(item.el);
        });
    }

    // ── Відсортувати всі ряди на екрані ──────────────────────────────────────

    function applySort() {
        if (!sortActive) return;

        // Горизонтальні ряди (головна сторінка)
        document.querySelectorAll('.scroll__body').forEach(function (sb) {
            if (sb.querySelector('.card__vote')) {
                sortScrollBody(sb);
            }
        });

        // Каталог (сітка)
        document.querySelectorAll('.items-list, .catalog__items').forEach(function (container) {
            var cards = Array.from(container.querySelectorAll(':scope > .card'));
            if (cards.length < 2) return;

            var withRating = cards.map(function (el) {
                return { el: el, vote: getVote(el) };
            });

            withRating.sort(function (a, b) { return b.vote - a.vote; });
            withRating.forEach(function (item) { container.appendChild(item.el); });
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
            btn.style.background = sortActive ? 'rgba(76,175,80,.95)' : 'rgba(20,20,20,.9)';
            btn.style.borderColor = sortActive ? '#4caf50' : 'rgba(255,255,255,.3)';
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

        // Подія після рендеру будь-якого компонента
        Lampa.Listener.follow('full', function (e) {
            if (sortActive) setTimeout(applySort, 600);
        });

        // Хук на дані API — сортує до рендеру (найефективніший спосіб)
        if (Lampa.Arrays && Lampa.Arrays.extend) {
            var _extend = Lampa.Arrays.extend;
            Lampa.Arrays.extend = function (target, items) {
                if (sortActive && Array.isArray(items) && items.length) {
                    items = items.slice().sort(function (a, b) {
                        var ra = parseFloat(a.vote_average || 0);
                        var rb = parseFloat(b.vote_average || 0);
                        return rb - ra;
                    });
                }
                return _extend.call(this, target, items);
            };
        }

        // MutationObserver — реагує на появу нових .card__vote елементів
        var timer;
        new MutationObserver(function (muts) {
            if (!sortActive) return;
            var hasNew = muts.some(function (m) {
                return Array.from(m.addedNodes).some(function (n) {
                    return n.nodeType === 1 && (
                        n.classList && n.classList.contains('card') ||
                        n.querySelector && n.querySelector('.card__vote')
                    );
                });
            });
            if (hasNew) {
                clearTimeout(timer);
                timer = setTimeout(applySort, 500);
            }
        }).observe(document.body, { childList: true, subtree: true });

        console.log('[RatingSort] v' + VERSION + ' готовий. Класи: .card, .card__vote, .scroll__body');
    }

    // ── Реєстрація ───────────────────────────────────────────────────────────

    if (typeof Lampa !== 'undefined' && Lampa.Plugin) {
        Lampa.Plugin.add({
            name: 'rating_sort',
            version: VERSION,
            description: 'Сортування фільмів за рейтингом від вищого до нижчого',
            type: 'other',
            start: hookLampa
        });
    } else {
        window.addEventListener('load', hookLampa);
        setTimeout(hookLampa, 800);
    }

})();
