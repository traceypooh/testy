// eslint-disable-next-line no-console
const log = console.log.bind(console)

const cfg = {
  posts_per_page: 10,
}

async function xxx(urls) {
  let proms = []
  let files = []
  for (let n = 0; n < urls.length; n++) {
    const md = urls[n]
    const url = `${state.file_prefix}${md}`
    const mat = url.match(/^(.*)\/([^/]+)$/) || url.match(/^()([^/]+)$/)
    const file = mat[2]

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

  // xxx if location.protocol === 'file:' swap out all sitemap https:// urls to file:
  const urls = (await (await (await fetch(`${path}sitemap.xml`)).text())).split('<loc>').slice(1).map((e) => e.split('</loc>').slice(0, 1).join('')).map((e) => location.protocol === 'file:' ? e.replace('https://traceypooh.github.io/testy/', ''))
  log({ urls })
  // await xxx(urls)
}

// eslint-disable-next-line no-void
void main()
