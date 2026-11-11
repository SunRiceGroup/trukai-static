(() => {
    const searchControls = document.querySelectorAll('[data-local-search]');
    const query = new URLSearchParams(location.search).get('q')?.trim() ?? '';

    for (const control of searchControls) {
        const input = control.querySelector('.search-input');
        const button = control.querySelector('.search-button');

        if (query && location.pathname.startsWith('/search')) input.value = query;
        const search = () => {
            const value = input.value.trim();
            if (value) location.assign('/search/?q=' + encodeURIComponent(value));
            else input.focus();
        };

        button.addEventListener('click', search);
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                search();
            }
        });
    }

    for (const opener of document.querySelectorAll('.search-btn')) {
        opener.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                opener.click();
            }
        });
        opener.addEventListener('click', () => {
            const input = opener.parentElement.querySelector('.search-input');
            if (input) requestAnimationFrame(() => input.focus());
        });
    }

    function searchable(value) {
        return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
    }

    function score(page, phrase, words) {
        const title = searchable(page.title);
        const text = searchable(page.text);
        if (title === phrase) return 4;
        if (title.includes(phrase)) return 3;
        if (words.every(word => title.includes(word))) return 2;
        if (words.every(word => title.includes(word) || text.includes(word))) return 1;
        return 0;
    }

    function searchCard(page) {
        const row = document.createElement('li');
        row.className = 'list-group-item';
        const heading = document.createElement('h3');
        const link = document.createElement('a');
        link.href = page.url;
        link.textContent = page.title;
        heading.append(link);
        row.append(heading);
        if (page.summary) {
            const description = document.createElement('p');
            description.className = 'mb-0';
            description.textContent = page.summary;
            row.append(description);
        }
        return row;
    }

    const results = document.querySelector('[data-search-results]');
    if (!results || !query) return;

    document.querySelector('[data-search-title]').textContent = 'Search results for “' + query + '”';
    const status = document.querySelector('[data-search-status]');
    const phrase = searchable(query);
    const words = phrase.split(/\s+/).filter(Boolean);
    fetch('/_local/search.json')
        .then(response => {
            if (!response.ok) throw new Error('Search index unavailable');
            return response.json();
        })
        .then(pages => {
            const matches = pages.map(page => ({page, score: score(page, phrase, words)}))
                .filter(match => match.score)
                .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));
            results.replaceChildren(...matches.map(match => searchCard(match.page)));
            status.textContent = matches.length
                ? matches.length + (matches.length === 1 ? ' result' : ' results')
                : 'No results found.';
        })
        .catch(() => {
            status.textContent = 'Search is temporarily unavailable.';
        });
})();
