(function () {
    'use strict';

    function start() {
        if (typeof Lampa === 'undefined' || !Lampa.Arrays) {
            setTimeout(start, 300);
            return;
        }

        var _extend = Lampa.Arrays.extend;
        Lampa.Arrays.extend = function (target, items) {
            if (Array.isArray(items) && items.length) {
                items = items.slice().sort(function (a, b) {
                    return parseFloat(b.vote_average || 0) - parseFloat(a.vote_average || 0);
                });
            }
            return _extend.call(this, target, items);
        };

        console.log('[RatingSort] працює — сортування за рейтингом увімкнено');
    }

    if (typeof Lampa !== 'undefined' && Lampa.Plugin) {
        Lampa.Plugin.add({
            name: 'rating_sort',
            version: '5.0.0',
            description: 'Сортування фільмів за рейтингом',
            type: 'other',
            start: start
        });
    } else {
        setTimeout(start, 800);
    }

})();
