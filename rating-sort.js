(function () {
    'use strict';

    var VERSION = '4.0.0';
    var sortActive = false;

    // Структура DOM (перевірено):
    // .scroll__body.mapping--line  ← контейнер рядка
    //   .card                      ← картка
    //     .card__view
    //       .card__vote            ← рейтинг "6.7"

    function getVote(cardEl) {
        var el = cardEl.querySelector('.card__vote');
        if (!el) return 0;
        var v = parseFloat(el.textContent.trim());
        return isNaN(v) ? 0 : v;
    }

    function sortContainer(container) {
        var cards = Array.from(container.querySelectorAll(':scope > .card'));
        if (cards.length < 2) return;

        cards.sort(function (a, b) {
            return getVote(b) - getVote(a);
        });

        cards.forEach(function (c) { container.appendChild(c); });
    }

    function applySort() {
        if (!sortActive) return;

        // Горизонтальні ряди: .scroll__body.mapping--line
        document.querySelectorAll('.scroll__body.mapping--line').forEach(sortContainer);

        // Каталог (сітка фільмів)
        document.querySelectorAll('.items-list').forEach(sortContainer);
    }

    // ── Кнопка ───────────────────────────────────────────────────────────────

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

    // ── Хуки Lampa ───────────────────────────────────────────────────────────

    function hookLampa() {
        if (typeof Lampa === 'undefined') {
            setTimeout(hookLampa, 300);
            return;
        }

        createButton();

        // Після кожного рендеру сторінки
        Lampa.Listener.follow('full', function () {
            if (sortActive) setTimeout(applySort, 600);
        });

        // Сортування даних до рендеру
        if (Lampa.Arrays && Lampa.Arrays.extend) {
            var _extend = Lampa.Arrays.extend;
            Lampa.Arrays.extend = function (target, items) {
                if (sortActive && Array.isArray(items) && items.length) {
                    items = items.slice().sort(function (a, b) {
                        return parseFloat(b.vote_average || 0) - parseFloat(a.vote_average || 0);
                    });
                }
                return _extend.call(this, target, items);
            };
        }

        // Реакція на появу нових карток
        var timer;
        new MutationObserver(function (muts) {
            if (!sortActive) return;
            var hasNew = muts.some(function (m) {
                return Array.from(m.addedNodes).some(function (n) {
                    return n.nodeType === 1 && (
                        (n.classList && n.classList.contains('card')) ||
                        (n.querySelector && n.querySelector('.card__vote'))
                    );
                });
            });
            if (hasNew) {
                clearTimeout(timer);
                timer = setTimeout(applySort, 500);
            }
        }).observe(document.body, { childList: true, subtree: true });

        console.log('[RatingSort] v' + VERSION + ' готовий');
    }

    // ── Реєстрація ───────────────────────────────────────────────────────────

    if (typeof Lampa !== 'undefined' && Lampa.Plugin) {
        Lampa.Plugin.add({
            name: 'rating_sort',
            version: VERSION,
            description: 'Сортування фільмів за рейтингом',
            type: 'other',
            start: hookLampa
        });
    } else {
        window.addEventListener('load', hookLampa);
        setTimeout(hookLampa, 800);
    }

})();
