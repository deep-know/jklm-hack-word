const puppeteer = require('puppeteer')
const args = require('args');
const { faker } = require('@faker-js/faker')
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

args.option('bots', 'Number of bots to launch')
args.option('code', 'Code of the room')
args.option('hacker', 'Activate the hacker mode')
args.option('language', 'Language to write')
const flags = args.parse(process.argv)
args.example('node bots.js -b 5 -c HJED -l spanish', 'It will launch 5 bots that will enter the room with the code HJED and will be writting in Spanish.')
if (typeof flags.l === 'undefined') {
  flags.l = 'spanish'
}
const words = require(`an-array-of-${flags.l}-words`)
const bot = async () => {
  const browser = await puppeteer.launch({
    headless: true, args: ['--no-sandbox', '--disable-web-security', '--disable-features=site-per-process', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--disable-gpu']
  })
  const page = await browser.newPage()
  await page.goto(`https://jklm.fun/`)
  const file_input = await page.waitForSelector('input.pictureUpload')
  await file_input.uploadFile(`./cat${random(1,7)}.png`)
  await page.goto(`https://jklm.fun/${flags.code}`);
  const nick_input = await page.waitForSelector('input.styled.nickname', { visible: true })
  await page.keyboard.press('Backspace')
  nick_input.type(faker.name.firstName())
  const main_button = await page.waitForSelector('button.styled', { visible: true })
  await main_button.click()
  const elementHandle = await page.waitForSelector('body > div.pages > div.main.page > div.game > iframe');
  const frame = await elementHandle.contentFrame();
  await page.exposeFunction('scriptMain', async (syl) => {
    const selfTurn = await frame.$eval(".selfTurn", (el) =>
      el.getAttribute("hidden")
    );
    if (typeof selfTurn === 'object') {
      async function checker(syl) {
        const syl_new = await frame.$eval('.syllable', (el) => el.innerHTML);
        if (syl === syl_new) {
          return writter()
        }
      }
      async function writter() {
        const input = await frame.$('input.styled')
        await page.keyboard.press('Backspace')
        const newords = words.filter(w => w.includes(syl.toLowerCase()))
        const word = newords[random(0, newords.length - 1)];
        // const characters = '!?0123456789';
        // let random_string = '';
        // for (let i = 0; i < 10; i ++){
        //   random_string += characters[random(0, characters.length - 1)]
        // }
        if(flags.hacker){
          await input.type(word)
        }
        else {
          await input.type(word, { delay: 100 })
        }

        // await input.type(random_string, {delay: 50})
        await page.keyboard.press('Enter').then(
          checker(syl)
        )
      }
      await writter()
    }
  })
  await page.exposeFunction('joinable', async () => {
    const joinable = await frame.$eval(".seating", (el) =>
      el.getAttribute("hidden")
    );
    if (typeof joinable === 'object') {
      return await frame.waitForSelector("button.styled.joinRound", { visible: true }).then(el => el.click());
    }
  })
  await page.waitForTimeout(2000)
  await frame.waitForSelector("button.styled.joinRound", { visible: true, timeout: 100 * 1000 }).then(el => el.click());
  await page.evaluate(async () => {
    const iframe = document.querySelector('iframe');
    const iframeContent = iframe.contentWindow.document;
    const actual_syl = iframeContent.querySelector('.syllable');
    const turn = iframeContent.querySelector('.otherTurn');
    const seating = iframeContent.querySelector('.seating');
    const observer2 = new MutationObserver(async () => {
      window.joinable()
    });
    observer2.observe(seating, {
      attributes: true,
    })
    const observer = new MutationObserver(async (m) => {
      console.log(m)
      window.scriptMain(actual_syl.innerHTML)
    });
    observer.observe(turn, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  })





}

for (let i = 0; i < flags.bots; i++) {
  bot()
}
