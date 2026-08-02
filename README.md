# My Works — site guide

A plain static website. No build step, no framework, no server code. Double-click
`index.html` to open it locally; upload the folder to publish it.

## The files

| File | What it is |
| --- | --- |
| `content.js` | **Everything you edit.** All works, categories, fatawa, links |
| `files/` | Put your PDFs and documents here |
| `index.html` | The homepage |
| `work.html` | One page that renders any single work or fatwa |
| `common.js` · `script.js` · `work.js` | The code that builds the pages from `content.js` |
| `styles.css` | All the design, organised into numbered sections |
| `404.html` · `favicon.svg` · `robots.txt` · `sitemap.xml` · `share-card.png` | Supporting files |

## Adding a work

1. Copy the PDF into the `files/` folder. Use a lowercase name with hyphens and
   no spaces — `ilm-ul-meerath.pdf`, not `Ilm ul Meerath Final (2).pdf`.
2. Open `content.js`, find the right category, and add an entry to its `works` list:

```js
{
  id: "ilm-ul-meerath",
  title: "علم المیراث",
  language: "ur",
  kind: "رسالہ",
  description: "One or two lines about it.",
  tags: ["میراث"],
  files: [
    { label: "Urdu PDF", url: "files/ilm-ul-meerath.pdf" },
    { label: "Slides", url: "files/ilm-ul-meerath-slides.pdf" }
  ]
}
```

3. Add a matching line to `sitemap.xml`, copying one of the existing `<url>`
   blocks and changing the id. Without it search engines will not find the
   new work.
4. Save and refresh the page.

**`language`** picks the font: `"ur"` gives Nastaleeq, `"ar"` gives Naskh, `"en"`
gives the English serif.

**`id`** must be unique and use only English letters, numbers and hyphens. It
becomes the shareable address: `work.html?work=ilm-ul-meerath`. Once you have
shared a link, don't change its `id` — the old link will stop working.

**`files`** can point at a Google Drive link just as easily as a local file. Leave
the whole `files` line out if nothing is ready yet; the work then shows as
"Not published here yet", which is a normal state, not a mistake.

**`kind`** is the small Urdu label beside the title — رسالہ, چارٹ, پریزینٹیشن,
ترجمہ و تخریج, مضمون. It tells the reader what form the work takes.

**`tags`** appear as small pills and are included in the search.

## Adding a fatwa

Same shape, added to the `rulings` list at the bottom of `content.js`. Fatawa get
their own detail pages too, so `files` works there as well.

## Adding a category

Copy a whole category block in `content.js` and give it a new English `id`. It
appears in the category bar automatically. To reorder categories, move the blocks
— the page follows the file.

## Publishing on GitHub Pages

1. Create a new public repository, e.g. `tahirqadri.github.io`.
2. Upload every file in this folder, including the hidden `.nojekyll` file.
3. Settings → Pages → Source: *Deploy from a branch*, branch `main`, folder `/root`.
4. Wait a minute or two. The site is live at `https://<your-username>.github.io/`.

To use your own domain later: add it under Settings → Pages → Custom domain, then
point a CNAME record at `<your-username>.github.io` with your registrar.

Netlify and Vercel also work — drag the folder onto their dashboard.

## After publishing

- Submit the site once in Google Search Console so it can be found.
- The address is already set to `https://tahirqadri88.github.io/PersonalWebsite/`
  in `site.baseUrl`, `robots.txt`, `sitemap.xml` and the sharing tags in
  `index.html`. If you move to your own domain, change all four together.
- Add a link to the new site from your Google Site and your Super page, so
  existing readers follow across.
