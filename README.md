# testy

## sitemap
You'll want a nice and up-to-date `sitemap.xml` file, for crawling/SEO *and* to make automatic parsing of your site's content with JS work nicely and *not* require GitHub API calls (which have daily limits).

After you create or delete a post, run:
```sh
./bin/sitemap
```

Commit and push the new or updated `_site/sitemap.xml` file.

## local dev
`safari` is nice, you can run the site locally by just
- Developer Tools enabled
- `Develop` menu
  - check `Disable Cross-Origin Restrictions` during development
  - reload html page
  - uncheck `Disable Cross-Origin Restrictions` when done
