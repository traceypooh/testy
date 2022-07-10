// eslint-disable-next-line no-console
const log = console.log.bind(console)


async function main() {
  const lines = document.getElementsByTagName('body')[0].innerHTML.split('\n')
  log({ lines })

  const urls = (await (await (await fetch('../../../sitemap.xml')).text())).split('<loc>').slice(1).map((e) => e.split('</loc>').slice(0, 1).join(''))
  log({ urls })
}

// eslint-disable-next-line no-void
void main()
