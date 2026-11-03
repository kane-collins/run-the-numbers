# Run the Numbers

A clean, simple data journalism site. Plain HTML, CSS and JavaScript (charts use [D3](https://d3js.org/) from a CDN), so there is no build step and it works as-is on GitHub Pages.

## Files

| File | What it is |
| --- | --- |
| `index.html` | Homepage with all article cards |
| `about.html`, `contact.html` | The two tabs |
| `style.css` | All styling (colours and fonts are variables at the top) |
| `charts.js` | Shared hoverable chart helpers: `barChart`, `lineChart`, `scatter` |
| `article-squeeze.html` | Placeholder scroll-driven article |
| `article-weather.html` | Placeholder traditional article with hover charts |
| `article-xc-clubs.html` | First real article: Irish cross-country club results, 2016 to 2025 |
| `xc-clubs-data.js` | Chart data for that article, generated from `club_results.csv` |

The data in the two placeholder articles (`article-squeeze.html` and `article-weather.html`) is **placeholder data**. Replace it with real, sourced figures.

## Publish on GitHub Pages

1. Create a new repository on GitHub (e.g. `run-the-numbers`) and upload all these files to the root.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, then **Save**.
4. After a minute or so your site is live at `https://<your-username>.github.io/run-the-numbers/`.

Tip: name the repo `<your-username>.github.io` to get the site at the root address instead.

## Add a new article

1. Copy `article-weather.html` (traditional) or `article-squeeze.html` (scrolly) and rename it.
2. Edit the title, text and data.
3. Copy a card block in `index.html` (look for `ARTICLE CARD`) and point it at your new file. Newest first.

## To do

- Replace the Instagram link in the footer (search for `instagram.com` in each HTML file).
- Write real About text and add Contact details.
