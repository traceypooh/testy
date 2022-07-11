/* eslint-disable no-continue */
import yml from 'https://esm.archive.org/js-yaml'
import { friendly_truncate } from 'https://av.prod.archive.org/js/util/strings.js'

// eslint-disable-next-line no-console
const log = console.log.bind(console)

const cfg = {
  posts_per_page: 10,
}
const state = {
  file_prefix: '', // xxx
  tags: {},
  cats: {},
}

const search = decodeURIComponent(location.search)
const filter_tag  = (search.match(/^\?tags\/([^&]+)/)       || ['', ''])[1]
const filter_cat  = (search.match(/^\?categories\/([^&]+)/) || ['', ''])[1]
const filter_post = false


async function xxx(urls) {
  let proms = []
  let files = []
  for (let n = 0; n < urls.length; n++) {
    const md = urls[n]
    const url = `${state.file_prefix}${md}`
    const mat = url.match(/^(.*)\/([^/]+)$/) || url.match(/^()([^/]+)$/)
    const file = urls[n] // mat[2]

    files.push(file)
    proms.push(fetch(url))

    if (((n + 1) % cfg.posts_per_page) && n < urls.length - 1)
      continue // keep building up requests

    // now make the requests in parallel and wait for them all to answer.
    const vals = await Promise.all(proms)
    const file2markdown = files.reduce((obj, key, idx) => ({ ...obj, [key]: vals[idx] }), {})

    // eslint-disable-next-line no-use-before-define
    await parse_posts(file2markdown)

    files = []
    proms = []
  }

  return 0
}

async function main() {
  const lines = document.getElementsByTagName('body')[0].innerHTML.split('\n')
  log({ lines })

  const dirs = location.pathname.split('/').filter((e) => e !== '')
  // eslint-disable-next-line no-nested-ternary
  const is_topdir = location.protocol === 'file:'
    ? dirs.slice(-2, -1)[0] === '_site' // eg: .../_site/index.html
    : (location.hostname.endsWith('.github.io') ? dirs.length <= 1 : !dirs.length)

  const path = is_topdir ? './' : '../../../'
  log({ dirs, is_topdir, path })

  if (!is_topdir)
    return

  document.getElementsByTagName('body')[0].innerHTML = `
    <div class="container">
      <div id="welcome" class="bg-light">
      </div>
      <div id="main-row" class="row">
        <div class="col-md-10 order-md-2">
          <div id="posts"></div>
          <div id="spa"></div>
        </div>
        <div class="nav-left col-md-2 order-md-1">
          <h5>Categories</h5>
          <div id="nav-cats">
          </div>
          <h5>Tags</h5>
          <div id="nav-tags">
          </div>
        </div>
      </div>
    </div>`


  // xxx if location.protocol === 'file:' swap out all sitemap https:// urls to file:
  const urls = (await (await (await fetch(`${path}sitemap.xml`)).text())).split('<loc>').slice(1)
    .map((e) => e.split('</loc>').slice(0, 1).join(''))
    // eslint-disable-next-line no-confusing-arrow
    .map((e) => location.protocol === 'file:' ? e.replace('https://traceypooh.github.io/testy/', '') : e) // xxx
    .filter((e) => e !== '')
    // eslint-disable-next-line no-confusing-arrow
    .map((e) => e.endsWith('/') ? e.concat('index.htm') : e)
  log({ urls })
  await xxx(urls)

  // eslint-disable-next-line no-use-before-define
  finish()
}


async function parse_posts(markdowns) {
  let htm = ''
  for (const [file, markdown] of Object.entries(markdowns)) {
    // the very first post might have been loaded into text if the webserver served the markdown
    // file directly.  the rest are fetch() results.
    const yaml = typeof markdown === 'string' ? markdown : await markdown.text()

    const chunks = yaml.split('\n---')

    const multiples = (file === 'README.md' && !(chunks.length % 2) && // xxx handle \n--- corner cases (hr, tables..)
        !(chunks.filter((_e, idx) => !(idx % 2)).filter((e) => !e.match(/\ntitle:/m)).length))
    const parts = multiples ? chunks : [chunks.shift(), chunks.join('\n---')]
    if (multiples) {
      if (parts.length > 2 && parts[1].trim() === '' && parts[0].match(/^---\ntitle:[^\n]+$/)) {
        // prolly doing local dev -- pull dummy front-matter that GH Pages deploy's jekyll removes..
        parts.shift()
        parts.shift()
      }
      log('looks like single file with', parts.length / 2, 'posts')
    }

    while (parts.length) {
      const front_matter = parts.shift()
      const body_raw = parts.shift()
      const body = body_raw.replace(/\n\n/g, '<br><br>')
      const preview = body_raw.replace(/</g, '&lt;')
      let parsed
      try {
        parsed = yml.load(front_matter)
      } catch {
        // no front-matter or not parseable -- skip
        log('not parseable', { file, front_matter })
        continue
      }
      const json = parsed
      log({ json })

      const title      = json.title?.trim() ?? ''
      const tags       = (json.tags       ?? []).map((e) => e.trim().replace(/ /g, '-'))
      const categories = (json.categories ?? []).map((e) => e.trim().replace(/ /g, '-'))
      const date       = json.date || json.created_at || '' // xxx any more possibilities should do?

      if (!date) {
        log('no date', { file, front_matter })
        continue
      }

      // hugo uses 'images' array
      // eslint-disable-next-line no-nested-ternary
      const featured   = json.featured?.trim() || json.featured_image?.trim() || (json.images
        ? (typeof json.images === 'object' ? json.images.shift() : json.images.trim())
        : '')
      log({ date, featured })
      // author xxx

      for (const tag of tags) {
        state.tags[tag] = state.tags[tag] || []
        state.tags[tag].push(file)
      }
      for (const cat of categories) {
        state.cats[cat] = state.cats[cat] || []
        state.cats[cat].push(file)
      }

      const ymd = [
        date.getUTCFullYear(),
        `${1 + date.getUTCMonth()}`.padStart(2, '0'),
        `${date.getUTCDate()}`.padStart(2, '0'),
      ].join('-')

      // eslint-disable-next-line no-use-before-define
      const url = multiples ? `${ymd}-${slugify(title)}` : file.replace(/\.md$/, '')

      state.num_posts += 1

      if (filter_tag.length  &&       !(tags.includes(filter_tag))) continue
      if (filter_cat.length  && !(categories.includes(filter_cat))) continue
      if (filter_post && url !== filter_post) continue

      // eslint-disable-next-line no-nested-ternary
      const img = featured === ''
        ? cfg.img_site
        : (featured.match(/\//) ? featured : `./img/${featured}`)

      const taglinks =       tags.map((e) => `<a href="?tags/${e}">${e}</a>`/*  */).join(' · ').trim()
      const catlinks = categories.map((e) => `<a href="?categories/${e}">${e}</a>`).join(' · ').trim()

      const date_short = date.toString().split(' ').slice(0, 4).join(' ')
      htm += filter_post
        // eslint-disable-next-line no-use-before-define
        ? post_full(title, img, date_short, taglinks, catlinks, body)
        // eslint-disable-next-line no-use-before-define
        : post_card(title, img, date_short, taglinks, catlinks, preview, url)
    }
  }

  document.getElementById(filter_post ? 'spa' : 'posts').insertAdjacentHTML('beforeend', htm)
}


function post_full(title, img, date, taglinks, catlinks, body) {
  return `
    <h3 class="d-none d-md-block float-md-end">${date}</h3>
    <h1>${title}</h1>
    <h3 class="d-md-none" style="text-align:center">${date}</h3>
    <div class="float-none" style="clear:both">
      <img src="${img}" class="img-fluid rounded mx-auto d-block">
    </div>
    <div>
      ${body}
    </div>
    <hr>
    <div>
      ${catlinks ? '📁 Categories: ' : ''} ${catlinks} ${catlinks ? '<br>' : ''}
      ${taglinks ? '🏷️ Tags: ' : ''} ${taglinks}
    </div>
  `
}


function post_card(title, img, date, taglinks, catlinks, body, url) {
  return `
    <div class="card card-body bg-light">
      <a href="${location.protocol === 'file:' ? url : url.replace(/\/index.html*$/, '')}">
        ${img ? `<img src="${img}">` : ''}
        <h2>${title}</h2>
      </a>
      ${date}
      <div>
        ${friendly_truncate(body, 200)}
      </div>
      ${catlinks ? '📁 ' : ''}
      ${catlinks}
      ${taglinks ? '🏷️ ' : ''}
      ${taglinks}
    </div>`
}


function slugify(str) {
  return str.toLowerCase()
    .replace(/'s/g, 's')
    .replace(/[^a-z0-9-]/g, '-') // xxx i18l
    .replace(/--+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')
}


function finish() {
  let htm

  htm = '<ul>'
  for (const cat of Object.keys(state.cats).sort())
    htm += `<li><a href="?categories/${cat}">${cat.toLowerCase()}</a> ${state.cats[cat].length}</li>`
  htm += '</ul>'
  document.getElementById('nav-cats').insertAdjacentHTML('beforeend', htm)

  htm = ''
  const rem_min = 1
  const rem_max = 2.5

  const counts = Object.values(state.tags).map((e) => e.length)
  const cnt_min = Math.min(...counts)
  const cnt_max = 1 + Math.max(...counts)

  for (const tag of Object.keys(state.tags).sort()) {
    const count = state.tags[tag].length
    const weight = (Math.log(count) - Math.log(cnt_min)) / (Math.log(cnt_max) - Math.log(cnt_min))
    const size = (rem_min + ((rem_max - rem_min) * weight)).toFixed(1)
    htm += `<a href="?tags/${tag}" style="font-size: ${size}rem">${tag.toLowerCase()}</a> `
  }
  document.getElementById('nav-tags').insertAdjacentHTML('beforeend', htm)
}

// eslint-disable-next-line no-void
void main()

